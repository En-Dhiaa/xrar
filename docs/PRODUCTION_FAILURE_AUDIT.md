# XRAR Production Failure Audit & Architectural Diagnosis

**Document Version:** 2.0.0  
**Date:** 2026-11-12  
**Auditor:** Principal Windows Desktop Systems Architect & Release Engineer  
**Status:** Root Cause Identified & Proven via Source & Process Traces  

---

## 1. Executive Summary

Following installation of XRAR v1.0.0, users reported that launching the application or setup wizard failed with a Windows error dialog displaying:

```text
127.0.0.1 refused to connect
ERR_CONNECTION_REFUSED
```

This audit provides a factual, non-speculative diagnosis of the failure mechanisms, exact files responsible, lifecycle flaws, and the required corrections to transition XRAR to a robust, self-contained native desktop architecture.

---

## 2. Root Cause Analysis (Proven by Source Code and Process Lifecycle)

### Root Cause 1: Subprocess Lifetime Race Condition in `apps/desktop/src/main.rs` & `apps/installer/src/main.rs`

In `apps/desktop/src/main.rs` (lines 118–192) and `apps/installer/src/main.rs` (lines 391–450):
1. The application bound a temporary loopback TCP listener on `127.0.0.1:0` (ephemeral port).
2. It launched Microsoft Edge via `Command::new(&browser_exe).args(["--app=http://127.0.0.1:PORT", ...]).spawn()`.
3. It immediately called `child.wait()`.

**The Failure Mechanism in Windows:**
Microsoft Edge (`msedge.exe`) operates as a multi-process, single-instance browser. Whenever an instance of `msedge.exe` is already running in the user session (or running in the background as Windows Startup Boost / background tabs):
- The newly spawned `msedge.exe` command-line process simply passes the target URL argument to the existing running Edge master process via Windows IPC.
- The spawned child process **terminates immediately with exit code 0** in less than 100 milliseconds.
- In Rust, `child.wait()` unblocks immediately upon the child's exit.
- The Rust process executes:
  ```rust
  running.store(false, Ordering::Relaxed);
  ExitCode::SUCCESS
  ```
- The `xrar-gui.exe` (or `xrar-setup.exe`) process immediately shuts down and drops the `TcpListener`.
- When the actual Edge browser window attempts to perform the initial HTTP GET request to `http://127.0.0.1:PORT`, the socket is already closed because the server has terminated.
- Edge displays: `127.0.0.1 refused to connect` (`ERR_CONNECTION_REFUSED`).

---

### Root Cause 2: Fragile External Browser Dependency & Network Sandboxing

The v1.0.0 desktop launcher did not host a true embedded web view within its own process window. Instead, it attempted to launch an external browser process (`msedge.exe` with `--app=...`).

This introduced critical failure vectors:
1. **Windows Loopback Exemption & AppContainer Restrictions**: Windows UWP / sandboxed browser processes frequently block loopback connections (`127.0.0.1`) by default without special loopback exemptions.
2. **Local Proxy & VPN Interference**: Corporate and personal VPNs, PAC scripts, or system proxy configurations frequently route or intercept `127.0.0.1` traffic, returning connection refused or proxy errors.
3. **Local Firewall Rules**: Third-party firewalls and Windows Defender periodically pop up alerts or block ephemeral inbound ports.
4. **Hardcoded Asset Hashing**: In `apps/desktop/src/main.rs`, Vite output bundle filenames (`index-DwW66Z_N.js` and `index-DJvC3-Je.css`) were hardcoded string constants using `include_bytes!`. Any change in the frontend source code that modified the Vite hash caused compilation breakage.

---

### Root Cause 3: Toolchain Missing `dlltool.exe` in User PATH

In previous packaging runs, Cargo checks on desktop crates relying on Windows raw-dylib failed with:
```text
error: error calling dlltool 'dlltool.exe': program not found
error: could not compile `parking_lot_core`
```
**Diagnosis:** The GNU toolchain required MinGW `dlltool.exe` for linking Windows system libraries. While `C:\msys64\mingw64\bin\dlltool.exe` existed on disk, it was missing from the User `PATH` environment variable.

