//! XRAR Plugin & Codec Extension API
//! Allows safe sandboxed registration of custom compression algorithms and external decoders.

use thiserror::Error;

#[derive(Error, Debug)]
pub enum PluginError {
    #[error("Plugin error: {0}")]
    Error(String),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub author: String,
    pub supported_extensions: Vec<String>,
    pub provides_compression: bool,
    pub provides_decompression: bool,
}

pub trait XrarPlugin: Send + Sync {
    fn manifest(&self) -> PluginManifest;
    fn process_block(&self, data: &[u8]) -> Result<Vec<u8>, PluginError>;
}
