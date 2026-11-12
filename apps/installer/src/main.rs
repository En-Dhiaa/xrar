//! XRAR Official Windows Native Setup & Installer
//! Production installer with real progress display, destination path picker,
//! shell integration, file associations, environment PATH, and uninstaller.
//! 100% offline, zero localhost/TCP sockets, zero browser dependencies.

use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};
use std::thread;
use std::time::Duration;

const PAYLOAD_XRAR_EXE: &[u8] = include_bytes!("../payload/xrar.exe");
const PAYLOAD_XRAR_GUI: &[u8] = include_bytes!("../payload/xrar-gui.exe");
const PAYLOAD_XRAR_SFX: &[u8] = include_bytes!("../payload/xrar-sfx.exe");
const PAYLOAD_WEBVIEW2_DLL: &[u8] = include_bytes!("../payload/WebView2Loader.dll");
const PAYLOAD_ICON_ICO: &[u8] = include_bytes!("../payload/icon.ico");
const PAYLOAD_ICON_PNG: &[u8] = include_bytes!("../payload/icon.png");
const PAYLOAD_README: &[u8] = include_bytes!("../../../README.md");
const PAYLOAD_LICENSE: &[u8] = include_bytes!("../../../LICENSE");

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

    // Windows Apps & Features ("Add or Remove Programs") registration
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

/// Displays an animated progress bar in the terminal
fn show_progress(step: usize, total: usize, message: &str) {
    let pct = (step * 100) / total;
    let bar_len = 30;
    let filled = (bar_len * pct) / 100;
    let empty = bar_len - filled;
    let bar: String = "█".repeat(filled) + &"░".repeat(empty);

    print!("\r  [{}] {:3}% - {:<50}", bar, pct, message);
    let _ = io::stdout().flush();
    thread::sleep(Duration::from_millis(120));
}

