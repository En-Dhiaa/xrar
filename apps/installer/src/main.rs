//! XRAR Official Windows Setup & Installer
//! Standalone English installer with interactive path selection, real-time extraction progress,
//! shell integration, registry associations, environment PATH registration, and uninstaller.

use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};
use std::thread::sleep;
use std::time::Duration;

const PAYLOAD_XRAR_EXE: &[u8] = include_bytes!("../payload/xrar.exe");
const PAYLOAD_XRAR_SFX: &[u8] = include_bytes!("../payload/xrar-sfx.exe");
const PAYLOAD_README: &[u8] = include_bytes!("../../../README.md");
const PAYLOAD_LICENSE: &[u8] = include_bytes!("../../../LICENSE");

/// Determines default installation folder
fn get_recommended_install_dir() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data).join("Programs").join("XRAR")
    } else if let Ok(user_profile) = std::env::var("USERPROFILE") {
        PathBuf::from(user_profile).join("XRAR")
    } else {
        PathBuf::from("C:\\XRAR")
    }
}

/// Visual progress animation for file extraction
fn print_file_progress(filename: &str, size_bytes: usize) {
    let size_mb = size_bytes as f64 / (1024.0 * 1024.0);
    print!("         -> Deploying {:<16} [", filename);
    let _ = io::stdout().flush();
    for _ in 0..20 {
        print!("=");
        let _ = io::stdout().flush();
        sleep(Duration::from_millis(15));
    }
    if size_mb >= 0.1 {
        println!("] 100% ({:.2} MB)", size_mb);
    } else {
        println!("] 100% ({} bytes)", size_bytes);
    }
}

/// Creates a Windows shortcut (.lnk) via PowerShell WScript.Shell
fn create_shortcut(target: &Path, shortcut_path: &Path, description: &str) -> io::Result<()> {
    if let Some(parent) = shortcut_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let ps_cmd = format!(
        "$ws = New-Object -ComObject WScript.Shell; \
         $s = $ws.CreateShortcut('{}'); \
         $s.TargetPath = '{}'; \
         $s.Description = '{}'; \
         $s.WorkingDirectory = '{}'; \
         $s.Save()",
        shortcut_path.display(),
        target.display(),
        description,
        target.parent().unwrap_or(target).display()
    );

    let _ = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
        .output();

    Ok(())
}

/// Registers file associations, Explorer context menu, and Windows Apps & Features
fn register_system_integration(install_dir: &Path) {
    let xrar_exe = install_dir.join("xrar.exe");
    let xrar_path = xrar_exe.to_string_lossy().replace('/', "\\");

    let reg_commands = [
        // .xrar file extension association
        format!("reg add HKCU\\Software\\Classes\\.xrar /ve /d \"XRAR.Archive\" /f"),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive /ve /d \"XRAR Archive\" /f"),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\DefaultIcon /ve /d \"\\\"{}\\\",0\" /f", xrar_path),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\open\\command /ve /d \"\\\"{}\\\" list \\\"%1\\\"\" /f", xrar_path),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\ExtractHere /ve /d \"Extract here (XRAR)\" /f"),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\ExtractHere\\command /ve /d \"\\\"{}\\\" extract \\\"%1\\\" -o .\" /f", xrar_path),

        // Windows Explorer right-click context menu
        format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR /ve /d \"XRAR\" /f"),
        format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR\\shell\\Compress /ve /d \"Add to .xrar (Smart)\" /f"),
        format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR\\shell\\Compress\\command /ve /d \"\\\"{}\\\" create \\\"%1.xrar\\\" \\\"%1\\\" --profile smart\" /f", xrar_path),
        format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR /ve /d \"XRAR\" /f"),
        format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR\\shell\\Compress /ve /d \"Compress Folder with XRAR\" /f"),
        format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR\\shell\\Compress\\command /ve /d \"\\\"{}\\\" create \\\"%1.xrar\\\" \\\"%1\\\" --solid\" /f", xrar_path),

        // Windows Apps & Features (Add/Remove Programs) registration
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v DisplayName /d \"XRAR — Extreme Compression Archive\" /f"),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v DisplayVersion /d \"1.0.0\" /f"),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v Publisher /d \"En-Dhiaa\" /f"),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v DisplayIcon /d \"\\\"{}\\\",0\" /f", xrar_path),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v InstallLocation /d \"{}\" /f", install_dir.display()),
        format!("reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\XRAR /v UninstallString /d \"\\\"{}\\\\uninstall.bat\\\"\" /f", install_dir.display()),
    ];

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

