# XRAR Security Policy & Defensive Architecture

### 1. Threat Model & Defensive Posture
Archive managers frequently process untrusted data from the internet. XRAR implements defense-in-depth protections against all major archive vulnerability vectors:

```
                      [ Untrusted Archive File ]
                                  |
                                  v
             +-----------------------------------------+
             |      Phase 1: Header & Bounds Guard      |
             |  - Magic number validation              |
             |  - Memory-safe binary parsing (Rust)    |
             |  - Checked integer arithmetic (no wrap) |
             +-----------------------------------------+
                                  |
                                  v
             +-----------------------------------------+
             |       Phase 2: Path Sanitization        |
             |  - Strip '../' & '..\' components       |
             |  - Reject absolute paths (C:\, /etc)    |
             |  - Reject Windows reserved (CON, PRN)   |
             |  - Force containment in extraction root |
             +-----------------------------------------+
                                  |
                                  v
             +-----------------------------------------+
             |   Phase 3: Resource & Bomb Prevention   |
             |  - Max expansion ratio ceiling (100:1)  |
             |  - Pre-flight disk space availability   |
             |  - Streaming decompression (no RAM bloat|
             +-----------------------------------------+
                                  |
                                  v
             +-----------------------------------------+
             |       Phase 4: Cryptographic Check      |
             |  - Argon2id key derivation              |
             |  - AES-256-GCM authentication tag test  |
             |  - Zeroize sensitive key memory         |
             +-----------------------------------------+
```

---

### 2. Specific Security Safeguards

#### 2.1 Path Traversal (Zip Slip / Directory Traversal)
- Every relative file path inside an archive is normalized by replacing backward slashes `\` with forward slashes `/`.
- Any component equal to `..` or containing null bytes is strictly rejected.
- Extraction targets are checked using canonicalization: the final target absolute path must strictly start with the intended destination directory prefix (`starts_with(destination_canonical)`).
- Windows reserved file names (`CON`, `PRN`, `AUX`, `NUL`, `COM1..9`, `LPT1..9`) are automatically renamed or rejected to prevent OS-level deadlocks.

#### 2.2 Symlink & Junction Attack Prevention
- By default, XRAR does not follow symbolic links during extraction that point outside the destination root.
- Reparse points, junctions, and NTFS hard links targeting system files are neutralized or skipped with an explicit warning.

#### 2.3 Archive Bomb & Resource Exhaustion Defense
- Decompression routines monitor the ratio between output bytes produced and input bytes consumed. If the ratio exceeds safe thresholds (e.g. 200:1) or total uncompressed size exceeds allocated disk quotas, extraction halts immediately with `Error::DecompressionRatioExceeded`.
- All operations are streaming. XRAR never buffers unbounded blocks into RAM.

#### 2.4 Cryptographic Standards
- Password hashing uses **Argon2id** (RFC 9106) with configurable memory and time costs, resistant to GPU/ASIC brute-force cracking.
- Encryption uses **AES-256-GCM** with authenticated 128-bit MAC tags. Tampered ciphertext is detected and aborted before being written to disk.
- All password memory buffers implement `Zeroize` to scrub secrets from RAM immediately after key derivation.

#### 2.5 Safe Preview
- Previews within the GUI are limited to safe plain text, markdown, syntax-highlighted code, CSV/JSON/XML data, and standard raster images.
- No files are ever executed, spawned, or invoked via shell associations without explicit user confirmation.
