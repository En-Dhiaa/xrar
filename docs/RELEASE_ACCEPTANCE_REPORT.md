# XRAR 2.0 — Production Release Acceptance & Engineering Report

## Executive Summary
XRAR 2.0 (Extreme Compression Archive) has completed a comprehensive engineering reconstruction, transitioning from a fragile development prototype to a robust, production-grade native Windows desktop application and compression suite.

The critical production defect (`127.0.0.1 refused to connect` / `ERR_CONNECTION_REFUSED`) has been eliminated by deprecating localhost-bound HTTP servers and transitioning the desktop shell to **Tauri 2 + native Microsoft Edge WebView2 control** with embedded local assets (`tauri://localhost` custom in-memory protocol) and typed native IPC.

All workspace tests, packaging workflows, and release acceptance tests have passed with **100% success**.

---

## 1. System & Environment Specifications

| Component | Specification |
|---|---|
| **Operating System** | Microsoft Windows 11 / Windows 10 x64 |
| **Rust Toolchain** | Rust stable `1.99.1` (`x86_64-pc-windows-gnu`) |
| **C/C++ & Linker Toolchain** | MSYS2 MinGW-w64 GCC `16.2.0`, `dlltool`, `windres` |
| **Desktop Shell Architecture** | Tauri 2.12.5 + Microsoft Edge WebView2 Control |
| **Frontend Framework** | React 18, TypeScript 5.6, Tailwind CSS 3.4, Vite 6.0 |
| **IPC Mechanism** | Native in-process COM / Tauri IPC (`invoke_handler`) |
| **Localhost / TCP Socket Dependency** | **ZERO (None)** |
| **Telemetry / Network Callbacks** | **ZERO (100% Offline, Privacy-First)** |

---

## 2. Root Cause & Architectural Resolution

### The Defect
When launching the previous build of XRAR or its installer, Windows displayed `ERR_CONNECTION_REFUSED` (`127.0.0.1 refused to connect`).

### Technical Root Cause
The legacy desktop launcher (`apps/desktop/src/main.rs`) bound a temporary TCP listener to `127.0.0.1:0` and spawned `msedge.exe --app=http://127.0.0.1:PORT`. Because modern Microsoft Edge runs a shared multi-process manager in the background, the spawned `msedge.exe` immediately handed the URL off to the existing browser session and terminated with exit code 0. Rust's `child.wait()` detected the process termination, stopped the TCP listener, and exited `xrar-gui.exe`. By the time Edge attempted to render the webpage, the socket was closed, yielding `ERR_CONNECTION_REFUSED`.

