//! XRAR Desktop Application
//! Production-grade Native Windows WinRAR-style Archive Manager
//! Tauri 2 + WebView2 architecture with native IPC, zero localhost sockets, and offline operation.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// Writes an entry into the local diagnostic startup log
fn log_startup(message: &str) {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let log_dir = PathBuf::from(local_app_data).join("XRAR").join("Logs");
        let _ = fs::create_dir_all(&log_dir);
        let log_file = log_dir.join("startup.log");
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_file) {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let _ = writeln!(f, "[{}] {}", timestamp, message);
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct FsItem {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_timestamp: i64,
}

/// Lists files and folders in a local filesystem directory (File Manager Mode)
#[tauri::command]
fn read_directory(path: Option<String>) -> Result<Vec<FsItem>, String> {
    let target = match path {
        Some(ref p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => {
            // Default to user profile or Downloads
            if let Ok(profile) = std::env::var("USERPROFILE") {
                PathBuf::from(profile).join("Downloads")
            } else {
                PathBuf::from("C:\\")
            }
        }
    };

    if !target.exists() {
        return Err(format!("Directory does not exist: {}", target.display()));
    }

    let read_dir = fs::read_dir(&target).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in read_dir.flatten() {
        let p = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let meta = entry.metadata().ok();
        let is_dir = meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
        let modified = meta
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        items.push(FsItem {
            name,
            path: p.to_string_lossy().to_string(),
            is_dir,
            size,
            modified_timestamp: modified,
        });
    }

    // Sort: directories first, then alphabetically
    items.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(items)
}

/// Returns list of available Windows drive letters
#[tauri::command]
fn get_drives() -> Vec<String> {
    let mut drives = Vec::new();
    for letter in b'C'..=b'Z' {
        let path = format!("{}:\\", letter as char);
        if Path::new(&path).exists() {
            drives.push(path);
        }
    }
    if drives.is_empty() {
        drives.push("C:\\".to_string());
    }
    drives
}

/// Lists contents of an archive file (Archive Manager Mode)
#[tauri::command]
fn list_archive(path: String, password: Option<String>) -> Result<xrar_core::ArchiveSummary, String> {
    log_startup(&format!("Opening archive: {}", path));
    xrar_core::raw_list(Path::new(&path), password.as_deref()).map_err(|e| e.to_string())
}

/// Creates a new archive
#[tauri::command]
fn create_archive(
    archive: String,
    files: Vec<String>,
    profile: String,
    password: Option<String>,
    solid: bool,
) -> Result<xrar_core::ArchiveSummary, String> {
    log_startup(&format!("Creating archive {} with {} files", archive, files.len()));
    let p_enum = match profile.to_lowercase().as_str() {
        "fast" => xrar_core::CompressionProfile::Fast,
        "balanced" => xrar_core::CompressionProfile::Balanced,
        "high" => xrar_core::CompressionProfile::High,
        "ultra" => xrar_core::CompressionProfile::Ultra,
        "extreme" => xrar_core::CompressionProfile::Extreme,
        _ => xrar_core::CompressionProfile::Smart,
    };
    let path_bufs: Vec<PathBuf> = files.into_iter().map(PathBuf::from).collect();
    xrar_core::create_xrar(
        Path::new(&archive),
        &path_bufs,
        p_enum,
        password.as_deref(),
        solid,
    )
    .map_err(|e| e.to_string())
}

/// Extracts an archive to destination
#[tauri::command]
fn extract_archive(
    archive: String,
    destination: String,
    password: Option<String>,
) -> Result<usize, String> {
    log_startup(&format!("Extracting archive {} to {}", archive, destination));
    xrar_core::raw_extract(
        Path::new(&archive),
        Path::new(&destination),
        password.as_deref(),
    )
    .map_err(|e| e.to_string())
}

/// Tests archive block integrity
#[tauri::command]
fn test_archive(archive: String, password: Option<String>) -> Result<xrar_core::TestResult, String> {
    log_startup(&format!("Testing archive {}", archive));
    xrar_core::raw_test(Path::new(&archive), password.as_deref()).map_err(|e| e.to_string())
}

/// Runs compression benchmark
#[tauri::command]
fn run_benchmark(size_mb: usize) -> Result<xrar_core::BenchmarkReport, String> {
    xrar_core::raw_benchmark(size_mb).map_err(|e| e.to_string())
}

/// Finds duplicate files in a directory
#[tauri::command]
fn find_duplicates(dir: String) -> Result<Vec<xrar_core::DuplicateFileGroup>, String> {
    xrar_core::find_duplicates(Path::new(&dir)).map_err(|e| e.to_string())
}

/// Converts an archive (RAR, ZIP, TAR) to XRAR
#[tauri::command]
fn convert_archive(
    source: String,
    dest: String,
    profile: String,
    password: Option<String>,
) -> Result<xrar_core::ArchiveSummary, String> {
    let p_enum = match profile.to_lowercase().as_str() {
        "fast" => xrar_core::CompressionProfile::Fast,
        "balanced" => xrar_core::CompressionProfile::Balanced,
        "high" => xrar_core::CompressionProfile::High,
        "ultra" => xrar_core::CompressionProfile::Ultra,
        "extreme" => xrar_core::CompressionProfile::Extreme,
        _ => xrar_core::CompressionProfile::Smart,
    };
    xrar_core::convert_to_xrar(
        Path::new(&source),
        Path::new(&dest),
        p_enum,
        password.as_deref(),
    )
    .map_err(|e| e.to_string())
}

/// Safely previews text/code files
#[tauri::command]
fn read_file_preview(path: String, max_bytes: Option<usize>) -> Result<String, String> {
    let limit = max_bytes.unwrap_or(65536);
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    use std::io::Read;
    file.take(limit as u64)
        .read_to_end(&mut buffer)
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&buffer).to_string())
}

