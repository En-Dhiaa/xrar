//! XRAR Official Windows Graphical Setup & Installer
//! Real English graphical installation wizard with interactive path picker,
//! progress bar, shell integration, file associations, environment PATH, and uninstaller.

use std::fs;
use std::io::{self, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitCode};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const PAYLOAD_XRAR_EXE: &[u8] = include_bytes!("../payload/xrar.exe");
const PAYLOAD_XRAR_GUI: &[u8] = include_bytes!("../payload/xrar-gui.exe");
const PAYLOAD_XRAR_SFX: &[u8] = include_bytes!("../payload/xrar-sfx.exe");
const PAYLOAD_ICON_ICO: &[u8] = include_bytes!("../payload/icon.ico");
const PAYLOAD_ICON_PNG: &[u8] = include_bytes!("../payload/icon.png");
const PAYLOAD_README: &[u8] = include_bytes!("../../../README.md");
const PAYLOAD_LICENSE: &[u8] = include_bytes!("../../../LICENSE");
const WIZARD_HTML: &[u8] = include_bytes!("wizard.html");

/// Determines default installation folder
fn get_recommended_install_dir() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data).join("Programs").join("XRAR")
    } else if let Ok(user_profile) = std::env::var("USERPROFILE") {
        PathBuf::from(user_profile).join("XRAR")
    } else {
        PathBuf::from("C:\\Program Files\\XRAR")
    }
}

/// Creates a Windows shortcut (.lnk) with custom icon via PowerShell WScript.Shell
fn create_shortcut(target: &Path, shortcut_path: &Path, icon_path: &Path, description: &str) -> io::Result<()> {
    if let Some(parent) = shortcut_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let ps_cmd = format!(
        "$ws = New-Object -ComObject WScript.Shell; \
         $s = $ws.CreateShortcut('{}'); \
         $s.TargetPath = '{}'; \
         $s.IconLocation = '{},0'; \
         $s.Description = '{}'; \
         $s.WorkingDirectory = '{}'; \
         $s.Save()",
        shortcut_path.display(),
        target.display(),
        icon_path.display(),
        description,
        target.parent().unwrap_or(target).display()
    );

    let _ = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
        .output();

    Ok(())
}

/// Registers file associations, Explorer context menu, and Windows Apps & Features
fn register_system_integration(install_dir: &Path, associate_xrar: bool, context_menu: bool) {
    let xrar_gui = install_dir.join("xrar-gui.exe");
    let xrar_cli = install_dir.join("xrar.exe");
    let icon_ico = install_dir.join("icon.ico");

    let gui_path = xrar_gui.to_string_lossy().replace('/', "\\");
    let cli_path = xrar_cli.to_string_lossy().replace('/', "\\");
    let icon_path = icon_ico.to_string_lossy().replace('/', "\\");

    let mut reg_commands = Vec::new();

    if associate_xrar {
        reg_commands.extend([
            format!("reg add HKCU\\Software\\Classes\\.xrar /ve /d \"XRAR.Archive\" /f"),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Archive /ve /d \"XRAR Archive\" /f"),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\DefaultIcon /ve /d \"\\\"{}\\\",0\" /f", icon_path),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\open /ve /d \"Open with XRAR\" /f"),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\open\\command /ve /d \"\\\"{}\\\" \\\"%1\\\"\" /f", gui_path),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\ExtractHere /ve /d \"Extract here (XRAR)\" /f"),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\ExtractHere\\command /ve /d \"\\\"{}\\\" extract \\\"%1\\\" -o .\" /f", cli_path),
        ]);
    }

    if context_menu {
        reg_commands.extend([
            format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR /ve /d \"XRAR\" /f"),
            format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR /v Icon /d \"\\\"{}\\\",0\" /f", icon_path),
            format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR\\shell\\Compress /ve /d \"Add to .xrar (Smart)\" /f"),
            format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR\\shell\\Compress\\command /ve /d \"\\\"{}\\\" create \\\"%1.xrar\\\" \\\"%1\\\" --profile smart\" /f", cli_path),
            format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR /ve /d \"XRAR\" /f"),
            format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR /v Icon /d \"\\\"{}\\\",0\" /f", icon_path),
            format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR\\shell\\Compress /ve /d \"Compress Folder with XRAR\" /f"),
            format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR\\shell\\Compress\\command /ve /d \"\\\"{}\\\" create \\\"%1.xrar\\\" \\\"%1\\\" --solid\" /f", cli_path),
        ]);
    }

    // Windows Apps & Features registration
    reg_commands.extend([
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v DisplayName /d \"XRAR — Extreme Compression Archive\" /f"),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v DisplayVersion /d \"1.0.0\" /f"),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v Publisher /d \"En-Dhiaa\" /f"),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v DisplayIcon /d \"\\\"{}\\\",0\" /f", icon_path),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v InstallLocation /d \"{}\" /f", install_dir.display()),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v UninstallString /d \"\\\"{}\\\\uninstall.bat\\\"\" /f", install_dir.display()),
    ]);

    for cmd in &reg_commands {
        let _ = Command::new("cmd").args(["/c", cmd]).output();
    }
}

