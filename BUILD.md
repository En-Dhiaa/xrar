# XRAR Build & Development Guide

## Prerequisites
- **Rust Toolchain**: Stable (1.80+)
- **Node.js**: v18+ (Node 24 recommended)
- **PowerShell**: For packaging scripts

## Building the CLI (`xrar.exe`)
```powershell
# Debug build
cargo build

# Optimized release build
cargo build --release --bin xrar
```
The resulting binary will be located in `target/release/xrar.exe`.

## Running Tests
```powershell
cargo test --workspace
```

## Building Frontend Bundle
```powershell
cd frontend
npm install
npm run build
```

## Creating Portable Release
```powershell
.\scripts\build_portable.ps1
```
Creates `dist/XRAR-1.0.0-Portable-x64.zip`.
