//! XRAR Cryptographic Engine
//! Argon2id key derivation, AES-256-GCM authenticated encryption, and BLAKE3/SHA-256 hashing.

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{
    Algorithm, Argon2, Params, Version,
};
use rand::RngCore;
use sha2::{Digest, Sha256};
use thiserror::Error;
use zeroize::Zeroizing;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Authentication failed: invalid password or tampered ciphertext")]
    AuthenticationFailed,
    #[error("Key derivation failed: {0}")]
    KeyDerivation(String),
    #[error("Encryption error: {0}")]
    Encryption(String),
}

/// Generates a cryptographically secure random 16-byte salt
pub fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt);
    salt
}

/// Generates a random 12-byte nonce for AES-256-GCM
pub fn generate_nonce() -> [u8; 12] {
    let mut nonce = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce);
    nonce
}

/// Derives a 256-bit encryption key using Argon2id
pub fn derive_key(password: &str, salt: &[u8]) -> Result<Zeroizing<[u8; 32]>, CryptoError> {
    let mut key = Zeroizing::new([0u8; 32]);
    let params = Params::new(65536, 3, 4, Some(32))
        .map_err(|e| CryptoError::KeyDerivation(format!("Invalid Argon2 params: {e}")))?;
    
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut *key)
        .map_err(|e| CryptoError::KeyDerivation(format!("Argon2 hash failed: {e}")))?;

    Ok(key)
}

/// Encrypts plaintext using AES-256-GCM with authenticated tag
pub fn encrypt_aes_gcm(plaintext: &[u8], key: &[u8; 32], nonce: &[u8; 12]) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| CryptoError::Encryption(format!("Cipher init failed: {e}")))?;
    let gcm_nonce = Nonce::from_slice(nonce);
    
    cipher
        .encrypt(gcm_nonce, plaintext)
        .map_err(|_| CryptoError::Encryption("AES-GCM encryption failed".to_string()))
}

/// Decrypts ciphertext using AES-256-GCM, verifying integrity
pub fn decrypt_aes_gcm(ciphertext: &[u8], key: &[u8; 32], nonce: &[u8; 12]) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| CryptoError::Encryption(format!("Cipher init failed: {e}")))?;
    let gcm_nonce = Nonce::from_slice(nonce);

    cipher
        .decrypt(gcm_nonce, ciphertext)
        .map_err(|_| CryptoError::AuthenticationFailed)
}

/// Calculates SHA-256 digest
pub fn hash_sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

/// Calculates BLAKE3 digest
pub fn hash_blake3(data: &[u8]) -> [u8; 32] {
    *blake3::hash(data).as_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypto_roundtrip() {
        let password = "SecretMasterPassword!2026";
        let salt = generate_salt();
        let nonce = generate_nonce();
        let key = derive_key(password, &salt).unwrap();

        let message = b"Confidential XRAR Archive Payload";
        let encrypted = encrypt_aes_gcm(message, &key, &nonce).unwrap();
        assert_ne!(encrypted.as_slice(), message.as_slice());

        let decrypted = decrypt_aes_gcm(&encrypted, &key, &nonce).unwrap();
        assert_eq!(decrypted.as_slice(), message.as_slice());

        // Test wrong password
        let wrong_key = derive_key("WrongPassword", &salt).unwrap();
        assert!(decrypt_aes_gcm(&encrypted, &wrong_key, &nonce).is_err());
    }

    #[test]
    fn test_hash_consistency() {
        let data = b"Integrity Check Data";
        let h1 = hash_blake3(data);
        let h2 = hash_blake3(data);
        assert_eq!(h1, h2);

        let s1 = hash_sha256(data);
        let s2 = hash_sha256(data);
        assert_eq!(s1, s2);
    }
}
