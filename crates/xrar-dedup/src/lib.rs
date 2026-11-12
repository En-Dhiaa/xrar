//! XRAR Deduplication Engine
//! Content-defined and rolling chunking for deduplicating identical file segments.

use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DedupError {
    #[error("Deduplication error: {0}")]
    General(String),
}

/// Metadata describing an individual content chunk
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChunkDescriptor {
    pub hash: [u8; 32],
    pub offset: u64,
    pub length: u32,
    pub is_duplicate: bool,
    pub reference_block_id: Option<u64>,
}

pub struct DedupIndex {
    chunk_map: HashMap<[u8; 32], (u64, u32)>, // Hash -> (Block ID, Offset)
}

impl Default for DedupIndex {
    fn default() -> Self {
        Self::new()
    }
}

impl DedupIndex {
    pub fn new() -> Self {
        Self {
            chunk_map: HashMap::new(),
        }
    }

    /// Chunks data into 64 KiB blocks and detects duplicates against existing index
    pub fn chunk_and_deduplicate(&mut self, data: &[u8], current_block_id: u64) -> Vec<ChunkDescriptor> {
        let chunk_size = 64 * 1024; // 64 KiB chunking
        let mut descriptors = Vec::new();
        let mut offset = 0;

        while offset < data.len() {
            let end = (offset + chunk_size).min(data.len());
            let chunk_data = &data[offset..end];
            let hash = *blake3::hash(chunk_data).as_bytes();

            if let Some(&(ref_block, _)) = self.chunk_map.get(&hash) {
                descriptors.push(ChunkDescriptor {
                    hash,
                    offset: offset as u64,
                    length: (end - offset) as u32,
                    is_duplicate: true,
                    reference_block_id: Some(ref_block),
                });
            } else {
                self.chunk_map.insert(hash, (current_block_id, offset as u32));
                descriptors.push(ChunkDescriptor {
                    hash,
                    offset: offset as u64,
                    length: (end - offset) as u32,
                    is_duplicate: false,
                    reference_block_id: None,
                });
            }

            offset = end;
        }

        descriptors
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deduplication_detection() {
        let mut index = DedupIndex::new();
        let chunk = vec![0x42u8; 64 * 1024];

        let desc1 = index.chunk_and_deduplicate(&chunk, 1);
        assert_eq!(desc1.len(), 1);
        assert!(!desc1[0].is_duplicate);

        // Same chunk in block 2
        let desc2 = index.chunk_and_deduplicate(&chunk, 2);
        assert_eq!(desc2.len(), 1);
        assert!(desc2[0].is_duplicate);
        assert_eq!(desc2[0].reference_block_id, Some(1));
    }
}
