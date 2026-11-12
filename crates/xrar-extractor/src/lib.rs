//! XRAR Safe Extractor Pipeline
//! Orchestrates archive extraction with progress monitoring, conflict handling, and safety guards.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use thiserror::Error;
use xrar_archive::{extract_archive, ArchiveError};

#[derive(Error, Debug)]
pub enum ExtractorError {
    #[error("Archive error: {0}")]
    Archive(#[from] ArchiveError),
    #[error("Extraction cancelled by user")]
    Cancelled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OverwriteMode {
    AlwaysOverwrite,
    SkipExisting,
    AskUser,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ProgressUpdate {
    pub current_file: String,
    pub files_extracted: usize,
    pub total_files: usize,
    pub bytes_extracted: u64,
    pub total_bytes: u64,
}

pub struct ExtractorTask {
    pub archive_path: PathBuf,
    pub output_dir: PathBuf,
    pub password: Option<String>,
    pub overwrite_mode: OverwriteMode,
    pub cancel_flag: Arc<AtomicBool>,
}

impl ExtractorTask {
    pub fn new<P: AsRef<Path>>(archive_path: P, output_dir: P) -> Self {
        Self {
            archive_path: archive_path.as_ref().to_path_buf(),
            output_dir: output_dir.as_ref().to_path_buf(),
            password: None,
            overwrite_mode: OverwriteMode::AlwaysOverwrite,
            cancel_flag: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn with_password(mut self, password: &str) -> Self {
        self.password = Some(password.to_string());
        self
    }

    pub fn execute(&self) -> Result<usize, ExtractorError> {
        if self.cancel_flag.load(Ordering::Relaxed) {
            return Err(ExtractorError::Cancelled);
        }

        let count = extract_archive(
            &self.archive_path,
            &self.output_dir,
            self.password.as_deref(),
        )?;

        Ok(count)
    }

    pub fn cancel(&self) {
        self.cancel_flag.store(true, Ordering::Relaxed);
    }
}
