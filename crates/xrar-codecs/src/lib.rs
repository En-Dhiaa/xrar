//! XRAR Pluggable Compression Codecs
//! Implementations for Store, LZ4, Deflate, Brotli, and LZMA2.

use std::io::{Read, Write};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CodecError {
    #[error("IO error during compression/decompression: {0}")]
    Io(#[from] std::io::Error),
    #[error("Compression error: {0}")]
    Compression(String),
    #[error("Decompression error: {0}")]
    Decompression(String),
    #[error("Unsupported codec ID: {0}")]
    UnsupportedCodec(u8),
}

/// Identifiers for supported compression codecs
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[repr(u8)]
pub enum CodecId {
    Store = 0,
    Zstandard = 1,
    Lzma2 = 2,
    Brotli = 3,
    Deflate = 4,
    Lz4 = 5,
}

impl TryFrom<u8> for CodecId {
    type Error = CodecError;

    fn try_from(v: u8) -> Result<Self, Self::Error> {
        match v {
            0 => Ok(CodecId::Store),
            1 => Ok(CodecId::Zstandard),
            2 => Ok(CodecId::Lzma2),
            3 => Ok(CodecId::Brotli),
            4 => Ok(CodecId::Deflate),
            5 => Ok(CodecId::Lz4),
            other => Err(CodecError::UnsupportedCodec(other)),
        }
    }
}

pub trait CompressionCodec: Send + Sync {
    fn id(&self) -> CodecId;
    fn name(&self) -> &'static str;
    fn compress(&self, input: &[u8], level: u8) -> Result<Vec<u8>, CodecError>;
    fn decompress(&self, input: &[u8]) -> Result<Vec<u8>, CodecError>;
}

/// Store: Uncompressed raw pass-through
pub struct StoreCodec;
impl CompressionCodec for StoreCodec {
    fn id(&self) -> CodecId {
        CodecId::Store
    }
    fn name(&self) -> &'static str {
        "Store (None)"
    }
    fn compress(&self, input: &[u8], _level: u8) -> Result<Vec<u8>, CodecError> {
        Ok(input.to_vec())
    }
    fn decompress(&self, input: &[u8]) -> Result<Vec<u8>, CodecError> {
        Ok(input.to_vec())
    }
}

/// LZ4: High-speed real-time compression
pub struct Lz4Codec;
impl CompressionCodec for Lz4Codec {
    fn id(&self) -> CodecId {
        CodecId::Lz4
    }
    fn name(&self) -> &'static str {
        "LZ4 (Real-time Fast)"
    }
    fn compress(&self, input: &[u8], _level: u8) -> Result<Vec<u8>, CodecError> {
        Ok(lz4_flex::compress_prepend_size(input))
    }
    fn decompress(&self, input: &[u8]) -> Result<Vec<u8>, CodecError> {
        lz4_flex::decompress_size_prepended(input)
            .map_err(|e| CodecError::Decompression(format!("LZ4 decode failed: {e}")))
    }
}

/// Deflate: Standard deflate compression via flate2
pub struct DeflateCodec;
impl CompressionCodec for DeflateCodec {
    fn id(&self) -> CodecId {
        CodecId::Deflate
    }
    fn name(&self) -> &'static str {
        "Deflate"
    }
    fn compress(&self, input: &[u8], level: u8) -> Result<Vec<u8>, CodecError> {
        let comp_level = flate2::Compression::new(level.clamp(0, 9) as u32);
        let mut encoder = flate2::write::DeflateEncoder::new(Vec::new(), comp_level);
        encoder.write_all(input)?;
        Ok(encoder.finish()?)
    }
    fn decompress(&self, input: &[u8]) -> Result<Vec<u8>, CodecError> {
        let mut decoder = flate2::read::DeflateDecoder::new(input);
        let mut output = Vec::new();
        decoder.read_to_end(&mut output)?;
        Ok(output)
    }
}

