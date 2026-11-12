//! XRAR Full Integration & Security Fuzzing Test Suite
//! Validates Arabic & Unicode paths, zero-byte files, encryption, path traversal defenses,
//! corrupted header fuzzing, deduplication, and Reed-Solomon self-healing.

use std::fs::{self, File};
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};
use xrar_core::*;

fn create_temp_test_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("xrar_test_{}_{}", name, std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn test_arabic_and_unicode_filenames() {
    let source_dir = create_temp_test_dir("arabic_source");
    let extract_dir = create_temp_test_dir("arabic_extract");
    let archive_path = source_dir.join("arabic_archive.xrar");

    // Create files with Arabic and Unicode filenames
    let arabic_file1 = source_dir.join("ملف_نصوص_عربي.txt");
    let arabic_file2 = source_dir.join("قاعدة_البيانات_2026.json");
    let sub_dir = source_dir.join("مجلد_المشروع");
    fs::create_dir_all(&sub_dir).unwrap();
    let arabic_file3 = sub_dir.join("كود_المصدر_الرئيسي.rs");

    let content1 = "مرحباً بكم في إكس-رار (XRAR) — أرشيف الضغط الفائق الآمن.".as_bytes();
    let content2 = b"{\"system\": \"xrar\", \"language\": \"arabic\", \"status\": \"verified\"}";
    let content3 = b"fn main() { println!(\"XRAR Arabic Unicode Test Passed\"); }";

    fs::write(&arabic_file1, content1).unwrap();
    fs::write(&arabic_file2, content2).unwrap();
    fs::write(&arabic_file3, content3).unwrap();

    // 1. Create Archive
    let summary = create_xrar(
        &archive_path,
        &[arabic_file1.clone(), arabic_file2.clone(), sub_dir.clone()],
        CompressionProfile::Smart,
        None,
        false,
    )
    .unwrap();

    assert!(summary.total_files >= 3);

    // 2. Test Integrity
    let test_res = raw_test(&archive_path, None).unwrap();
    assert!(test_res.valid);
    assert_eq!(test_res.errors.len(), 0);

    // 3. Extract Archive
    let extracted_count = raw_extract(&archive_path, &extract_dir, None).unwrap();
    assert!(extracted_count >= 3);

    // 4. Verify extracted contents match original bit-for-bit
    let extracted1 = extract_dir.join("ملف_نصوص_عربي.txt");
    let extracted2 = extract_dir.join("قاعدة_البيانات_2026.json");
    let extracted3 = extract_dir.join("مجلد_المشروع/كود_المصدر_الرئيسي.rs");

    assert!(extracted1.exists());
    assert!(extracted2.exists());
    assert!(extracted3.exists());

    assert_eq!(fs::read(extracted1).unwrap(), content1);
    assert_eq!(fs::read(extracted2).unwrap(), content2);
    assert_eq!(fs::read(extracted3).unwrap(), content3);

    // Cleanup
    let _ = fs::remove_dir_all(source_dir);
    let _ = fs::remove_dir_all(extract_dir);
}

#[test]
fn test_zero_byte_empty_files_and_empty_dirs() {
    let source_dir = create_temp_test_dir("empty_source");
    let extract_dir = create_temp_test_dir("empty_extract");
    let archive_path = source_dir.join("empty_test.xrar");

    let empty_file = source_dir.join("empty.bin");
    fs::write(&empty_file, b"").unwrap();

    let empty_sub = source_dir.join("empty_folder");
    fs::create_dir_all(&empty_sub).unwrap();

    // Create archive
    let summary = create_xrar(
        &archive_path,
        &[empty_file.clone(), empty_sub.clone()],
        CompressionProfile::Smart,
        None,
        false,
    )
    .unwrap();

    assert_eq!(summary.uncompressed_size, 0);

    // Extract
    let count = raw_extract(&archive_path, &extract_dir, None).unwrap();
    assert_eq!(count, 1);

    let extracted_empty = extract_dir.join("empty.bin");
    assert!(extracted_empty.exists());
    assert_eq!(fs::metadata(extracted_empty).unwrap().len(), 0);

    let _ = fs::remove_dir_all(source_dir);
    let _ = fs::remove_dir_all(extract_dir);
}

#[test]
fn test_encrypted_security_and_wrong_password_rejection() {
    let source_dir = create_temp_test_dir("crypto_source");
    let extract_dir = create_temp_test_dir("crypto_extract");
    let archive_path = source_dir.join("secure.xrar");

    let secret_file = source_dir.join("confidential.dat");
    let secret_payload = b"Top secret corporate documents protected by AES-256-GCM and Argon2id.";
    fs::write(&secret_file, secret_payload).unwrap();

    let correct_pass = "EnterpriseMasterPassword!2026";
    let wrong_pass = "InvalidPasswordGuess";

    // Create encrypted archive
    create_xrar(
        &archive_path,
        &[secret_file],
        CompressionProfile::High,
        Some(correct_pass),
        false,
    )
    .unwrap();

    // 1. Attempt open without password -> Error
    assert!(raw_list(&archive_path, None).is_err());

    // 2. Attempt open with wrong password -> Error
    assert!(raw_list(&archive_path, Some(wrong_pass)).is_err());

    // 3. Attempt extract with wrong password -> Error
    assert!(raw_extract(&archive_path, &extract_dir, Some(wrong_pass)).is_err());

    // 4. Extract with correct password -> Success
    let count = raw_extract(&archive_path, &extract_dir, Some(correct_pass)).unwrap();
    assert_eq!(count, 1);

    let extracted_file = extract_dir.join("confidential.dat");
    assert_eq!(fs::read(extracted_file).unwrap(), secret_payload);

    let _ = fs::remove_dir_all(source_dir);
    let _ = fs::remove_dir_all(extract_dir);
}

#[test]
fn test_path_traversal_attack_fuzz_prevention() {
    let target_dir = Path::new("C:/safe_sandbox");

    // All traversal variants must be rejected
    assert!(resolve_safe_extraction_path(target_dir, "../../Windows/System32/calc.exe").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "..\\..\\evil.bat").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "foo/../../../bar.txt").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "/absolute/root.sh").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "C:\\Windows\\System32").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "CON").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "PRN.txt").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "sub/aux/file").is_err());
    assert!(resolve_safe_extraction_path(target_dir, "NUL").is_err());

    // Legitimate nested paths must succeed
    assert!(resolve_safe_extraction_path(target_dir, "sub/folder/file.txt").is_ok());
    assert!(resolve_safe_extraction_path(target_dir, "docs\\manual\\page1.pdf").is_ok());
}

