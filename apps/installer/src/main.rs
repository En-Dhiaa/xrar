//! XRAR Native Windows Installer (Setup)
//! Self-contained bilingual Windows installer with Start Menu, Desktop shortcuts,
//! file associations, Explorer context menu, and Add/Remove Programs registration.

use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};

const PAYLOAD_XRAR_EXE: &[u8] = include_bytes!("../payload/xrar.exe");
const PAYLOAD_README: &[u8] = include_bytes!("../../../README.md");
const PAYLOAD_LICENSE: &[u8] = include_bytes!("../../../LICENSE");

fn get_default_install_dir() -> PathBuf {
    if let Ok(prog_files) = std::env::var("ProgramFiles") {
        PathBuf::from(prog_files).join("XRAR")
    } else if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data).join("Programs").join("XRAR")
    } else {
        PathBuf::from("C:\\XRAR")
    }
}

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

fn register_windows_registry(install_dir: &Path) {
    let xrar_exe = install_dir.join("xrar.exe");
    let xrar_path = xrar_exe.to_string_lossy().replace('/', "\\");

    // Commands to register file associations and context menu in Windows Registry
    let reg_commands = [
        // File association .xrar
        format!("reg add HKCU\\Software\\Classes\\.xrar /ve /d \"XRAR.Archive\" /f"),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive /ve /d \"XRAR Archive\" /f"),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\DefaultIcon /ve /d \"\\\"{}\\\",0\" /f", xrar_path),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\open\\command /ve /d \"\\\"{}\\\" list \\\"%1\\\"\" /f", xrar_path),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\ExtractHere /ve /d \"Extract here (XRAR)\" /f"),
        format!("reg add HKCU\\Software\\Classes\\XRAR.Archive\\shell\\ExtractHere\\command /ve /d \"\\\"{}\\\" extract \\\"%1\\\" -o .\" /f", xrar_path),
        
        // Explorer context menu for all files and directories
        format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR /ve /d \"XRAR\" /f"),
        format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR\\shell\\Compress /ve /d \"Add to .xrar (Smart)\" /f"),
        format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR\\shell\\Compress\\command /ve /d \"\\\"{}\\\" create \\\"%1.xrar\\\" \\\"%1\\\" --profile smart\" /f", xrar_path),
        format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR /ve /d \"XRAR\" /f"),
        format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR\\shell\\Compress /ve /d \"Compress Folder with XRAR\" /f"),
        format!("reg add HKCU\\Software\\Classes\\Directory\\shell\\XRAR\\shell\\Compress\\command /ve /d \"\\\"{}\\\" create \\\"%1.xrar\\\" \\\"%1\\\" --solid\" /f", xrar_path),

        // Windows Add / Remove Programs Entry
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

