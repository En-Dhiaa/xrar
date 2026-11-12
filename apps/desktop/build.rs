use std::fs;
use std::path::Path;

fn main() {
    let temp_icon = std::env::temp_dir().join("xrar_icon.ico");
    let local_icon = Path::new("assets/icon.ico");
    if local_icon.exists() {
        let _ = fs::copy(local_icon, &temp_icon);
    }

    let attrs = tauri_build::Attributes::new().windows_attributes(
        tauri_build::WindowsAttributes::new().window_icon_path(temp_icon)
    );

    tauri_build::try_build(attrs).expect("failed to run tauri-build");
}
