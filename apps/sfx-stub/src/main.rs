//! XRAR Self-Extracting Archive (SFX) Stub
//! Safely extracts embedded .xrar payload from executable without auto-execution.

use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::process::ExitCode;
use xrar_core::{raw_extract, XRAR_MAGIC};

fn find_xrar_offset(file: &mut File) -> Option<u64> {
    let file_len = file.metadata().ok()?.len();
    if file_len < 1024 {
        return None;
    }

    // Read file in 64 KiB chunks to locate the XRAR magic sequence
    let mut reader = BufReader::new(file);
    let mut buffer = [0u8; 64 * 1024];
    let mut current_offset = 0u64;

    while current_offset < file_len {
        reader.seek(SeekFrom::Start(current_offset)).ok()?;
        let bytes_read = reader.read(&mut buffer).ok()?;
        if bytes_read < 4 {
            break;
        }

        for i in 0..bytes_read - 3 {
            if &buffer[i..i + 4] == XRAR_MAGIC {
                return Some(current_offset + i as u64);
            }
        }

        current_offset += (bytes_read - 3) as u64;
    }

    None
}

fn main() -> ExitCode {
    println!("============================================================");
    println!("  XRAR Self-Extracting Archive (SFX) v1.0.0");
    println!("  Publisher: En-Dhiaa (Open Source)");
    println!("============================================================");

    let exe_path = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Error detecting executable path: {e}");
            return ExitCode::FAILURE;
        }
    };

    let mut exe_file = match File::open(&exe_path) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("Error opening SFX container: {e}");
            return ExitCode::FAILURE;
        }
    };

    println!("[i] SFX Container: {}", exe_path.display());

    let xrar_offset = match find_xrar_offset(&mut exe_file) {
        Some(off) => off,
        None => {
            eprintln!("Error: No embedded .xrar archive payload found in this SFX package.");
            return ExitCode::FAILURE;
        }
    };

    println!("[i] Embedded payload located at offset 0x{:X}", xrar_offset);

    // Default output directory: folder with the same name as the executable
    let default_dest = exe_path
        .file_stem()
        .map(|s| format!("{}_extracted", s.to_string_lossy()))
        .unwrap_or_else(|| "xrar_extracted".to_string());
    let dest_dir = PathBuf::from(&default_dest);

    println!("[i] Destination Directory: {}", dest_dir.display());

    // Prompt for password if needed or check CLI args
    let args: Vec<String> = std::env::args().collect();
    let password = if args.len() > 1 && args[1] == "-p" && args.len() > 2 {
        Some(args[2].clone())
    } else {
        None
    };

    println!("[*] Extracting contents safely...");

    // Copy embedded payload to a temporary file for safe reading
    let temp_xrar = std::env::temp_dir().join(format!("xrar_sfx_{}.xrar", std::process::id()));
    {
        if let Err(e) = exe_file.seek(SeekFrom::Start(xrar_offset)) {
            eprintln!("Seek error: {e}");
            return ExitCode::FAILURE;
        }
        let mut temp_out = match File::create(&temp_xrar) {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to create temporary archive: {e}");
                return ExitCode::FAILURE;
            }
        };
        if let Err(e) = std::io::copy(&mut exe_file, &mut temp_out) {
            eprintln!("Failed to write embedded archive stream: {e}");
            let _ = std::fs::remove_file(&temp_xrar);
            return ExitCode::FAILURE;
        }
    }

    match raw_extract(&temp_xrar, &dest_dir, password.as_deref()) {
        Ok(count) => {
            println!("============================================================");
            println!("[✓] Extraction Complete: {count} files successfully extracted.");
            println!("[✓] Destination: {}", dest_dir.display());
            println!("============================================================");
            let _ = std::fs::remove_file(&temp_xrar);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("[!] Extraction failed: {e}");
            let _ = std::fs::remove_file(&temp_xrar);
            ExitCode::FAILURE
        }
    }
}
