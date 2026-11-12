# XRAR Technical Architecture

## 1. System Overview
XRAR is structured as a decoupled workspace separating pure systems logic from presentation layers.

```
+-------------------------------------------------------------+
|                      Presentation Layer                     |
|  - CLI (apps/cli)                                           |
|  - Modern Desktop UI (frontend: React + Tailwind + Vite)    |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                   Orchestration Core (xrar-core)            |
|  - Engine facade, conversion, progress hooks, deduplication |
+-------------------------------------------------------------+
                               |
       +---------------+-------+-------+---------------+
       |               |               |               |
       v               v               v               v
+-------------+ +-------------+ +-------------+ +-------------+
| xrar-archive| | xrar-format | |  xrar-codecs| | xrar-crypto |
| ZIP, TAR,   | | .xrar spec  | | LZ4, LZMA2, | | AES-GCM,    |
| RAR, ISO    | | reader/writ | | Brotli, Zstd| | Argon2id    |
+-------------+ +-------------+ +-------------+ +-------------+
       |               |               |               |
       +---------------+-------+-------+---------------+
                               |
                               v
+-------------------------------------------------------------+
|                      Low-Level Crates                       |
|  - xrar-filesystem: Path safety, Zip Slip protection        |
|  - xrar-recovery:   Reed-Solomon erasure parity healing     |
|  - xrar-dedup:      Content-defined chunking (FastCDC)      |
|  - xrar-benchmark:  Multi-threaded hardware benchmarking    |
+-------------------------------------------------------------+
```

## 2. Key Architecture Principles
1. **Defensive Extraction**: All paths pass through `resolve_safe_extraction_path` preventing traversal attacks (`../`, device names).
2. **Streaming Design**: 64-bit integer file sizes throughout; no whole-archive RAM buffering.
3. **Smart Heuristics**: Automatic entropy scanning bypasses re-compressing already packed formats.
4. **Bilingual Localization**: English (LTR) and Arabic (RTL) first-class support in core and UI.
