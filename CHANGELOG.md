# Changelog

All notable changes to **XRAR** are documented in this file.

## [1.0.0] - 2026-11-12
### Initial Release Candidate
- **Native `.xrar` Container**: Versioned archive container with streaming block headers, manifest directory tree, and footer verification.
- **Pluggable Codec Suite**: Store, LZ4 (real-time fast), Deflate, Brotli, and LZMA2 (extreme ratio).
- **Smart Compression Heuristics**: Shannon entropy scanner and extension categorizer to prevent recompressing media/compressed formats.
- **Authenticated Cryptography**: AES-256-GCM authenticated payload/header encryption with Argon2id memory-hard key derivation.
- **Recovery Records**: Reed-Solomon GF(2^8) erasure parity records (1%, 3%, 5%, 10%) for archive self-healing.
- **Deduplication Engine**: Content-defined chunking (FastCDC) to detect and reference identical blocks.
- **Multi-Format Compatibility**: Seamless inspection and extraction of `.xrar`, `.zip` (ZIP64), `.tar`, `.tar.gz`, `.rar`, and `.iso`.
- **Integrated Hardware Benchmark**: Measures real-world CPU compression throughput, decompression speed, and ratio.
- **Modern Desktop UI**: React 18 + TypeScript + Vite + Tailwind CSS with first-class Arabic (RTL) and English (LTR) localization.
- **Windows Explorer Integration**: Context menu registration scripts (`Add to .xrar`, `Extract here`, `Test archive`).
- **Automation CLI (`xrar.exe`)**: Subcommands `create`, `extract`, `list`, `test`, `benchmark`, `convert`, `duplicates`, and `--json`.
- **Packaging**: Portable package builder script and Inno Setup installer configuration.