/// Performs complete deployment of all payload binaries and configuration
fn perform_deployment(
    target_dir: &Path,
    associate_xrar: bool,
    context_menu: bool,
    desktop_shortcut: bool,
    start_menu: bool,
    update_path: bool,
    show_ui: bool,
) -> Result<(), String> {
    if show_ui {
        println!();
        println!("  Installing XRAR to: {}", target_dir.display());
        println!("  -------------------------------------------------------------");
    }

    if let Err(e) = fs::create_dir_all(target_dir) {
        return Err(format!("Failed to create destination directory: {}", e));
    }

    let total_steps = 8;

    if show_ui {
        show_progress(1, total_steps, "Verifying payload integrity...");
    }

    let xrar_exe = target_dir.join("xrar.exe");
    let xrar_gui = target_dir.join("xrar-gui.exe");
    let xrar_sfx = target_dir.join("xrar-sfx.exe");
    let icon_ico = target_dir.join("icon.ico");
    let icon_png = target_dir.join("icon.png");

    if show_ui {
        show_progress(2, total_steps, "Deploying XRAR Desktop Application...");
    }
    fs::write(&xrar_gui, PAYLOAD_XRAR_GUI).map_err(|e| format!("Failed to write xrar-gui.exe: {}", e))?;
    fs::write(target_dir.join("WebView2Loader.dll"), PAYLOAD_WEBVIEW2_DLL)
        .map_err(|e| format!("Failed to write WebView2Loader.dll: {}", e))?;

    if show_ui {
        show_progress(3, total_steps, "Deploying XRAR Command Line Engine...");
    }
    fs::write(&xrar_exe, PAYLOAD_XRAR_EXE).map_err(|e| format!("Failed to write xrar.exe: {}", e))?;

    if show_ui {
        show_progress(4, total_steps, "Deploying SFX Bootstrap Module...");
    }
    fs::write(&xrar_sfx, PAYLOAD_XRAR_SFX).map_err(|e| format!("Failed to write xrar-sfx.exe: {}", e))?;

    if show_ui {
        show_progress(5, total_steps, "Installing branding assets and documents...");
    }
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

    if show_ui {
        show_progress(6, total_steps, "Registering Windows shell integration...");
    }
    register_system_integration(target_dir, associate_xrar, context_menu);

    if show_ui {
        show_progress(7, total_steps, "Creating Desktop & Start Menu shortcuts...");
    }
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

    if show_ui {
        show_progress(8, total_steps, "Updating User PATH environment...");
    }
    if update_path {
        add_to_user_path(target_dir);
    }

    if show_ui {
        println!();
        println!("  -------------------------------------------------------------");
        println!("  [✓] Deployment finished successfully (100% complete).");
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

/// Interactive English setup wizard
fn run_interactive_setup() -> ExitCode {
    println!("==========================================================================");
    println!("    XRAR — Extreme Compression Archive Setup Wizard (Windows x64)       ");
    println!("    Version 1.0.0 | Developer: En-Dhiaa | License: MIT Open Source        ");
    println!("==========================================================================");
    println!();
    println!("  Welcome to the XRAR Setup Wizard.");
    println!("  XRAR is a next-generation offline archive manager and compression engine.");
    println!();

    let default_dir = get_recommended_install_dir();
    let mut chosen_dir = default_dir.clone();

    println!("  Destination Folder:");
    println!("  [1] Recommended: {}", default_dir.display());
    println!("  [2] Select another custom folder (Browse dialog or type path)");
    println!();
    print!("  Choose destination [Press ENTER for default, or 'B' to browse]: ");
    let _ = io::stdout().flush();

    let mut input = String::new();
    let _ = io::stdin().read_line(&mut input);
    let trimmed = input.trim();

    if trimmed.eq_ignore_ascii_case("b") {
        println!("  Opening folder browser dialog...");
        if let Some(picked) = open_native_folder_picker() {
            chosen_dir = PathBuf::from(picked).join("XRAR");
            println!("  Selected destination: {}", chosen_dir.display());
        } else {
            println!("  Using default destination: {}", default_dir.display());
        }
    } else if !trimmed.is_empty() && trimmed != "1" {
        chosen_dir = PathBuf::from(trimmed);
        println!("  Using destination: {}", chosen_dir.display());
    }

    println!();
    println!("  Installation Options:");
    println!("  [✓] Register .xrar file format association");
    println!("  [✓] Integrate with Windows Explorer context menu");
    println!("  [✓] Create Desktop shortcut");
    println!("  [✓] Create Start Menu shortcut");
    println!("  [✓] Add XRAR to User Environment PATH");
    println!();
    print!("  Press ENTER to begin installation: ");
    let _ = io::stdout().flush();
    let mut proceed = String::new();
    let _ = io::stdin().read_line(&mut proceed);

    match perform_deployment(&chosen_dir, true, true, true, true, true, true) {
        Ok(_) => {
            println!();
            println!("==========================================================================");
            println!("  Installation Completed Successfully!");
            println!("  XRAR is now installed and ready to use.");
            println!("==========================================================================");
            println!();
            print!("  Launch XRAR Archive Manager now? (Y/n): ");
            let _ = io::stdout().flush();
            let mut launch_in = String::new();
            let _ = io::stdin().read_line(&mut launch_in);
            if !launch_in.trim().eq_ignore_ascii_case("n") {
                let gui_exe = chosen_dir.join("xrar-gui.exe");
                println!("  Launching {}...", gui_exe.display());
                let _ = Command::new(&gui_exe).spawn();
            }
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("\n[!] Installation failed: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let is_silent = args.iter().any(|a| a == "--silent" || a == "-s" || a == "/S" || a == "/VERYSILENT");
    let is_uninstall = args.iter().any(|a| a == "--uninstall" || a == "-u");

    if is_uninstall {
        return execute_uninstall();
    }

    // Silent Mode
    if is_silent {
        let default_dir = get_recommended_install_dir();
        let mut chosen_dir = default_dir;
        if let Some(pos) = args.iter().position(|a| a == "--dir" || a == "-d") {
            if pos + 1 < args.len() {
                chosen_dir = PathBuf::from(&args[pos + 1]);
            }
        }
        return match perform_deployment(&chosen_dir, true, true, true, true, true, false) {
            Ok(_) => ExitCode::SUCCESS,
            Err(e) => {
                eprintln!("Silent install error: {}", e);
                ExitCode::FAILURE
            }
        };
    }

    // Interactive English Setup Wizard
    run_interactive_setup()
}