/// Permanently appends install_dir to User PATH
fn add_to_user_path(install_dir: &Path) {
    let install_dir_str = install_dir.to_string_lossy().to_string();
    let ps_cmd = format!(
        "$dir = '{}'; \
         $current = [Environment]::GetEnvironmentVariable('PATH', 'User'); \
         if ($current -notlike ('*' + $dir + '*')) {{ \
             [Environment]::SetEnvironmentVariable('PATH', ($current + ';' + $dir), 'User'); \
         }}",
        install_dir_str
    );

    let _ = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
        .output();
}

/// Performs complete deployment of all payload binaries and configuration
fn perform_deployment(
    target_dir: &Path,
    associate_xrar: bool,
    context_menu: bool,
    desktop_shortcut: bool,
    start_menu: bool,
    update_path: bool,
) -> Result<(), String> {
    if let Err(e) = fs::create_dir_all(target_dir) {
        return Err(format!("Failed to create destination directory: {}", e));
    }

    let xrar_exe = target_dir.join("xrar.exe");
    let xrar_gui = target_dir.join("xrar-gui.exe");
    let xrar_sfx = target_dir.join("xrar-sfx.exe");
    let icon_ico = target_dir.join("icon.ico");
    let icon_png = target_dir.join("icon.png");

    let _ = fs::write(&xrar_exe, PAYLOAD_XRAR_EXE);
    let _ = fs::write(&xrar_gui, PAYLOAD_XRAR_GUI);
    let _ = fs::write(&xrar_sfx, PAYLOAD_XRAR_SFX);
    let _ = fs::write(&icon_ico, PAYLOAD_ICON_ICO);
    let _ = fs::write(&icon_png, PAYLOAD_ICON_PNG);
    let _ = fs::write(target_dir.join("README.txt"), PAYLOAD_README);
    let _ = fs::write(target_dir.join("LICENSE.txt"), PAYLOAD_LICENSE);

    // Create self-contained uninstaller script
    let uninstaller_path = target_dir.join("uninstall.bat");
    let uninst_script = format!(
        "@echo off\r\n\
         title XRAR Uninstaller\r\n\
         echo ========================================================\r\n\
         echo   XRAR — Extreme Compression Archive Uninstaller\r\n\
         echo ========================================================\r\n\
         echo.\r\n\
         set /p CONFIRM=Are you sure you want to uninstall XRAR? (Y/N): \r\n\
         if /i not \"%CONFIRM%\"==\"Y\" goto cancel\r\n\
         echo.\r\n\
         echo Cleaning up system integration...\r\n\
         \"{}\" --uninstall\r\n\
         echo.\r\n\
         echo Uninstallation complete.\r\n\
         pause\r\n\
         goto end\r\n\
         :cancel\r\n\
         echo Uninstallation cancelled.\r\n\
         :end\r\n",
        xrar_exe.display()
    );
    let _ = fs::write(&uninstaller_path, uninst_script);

    // Registry & Shell Integration
    register_system_integration(target_dir, associate_xrar, context_menu);

    // Shortcuts
    if desktop_shortcut {
        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            let desk_lnk = PathBuf::from(user_profile).join("Desktop\\XRAR Archive Manager.lnk");
            let _ = create_shortcut(&xrar_gui, &desk_lnk, &icon_ico, "XRAR — Extreme Compression Archive");
        }
    }

    if start_menu {
        if let Ok(app_data) = std::env::var("APPDATA") {
            let start_lnk = PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs\\XRAR.lnk");
            let _ = create_shortcut(&xrar_gui, &start_lnk, &icon_ico, "XRAR — Extreme Compression Archive");
        }
    }

    // PATH
    if update_path {
        add_to_user_path(target_dir);
    }

    Ok(())
}

