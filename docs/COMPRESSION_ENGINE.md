# XRAR Compression Engine Architecture
## Dynamic Codec Orchestration & Smart Analysis

### 1. Architectural Overview
The XRAR compression engine operates as a modular, decoupled pipeline. Compression codecs conform to a strictly typed Rust trait `CompressionCodec`. This allows zero-cost abstraction, polymorphic selection of codecs at runtime, and extensibility without modifying existing archive parsing code.

```
+-------------------------------------------------------------+
|                      XRAR Input Stream                      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               Smart Pre-Compression Analyzer                |
|  - Entropy estimation (Shannon Entropy: H = -sum(p * log2 p)|
|  - Extension & Magic Number heuristic matching              |
|  - Rapid 64 KiB block compressibility probe                |
|  - Duplicate chunk detection                                |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Compression Profile                     |
|    [ FAST | BALANCED | HIGH | ULTRA | EXTREME | SMART ]     |
+-------------------------------------------------------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
+---------------+      +---------------+      +---------------+
|     Zstandard |      |     LZMA2     |      |    Brotli     |
| Real-time I/O |      | Maximum Ratio |      |   Text / JSON |
+---------------+      +---------------+      +---------------+
```

---

### 2. Compression Profiles Specification

| Profile | Primary Codec | Level / Dict | Typical Use-Case | Speed / Ratio Tradeoff |
| :--- | :--- | :--- | :--- | :--- |
| **FAST** | LZ4 / Zstandard | Level 1 - 3 | Game backups, live log capture | Maximum throughput (500+ MB/s) |
| **BALANCED** | Zstandard | Level 6 - 9 | Everyday compression & distribution | Optimal general-purpose speed vs size |
| **HIGH** | LZMA2 / Zstandard | Level 6 / 16 | Distribution binaries, source code | High ratio, reasonable memory |
| **ULTRA** | LZMA2 | Level 9 / 64MB | Archive preservation, software releases | Near-maximum ratio, high RAM usage |
| **EXTREME** | LZMA2 + Solid | Level 9+ / 128MB | Minimal footprint archives | Intensive CPU/RAM consumption |
| **SMART** *(Default)* | Auto-determined | Dynamic | Heterogeneous directories | Analyzes each file individually |

---

### 3. Smart Pre-Compression Analysis Algorithm
The Smart profile prevents the wasteful re-compression of already compressed data (e.g. `.zip`, `.mp4`, `.jpg`, `.xz`) while maximizing compression on high-entropy structured files:

1. **Known Format Bypass**: Files with media/compressed extensions (`.zip`, `.rar`, `.7z`, `.jpg`, `.jpeg`, `.png`, `.mp4`, `.mkv`, `.mp3`, `.gz`, `.zst`) are classified as `Store` or checked with a fast 16 KiB entropy probe. If entropy exceeds $7.85$ bits/byte, the file is stored uncompressed, avoiding CPU waste.
2. **Executable Optimization**: Executables (`.exe`, `.dll`, `.so`) are routed to LZMA2 or Zstandard with BCJ (Branch-Call-Jump) filter pre-processing where supported.
3. **Structured Text & Code**: Files identified as source code (`.rs`, `.ts`, `.js`, `.py`, `.c`, `.cpp`), markup (`.html`, `.xml`, `.json`), or logs are directed to Brotli (level 11) or LZMA2 for maximum textual redundancy reduction.
4. **Sample Benchmark Probe**: For large files (> 64 MB) of unknown type, a 64 KiB sliding sample is compressed in memory with candidate codecs (Zstd vs LZMA2) in $< 5\text{ ms}$ to predict the full dataset ratio.

---

### 4. Solid Compression Mechanics
In **Solid Mode**, multiple small files are concatenated into a single continuous stream before entering the compression dictionary. This eliminates per-file dictionary resets and enables extreme compression ratios when archiving repositories, source directories, and collections of similar files.

XRAR supports:
- **No Solid**: Independent files for random access and immediate single-file extraction.
- **Smart Solid**: Files are sorted by extension and MIME type before concatenation, grouping similar data together for optimal dictionary reuse.
- **Maximum Solid**: All files concatenated in an uninterrupted solid block with an indexed seek table.