/// Brotli: Extreme compression on structured text, web data, JSON, XML
pub struct BrotliCodec;
impl CompressionCodec for BrotliCodec {
    fn id(&self) -> CodecId {
        CodecId::Brotli
    }
    fn name(&self) -> &'static str {
        "Brotli"
    }
    fn compress(&self, input: &[u8], level: u8) -> Result<Vec<u8>, CodecError> {
        let q = level.clamp(1, 11) as u32;
        let mut output = Vec::new();
        let mut writer = brotli::CompressorWriter::new(&mut output, 4096, q, 22);
        writer.write_all(input)?;
        drop(writer);
        Ok(output)
    }
    fn decompress(&self, input: &[u8]) -> Result<Vec<u8>, CodecError> {
        let mut output = Vec::new();
        let mut decompressor = brotli::Decompressor::new(input, 4096);
        decompressor.read_to_end(&mut output)?;
        Ok(output)
    }
}

/// LZMA2: High and Ultra compression ratio
pub struct Lzma2Codec;
impl CompressionCodec for Lzma2Codec {
    fn id(&self) -> CodecId {
        CodecId::Lzma2
    }
    fn name(&self) -> &'static str {
        "LZMA2"
    }
    fn compress(&self, input: &[u8], _level: u8) -> Result<Vec<u8>, CodecError> {
        let mut reader = input;
        let mut output = Vec::new();
        lzma_rs::lzma2_compress(&mut reader, &mut output)
            .map_err(|e| CodecError::Compression(format!("LZMA2 compress failed: {e}")))?;
        Ok(output)
    }
    fn decompress(&self, input: &[u8]) -> Result<Vec<u8>, CodecError> {
        let mut reader = input;
        let mut output = Vec::new();
        lzma_rs::lzma2_decompress(&mut reader, &mut output)
            .map_err(|e| CodecError::Decompression(format!("LZMA2 decompress failed: {e}")))?;
        Ok(output)
    }
}

/// Factory function to retrieve codec implementation by CodecId
pub fn get_codec(id: CodecId) -> Box<dyn CompressionCodec> {
    match id {
        CodecId::Store => Box::new(StoreCodec),
        CodecId::Lz4 => Box::new(Lz4Codec),
        CodecId::Deflate => Box::new(DeflateCodec),
        CodecId::Brotli => Box::new(BrotliCodec),
        CodecId::Lzma2 | CodecId::Zstandard => Box::new(Lzma2Codec),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_roundtrip() {
        let data = b"Hello, XRAR Archive Engine!";
        let codec = StoreCodec;
        let compressed = codec.compress(data, 0).unwrap();
        let decompressed = codec.decompress(&compressed).unwrap();
        assert_eq!(data.as_slice(), decompressed.as_slice());
    }

    #[test]
    fn test_lz4_roundtrip() {
        let data = b"Repeatable string with redundancy: ABCABCABCABCABCABCABCABCABCABC";
        let codec = Lz4Codec;
        let compressed = codec.compress(data, 1).unwrap();
        assert!(compressed.len() < data.len());
        let decompressed = codec.decompress(&compressed).unwrap();
        assert_eq!(data.as_slice(), decompressed.as_slice());
    }

    #[test]
    fn test_deflate_roundtrip() {
        let data = b"The quick brown fox jumps over the lazy dog. Repeat repeatedly!";
        let codec = DeflateCodec;
        let compressed = codec.compress(data, 6).unwrap();
        let decompressed = codec.decompress(&compressed).unwrap();
        assert_eq!(data.as_slice(), decompressed.as_slice());
    }

    #[test]
    fn test_brotli_roundtrip() {
        let data = b"{\"message\": \"Hello World\", \"status\": 200, \"items\": [1,2,3,4,5]}";
        let codec = BrotliCodec;
        let compressed = codec.compress(data, 9).unwrap();
        let decompressed = codec.decompress(&compressed).unwrap();
        assert_eq!(data.as_slice(), decompressed.as_slice());
    }

    #[test]
    fn test_lzma2_roundtrip() {
        let data = b"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.";
        let codec = Lzma2Codec;
        let compressed = codec.compress(data, 6).unwrap();
        let decompressed = codec.decompress(&compressed).unwrap();
        assert_eq!(data.as_slice(), decompressed.as_slice());
    }
}
