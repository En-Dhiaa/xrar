//! XRAR Integrated Hardware Benchmark Engine
//! Evaluates real hardware compression & decompression throughput, CPU time, and ratios.

use std::time::Instant;
use thiserror::Error;
use xrar_codecs::{get_codec, CodecId};

#[derive(Error, Debug)]
pub enum BenchmarkError {
    #[error("Benchmark failure: {0}")]
    Error(String),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CodecBenchmarkResult {
    pub codec_name: String,
    pub input_size_bytes: usize,
    pub compressed_size_bytes: usize,
    pub compression_ratio_pct: f32,
    pub compression_speed_mbs: f32,
    pub decompression_speed_mbs: f32,
    pub compression_time_ms: u128,
    pub decompression_time_ms: u128,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BenchmarkReport {
    pub total_input_mb: f32,
    pub results: Vec<CodecBenchmarkResult>,
    pub overall_score: u32,
}

/// Generates a realistic 1 MB benchmark payload containing mixed source code, text, and JSON
pub fn generate_benchmark_dataset(size_mb: usize) -> Vec<u8> {
    let text_sample = b"// XRAR Extreme Compression Benchmark Dataset\n\
        function calculateDigest(payload: Uint8Array): Promise<string> {\n\
            const buffer = new ArrayBuffer(payload.length);\n\
            const view = new DataView(buffer);\n\
            for (let i = 0; i < payload.length; i++) { view.setUint8(i, payload[i]); }\n\
            return crypto.subtle.digest('SHA-256', buffer).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''));\n\
        }\n\
        {\"status\": \"active\", \"version\": \"1.0.0\", \"metrics\": {\"cpu\": 4.2, \"mem\": 1024, \"io\": [12, 45, 99, 128]}}\n";

    let target_len = size_mb * 1024 * 1024;
    let mut data = Vec::with_capacity(target_len);
    while data.len() < target_len {
        data.extend_from_slice(text_sample);
    }
    data.truncate(target_len);
    data
}

/// Runs benchmark across all supported codecs
pub fn run_benchmark(size_mb: usize) -> Result<BenchmarkReport, BenchmarkError> {
    let data = generate_benchmark_dataset(size_mb);
    let codecs = [
        (CodecId::Store, 0, "Store"),
        (CodecId::Lz4, 1, "LZ4"),
        (CodecId::Deflate, 6, "Deflate"),
        (CodecId::Brotli, 6, "Brotli"),
        (CodecId::Lzma2, 4, "LZMA2"),
    ];

    let mut results = Vec::new();
    let mut total_score = 0u32;

    for (codec_id, level, _) in codecs {
        let codec = get_codec(codec_id);

        // Compression phase
        let t_start = Instant::now();
        let compressed = codec
            .compress(&data, level)
            .map_err(|e| BenchmarkError::Error(e.to_string()))?;
        let comp_time = t_start.elapsed().as_millis().max(1);

        // Decompression phase
        let t_decomp = Instant::now();
        let decompressed = codec
            .decompress(&compressed)
            .map_err(|e| BenchmarkError::Error(e.to_string()))?;
        let decomp_time = t_decomp.elapsed().as_millis().max(1);

        assert_eq!(decompressed.len(), data.len());

        let comp_mb = (data.len() as f32) / (1024.0 * 1024.0);
        let comp_speed = (comp_mb / (comp_time as f32 / 1000.0)).max(0.1);
        let decomp_speed = (comp_mb / (decomp_time as f32 / 1000.0)).max(0.1);
        let ratio = (compressed.len() as f32 / data.len() as f32) * 100.0;

        let score = ((comp_speed * 2.0) + (decomp_speed * 1.5) + ((100.0 - ratio) * 10.0)) as u32;
        total_score += score;

        results.push(CodecBenchmarkResult {
            codec_name: codec.name().to_string(),
            input_size_bytes: data.len(),
            compressed_size_bytes: compressed.len(),
            compression_ratio_pct: ratio,
            compression_speed_mbs: comp_speed,
            decompression_speed_mbs: decomp_speed,
            compression_time_ms: comp_time,
            decompression_time_ms: decomp_time,
        });
    }

    Ok(BenchmarkReport {
        total_input_mb: size_mb as f32,
        results,
        overall_score: total_score,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_benchmark_run() {
        let report = run_benchmark(1).unwrap();
        assert_eq!(report.results.len(), 5);
        assert!(report.overall_score > 0);
    }
}