/// Completely uninstalls XRAR
fn execute_uninstall() -> ExitCode {
    println!("Cleaning up XRAR registry associations and context menus...");
    let unreg_commands = [
        "reg delete HKCU\\Software\\Classes\\.xrar /f",
        "reg delete HKCU\\Software\\Classes\\XRAR.Archive /f",
        "reg delete HKCU\\Software\\Classes\\*\\shell\\XRAR /f",
        "reg delete HKCU\\Software\\Classes\\Directory\\shell\\XRAR /f",
        "reg delete HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /f",
    ];
    for cmd in &unreg_commands {
        let _ = Command::new("cmd").args(["/c", cmd]).output();
    }

    if let Ok(app_data) = std::env::var("APPDATA") {
        let start_lnk = PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs\\XRAR.lnk");
        let _ = fs::remove_file(start_lnk);
    }
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let desk_lnk = PathBuf::from(user_profile).join("Desktop\\XRAR Archive Manager.lnk");
        let _ = fs::remove_file(desk_lnk);
    }

    println!("XRAR uninstallation completed successfully.");
    ExitCode::SUCCESS
}

/// Invokes Windows FolderBrowserDialog via PowerShell
fn open_native_folder_picker() -> Option<String> {
    let script = "[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; \
                  $f = New-Object System.Windows.Forms.FolderBrowserDialog; \
                  $f.Description = 'Select XRAR Installation Destination Folder'; \
                  if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }";
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .ok()?;
    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !path_str.is_empty() {
        Some(path_str)
    } else {
        None
    }
}

/// Handles incoming HTTP connection for graphical setup wizard
fn handle_wizard_connection(
    mut stream: TcpStream,
    installed_dir: Arc<Mutex<Option<PathBuf>>>,
) {
    let mut buffer = [0u8; 4096];
    let bytes_read = match stream.read(&mut buffer) {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let req_str = String::from_utf8_lossy(&buffer[..bytes_read]);
    let first_line = req_str.lines().next().unwrap_or("");
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    if parts.len() < 2 {
        return;
    }

    let method = parts[0];
    let uri = parts[1];

    if method == "GET" {
        let (status, content_type, body): (&str, &str, &[u8]) = if uri == "/" || uri == "/index.html" {
            ("200 OK", "text/html; charset=utf-8", WIZARD_HTML)
        } else if uri == "/icon.png" || uri == "/favicon.ico" {
            ("200 OK", "image/png", PAYLOAD_ICON_PNG)
        } else if uri == "/api/default_dir" {
            let default_dir = get_recommended_install_dir();
            let json = format!("{{\"path\":\"{}\"}}", default_dir.to_string_lossy().replace('\\', "\\\\"));
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                json.len()
            );
            let _ = stream.write_all(header.as_bytes());
            let _ = stream.write_all(json.as_bytes());
            return;
        } else if uri == "/api/browse" {
            let chosen = open_native_folder_picker().unwrap_or_default();
            let json = format!("{{\"selected\":\"{}\"}}", chosen.replace('\\', "\\\\"));
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                json.len()
            );
            let _ = stream.write_all(header.as_bytes());
            let _ = stream.write_all(json.as_bytes());
            return;
        } else {
            ("404 Not Found", "text/plain", b"Not Found")
        };

        let header = format!(
            "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
            status, content_type, body.len()
        );
        let _ = stream.write_all(header.as_bytes());
        let _ = stream.write_all(body);
        return;
    }

    if method == "POST" {
        if uri == "/api/install" {
            // Find JSON body
            let body = if let Some(idx) = req_str.find("\r\n\r\n") {
                &req_str[idx + 4..]
            } else {
                ""
            };

            let target_dir = if let Some(start) = body.find("\"target_dir\":\"") {
                let rest = &body[start + 14..];
                if let Some(end) = rest.find('\"') {
                    rest[..end].replace("\\\\", "\\")
                } else {
                    get_recommended_install_dir().to_string_lossy().to_string()
                }
            } else {
                get_recommended_install_dir().to_string_lossy().to_string()
            };

            let path = PathBuf::from(target_dir);
            match perform_deployment(&path, true, true, true, true, true) {
                Ok(_) => {
                    let mut lock = installed_dir.lock().unwrap();
                    *lock = Some(path.clone());
                    let resp = b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"success\":true}";
                    let _ = stream.write_all(resp);
                }
                Err(e) => {
                    let json = format!("{{\"success\":false,\"error\":\"{}\"}}", e.replace('\"', "\\\""));
                    let header = format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                        json.len()
                    );
                    let _ = stream.write_all(header.as_bytes());
                    let _ = stream.write_all(json.as_bytes());
                }
            }
            return;
        }

        if uri == "/api/launch_app" {
            let lock = installed_dir.lock().unwrap();
            if let Some(ref dir) = *lock {
                let gui_exe = dir.join("xrar-gui.exe");
                let _ = Command::new(&gui_exe).spawn();
            }
            let resp = b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"launched\":true}";
            let _ = stream.write_all(resp);
            return;
        }
    }
}