/// Native folder selection dialog
#[tauri::command]
fn browse_folder() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

/// Native multi-file selection dialog
#[tauri::command]
fn browse_files() -> Vec<String> {
    rfd::FileDialog::new()
        .pick_files()
        .unwrap_or_default()
        .into_iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect()
}

/// Native open archive file dialog
#[tauri::command]
fn browse_archive_file() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("Archive Files", &["xrar", "zip", "rar", "7z", "tar", "iso"])
        .add_filter("XRAR Archive (*.xrar)", &["xrar"])
        .add_filter("All Files (*.*)", &["*"])
        .pick_file()
        .map(|p| p.to_string_lossy().to_string())
}

/// Native save archive file dialog
#[tauri::command]
fn browse_save_archive() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("XRAR Archive (*.xrar)", &["xrar"])
        .add_filter("ZIP Archive (*.zip)", &["zip"])
        .add_filter("7-Zip Archive (*.7z)", &["7z"])
        .save_file()
        .map(|p| p.to_string_lossy().to_string())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct PdfIntegrationStatus {
    pub file_association: bool,
    pub preview_handler: bool,
    pub thumbnail_provider: bool,
    pub context_menu: bool,
}

/// Reads binary PDF bytes from filesystem
#[tauri::command]
fn read_pdf_bytes(path: String) -> Result<Vec<u8>, String> {
    log_startup(&format!("Reading PDF document bytes: {}", path));
    fs::read(&path).map_err(|e| format!("Failed to read PDF file '{}': {}", path, e))
}

/// Saves modified or rotated PDF bytes to disk
#[tauri::command]
fn save_pdf_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    log_startup(&format!("Saving PDF document ({} bytes) to: {}", data.len(), path));
    fs::write(&path, &data).map_err(|e| format!("Failed to write PDF file '{}': {}", path, e))
}

/// Native PDF file picker dialog
#[tauri::command]
fn browse_pdf_file() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("PDF Documents (*.pdf)", &["pdf"])
        .add_filter("All Files (*.*)", &["*"])
        .pick_file()
        .map(|p| p.to_string_lossy().to_string())
}

/// Native PDF save file picker dialog
#[tauri::command]
fn browse_save_pdf() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("PDF Documents (*.pdf)", &["pdf"])
        .save_file()
        .map(|p| p.to_string_lossy().to_string())
}