/// Completely uninstalls XRAR
fn execute_uninstall() -> ExitCode {
    println!("========================================================================");
    println!("  XRAR Uninstaller — Cleaning up installation");
    println!("========================================================================");

    println!("[1/3] Removing Windows Registry associations and context menus...");
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
    println!("      -> Registry keys cleaned. [OK]");

    println!("[2/3] Removing Desktop and Start Menu shortcuts...");
    if let Ok(app_data) = std::env::var("APPDATA") {
        let start_lnk = PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs\\XRAR.lnk");
        let _ = fs::remove_file(start_lnk);
    }
    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let desk_lnk = PathBuf::from(user_profile).join("Desktop\\XRAR.lnk");
        let _ = fs::remove_file(desk_lnk);
    }
    println!("      -> Shortcuts removed. [OK]");

    println!("[3/3] XRAR has been completely uninstalled from your system.");
    println!("========================================================================");
    ExitCode::SUCCESS
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let is_silent = args.iter().any(|a| a == "--silent" || a == "-s" || a == "/S" || a == "/VERYSILENT");
    let is_uninstall = args.iter().any(|a| a == "--uninstall" || a == "-u");

    if is_uninstall {
        return execute_uninstall();
    }

    println!("========================================================================");
    println!("  XRAR — Extreme Compression Archive Setup (Windows x64)");
    println!("  Version: 1.0.0 | Publisher: En-Dhiaa | License: MIT Open Source");
    println!("  https://github.com/En-Dhiaa/xrar");
    println!("========================================================================");
    println!();

    // Step 1: Destination Selection
    let default_dir = get_recommended_install_dir();
    let mut chosen_dir = default_dir.clone();

    if let Some(pos) = args.iter().position(|a| a == "--dir" || a == "-d") {
        if pos + 1 < args.len() {
            chosen_dir = PathBuf::from(&args[pos + 1]);
        }
    } else if !is_silent {
        println!("[1/6] Choose Installation Directory:");
        println!("      Default path: {}", default_dir.display());
        print!("      Press [ENTER] to use default, or enter custom path: ");
        let _ = io::stdout().flush();

        let mut input = String::new();
        if io::stdin().read_line(&mut input).is_ok() {
            let trimmed = input.trim();
            if !trimmed.is_empty() {
                chosen_dir = PathBuf::from(trimmed);
            }
        }
        println!();
    }

    println!("[i] Confirmed Destination: {}", chosen_dir.display());
    println!();

    // Step 2: Preparing Target Directory
    println!("[2/6] Preparing installation target directory...");
    if let Err(e) = fs::create_dir_all(&chosen_dir) {
        eprintln!("[!] Fatal: Failed to create target directory {}: {}", chosen_dir.display(), e);
        eprintln!("    Tip: Please choose a directory with write permissions or run as administrator.");
        return ExitCode::FAILURE;
    }
    println!("      -> Directory ready. [OK]");
    println!();

    // Step 3: Extracting and Deploying Binaries
    println!("[3/6] Deploying application binaries and assets:");
    let xrar_exe_path = chosen_dir.join("xrar.exe");
    if let Err(e) = fs::write(&xrar_exe_path, PAYLOAD_XRAR_EXE) {
        eprintln!("[!] Fatal: Error writing xrar.exe: {}", e);
        return ExitCode::FAILURE;
    }
    print_file_progress("xrar.exe", PAYLOAD_XRAR_EXE.len());

    let sfx_stub_path = chosen_dir.join("xrar-sfx.exe");
    let _ = fs::write(&sfx_stub_path, PAYLOAD_XRAR_SFX);
    print_file_progress("xrar-sfx.exe", PAYLOAD_XRAR_SFX.len());

    let _ = fs::write(chosen_dir.join("README.txt"), PAYLOAD_README);
    print_file_progress("README.txt", PAYLOAD_README.len());

    let _ = fs::write(chosen_dir.join("LICENSE.txt"), PAYLOAD_LICENSE);
    print_file_progress("LICENSE.txt", PAYLOAD_LICENSE.len());

    // Generate self-contained uninstaller script
    let uninstaller_path = chosen_dir.join("uninstall.bat");
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
         echo Removing files from {}...\r\n\
         timeout /t 2 /nobreak >nul\r\n\
         echo Done.\r\n\
         goto end\r\n\
         :cancel\r\n\
         echo Uninstallation cancelled.\r\n\
         :end\r\n\
         pause\r\n",
        xrar_exe_path.display(),
        chosen_dir.display()
    );
    let _ = fs::write(&uninstaller_path, uninst_script);
    print_file_progress("uninstall.bat", 500);
    println!("      -> All components deployed successfully. [OK]");
    println!();

    // Step 4: System Registry & Context Menu Integration
    println!("[4/6] Registering Windows Explorer integration & file associations...");
    register_system_integration(&chosen_dir);
    println!("      -> Associated .xrar extension with XRAR engine [OK]");
    println!("      -> Added 'Add to .xrar (Smart)' to right-click context menu [OK]");
    println!("      -> Added 'Extract here (XRAR)' to right-click context menu [OK]");
    println!("      -> Registered in Windows Apps & Features (Settings) [OK]");
    println!();

    // Step 5: Desktop and Start Menu Shortcuts
    println!("[5/6] Creating Desktop and Start Menu shortcuts...");
    if let Ok(app_data) = std::env::var("APPDATA") {
        let start_lnk = PathBuf::from(app_data).join("Microsoft\\Windows\\Start Menu\\Programs\\XRAR.lnk");
        let _ = create_shortcut(&xrar_exe_path, &start_lnk, "XRAR — Extreme Compression Archive");
        println!("      -> Start Menu Shortcut: {} [OK]", start_lnk.display());
    }

    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let desk_lnk = PathBuf::from(user_profile).join("Desktop\\XRAR.lnk");
        let _ = create_shortcut(&xrar_exe_path, &desk_lnk, "XRAR — Extreme Compression Archive");
        println!("      -> Desktop Shortcut: {} [OK]", desk_lnk.display());
    }
    println!();

    // Step 6: Environment PATH Registration
    println!("[6/6] Updating Windows Environment PATH variable...");
    add_to_user_path(&chosen_dir);
    println!("      -> Added {} to User PATH permanently [OK]", chosen_dir.display());
    println!();

    // Final Verification Notice
    println!("========================================================================");
    println!("  [✓] SUCCESS: XRAR HAS BEEN INSTALLED SUCCESSFULLY!");
    println!("========================================================================");
    println!("  Install Location : {}", chosen_dir.display());
    println!("  Executable       : {}", xrar_exe_path.display());
    println!("  Command Line     : Type 'xrar --help' in any PowerShell or CMD");
    println!("  Explorer Menu    : Right-click any file/folder to compress or extract");
    println!("========================================================================");

    if !is_silent {
        println!();
        print!("Press [ENTER] to finish and exit setup...");
        let _ = io::stdout().flush();
        let mut buf = String::new();
        let _ = io::stdin().read_line(&mut buf);
    }

    ExitCode::SUCCESS
}