### The Resolution
1. **Removed all TCP listeners and HTTP servers** from the desktop runtime and installer.
2. Migrated `apps/desktop` to Tauri 2:
   - Configured `frontendDist: "../../frontend/dist"` to embed production frontend bundles directly into the compiled binary.
   - Assets are served securely via WebView2's virtual in-memory protocol (`tauri://localhost`), requiring no open network ports or firewall permissions.
   - Replaced HTTP endpoints (`/api/...`) with typed native Tauri commands:
     - `read_directory`: Real-time filesystem listing for File Manager mode.
     - `get_drives`: Auto-detects physical and logical Windows drives (`C:\`, `D:\`, etc.).
     - `list_archive`: Parses and lists archive contents (`.xrar`, `.zip`, `.rar`, `.7z`, `.tar`, `.iso`).
     - `create_archive`: Multi-threaded compression engine with streaming codecs.
     - `extract_archive`: Safe extraction with directory traversal protections.
     - `test_archive`: Cryptographic block integrity validation.
     - `run_benchmark`: Live hardware compression speed & ratio benchmarking.
     - `find_duplicates`: BLAKE3-powered duplicate file detection.
     - `read_file_preview`: Safe text/code sandboxed preview.
     - `browse_folder`, `browse_files`, `browse_archive_file`, `browse_save_archive`: Native Windows file picker dialogs.
3. Solved GNU `windres` Unicode file-path parsing crash on paths containing non-ASCII Arabic folder names by dynamically staging the icon to `%TEMP%` during build-time resource compilation.

---

## 3. UI/UX Dual Operational Modes (WinRAR-Equivalent)

### Mode 1 — Windows File Manager (Explorer Mode)
* Activated by default when launching XRAR without arguments.
* Displays available drives (`C:\`, `D:\`, etc.) and system directories.
* Provides full directory navigation, up-folder (`..`), sorting, and multi-selection.
* Double-clicking directories navigates deeper; double-clicking archives (`.xrar`, `.zip`, `.rar`, etc.) opens Archive Manager mode.
* Selecting files and clicking **Add** opens the compression wizard pre-populated with selected items.

### Mode 2 — Archive Manager Mode (WinRAR Mode)
* Activated upon opening any archive file or passing an archive via command line (`Open With`).
* Full breadcrumb path bar (`Archive.xrar > folder > subfolder`) with Back to Files (`Files`) navigation.
* Columns: Name, Original Size, Compressed Size, Ratio %, Checksum/CRC32, and Quick Action buttons.
* Integrated toolbar buttons: **Add**, **Extract To**, **Test**, **View**, **Delete**, **Find**, **Wizard**, **Info**, **Repair**, **Benchmark**, **Comment**, **Protect**.
* Right-click context menu for instant extraction, file preview, deletion, and property inspection.
* Bilingual localization: Instant toggle between **English** (LTR) and **Arabic** (RTL).

---

## 4. Production Windows Setup Installer

The installer (`XRAR-1.0.0-Setup.exe`) has been completely rewritten into a standalone native application:
* **Default Language**: English, with clear visual prompts and responsive input handling.
* **Destination Path Selection**: Allows accepting the recommended path (`%LOCALAPPDATA%\Programs\XRAR`), typing a custom path, or opening the native Windows Folder Picker.
* **Component Selection**: Desktop GUI, CLI Engine, SFX Module, Explorer Context Menu, File Associations (`.xrar`), Desktop Shortcut, Start Menu Shortcut, and User PATH addition.
* **Real-time Animated Progress Display**: Shows step-by-step progress bars and status updates during deployment.
* **System Integration**:
  - Registered under Windows Apps & Features (`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\XRAR`).
  - Native `.xrar` file association and icon registration.
  - Windows Explorer right-click context menu ("Add to .xrar (Smart)", "Compress Folder with XRAR", "Extract here (XRAR)").
  - Generates self-contained `uninstall.bat` and clean uninstallation handler (`--uninstall`).
* **Silent Mode**: Full automated deployment support via `--silent` / `/S` / `/VERYSILENT`.

---

## 5. Live Acceptance Test Execution Results

Executing `scripts/verify_release.ps1` produces the following verification log:

```text
==========================================================================
   XRAR Release Acceptance & Verification Suite v1.0.0                 
==========================================================================

[1/5] Verifying release distribution artifacts in dist/...
  [✓] Found: XRAR-1.0.0-Setup.exe (35.41 MB)
  [✓] Found: XRAR-1.0.0-Portable-x64.zip (12.33 MB)
  [✓] Found: xrar-cli.exe (4.58 MB)
  [✓] Found: xrar-gui.exe (24.95 MB)
  [✓] Found: xrar-sfx.exe (3.65 MB)

[2/5] Testing Silent Installation into isolated directory...
  [✓] Silent installation completed with ExitCode 0.

[3/5] Verifying installed binaries and payload integrity...
  [✓] Verified installed file: xrar.exe
  [✓] Verified installed file: xrar-gui.exe
  [✓] Verified installed file: xrar-sfx.exe
  [✓] Verified installed file: icon.ico
  [✓] Verified installed file: icon.png
  [✓] Verified installed file: README.txt
  [✓] Verified installed file: uninstall.bat

[4/5] Executing live functional test using installed xrar.exe...
  Creating test archive: C:\Users\USER\AppData\Local\Temp\XRAR_E2E_Test_Data\test_archive.xrar
  XRAR archive created successfully
  Testing archive cryptographic integrity...
  OK: Archive is valid (2 files verified).
  Extracting archive to: C:\Users\USER\AppData\Local\Temp\XRAR_E2E_Test_Data\extract
  Successfully extracted 2 files
  [✓] Content matches original data bit-for-bit (100% verified).

[5/5] Testing clean uninstallation...
  Cleaning up XRAR registry associations and context menus...
  XRAR uninstallation completed successfully.

==========================================================================
   ALL ACCEPTANCE TESTS PASSED (100% SUCCESS)                             
==========================================================================
```

---

## 6. Release Distribution Artifacts & Cryptographic Checksums

All official release artifacts are generated in `/dist/`:

| Artifact | Size | SHA-256 Checksum | Purpose |
|---|---|---|---|
| `XRAR-1.0.0-Setup.exe` | ~35.4 MB | `4AFAE3B5C6321C00FD98D9149B967504C98CC2136D70831D355282C1B0CA9702` | Standalone English Graphical & CLI Windows Setup Wizard |
| `XRAR-1.0.0-Portable-x64.zip` | ~12.3 MB | `8C7B40E3F7D0BC37BDA6A4F13705DB4DD9996D97FDE40CE6C74E169DDF168FD4` | Portable zero-install zip edition |
| `xrar-gui.exe` | ~25.0 MB | `61A264065C685B288BF983C65FEE59D2A6E6856A5C27373FB7494EBEFAC65F07` | Standalone Desktop UI (Tauri 2 + WebView2) |
| `xrar-cli.exe` | ~4.6 MB | `143868D86F14C6498C7875ED9C2BB195308D6BA2643040BFC53665279E565F38` | High-speed Command-Line Archiving Engine |
| `xrar-sfx.exe` | ~3.6 MB | `7BBCB88E98FF8EEF90F12E8C7EB8FAF71422143AC607B7C136050A4ADD4D5519` | Self-Extracting Archive (SFX) bootstrap stub |

---

## 7. Sign-off & Release Readiness
* **Build Verification**: PASSED
* **Offline Operation**: CONFIRMED
* **Localhost Removal**: CONFIRMED
* **Dual Operational Modes**: IMPLEMENTED & TESTED
* **Packaging & Setup**: VERIFIED
* **Ready for Production Release**: **YES**

