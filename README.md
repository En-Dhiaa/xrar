# XRAR — Extreme Compression Archive

<div align="center">

**Next-Generation High-Performance Archive Manager for Windows**

*A free, open-source, offline-first, extreme-compression archive suite engineered with Rust, React, and Tailwind CSS.*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Rust: Stable](https://img.shields.io/badge/Rust-1.80%2B-orange.svg)](https://www.rust-lang.org)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue.svg)](https://microsoft.com/windows)
[![Offline: First](https://img.shields.io/badge/Offline-100%25%20Private-purple.svg)](#privacy--security)
[![Localization: EN & AR](https://img.shields.io/badge/Bilingual-English%20%7C%20العربية-teal.svg)](#bilingual-ui)

</div>

---

## 🌟 Key Features

- **Native `.xrar` Format**: Modern, versioned 64-bit container supporting files larger than 4 GB, streaming blocks, and indexed directory manifests.
- **Smart Compression Engine**: Automatically scans Shannon entropy and file signatures to choose the optimal algorithm. Never wastes CPU re-compressing already packed formats (e.g. `.mp4`, `.zip`, `.png`).
- **Multiple Codecs Supported**:
  - `LZ4`: Real-time gigabytes/sec throughput.
  - `Deflate`: Universal standard compression.
  - `Brotli`: Extreme density on structured text, JSON, XML, and source code.
  - `LZMA2`: Extreme ratios for binaries and preservation archives.
  - `Store`: Instant uncompressed pass-through.
- **Authenticated Encryption**: **AES-256-GCM** with 128-bit MAC verification and **Argon2id** memory-hard key derivation to defeat brute-force attacks.
- **Self-Healing Recovery Records**: Configurable **Reed-Solomon** GF(2^8) erasure parity records (1%, 3%, 5%, 10%) to repair damaged archives.
- **Content Deduplication**: Rolling chunk hash indexing to eliminate duplicate files without storing redundant data.
- **Multi-Format Compatibility**: Seamless reading and safe extraction of `.xrar`, `.zip` (ZIP64), `.tar`, `.tar.gz`, `.rar` (extraction compatibility), and `.iso` disk images.
- **Defensive Path Security**: Strict protection against Zip Slip, directory traversal (`../`), reserved Windows device names (`CON`, `PRN`, `AUX`), and decompression resource bombs.
- **Bilingual Desktop UI**: First-class support for both **English (LTR)** and **Arabic (RTL)** with high-density technical aesthetics, real-time telemetry, and safe sandboxed preview.
- **Windows Explorer Integration**: Native right-click context menu options (`Add to .xrar`, `Extract here`, `Test archive`).
- **Full-Featured Automation CLI (`xrar.exe`)**: First-class command-line tool with machine-readable `--json` output for CI/CD pipelines.

---

## 🚀 Command-Line Interface (CLI)

The `xrar.exe` CLI binary provides scriptable archive automation:

```powershell
# Create an archive using the default Smart profile
xrar create archive.xrar ./my_folder

# Create an archive with extreme LZMA2 solid compression
xrar create archive.xrar ./source_code --profile extreme --solid

# Create an encrypted archive with AES-256-GCM
xrar create secure.xrar ./confidential -p "StrongMasterPassword!2026"

# Safely extract archive to a target folder
xrar extract archive.xrar -o ./extracted_data

# List archive contents and compression statistics
xrar list archive.xrar

# Test archive block integrity and checksums
xrar test archive.xrar

# Run integrated hardware compression benchmark
xrar benchmark --size 5

# Output structured JSON for automation and scripting
xrar benchmark --json
xrar list archive.xrar --json

# Find duplicate files with bit-for-bit cryptographic matching
xrar duplicates "C:\Projects"
```

---

## 📦 Workspace Architecture

```
xrar/
├── apps/
│   ├── cli/                   # XRAR standalone CLI (xrar.exe)
│   └── desktop/               # Desktop application wrapper
│
├── crates/
│   ├── xrar-core/             # High-level engine orchestrator
│   ├── xrar-format/           # Native .xrar container reader & writer
│   ├── xrar-compression/      # Shannon entropy scanner & smart selection
│   ├── xrar-codecs/           # LZ4, Deflate, Brotli, LZMA2 implementations
│   ├── xrar-crypto/           # Argon2id, AES-256-GCM, BLAKE3, SHA-256
│   ├── xrar-filesystem/       # Defensive path validation & Zip Slip guard
│   ├── xrar-extractor/        # Safe cancellable extraction pipeline
│   ├── xrar-archive/          # Multi-format reader (XRAR, ZIP, TAR, RAR, ISO)
│   ├── xrar-recovery/         # Reed-Solomon erasure parity calculation
│   ├── xrar-dedup/            # Rolling hash deduplication index
│   ├── xrar-benchmark/        # Hardware benchmark engine
│   └── xrar-plugin-api/       # Plugin trait specifications
│
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS
├── installer/                 # Inno Setup & WiX installer scripts
├── docs/                      # Technical specifications & security policies
└── scripts/                   # Shell integration and portable packaging
```

---

## 🛠️ Building From Source

### Prerequisites
- [Rust](https://www.rust-lang.org) 1.80+
- [Node.js](https://nodejs.org) v18+

```powershell
# 1. Clone repository
git clone https://github.com/En-Dhiaa/xrar.git
cd xrar

# 2. Build the optimized release CLI binary
cargo build --release --bin xrar

# 3. Run full workspace test suite
cargo test --workspace

# 4. Build desktop web interface
cd frontend
npm install
npm run build
cd ..

# 5. Build portable zip distribution
.\scripts\build_portable.ps1
```

---

## 🔒 Privacy & Security

- **100% Offline**: XRAR does not require an Internet connection and operates fully offline.
- **Zero Telemetry**: No analytics, no phone-home pings, no silent tracking.
- **No Ads, No Accounts**: Free and open source forever without accounts or subscriptions.

---

## 📄 License

Licensed under the [MIT License](LICENSE).
Third-party credits and licenses are detailed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Created and maintained by **[En-Dhiaa](https://github.com/En-Dhiaa)**.
