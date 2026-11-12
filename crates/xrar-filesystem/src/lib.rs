//! XRAR Filesystem & Path Sanitization Engine
//! Defensive path validation, Zip Slip prevention, and directory scanning.

use std::path::{Component, Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FsError {
    #[error("Path traversal detected: {0}")]
    PathTraversal(String),
    #[error("Invalid path or prohibited Windows device name: {0}")]
    ProhibitedPath(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Path resolution outside destination boundary: {0}")]
    OutsideDestination(String),
}

/// Normalizes an archive relative path:
/// - Replaces Windows backslashes with `/`
/// - Strips leading `./` or `/`
/// - Rejects `..` parent directory traversal
/// - Rejects Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
pub fn normalize_archive_path(raw: &str) -> Result<String, FsError> {
    let raw = raw.trim();
    if raw.is_empty() {
        return Err(FsError::PathTraversal("Empty path is invalid".to_string()));
    }

    // Replace Windows backslashes
    let sanitized = raw.replace('\\', "/");
    let parts: Vec<&str> = sanitized.split('/').collect();
    let mut clean_parts = Vec::new();

    for part in parts {
        let trimmed = part.trim();
        if trimmed.is_empty() || trimmed == "." {
            continue;
        }
        if trimmed == ".." {
            return Err(FsError::PathTraversal(format!(
                "Path component '..' is forbidden: {raw}"
            )));
        }

        // Check Windows device names
        let stem = trimmed.split('.').next().unwrap_or("").to_ascii_uppercase();
        if matches!(
            stem.as_str(),
            "CON" | "PRN" | "AUX" | "NUL"
                | "COM1" | "COM2" | "COM3" | "COM4" | "COM5" | "COM6" | "COM7" | "COM8" | "COM9"
                | "LPT1" | "LPT2" | "LPT3" | "LPT4" | "LPT5" | "LPT6" | "LPT7" | "LPT8" | "LPT9"
        ) {
            return Err(FsError::ProhibitedPath(format!(
                "Prohibited Windows device name detected: {trimmed}"
            )));
        }

        clean_parts.push(trimmed);
    }

    if clean_parts.is_empty() {
        return Err(FsError::PathTraversal("Path resolves to empty root".to_string()));
    }

    Ok(clean_parts.join("/"))
}

/// Safely resolves the target extraction path, strictly ensuring it cannot escape `target_dir`.
pub fn resolve_safe_extraction_path(target_dir: &Path, relative_archive_path: &str) -> Result<PathBuf, FsError> {
    let normalized = normalize_archive_path(relative_archive_path)?;
    let relative_path = Path::new(&normalized);

    // Verify no component is Normal containing .. or RootDir/Prefix
    for component in relative_path.components() {
        match component {
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(FsError::PathTraversal(format!(
                    "Illegal component in relative path: {relative_archive_path}"
                )));
            }
            Component::Normal(_) | Component::CurDir => {}
        }
    }

    let combined = target_dir.join(relative_path);
    
    // Ensure destination is structurally rooted in target_dir
    if !combined.starts_with(target_dir) {
        return Err(FsError::OutsideDestination(format!(
            "Resolved path {} escapes boundary {}",
            combined.display(),
            target_dir.display()
        )));
    }

    Ok(combined)
}

/// Metadata record for a filesystem file or directory entry to be archived.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ScannedFile {
    pub absolute_path: PathBuf,
    pub archive_path: String,
    pub is_dir: bool,
    pub uncompressed_size: u64,
    pub modified_timestamp: i64,
    pub readonly: bool,
}

fn collect_dir_entries(dir: &Path, base_path: &Path, base_name: &str, results: &mut Vec<ScannedFile>) -> Result<(), FsError> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let entry_path = entry.path();
        let entry_meta = entry.metadata()?;

        let rel = entry_path.strip_prefix(base_path).unwrap_or(Path::new(""));
        let archive_path = if rel.as_os_str().is_empty() {
            base_name.to_string()
        } else {
            format!("{}/{}", base_name, rel.to_string_lossy().replace('\\', "/"))
        };

        let norm_path = normalize_archive_path(&archive_path)?;
        let modified = entry_meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        let is_dir = entry_meta.is_dir();
        results.push(ScannedFile {
            absolute_path: entry_path.clone(),
            archive_path: norm_path,
            is_dir,
            uncompressed_size: if is_dir { 0 } else { entry_meta.len() },
            modified_timestamp: modified,
            readonly: entry_meta.permissions().readonly(),
        });

        if is_dir {
            collect_dir_entries(&entry_path, base_path, base_name, results)?;
        }
    }
    Ok(())
}

/// Recursively scans input files or directories for archiving.
pub fn scan_paths<P: AsRef<Path>>(inputs: &[P]) -> Result<Vec<ScannedFile>, FsError> {
    let mut results = Vec::new();

    for input in inputs {
        let input_path = input.as_ref();
        if !input_path.exists() {
            return Err(FsError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                format!("Path not found: {}", input_path.display()),
            )));
        }

        let metadata = std::fs::metadata(input_path)?;
        if metadata.is_dir() {
            let base_name = input_path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "root".to_string());

            let modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            results.push(ScannedFile {
                absolute_path: input_path.to_path_buf(),
                archive_path: normalize_archive_path(&base_name)?,
                is_dir: true,
                uncompressed_size: 0,
                modified_timestamp: modified,
                readonly: metadata.permissions().readonly(),
            });

            collect_dir_entries(input_path, input_path, &base_name, &mut results)?;
        } else {
            let filename = input_path
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_else(|| "file.bin".to_string());
            
            let norm_path = normalize_archive_path(&filename)?;
            let modified = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            results.push(ScannedFile {
                absolute_path: input_path.to_path_buf(),
                archive_path: norm_path,
                is_dir: false,
                uncompressed_size: metadata.len(),
                modified_timestamp: modified,
                readonly: metadata.permissions().readonly(),
            });
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_valid_paths() {
        assert_eq!(normalize_archive_path("foo/bar/baz.txt").unwrap(), "foo/bar/baz.txt");
        assert_eq!(normalize_archive_path("foo\\bar\\baz.txt").unwrap(), "foo/bar/baz.txt");
        assert_eq!(normalize_archive_path("./docs/manual.pdf").unwrap(), "docs/manual.pdf");
        assert_eq!(normalize_archive_path("folder///subfolder//file").unwrap(), "folder/subfolder/file");
    }

    #[test]
    fn test_reject_parent_traversal() {
        assert!(normalize_archive_path("../secret.txt").is_err());
        assert!(normalize_archive_path("docs/../../root.exe").is_err());
        assert!(normalize_archive_path("a/b/c/../..").is_err());
    }

    #[test]
    fn test_reject_windows_device_names() {
        assert!(normalize_archive_path("CON").is_err());
        assert!(normalize_archive_path("sub/prn.txt").is_err());
        assert!(normalize_archive_path("nul.dat").is_err());
        assert!(normalize_archive_path("aux").is_err());
    }

    #[test]
    fn test_safe_extraction_resolver() {
        let target = Path::new("C:/archive_out");
        let safe = resolve_safe_extraction_path(target, "sub/file.txt").unwrap();
        assert_eq!(safe, PathBuf::from("C:/archive_out/sub/file.txt"));
    }
}
