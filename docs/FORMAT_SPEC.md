# XRAR Native Archive Format Specification
## Version 1.0 (Specification ID: XRAR-CONTAINER-v1)

### 1. Abstract
The `.xrar` format is an open, modern, high-efficiency, multi-stream container format designed for extreme compression density, streaming decompression, authenticated encryption, data deduplication, and parity-based recovery.

### 2. General Principles
- **64-bit offsets and sizes throughout**: Files larger than 4 GB and archives containing billions of files are fully supported.
- **Defensive parsing**: Fixed length fields, strict boundary checks, and length-delimited variable-length records prevent buffer overflows and path traversal.
- **Separation of Content and Metadata**: Directory tree metadata is stored in a structured index block at the archive footer, allowing quick random access, search, and directory browsing without scanning every data block.
- **Tamper Resistance**: Authenticated encryption (AES-256-GCM) and cryptographic hashing (BLAKE3 / SHA-256) ensure tamper detection.

---

### 3. Binary Layout

```
+-------------------------------------------------------------------+
| 1. ARCHIVE HEADER (Fixed 32 bytes)                                |
|    - Magic: 4 bytes = [0x58, 0x52, 0x41, 0x52] ("XRAR")          |
|    - Major Version: u16 (0x0001)                                  |
|    - Minor Version: u16 (0x0000)                                  |
|    - Global Flags: u32                                            |
|        Bit 0: ENCRYPTED_HEADER                                    |
|        Bit 1: ENCRYPTED_DATA                                      |
|        Bit 2: SOLID_COMPRESSION                                   |
|        Bit 3: MULTI_VOLUME                                        |
|        Bit 4: DEDUPLICATION_ENABLED                              |
|        Bit 5: RECOVERY_RECORDS_PRESENT                            |
|    - Header Reserved: 16 bytes (zeroed)                           |
+-------------------------------------------------------------------+
| 2. ENCRYPTION METADATA (Optional, present if Bit 0 or 1 is set)   |
|    - KDF Algorithm: u8 (1 = Argon2id)                             |
|    - KDF Iterations / Time Cost: u32 (e.g. 3)                     |
|    - KDF Memory Cost (KiB): u32 (e.g. 65536)                      |
|    - KDF Parallelism: u8 (e.g. 4)                                 |
|    - Salt Length: u8 (16 or 32 bytes)                             |
|    - Salt: [u8; Salt Length]                                      |
|    - Cipher Algorithm: u8 (1 = AES-256-GCM, 2 = ChaCha20-Poly1305)|
|    - Nonce Length: u8 (12 bytes)                                  |
|    - Master Nonce: [u8; Nonce Length]                             |
+-------------------------------------------------------------------+
| 3. MULTI-VOLUME DESCRIPTOR (Optional, present if Bit 3 is set)    |
|    - Volume Index: u16 (0-based, part01 = 0)                      |
|    - Total Volumes: u16 (0 if unknown at start)                   |
|    - Archive UUID: [u8; 16] (Unique run ID matching all volumes)  |
+-------------------------------------------------------------------+
| 4. PAYLOAD COMPRESSION BLOCKS (Repeated N times)                  |
|    - Block Magic: 4 bytes = [0x58, 0x52, 0x42, 0x4B] ("XRBK")     |
|    - Block ID: u64                                                |
|    - Codec ID: u8                                                 |
|        0 = Store (Uncompressed)                                   |
|        1 = Zstandard                                              |
|        2 = LZMA2                                                  |
|        3 = Brotli                                                 |
|        4 = Deflate                                                |
|        5 = LZ4                                                    |
|    - Compression Level: u8 (0..22)                                |
|    - Original Uncompressed Size: u64                              |
|    - Compressed Size: u64                                         |
|    - Block Checksum Type: u8 (1 = BLAKE3, 2 = SHA-256, 3 = CRC32) |
|    - Block Checksum: [u8; 32]                                     |
|    - Compressed Payload Data: [u8; Compressed Size]               |
+-------------------------------------------------------------------+
| 5. ARCHIVE MANIFEST & FILE INDEX                                  |
|    - File Count: u64                                              |
|    - For each file entry:                                         |
|        - Path Length: u16                                         |
|        - Relative Path (UTF-8, normalized forward slashes): [u8]  |
|        - File Attributes: u32 (Windows FILE_ATTRIBUTE_* flags)    |
|        - Uncompressed Size: u64                                   |
|        - Modified Timestamp (Unix epoch seconds): i64             |
|        - Checksum: [u8; 32] (SHA-256 or BLAKE3)                   |
|        - Block References: List of (Block ID, Offset, Length)     |
+-------------------------------------------------------------------+
| 6. RECOVERY RECORDS (Optional, Reed-Solomon Parity Slices)        |
|    - Recovery Magic: 4 bytes = [0x58, 0x52, 0x52, 0x43] ("XRRC")  |
|    - Parity Algorithm: u8 (1 = Reed-Solomon GF(2^8))              |
|    - Data Shards: u16                                             |
|    - Parity Shards: u16                                           |
|    - Shard Size: u32                                              |
|    - Parity Shards Payload Data                                   |
+-------------------------------------------------------------------+
| 7. ARCHIVE FOOTER                                                 |
|    - Manifest Offset: u64 (Offset from beginning of archive)      |
|    - Manifest Size: u64                                           |
|    - Global Integrity Digest: [u8; 32] (BLAKE3 of whole archive)  |
|    - End Magic: 7 bytes = [0x58, 0x52, 0x41, 0x52, 0x45, 0x4E,    |
|                            0x44] ("XRAREND")                      |
+-------------------------------------------------------------------+
```

---

### 4. Codec Identifiers
| Codec Name | ID | Default Level | Key Attributes |
| :--- | :--- | :--- | :--- |
| **Store** | `0x00` | 0 | Raw pass-through, zero CPU cost |
| **Zstandard** | `0x01` | 3 (Fast), 19 (Ultra) | Multi-threaded, lightning decompression |
| **LZMA2** | `0x02` | 6 (High), 9 (Ultra) | Extreme ratio for binary/text |
| **Brotli** | `0x03` | 11 (Max) | Superior ratio on JSON/XML/text |
| **Deflate** | `0x04` | 6 | Standard legacy deflate |
| **LZ4** | `0x05` | 1 | Real-time gigabytes/sec throughput |

---

### 5. Deduplication Mechanism
When deduplication is enabled (`Global Flags & 0x10`), input streams are dynamically partitioned using a rolling FastCDC (Content-Defined Chunking) algorithm. Each chunk's BLAKE3 256-bit hash is calculated. If a matching chunk hash already exists in the manifest block index, the file entry points to the existing block reference without re-compressing duplicate data.

---

### 6. Reed-Solomon Recovery Slices
Recovery records allow the archive to survive bit rot, bad disk sectors, and partial transmission truncation. The archive can configure 1%, 3%, 5%, or 10% parity shards using Galois Field GF(2^8) Reed-Solomon arithmetic. If up to N parity shards are intact, any N missing or corrupted data shards can be bit-for-bit reconstructed.