/// Registers PDF file associations, Windows Explorer Preview Handler, and Thumbnail Provider in Registry
#[tauri::command]
fn register_pdf_associations(
    set_default: bool,
    enable_preview: bool,
    enable_thumbnails: bool,
    enable_context_menu: bool,
) -> Result<(), String> {
    let gui_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let gui_path = gui_exe.to_string_lossy().replace('/', "\\");
    let icon_path = gui_exe.with_file_name("icon.ico").to_string_lossy().replace('/', "\\");

    let mut reg_commands = Vec::new();

    if set_default {
        reg_commands.extend([
            format!("reg add HKCU\\Software\\Classes\\.pdf /ve /d \"XRAR.Pdf\" /f"),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Pdf /ve /d \"PDF Document\" /f"),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Pdf\\DefaultIcon /ve /d \"\\\"{}\\\",0\" /f", icon_path),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Pdf\\shell\\open /ve /d \"Open with XRAR PDF Reader\" /f"),
            format!("reg add HKCU\\Software\\Classes\\XRAR.Pdf\\shell\\open\\command /ve /d \"\\\"{}\\\" \\\"%1\\\"\" /f", gui_path),
        ]);
    }

    if enable_context_menu {
        reg_commands.extend([
            format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR_Pdf /ve /d \"Open in XRAR PDF Reader\" /f"),
            format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR_Pdf /v Icon /d \"\\\"{}\\\",0\" /f", icon_path),
            format!("reg add HKCU\\Software\\Classes\\*\\shell\\XRAR_Pdf\\command /ve /d \"\\\"{}\\\" \\\"%1\\\"\" /f", gui_path),
        ]);
    }

    if enable_preview {
        reg_commands.extend([
            format!("reg add HKCU\\Software\\Classes\\.pdf\\shellex\\{{8895b1c6-b41f-4c1c-a562-0d564250836f}} /ve /d \"{{dc6ad3ee-0351-4b47-9777-94d3f322920c}}\" /f"),
        ]);
    }

    if enable_thumbnails {
        reg_commands.extend([
            format!("reg add HKCU\\Software\\Classes\\.pdf\\shellex\\{{e357fccd-a995-4576-b01f-234630154e96}} /ve /d \"{{dc6ad3ee-0351-4b47-9777-94d3f322920c}}\" /f"),
        ]);
    }

    for cmd in &reg_commands {
        let _ = std::process::Command::new("cmd").args(["/c", cmd]).output();
    }

    Ok(())
}

/// Checks current Windows PDF integration diagnostics
#[tauri::command]
fn check_pdf_integration_status() -> Result<PdfIntegrationStatus, String> {
    let check_key = |key: &str| -> bool {
        let out = std::process::Command::new("reg")
            .args(["query", key])
            .output();
        out.map(|o| o.status.success()).unwrap_or(false)
    };

    let file_association = check_key("HKCU\\Software\\Classes\\.pdf");
    let preview_handler = check_key("HKCU\\Software\\Classes\\.pdf\\shellex\\{8895b1c6-b41f-4c1c-a562-0d564250836f}");
    let thumbnail_provider = check_key("HKCU\\Software\\Classes\\.pdf\\shellex\\{e357fccd-a995-4576-b01f-234630154e96}");
    let context_menu = check_key("HKCU\\Software\\Classes\\*\\shell\\XRAR_Pdf");

    Ok(PdfIntegrationStatus {
        file_association,
        preview_handler,
        thumbnail_provider,
        context_menu,
    })
}

fn main() {
    log_startup("==================================================");
    log_startup("XRAR Desktop Application initializing");
    log_startup("Runtime: Tauri 2 + Microsoft Edge WebView2 Control");

    // Check for file path passed via command line (e.g. Open With / double-click .xrar or .pdf)
    let initial_file = std::env::args().nth(1).filter(|arg| {
        let path = Path::new(arg);
        path.exists() && !arg.starts_with('-')
    });

    if let Some(ref file_path) = initial_file {
        log_startup(&format!("Invoked with file argument: {}", file_path));
    }

    let builder = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_directory,
            get_drives,
            list_archive,
            create_archive,
            extract_archive,
            test_archive,
            run_benchmark,
            find_duplicates,
            convert_archive,
            read_file_preview,
            browse_folder,
            browse_files,
            browse_archive_file,
            browse_save_archive,
            read_pdf_bytes,
            save_pdf_bytes,
            browse_pdf_file,
            browse_save_pdf,
            register_pdf_associations,
            check_pdf_integration_status
        ])
        .setup(move |app| {
            log_startup("Tauri application setup complete. Window created.");
            if let Some(ref file_path) = initial_file {
                let is_pdf = file_path.to_lowercase().ends_with(".pdf");
                let main_window = app.get_webview_window("main");
                if let Some(win) = main_window {
                    let _ = win.eval(&format!(
                        "window.__INITIAL_FILE__ = {{ path: {}, isPdf: {} }};",
                        serde_json::to_string(file_path).unwrap_or_default(),
                        is_pdf
                    ));
                    if is_pdf {
                        let _ = win.eval(&format!(
                            "window.__INITIAL_PDF__ = {};",
                            serde_json::to_string(file_path).unwrap_or_default()
                        ));
                    } else {
                        let _ = win.eval(&format!(
                            "window.__INITIAL_ARCHIVE__ = {};",
                            serde_json::to_string(file_path).unwrap_or_default()
                        ));
                    }
                }
            }
            Ok(())
        });

    log_startup("Starting native application event loop...");
    let result = builder.run(tauri::generate_context!());
    if let Err(e) = result {
        log_startup(&format!("Fatal application error: {}", e));
        eprintln!("Fatal XRAR error: {}", e);
    }
}
