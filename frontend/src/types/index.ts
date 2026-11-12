export type Language = 'en' | 'ar';
export type Theme = 'dark' | 'light' | 'system';

export type CompressionProfile = 'fast' | 'balanced' | 'high' | 'ultra' | 'extreme' | 'smart';
export type SupportedFormat = 'xrar' | 'zip' | 'tar' | 'rar' | '7z' | 'iso';
export type SolidMode = 'no_solid' | 'small' | 'medium' | 'large' | 'maximum' | 'smart';

export interface ArchiveItem {
  path: string;
  uncompressed_size: number;
  compressed_size: number;
  compression_ratio: number;
  is_dir: boolean;
  modified_timestamp: number;
  checksum: string;
}

export interface ArchiveSummary {
  total_files: number;
  total_folders: number;
  uncompressed_size: number;
  compressed_size: number;
  format: string;
  items: ArchiveItem[];
  comment?: string;
  has_recovery_record?: boolean;
  recovery_record_pct?: number;
  is_solid?: boolean;
  is_encrypted?: boolean;
  encryption_algorithm?: string;
  dictionary_size_kb?: number;
}

export interface ExtractOptions {
  destination: string;
  overwrite_mode: 'ask' | 'overwrite' | 'skip';
  extract_to_subfolder: boolean;
  open_folder_after: boolean;
}

export interface ProgressState {
  active: boolean;
  title: string;
  current_file: string;
  percentage: number;
  speed_mbs: number;
  cpu_pct: number;
  ram_mb: number;
  elapsed_secs: number;
  remaining_secs: number;
  original_bytes: number;
  compressed_bytes: number;
}

export interface CodecBenchmarkResult {
  codec_name: string;
  input_size_bytes: number;
  compressed_size_bytes: number;
  compression_ratio_pct: number;
  compression_speed_mbs: number;
  decompression_speed_mbs: number;
  compression_time_ms: number;
  decompression_time_ms: number;
}

export interface BenchmarkReport {
  total_input_mb: number;
  results: CodecBenchmarkResult[];
  overall_score: number;
}

export interface DuplicateGroup {
  hash: string;
  file_size: number;
  potential_savings: number;
  file_paths: string[];
}