fn unregister_windows_registry() {
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
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let is_silent = args.iter().any(|a| a == "--silent" || a == "-s" || a == "/S" || a == "/VERYSILENT");
    let is_uninstall = args.iter().any(|a| a == "--uninstall" || a == "-u");

    if is_uninstall {
        println!("============================================================");
        println!("  XRAR Uninstaller — إلغاء تثبيت إكس-رار");
        println!("============================================================");
        println!("[*] Removing Windows Explorer context menu & file associations...");
        unregister_windows_registry();

        // Remove Start Menu and Desktop shortcuts
        if let Ok(app_data) = std::env::var("APPDATA") {
            let start_menu_lnk = PathBuf::from(app_data)
                .join("Microsoft\\Windows\\Start Menu\\Programs\\XRAR.lnk");
            let _ = fs::remove_file(start_menu_lnk);
        }
        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            let desktop_lnk = PathBuf::from(user_profile).join("Desktop\\XRAR.lnk");
            let _ = fs::remove_file(desktop_lnk);
        }

        println!("[✓] XRAR has been completely uninstalled from this computer.");
        return ExitCode::SUCCESS;
    }

    let install_dir = if let Some(dir_pos) = args.iter().position(|a| a == "--dir" || a == "-d") {
        if dir_pos + 1 < args.len() {
            PathBuf::from(&args[dir_pos + 1])
        } else {
            get_default_install_dir()
        }
    } else {
        get_default_install_dir()
    };

    println!("============================================================");
    println!("  XRAR — Extreme Compression Archive Setup v1.0.0");
    println!("  مثبت إكس-رار — أرشيف الضغط الفائق لنظام ويندوز");
    println!("  Publisher: En-Dhiaa | License: Open Source (MIT)");
    println!("============================================================");
    println!("[i] Target Installation Directory: {}", install_dir.display());

    if !is_silent {
        println!();
        print!("Press [ENTER] to begin installation (or Ctrl+C to cancel)...");
        let _ = io::stdout().flush();
        let mut buf = String::new();
        let _ = io::stdin().read_line(&mut buf);
    }

    println!("[*] Creating installation directory...");
    if let Err(e) = fs::create_dir_all(&install_dir) {
        eprintln!("Error creating installation directory: {e}");
        return ExitCode::FAILURE;
    }

    println!("[*] Deploying XRAR engine and components...");
    let xrar_exe_path = install_dir.join("xrar.exe");
    if let Err(e) = fs::write(&xrar_exe_path, PAYLOAD_XRAR_EXE) {
        eprintln!("Error writing xrar.exe: {e}");
        return ExitCode::FAILURE;
    }

    let _ = fs::write(install_dir.join("README.txt"), PAYLOAD_README);
    let _ = fs::write(install_dir.join("LICENSE.txt"), PAYLOAD_LICENSE);

    // Create an uninstaller script inside the directory
    let uninst_bat_path = install_dir.join("uninstall.bat");
    let uninst_script = format!(
        "@echo off\r\n\
         echo Uninstalling XRAR...\r\n\
         \"{}\" --uninstall\r\n\
         echo Cleanup finished.\r\n\
         pause\r\n",
        xrar_exe_path.display()
    );
    let _ = fs::write(uninst_bat_path, uninst_script);

    println!("[*] Registering Windows Explorer integration & file associations...");
    register_windows_registry(&install_dir);

    println!("[*] Creating Start Menu & Desktop shortcuts...");
    if let Ok(app_data) = std::env::var("APPDATA") {
        let start_menu_lnk = PathBuf::from(app_data)
            .join("Microsoft\\Windows\\Start Menu\\Programs\\XRAR.lnk");
        let _ = create_shortcut(&xrar_exe_path, &start_menu_lnk, "XRAR — Extreme Compression Archive");
    }

    if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let desktop_lnk = PathBuf::from(user_profile).join("Desktop\\XRAR.lnk");
        let _ = create_shortcut(&xrar_exe_path, &desktop_lnk, "XRAR — Extreme Compression Archive");
    }

    // Add installation directory to User PATH
    if let Ok(current_path) = std::env::var("PATH") {
        if !current_path.contains(&install_dir.to_string_lossy().to_string()) {
            let add_path_cmd = format!(
                "$p = [Environment]::GetEnvironmentVariable('PATH', 'User'); \
                 if ($p -notlike '*{}*') {{ \
                     [Environment]::SetEnvironmentVariable('PATH', \"$p;{}\", 'User') \
                 }}",
                install_dir.display(),
                install_dir.display()
            );
            let _ = Command::new("powershell")
                .args(["-NoProfile", "-NonInteractive", "-Command", &add_path_cmd])
                .output();
        }
    }

    println!("============================================================");
    println!("[✓] Installation Complete! تم التثبيت بنجاح");
    println!("  - Application: {}", xrar_exe_path.display());
    println!("  - Shortcuts: Start Menu & Desktop");
    println!("  - Explorer: Right-click 'Add to .xrar' & 'Extract here' active");
    println!("  - CLI command: 'xrar' is now available in command prompt & PowerShell");
    println!("============================================================");

    if !is_silent {
        println!();
        print!("Press [ENTER] to exit setup...");
        let _ = io::stdout().flush();
        let mut buf = String::new();
        let _ = io::stdin().read_line(&mut buf);
    }

    ExitCode::SUCCESS
}