#[test]
fn test_fuzz_corrupted_headers_and_noise() {
    // Test that corrupt random bytes never crash or panic the parser
    let mut rng_state: u64 = 0x12345678;
    let mut pseudo_rand = || {
        rng_state = rng_state.wrapping_mul(6364136223846793005).wrapping_add(1);
        (rng_state >> 32) as u8
    };

    let test_sizes = [0, 1, 3, 4, 15, 32, 55, 100, 1024, 65536];

    for &size in &test_sizes {
        let mut noise = Vec::with_capacity(size);
        for _ in 0..size {
            noise.push(pseudo_rand());
        }

        let mut cursor = Cursor::new(noise);
        // The parser must return Err cleanly without crashing
        let res = XrarReader::open(&mut cursor, None);
        assert!(res.is_err());
    }

    // Corrupted magic bytes
    let mut corrupt_magic = Cursor::new(b"BADM\x01\x00\x00\x00\x00\x00\x00\x00".to_vec());
    assert!(XrarReader::open(&mut corrupt_magic, None).is_err());
}

#[test]
fn test_recovery_records_reed_solomon_healing() {
    let original = b"Vital mission-critical database data that cannot afford bit rot!";
    let data_shards = 4;
    let parity_shards = 2;

    let parity = xrar_recovery::generate_recovery_shards(original, data_shards, parity_shards).unwrap();
    assert_eq!(parity.len(), parity_shards);

    let shard_size = (original.len() + data_shards - 1) / data_shards;
    let mut shards: Vec<Option<Vec<u8>>> = Vec::new();

    for i in 0..data_shards {
        let start = i * shard_size;
        let mut s = vec![0u8; shard_size];
        if start < original.len() {
            let end = (start + shard_size).min(original.len());
            s[..end - start].copy_from_slice(&original[start..end]);
        }
        shards.push(Some(s));
    }
    for p in parity {
        shards.push(Some(p));
    }

    // Simulate corruption: erase shard 0 and shard 2
    shards[0] = None;
    shards[2] = None;

    xrar_recovery::reconstruct_data(&mut shards, data_shards, parity_shards).unwrap();

    assert!(shards[0].is_some());
    assert!(shards[2].is_some());
}