/// Runs the modern graphical setup wizard window
fn run_gui_setup_wizard() -> ExitCode {
    let listener = match TcpListener::bind("127.0.0.1:0") {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind setup server: {}", e);
            return ExitCode::FAILURE;
        }
    };

    let port = match listener.local_addr() {
        Ok(addr) => addr.port(),
        Err(_) => return ExitCode::FAILURE,
    };

    let wizard_url = format!("http://127.0.0.1:{}", port);
    let installed_dir = Arc::new(Mutex::new(None));
    let installed_dir_clone = installed_dir.clone();

    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    thread::spawn(move || {
        for stream in listener.incoming() {
            if !running_clone.load(Ordering::Relaxed) {
                break;
            }
            if let Ok(stream) = stream {
                let id_clone = installed_dir_clone.clone();
                thread::spawn(move || {
                    handle_wizard_connection(stream, id_clone);
                });
            }
        }
    });

    // Check for Edge executable
    let edge_paths = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    let mut edge_exe = None;
    for p in &edge_paths {
        if Path::new(p).exists() {
            edge_exe = Some(PathBuf::from(p));
            break;
        }
    }

    let mut browser_child: Option<Child> = None;
    if let Some(exe) = edge_exe {
        let app_arg = format!("--app={}", wizard_url);
        let win_size = "--window-size=680,560";
        if let Ok(child) = Command::new(&exe)
            .args([&app_arg, win_size, "--name=XRAR Setup Wizard"])
            .spawn()
        {
            browser_child = Some(child);
        }
    }

    if browser_child.is_none() {
        let _ = Command::new("cmd")
            .args(["/c", "start", &wizard_url])
            .spawn();
    }

    if let Some(mut child) = browser_child {
        let _ = child.wait();
    } else {
        thread::sleep(Duration::from_secs(60));
    }

    running.store(false, Ordering::Relaxed);
    ExitCode::SUCCESS
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let is_silent = args.iter().any(|a| a == "--silent" || a == "-s" || a == "/S" || a == "/VERYSILENT");
    let is_uninstall = args.iter().any(|a| a == "--uninstall" || a == "-u");
    let is_cli = args.iter().any(|a| a == "--cli");

    if is_uninstall {
        return execute_uninstall();
    }

    // Default: Run modern graphical setup wizard!
    if !is_silent && !is_cli {
        return run_gui_setup_wizard();
    }

    // Silent or CLI fallback
    let default_dir = get_recommended_install_dir();
    let mut chosen_dir = default_dir.clone();

    if let Some(pos) = args.iter().position(|a| a == "--dir" || a == "-d") {
        if pos + 1 < args.len() {
            chosen_dir = PathBuf::from(&args[pos + 1]);
        }
    }

    println!("========================================================================");
    println!("  XRAR — Extreme Compression Archive Setup (Windows x64)");
    println!("  Version: 1.0.0 | Developer: En-Dhiaa | License: MIT Open Source");
    println!("========================================================================");
    println!("Deploying to: {}", chosen_dir.display());

    match perform_deployment(&chosen_dir, true, true, true, true, true) {
        Ok(_) => {
            println!("[✓] XRAR has been successfully installed to {}", chosen_dir.display());
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("[!] Installation error: {}", e);
            ExitCode::FAILURE
        }
    }
}