---

## 3. Reproduction Steps

1. Build XRAR v1.0.0 release binaries.
2. Ensure Microsoft Edge is running in the background on Windows 10/11 (default Windows state).
3. Execute `xrar-gui.exe` (or `xrar.exe` without CLI arguments).
4. Observe that `xrar-gui.exe` spawns `msedge.exe --app=http://127.0.0.1:<port>`.
5. Observe in Task Manager that `xrar-gui.exe` exits immediately.
6. Observe that the opened Edge window shows:
   ```text
   This site can’t be reached
   127.0.0.1 refused to connect.
   Try:
   • Checking the connection
   • Checking the proxy and the firewall
   ERR_CONNECTION_REFUSED
   ```

---

## 4. Failed Components Summary

| Component | Responsible File | Flaw Description |
| :--- | :--- | :--- |
| **Desktop Launcher** | `apps/desktop/src/main.rs` | Local HTTP server on `127.0.0.1` with child process lifetime race condition; hardcoded Vite bundle file hashes |
| **CLI Fallback** | `apps/cli/src/main.rs` | Spawns `xrar-gui.exe` without checking lifecycle or errors |
| **Installer Setup** | `apps/installer/src/main.rs` | Spawns external Edge instance over temporary loopback port with premature exit on child delegation |
| **Frontend Config** | `frontend/vite.config.ts` | Configured with `port: 1420` development server settings instead of self-contained local packaging |
| **Build Scripts** | `scripts/build_portable.ps1` | Did not automate clean build verification or frontend sync |

---

## 5. Architectural Corrections & Strategy

To eliminate all localhost dependencies and guarantee production reliability, the following architectural changes are mandated:

### 1. Eliminate Localhost and Ephemeral HTTP Servers for Production
- The production application **must never** open `127.0.0.1` or bind a TCP socket to display the UI.
- Use **Tauri 2 (or native WebView2)** where web assets are embedded directly into the application binary or loaded through a custom local protocol (`asset://` or `tauri://localhost`).
- The application window is managed directly by the Rust executable's window event loop. When the window is open, the process is alive; when closed, the process terminates.

### 2. Native IPC Architecture
- Replace HTTP REST endpoints (`/api/create`, `/api/extract`, `/api/test`, `/api/benchmark`) with native IPC commands (`invoke`).
- Front-to-back calls execute within the process via typed IPC messages directly into `xrar-core`.

### 3. Native Startup & Logging Architecture
- Implement structured initialization logging in `%LOCALAPPDATA%\XRAR\Logs\startup.log`.
- Provide graceful native error message boxes (`rfd` or Win32 message boxes) if WebView2 runtime is missing or corrupted, providing direct download and repair options.

### 4. Self-Contained Desktop Installer
- Package production frontend assets (`frontend/dist/`).
- Package standalone native executables with proper embedded icons and Windows subsystem flags (`#![windows_subsystem = "windows"]`).
- Automatically detect and verify the WebView2 runtime on target systems.

---

## 6. Verification Strategy

1. **Compilation Verification**:
   - `cargo clippy --workspace --all-targets` with zero warnings/errors.
   - `cargo test --workspace` with 100% pass rate.
2. **Direct Process Execution**:
   - Run `xrar-gui.exe` directly from PowerShell and Explorer without any development server or background terminal.
   - Verify that the window renders with the full WinRAR-style interface.
   - Verify in Sysinternals TCPView / `netstat -ano` that NO localhost TCP port is opened or required.
3. **Full Installation Test**:
   - Install via `XRAR-Setup-x64.exe` to `%LOCALAPPDATA%\Programs\XRAR`.
   - Launch from Start Menu and Desktop shortcuts.
   - Verify archive creation, extraction, and integrity testing directly from the UI.

