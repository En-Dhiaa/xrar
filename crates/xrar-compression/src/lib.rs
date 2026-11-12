//! XRAR Smart Compression Engine & Profiles
//! Shannon entropy calculation, file type optimization, solid compression orchestrator.

use xrar_codecs::CodecId;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CompressionEngineError {
    #[error("Compression error: {0}")]
    Error(String),
}

/// Compression profiles available to the user
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum CompressionProfile {
    Fast,
    Balanced,
    High,
    Ultra,
    Extreme,
    Smart,
}

impl Default for CompressionProfile {
    fn default() -> Self {
        CompressionProfile::Smart
    }
}

/// Solid compression strategies
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SolidMode {
    NoSolid,
    SmallSolid,   // 16 MB solid blocks
    MediumSolid,  // 64 MB solid blocks
    LargeSolid,   // 256 MB solid blocks
    MaximumSolid, // All files in single block
    SmartSolid,   // Group by extension / MIME type
}

impl Default for SolidMode {
    fn default() -> Self {
        SolidMode::SmartSolid
    }
}

/// File classification category
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileCategory {
    AlreadyCompressed,
    TextOrCode,
    StructuredData, // JSON, XML, CSV
    Executable,
    RawBinary,
    Unknown,
}

/// Calculates Shannon entropy of a byte buffer (0.0 to 8.0 bits per byte)
pub fn calculate_entropy(data: &[u8]) -> f64 {
    if data.is_empty() {
        return 0.0;
    }

    let mut counts = [0usize; 256];
    for &b in data {
        counts[b as usize] += 1;
    }

    let len = data.len() as f64;
    let mut entropy = 0.0;

    for &count in &counts {
        if count > 0 {
            let p = count as f64 / len;
            entropy -= p * p.log2();
        }
    }

    entropy
}

/// Classifies file type based on extension
pub fn classify_extension(ext: &str) -> FileCategory {
    let lower = ext.to_lowercase();
    match lower.as_str() {
        "zip" | "rar" | "7z" | "gz" | "xz" | "bz2" | "zst" | "tar.gz" | "jpg" | "jpeg" | "png"
        | "webp" | "mp4" | "mkv" | "mp3" | "flac" | "aac" | "mov" | "avi" | "pdf" | "docx"
        | "xlsx" | "pptx" | "apk" | "jar" => FileCategory::AlreadyCompressed,

        "txt" | "md" | "rs" | "c" | "cpp" | "h" | "hpp" | "py" | "js" | "ts" | "jsx"
        | "tsx" | "go" | "java" | "cs" | "html" | "css" | "scss" | "log" | "sql" | "sh" | "bat"
        | "ps1" => FileCategory::TextOrCode,

        "json" | "xml" | "yaml" | "yml" | "csv" | "tsv" | "svg" => FileCategory::StructuredData,

        "exe" | "dll" | "so" | "dylib" | "sys" | "bin" | "elf" => FileCategory::Executable,

        _ => FileCategory::Unknown,
    }
}

/// Analyzes an input file/stream and selects the optimal codec and level
pub fn select_smart_strategy(
    path: &str,
    sample: &[u8],
    requested_profile: CompressionProfile,
) -> (CodecId, u8) {
    // If user explicitly chose a fixed profile (not Smart), honor the profile
    match requested_profile {
        CompressionProfile::Fast => return (CodecId::Lz4, 1),
        CompressionProfile::Balanced => return (CodecId::Deflate, 6),
        CompressionProfile::High => return (CodecId::Lzma2, 6),
        CompressionProfile::Ultra => return (CodecId::Lzma2, 9),
        CompressionProfile::Extreme => return (CodecId::Lzma2, 9),
        CompressionProfile::Smart => {}
    }

    // SMART PROFILE: Intelligent dynamic analysis
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    let category = classify_extension(ext);

    // If file is already compressed media or archive, do not waste CPU
    if category == FileCategory::AlreadyCompressed {
        return (CodecId::Store, 0);
    }

    // Check entropy of sample (high entropy > 7.80 means likely random or already compressed)
    if !sample.is_empty() {
        let entropy = calculate_entropy(sample);
        if entropy > 7.85 {
            return (CodecId::Store, 0);
        }
    }

    // Assign optimal codec per detected structure
    match category {
        FileCategory::StructuredData => (CodecId::Brotli, 9),
        FileCategory::TextOrCode => (CodecId::Lzma2, 6),
        FileCategory::Executable => (CodecId::Lzma2, 6),
        FileCategory::RawBinary | FileCategory::Unknown => (CodecId::Lzma2, 6),
        FileCategory::AlreadyCompressed => (CodecId::Store, 0),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entropy_computation() {
        // Zero entropy for all uniform zeros
        let zeros = vec![0u8; 1000];
        assert_eq!(calculate_entropy(&zeros), 0.0);

        // Maximum entropy for uniform random-like distribution
        let mut uniform = Vec::new();
        for _ in 0..10 {
            for b in 0..=255 {
                uniform.push(b);
            }
        }
        let e = calculate_entropy(&uniform);
        assert!((e - 8.0).abs() < 0.01);
    }

    #[test]
    fn test_smart_strategy_selection() {
        // Already compressed file -> Store
        let (codec, _) = select_smart_strategy("video.mp4", &[], CompressionProfile::Smart);
        assert_eq!(codec, CodecId::Store);

        // JSON file -> Brotli
        let (codec, _) = select_smart_strategy("data.json", b"{\"key\": \"val\"}", CompressionProfile::Smart);
        assert_eq!(codec, CodecId::Brotli);

        // Source code -> LZMA2
        let (codec, _) = select_smart_strategy("main.rs", b"fn main() {}", CompressionProfile::Smart);
        assert_eq!(codec, CodecId::Lzma2);
    }
}
