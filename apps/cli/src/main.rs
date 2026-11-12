//! XRAR Command-Line Interface (CLI)
//! Automation, high-speed terminal compression, extraction, and benchmarking.

use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;
use std::process::ExitCode;
use xrar_core::{
    convert_to_xrar, create_xrar, find_duplicates, raw_benchmark, raw_extract, raw_list, raw_test,
    CompressionProfile,
};

#[derive(Parser)]
#[command(name = "xrar")]
#[command(version = "1.0.0")]
#[command(about = "XRAR — Extreme Compression Archive: Next-generation high-performance archive manager", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Output results in JSON format for automation and scripting
    #[arg(long, global = true)]
    json: bool,
}

#[derive(ValueEnum, Clone, Copy, Debug)]
enum CliProfile {
    Fast,
    Balanced,
    High,
    Ultra,
    Extreme,
    Smart,
}

impl From<CliProfile> for CompressionProfile {
    fn from(p: CliProfile) -> Self {
        match p {
            CliProfile::Fast => CompressionProfile::Fast,
            CliProfile::Balanced => CompressionProfile::Balanced,
            CliProfile::High => CompressionProfile::High,
            CliProfile::Ultra => CompressionProfile::Ultra,
            CliProfile::Extreme => CompressionProfile::Extreme,
            CliProfile::Smart => CompressionProfile::Smart,
        }
    }
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new archive
    Create {
        /// Destination archive file (.xrar)
        archive: PathBuf,
        /// Source files or folders to include
        files: Vec<PathBuf>,
        /// Compression profile (fast, balanced, high, ultra, extreme, smart)
        #[arg(long, default_value = "smart")]
        profile: CliProfile,
        /// Password for AES-256-GCM encryption
        #[arg(short, long)]
        password: Option<String>,
        /// Enable solid compression mode
        #[arg(short, long)]
        solid: bool,
    },
    /// Extract files from an archive
    Extract {
        /// Archive path to extract
        archive: PathBuf,
        /// Output destination directory (defaults to current dir)
        #[arg(short, long, default_value = ".")]
        output: PathBuf,
        /// Decryption password if archive is encrypted
        #[arg(short, long)]
        password: Option<String>,
    },
    /// List contents of an archive
    List {
        /// Archive path to inspect
        archive: PathBuf,
        /// Password if archive metadata is encrypted
        #[arg(short, long)]
        password: Option<String>,
    },
    /// Test archive integrity and block checksums
    Test {
        /// Archive path to test
        archive: PathBuf,
        /// Decryption password if archive is encrypted
        #[arg(short, long)]
        password: Option<String>,
    },
    /// Run real-time compression hardware benchmark
    Benchmark {
        /// Dataset size in megabytes (default 5 MB)
        #[arg(short, long, default_value_t = 5)]
        size: usize,
    },
    /// Convert an existing archive (RAR, ZIP, TAR) to native XRAR
    Convert {
        /// Input source archive
        input: PathBuf,
        /// Destination .xrar archive
        output: PathBuf,
        /// Compression profile
        #[arg(long, default_value = "high")]
        profile: CliProfile,
        /// Password if input or output is encrypted
        #[arg(short, long)]
        password: Option<String>,
    },
    /// Scan directory for duplicate files
    Duplicates {
        /// Directory to analyze
        directory: PathBuf,
    },
    /// Create a Windows self-extracting executable (.exe) from an .xrar archive
    Sfx {
        /// Input .xrar archive
        archive: PathBuf,
        /// Target .exe output file (defaults to archive name with .exe)
        output: Option<PathBuf>,
    },
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    // If double-clicked in Windows Explorer (no args) or explicitly requested --gui
    if args.len() <= 1 || (args.len() == 2 && (args[1] == "--gui" || args[1] == "gui")) {
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(parent) = current_exe.parent() {
                let gui_exe = parent.join("xrar-gui.exe");
                if gui_exe.exists() {
                    let _ = std::process::Command::new(&gui_exe).spawn();
                    return ExitCode::SUCCESS;
                }
            }
        }
    }

    let cli = Cli::parse();

    match cli.command {
        Commands::Create {
            archive,
            files,
            profile,
            password,
            solid,
        } => {
            if files.is_empty() {
                eprintln!("Error: No input files specified to compress.");
                return ExitCode::FAILURE;
            }

            match create_xrar(&archive, &files, profile.into(), password.as_deref(), solid) {
                Ok(summary) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&summary).unwrap());
                    } else {
                        println!("XRAR archive created successfully: {}", archive.display());
                        println!("  Files: {}", summary.total_files);
                        println!("  Folders: {}", summary.total_folders);
                        println!("  Original size:   {} bytes", summary.uncompressed_size);
                        println!("  Compressed size: {} bytes", summary.compressed_size);
                        let ratio = if summary.uncompressed_size > 0 {
                            (summary.compressed_size as f32 / summary.uncompressed_size as f32) * 100.0
                        } else {
                            100.0
                        };
                        println!("  Compression ratio: {:.1}%", ratio);
                    }
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("Error creating archive: {e}");
                    ExitCode::FAILURE
                }
            }
        }
        Commands::Extract {
            archive,
            output,
            password,
        } => match raw_extract(&archive, &output, password.as_deref()) {
            Ok(count) => {
                if cli.json {
                    println!(
                        "{}",
                        serde_json::json!({
                            "status": "success",
                            "extracted_files": count,
                            "destination": output.display().to_string()
                        })
                    );
                } else {
                    println!("Successfully extracted {} files to: {}", count, output.display());
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("Extraction failed: {e}");
                ExitCode::FAILURE
            }
        },
        Commands::List { archive, password } => match raw_list(&archive, password.as_deref()) {
            Ok(summary) => {
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&summary).unwrap());
                } else {
                    println!("Archive: {}", archive.display());
                    println!("Format:  {:?}", summary.format);
                    println!("-------------------------------------------------------------------------------");
                    println!("{:<50} {:>12} {:>12}", "File Path", "Size", "Packed");
                    println!("-------------------------------------------------------------------------------");
                    for item in &summary.items {
                        println!("{:<50} {:>12} {:>12}", item.path, item.uncompressed_size, item.compressed_size);
                    }
                    println!("-------------------------------------------------------------------------------");
                    println!(
                        "Total: {} files, {} folders ({} -> {} bytes)",
                        summary.total_files, summary.total_folders, summary.uncompressed_size, summary.compressed_size
                    );
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("Failed to list archive: {e}");
                ExitCode::FAILURE
            }
        },
        Commands::Test { archive, password } => match raw_test(&archive, password.as_deref()) {
            Ok(result) => {
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&result).unwrap());
                } else if result.valid {
                    println!("OK: Archive {} is valid ({} files verified).", archive.display(), result.tested_files);
                } else {
                    println!("CORRUPTED: Integrity check failed with {} errors:", result.errors.len());
                    for err in &result.errors {
                        println!("  - {err}");
                    }
                }
                if result.valid {
                    ExitCode::SUCCESS
                } else {
                    ExitCode::FAILURE
                }
            }
            Err(e) => {
                eprintln!("Integrity test failed: {e}");
                ExitCode::FAILURE
            }
        },
        Commands::Benchmark { size } => match raw_benchmark(size) {
            Ok(report) => {
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&report).unwrap());
                } else {
                    println!("===============================================================================");
                    println!("XRAR Hardware Compression Benchmark (Dataset: {} MB)", report.total_input_mb);
                    println!("===============================================================================");
                    println!(
                        "{:<12} {:>12} {:>12} {:>10} {:>10}",
                        "Codec", "Comp (MB/s)", "Decomp(MB/s)", "Ratio %", "Time (ms)"
                    );
                    println!("-------------------------------------------------------------------------------");
                    for r in &report.results {
                        println!(
                            "{:<12} {:>12.1} {:>12.1} {:>9.1}% {:>10}",
                            r.codec_name,
                            r.compression_speed_mbs,
                            r.decompression_speed_mbs,
                            r.compression_ratio_pct,
                            r.compression_time_ms
                        );
                    }
                    println!("-------------------------------------------------------------------------------");
                    println!("Overall System Benchmark Score: {}", report.overall_score);
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("Benchmark failed: {e}");
                ExitCode::FAILURE
            }
        },
        Commands::Convert {
            input,
            output,
            profile,
            password,
        } => match convert_to_xrar(&input, &output, profile.into(), password.as_deref()) {
            Ok(summary) => {
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&summary).unwrap());
                } else {
                    println!("Archive converted successfully to: {}", output.display());
                    println!("  Total files: {}", summary.total_files);
                    println!("  Final size:  {} bytes", summary.compressed_size);
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("Conversion failed: {e}");
                ExitCode::FAILURE
            }
        },
        Commands::Duplicates { directory } => match find_duplicates(&directory) {
            Ok(groups) => {
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&groups).unwrap());
                } else if groups.is_empty() {
                    println!("No duplicate files found in: {}", directory.display());
                } else {
                    println!("Found {} duplicate file groups in: {}", groups.len(), directory.display());
                    let mut total_savable = 0u64;
                    for (i, g) in groups.iter().enumerate() {
                        println!(
                            "\nGroup #{} - Size: {} bytes (Potential saving: {} bytes)",
                            i + 1,
                            g.file_size,
                            g.potential_savings
                        );
                        total_savable += g.potential_savings;
                        for p in &g.file_paths {
                            println!("  - {}", p.display());
                        }
                    }
                    println!("\nTotal potential storage reclaim: {} bytes", total_savable);
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("Duplicate search failed: {e}");
                ExitCode::FAILURE
            }
        },
        Commands::Sfx { archive, output } => {
            let out_exe = output.unwrap_or_else(|| {
                let mut p = archive.clone();
                p.set_extension("exe");
                p
            });

            let stub_candidates = [
                PathBuf::from("dist/XRAR-1.0.0-SFX-Stub.exe"),
                PathBuf::from("XRAR-1.0.0-SFX-Stub.exe"),
                PathBuf::from("C:\\Program Files\\XRAR\\xrar-sfx.exe"),
                std::env::current_exe().unwrap_or_default().with_file_name("xrar-sfx.exe"),
            ];

            let mut stub_bytes = None;
            for cand in &stub_candidates {
                if let Ok(bytes) = std::fs::read(cand) {
                    stub_bytes = Some(bytes);
                    break;
                }
            }

            let stub = match stub_bytes {
                Some(b) => b,
                None => {
                    eprintln!("Error: SFX stub binary (XRAR-1.0.0-SFX-Stub.exe) not found.");
                    return ExitCode::FAILURE;
                }
            };

            match xrar_core::create_sfx_executable(&archive, &out_exe, &stub) {
                Ok(size) => {
                    if cli.json {
                        println!(
                            "{}",
                            serde_json::json!({
                                "status": "success",
                                "sfx_executable": out_exe.display().to_string(),
                                "file_size": size
                            })
                        );
                    } else {
                        println!("Successfully generated SFX archive: {}", out_exe.display());
                        println!("  Size: {} bytes", size);
                    }
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("SFX generation failed: {e}");
                    ExitCode::FAILURE
                }
            }
        }
    }
}
