//! XRAR Recovery Records Engine
//! Reed-Solomon Erasure Coding for archive self-healing and damaged sector repair.

use reed_solomon_erasure::galois_8::ReedSolomon;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RecoveryError {
    #[error("Reed Solomon initialization error: {0}")]
    Init(String),
    #[error("Reconstruction failed: too many damaged or missing shards ({0})")]
    ReconstructionFailed(String),
    #[error("Invalid slice configuration")]
    InvalidConfig,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecoveryProfile {
    None,
    OnePercent,
    ThreePercent,
    FivePercent,
    TenPercent,
}

impl RecoveryProfile {
    pub fn parity_ratio(&self) -> f32 {
        match self {
            RecoveryProfile::None => 0.0,
            RecoveryProfile::OnePercent => 0.01,
            RecoveryProfile::ThreePercent => 0.03,
            RecoveryProfile::FivePercent => 0.05,
            RecoveryProfile::TenPercent => 0.10,
        }
    }
}

/// Generates parity shards for input data using Reed-Solomon GF(2^8)
pub fn generate_recovery_shards(
    data: &[u8],
    data_shards: usize,
    parity_shards: usize,
) -> Result<Vec<Vec<u8>>, RecoveryError> {
    if data_shards == 0 || parity_shards == 0 {
        return Err(RecoveryError::InvalidConfig);
    }

    let rs = ReedSolomon::new(data_shards, parity_shards)
        .map_err(|e| RecoveryError::Init(format!("{e:?}")))?;

    let shard_size = (data.len() + data_shards - 1) / data_shards;
    let mut shards = Vec::with_capacity(data_shards + parity_shards);

    for i in 0..data_shards {
        let start = i * shard_size;
        let mut shard = vec![0u8; shard_size];
        if start < data.len() {
            let end = (start + shard_size).min(data.len());
            shard[..end - start].copy_from_slice(&data[start..end]);
        }
        shards.push(shard);
    }

    for _ in 0..parity_shards {
        shards.push(vec![0u8; shard_size]);
    }

    rs.encode(&mut shards)
        .map_err(|e| RecoveryError::Init(format!("Encode error: {e:?}")))?;

    // Return the parity shards
    Ok(shards[data_shards..].to_vec())
}

/// Reconstructs missing or corrupted data shards using remaining intact data & parity shards
pub fn reconstruct_data(
    shards: &mut [Option<Vec<u8>>],
    data_shards: usize,
    parity_shards: usize,
) -> Result<(), RecoveryError> {
    let rs = ReedSolomon::new(data_shards, parity_shards)
        .map_err(|e| RecoveryError::Init(format!("{e:?}")))?;

    rs.reconstruct(shards)
        .map_err(|e| RecoveryError::ReconstructionFailed(format!("{e:?}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reed_solomon_reconstruction() {
        let original_data = b"This is vital archived information that might suffer sector corruption.";
        let data_shards = 4;
        let parity_shards = 2;

        let parity = generate_recovery_shards(original_data, data_shards, parity_shards).unwrap();
        assert_eq!(parity.len(), 2);

        let shard_size = (original_data.len() + data_shards - 1) / data_shards;
        let mut all_shards: Vec<Option<Vec<u8>>> = Vec::new();

        // Populate data shards
        for i in 0..data_shards {
            let start = i * shard_size;
            let mut s = vec![0u8; shard_size];
            if start < original_data.len() {
                let end = (start + shard_size).min(original_data.len());
                s[..end - start].copy_from_slice(&original_data[start..end]);
            }
            all_shards.push(Some(s));
        }

        // Add parity shards
        for p in parity {
            all_shards.push(Some(p));
        }

        // Simulate 2 corrupted/missing data shards
        all_shards[1] = None;
        all_shards[3] = None;

        // Reconstruct
        reconstruct_data(&mut all_shards, data_shards, parity_shards).unwrap();

        // Verify shard 1 and 3 are healed
        assert!(all_shards[1].is_some());
        assert!(all_shards[3].is_some());
    }
}
