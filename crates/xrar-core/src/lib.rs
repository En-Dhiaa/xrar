//! XRAR Master Engine Core
//! Main facade providing unified archiving, extraction, conversion, duplicate detection, and benchmark services.

pub use xrar_archive::{
    create_xrar, extract_archive as raw_extract, list_archive as raw_list, test_archive as raw_test,
    ArchiveError, ArchiveItem, ArchiveSummary, SupportedFormat, TestResult,
};
pub use xrar_benchmark::{run_benchmark as raw_benchmark, BenchmarkReport, CodecBenchmarkResult};
pub use xrar_codecs::CodecId;
pub use xrar_compression::{calculate_entropy, CompressionProfile, SolidMode};
pub use xrar_crypto::hash_blake3;
pub use xrar_dedup::DedupIndex;
pub use xrar_extractor::{ExtractorTask, OverwriteMode, ProgressUpdate};
pub use xrar_filesystem::{normalize_archive_path, resolve_safe_extraction_path, scan_paths, ScannedFile};
pub use xrar_format::{ArchiveManifest, XrarReader, XRAR_MAGIC};

use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CoreError {
    #[error("Archive operation failed: {0}")]
    Archive(#[from] ArchiveError),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Filesystem error: {0}")]
    Fs(#[from] xrar_filesystem::FsError),
    #[error("Conversion error: {0}")]
    Conversion(String),
}

/// Duplicate file finding record
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DuplicateFileGroup {
    pub hash: String,
    pub file_size: u64,
    pub potential_savings: u64,
    pub file_paths: Vec<PathBuf>,
}

/// Scans a directory to detect duplicate files by size and BLAKE3 hash
pub fn find_duplicates(dir: &Path) -> Result<Vec<DuplicateFileGroup>, CoreError> {
    let scanned = scan_paths(&[dir.to_path_buf()])?;
    let mut size_map: HashMap<u64, Vec<PathBuf>> = HashMap::new();

    // Pass 1: Group files by file length
    for file in scanned {
        if !file.is_dir && file.uncompressed_size > 0 {
            size_map.entry(file.uncompressed_size).or_default().push(file.absolute_path);
        }
    }

    let mut hash_map: HashMap<String, Vec<PathBuf>> = HashMap::new();

    // Pass 2: For sizes with > 1 file, compute BLAKE3 hash
    for (size, paths) in size_map {
        if paths.len() > 1 {
            for p in paths {
                if let Ok(mut f) = File::open(&p) {
                    let mut buf = Vec::with_capacity(size as usize);
                    if f.read_to_end(&mut buf).is_ok() {
                        let digest = hash_blake3(&buf);
                        let hex = hex_encode(digest);
                        hash_map.entry(hex).or_default().push(p);
                    }
                }
            }
        }
    }

    // Filter groups where duplicate count > 1
    let mut groups = Vec::new();
    for (hash, paths) in hash_map {
        if paths.len() > 1 {
            let file_size = std::fs::metadata(&paths[0]).map(|m| m.len()).unwrap_or(0);
            let savings = file_size * (paths.len() as u64 - 1);
            groups.push(DuplicateFileGroup {
                hash,
                file_size,
                potential_savings: savings,
                file_paths: paths,
            });
        }
    }

    groups.sort_by(|a, b| b.potential_savings.cmp(&a.potential_savings));
    Ok(groups)
}

/// Converts an archive (RAR, ZIP, TAR) into native XRAR format
pub fn convert_to_xrar(
    input_archive: &Path,
    output_xrar: &Path,
    profile: CompressionProfile,
    password: Option<&str>,
) -> Result<ArchiveSummary, CoreError> {
    let temp_dir = std::env::temp_dir().join(format!("xrar_conv_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis()));
    std::fs::create_dir_all(&temp_dir)?;

    // Extract input archive to temp directory
    raw_extract(input_archive, &temp_dir, password)?;

    // Compress extracted tree into new .xrar
    let result = create_xrar(output_xrar, &[temp_dir.clone()], profile, password, true)?;

    // Cleanup temp files
    let _ = std::fs::remove_dir_all(temp_dir);

    Ok(result)
}

fn hex_encode(data: [u8; 32]) -> String {
    let mut s = String::with_capacity(64);
    for b in data {
        s.push_str(&format!("{b:02x}"));
    }
    s
}
