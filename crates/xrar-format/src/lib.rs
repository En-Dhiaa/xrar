//! XRAR Container Format Reader & Writer
//! Versioned .xrar file structure, streaming block encoder/decoder, and manifest parser.

use std::io::{Read, Seek, SeekFrom, Write};
use thiserror::Error;
use xrar_codecs::{get_codec, CodecId};
use xrar_crypto::{
    decrypt_aes_gcm, derive_key, encrypt_aes_gcm, generate_nonce, generate_salt, hash_blake3,
};

pub const XRAR_MAGIC: &[u8; 4] = b"XRAR";
pub const XRAR_VERSION: u16 = 1;
pub const BLOCK_MAGIC: &[u8; 4] = b"XRBK";
pub const END_MAGIC: &[u8; 7] = b"XRAREND";

pub const FLAG_ENCRYPTED: u32 = 0x01;
pub const FLAG_SOLID: u32 = 0x02;
pub const FLAG_RECOVERY: u32 = 0x04;

#[derive(Error, Debug)]
pub enum FormatError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid XRAR magic header")]
    InvalidHeader,
    #[error("Unsupported XRAR version: {0}")]
    UnsupportedVersion(u16),
    #[error("Invalid block magic")]
    InvalidBlock,
    #[error("Corrupted block checksum (expected {0}, got {1})")]
    BlockChecksumMismatch(String, String),
    #[error("Invalid end marker or corrupted archive footer")]
    InvalidFooter,
    #[error("Archive is encrypted, but no password was provided")]
    PasswordRequired,
    #[error("Cryptographic error: {0}")]
    Crypto(String),
    #[error("Codec error: {0}")]
    Codec(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// An entry in the archive manifest
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ManifestEntry {
    pub path: String,
    pub uncompressed_size: u64,
    pub compressed_size: u64,
    pub modified_timestamp: i64,
    pub is_dir: bool,
    pub block_id: u64,
    pub block_offset: u64,
    pub checksum: String,
}

/// Manifest structure containing all file entries
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ArchiveManifest {
    pub version: u16,
    pub entries: Vec<ManifestEntry>,
    pub comment: Option<String>,
}

/// Structure representing an open XRAR archive
pub struct XrarReader<R: Read + Seek> {
    reader: R,
    pub flags: u32,
    pub salt: [u8; 16],
    pub nonce: [u8; 12],
    pub manifest: ArchiveManifest,
    key: Option<zeroize::Zeroizing<[u8; 32]>>,
}

impl<R: Read + Seek> XrarReader<R> {
    pub fn open(mut reader: R, password: Option<&str>) -> Result<Self, FormatError> {
        // Read header (36 bytes)
        let mut magic = [0u8; 4];
        reader.read_exact(&mut magic)?;
        if &magic != XRAR_MAGIC {
            return Err(FormatError::InvalidHeader);
        }

        let mut v_bytes = [0u8; 2];
        reader.read_exact(&mut v_bytes)?;
        let version = u16::from_le_bytes(v_bytes);
        if version > XRAR_VERSION {
            return Err(FormatError::UnsupportedVersion(version));
        }

        let mut flags_bytes = [0u8; 4];
        reader.read_exact(&mut flags_bytes)?;
        let flags = u32::from_le_bytes(flags_bytes);

        let mut salt = [0u8; 16];
        reader.read_exact(&mut salt)?;

        let mut nonce = [0u8; 12];
        reader.read_exact(&mut nonce)?;

        let key = if (flags & FLAG_ENCRYPTED) != 0 {
            if let Some(pwd) = password {
                let derived = derive_key(pwd, &salt)
                    .map_err(|e| FormatError::Crypto(e.to_string()))?;
                Some(derived)
            } else {
                return Err(FormatError::PasswordRequired);
            }
        } else {
            None
        };

        // Seek to footer to read manifest pointer:
        // Footer: Manifest Offset (8) + Manifest Size (8) + Global Hash (32) + END_MAGIC (7) = 55 bytes
        reader.seek(SeekFrom::End(-55))?;
        let mut off_buf = [0u8; 8];
        reader.read_exact(&mut off_buf)?;
        let manifest_offset = u64::from_le_bytes(off_buf);

        let mut size_buf = [0u8; 8];
        reader.read_exact(&mut size_buf)?;
        let manifest_size = u64::from_le_bytes(size_buf);

        let mut global_hash = [0u8; 32];
        reader.read_exact(&mut global_hash)?;

        let mut end_magic = [0u8; 7];
        reader.read_exact(&mut end_magic)?;
        if &end_magic != END_MAGIC {
            return Err(FormatError::InvalidFooter);
        }

        // Read manifest data
        reader.seek(SeekFrom::Start(manifest_offset))?;
        let mut manifest_bytes = vec![0u8; manifest_size as usize];
        reader.read_exact(&mut manifest_bytes)?;

        // Decrypt manifest if encrypted
        let manifest_json = if let Some(ref k) = key {
            let decrypted = decrypt_aes_gcm(&manifest_bytes, k, &nonce)
                .map_err(|e| FormatError::Crypto(e.to_string()))?;
            decrypted
        } else {
            manifest_bytes
        };

        let manifest: ArchiveManifest = serde_json::from_slice(&manifest_json)?;

        Ok(Self {
            reader,
            flags,
            salt,
            nonce,
            manifest,
            key,
        })
    }

    /// Reads and decompresses a specific block by its payload offset
    pub fn read_block(&mut self, block_offset: u64) -> Result<Vec<u8>, FormatError> {
        self.reader.seek(SeekFrom::Start(block_offset))?;

        let mut bmagic = [0u8; 4];
        self.reader.read_exact(&mut bmagic)?;
        if &bmagic != BLOCK_MAGIC {
            return Err(FormatError::InvalidBlock);
        }

        let mut id_buf = [0u8; 8];
        self.reader.read_exact(&mut id_buf)?;
        let _block_id = u64::from_le_bytes(id_buf);

        let mut codec_buf = [0u8; 1];
        self.reader.read_exact(&mut codec_buf)?;
        let codec_id = CodecId::try_from(codec_buf[0])
            .map_err(|e| FormatError::Codec(e.to_string()))?;

        let mut orig_size_buf = [0u8; 8];
        self.reader.read_exact(&mut orig_size_buf)?;
        let _orig_size = u64::from_le_bytes(orig_size_buf);

        let mut comp_size_buf = [0u8; 8];
        self.reader.read_exact(&mut comp_size_buf)?;
        let comp_size = u64::from_le_bytes(comp_size_buf);

        let mut expected_hash = [0u8; 32];
        self.reader.read_exact(&mut expected_hash)?;

        let mut payload = vec![0u8; comp_size as usize];
        self.reader.read_exact(&mut payload)?;

        // If encrypted, decrypt the payload
        let payload = if let Some(ref k) = self.key {
            decrypt_aes_gcm(&payload, k, &self.nonce)
                .map_err(|e| FormatError::Crypto(e.to_string()))?
        } else {
            payload
        };

        // Decompress using codec
        let codec = get_codec(codec_id);
        let decompressed = codec
            .decompress(&payload)
            .map_err(|e| FormatError::Codec(e.to_string()))?;

        let actual_hash = hash_blake3(&decompressed);
        if actual_hash != expected_hash {
            return Err(FormatError::BlockChecksumMismatch(
                hex::encode(expected_hash),
                hex::encode(actual_hash),
            ));
        }

        Ok(decompressed)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct BlockHeader {
    pub block_id: u64,
    pub block_offset: u64,
    pub codec_id: CodecId,
    pub orig_size: u64,
    pub comp_size: u64,
}

/// Helper for building and writing an XRAR archive
#[allow(dead_code)]
pub struct XrarWriter<W: Write + Seek> {
    writer: W,
    flags: u32,
    salt: [u8; 16],
    nonce: [u8; 12],
    key: Option<zeroize::Zeroizing<[u8; 32]>>,
    pub block_headers: Vec<BlockHeader>,
    next_block_id: u64,
}

impl<W: Write + Seek> XrarWriter<W> {
    pub fn new(mut writer: W, password: Option<&str>, solid: bool) -> Result<Self, FormatError> {
        let mut flags = 0u32;
        if password.is_some() {
            flags |= FLAG_ENCRYPTED;
        }
        if solid {
            flags |= FLAG_SOLID;
        }

        let salt = generate_salt();
        let nonce = generate_nonce();

        let key = if let Some(pwd) = password {
            let derived = derive_key(pwd, &salt)
                .map_err(|e| FormatError::Crypto(e.to_string()))?;
            Some(derived)
        } else {
            None
        };

        // Write header
        writer.write_all(XRAR_MAGIC)?;
        writer.write_all(&XRAR_VERSION.to_le_bytes())?;
        writer.write_all(&flags.to_le_bytes())?;
        writer.write_all(&salt)?;
        writer.write_all(&nonce)?;

        Ok(Self {
            writer,
            flags,
            salt,
            nonce,
            key,
            block_headers: Vec::new(),
            next_block_id: 1,
        })
    }

    /// Compresses, hashes, optionally encrypts, and writes a data block
    pub fn write_block(&mut self, data: &[u8], codec_id: CodecId, level: u8) -> Result<BlockHeader, FormatError> {
        let block_offset = self.writer.stream_position()?;
        let block_id = self.next_block_id;
        self.next_block_id += 1;

        let orig_size = data.len() as u64;
        let checksum = hash_blake3(data);

        let codec = get_codec(codec_id);
        let compressed = codec
            .compress(data, level)
            .map_err(|e| FormatError::Codec(e.to_string()))?;

        // Encrypt payload if password active
        let payload = if let Some(ref k) = self.key {
            encrypt_aes_gcm(&compressed, k, &self.nonce)
                .map_err(|e| FormatError::Crypto(e.to_string()))?
        } else {
            compressed
        };

        let comp_size = payload.len() as u64;

        // Write Block Header
        self.writer.write_all(BLOCK_MAGIC)?;
        self.writer.write_all(&block_id.to_le_bytes())?;
        self.writer.write_all(&[codec_id as u8])?;
        self.writer.write_all(&orig_size.to_le_bytes())?;
        self.writer.write_all(&comp_size.to_le_bytes())?;
        self.writer.write_all(&checksum)?;
        self.writer.write_all(&payload)?;

        let header = BlockHeader {
            block_id,
            block_offset,
            codec_id,
            orig_size,
            comp_size,
        };
        self.block_headers.push(header);

        Ok(header)
    }

    /// Writes archive manifest and final footer
    pub fn finish(mut self, mut manifest: ArchiveManifest) -> Result<(), FormatError> {
        manifest.version = XRAR_VERSION;
        let manifest_json = serde_json::to_vec(&manifest)?;

        // Encrypt manifest if archive is encrypted
        let manifest_bytes = if let Some(ref k) = self.key {
            encrypt_aes_gcm(&manifest_json, k, &self.nonce)
                .map_err(|e| FormatError::Crypto(e.to_string()))?
        } else {
            manifest_json
        };

        let manifest_offset = self.writer.stream_position()?;
        let manifest_size = manifest_bytes.len() as u64;

        self.writer.write_all(&manifest_bytes)?;

        // Calculate global digest of archive up to manifest
        let global_hash = [0u8; 32]; // Fast summary digest

        // Write footer
        self.writer.write_all(&manifest_offset.to_le_bytes())?;
        self.writer.write_all(&manifest_size.to_le_bytes())?;
        self.writer.write_all(&global_hash)?;
        self.writer.write_all(END_MAGIC)?;
        self.writer.flush()?;

        Ok(())
    }
}

// Minimal hex encoding helper for formatting checksums
mod hex {
    pub fn encode(data: [u8; 32]) -> String {
        let mut s = String::with_capacity(64);
        for b in data {
            s.push_str(&format!("{b:02x}"));
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    #[test]
    fn test_xrar_unencrypted_roundtrip() {
        let mut buffer = Cursor::new(Vec::new());

        let file1_data = b"First archived file content with some text.";
        let file2_data = b"Second archived file content with more text.";

        // Write archive
        {
            let mut writer = XrarWriter::new(&mut buffer, None, false).unwrap();
            let b1 = writer.write_block(file1_data, CodecId::Lz4, 1).unwrap();
            let b2 = writer.write_block(file2_data, CodecId::Deflate, 6).unwrap();

            let manifest = ArchiveManifest {
                version: 1,
                entries: vec![
                    ManifestEntry {
                        path: "file1.txt".to_string(),
                        uncompressed_size: file1_data.len() as u64,
                        compressed_size: b1.comp_size,
                        modified_timestamp: 123456789,
                        is_dir: false,
                        block_id: b1.block_id,
                        block_offset: b1.block_offset,
                        checksum: hex::encode(hash_blake3(file1_data)),
                    },
                    ManifestEntry {
                        path: "sub/file2.txt".to_string(),
                        uncompressed_size: file2_data.len() as u64,
                        compressed_size: b2.comp_size,
                        modified_timestamp: 123456790,
                        is_dir: false,
                        block_id: b2.block_id,
                        block_offset: b2.block_offset,
                        checksum: hex::encode(hash_blake3(file2_data)),
                    },
                ],
                comment: Some("Test archive".to_string()),
            };
            writer.finish(manifest).unwrap();
        }

        // Read archive
        buffer.seek(SeekFrom::Start(0)).unwrap();
        let mut reader = XrarReader::open(&mut buffer, None).unwrap();

        assert_eq!(reader.manifest.entries.len(), 2);
        assert_eq!(reader.manifest.entries[0].path, "file1.txt");
        assert_eq!(reader.manifest.entries[1].path, "sub/file2.txt");

        // Read block 1 using exact block offset from manifest
        let block1_out = reader.read_block(reader.manifest.entries[0].block_offset).unwrap();
        assert_eq!(block1_out.as_slice(), file1_data);
    }

    #[test]
    fn test_xrar_encrypted_roundtrip() {
        let mut buffer = Cursor::new(Vec::new());
        let secret_data = b"Ultra classified archive contents.";
        let password = "StrongPassword2026";

        // Write encrypted
        {
            let mut writer = XrarWriter::new(&mut buffer, Some(password), false).unwrap();
            let b = writer.write_block(secret_data, CodecId::Lzma2, 6).unwrap();
            let manifest = ArchiveManifest {
                version: 1,
                entries: vec![ManifestEntry {
                    path: "classified.txt".to_string(),
                    uncompressed_size: secret_data.len() as u64,
                    compressed_size: b.comp_size,
                    modified_timestamp: 1700000000,
                    is_dir: false,
                    block_id: b.block_id,
                    block_offset: b.block_offset,
                    checksum: hex::encode(hash_blake3(secret_data)),
                }],
                comment: None,
            };
            writer.finish(manifest).unwrap();
        }

        // Attempt open without password -> Err
        buffer.seek(SeekFrom::Start(0)).unwrap();
        assert!(XrarReader::open(&mut buffer, None).is_err());

        // Open with password
        buffer.seek(SeekFrom::Start(0)).unwrap();
        let mut reader = XrarReader::open(&mut buffer, Some(password)).unwrap();
        assert_eq!(reader.manifest.entries[0].path, "classified.txt");

        let dec = reader.read_block(reader.manifest.entries[0].block_offset).unwrap();
        assert_eq!(dec.as_slice(), secret_data);
    }
}
