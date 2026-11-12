import { invoke } from '@tauri-apps/api/core';
import {
  ArchiveSummary,
  BenchmarkReport,
  DuplicateGroup,
  FsItem,
  TestResult,
} from '../types';

export const isRunningInTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export async function readDirectory(path?: string): Promise<FsItem[]> {
  if (!isRunningInTauri()) {
    return [
      { name: 'Documents', path: 'C:\\Users\\USER\\Documents', is_dir: true, size: 0, modified_timestamp: Date.now() / 1000 },
      { name: 'Downloads', path: 'C:\\Users\\USER\\Downloads', is_dir: true, size: 0, modified_timestamp: Date.now() / 1000 },
      { name: 'Sample_Archive.xrar', path: 'C:\\Users\\USER\\Downloads\\Sample_Archive.xrar', is_dir: false, size: 1048576, modified_timestamp: Date.now() / 1000 },
      { name: 'Report.pdf', path: 'C:\\Users\\USER\\Documents\\Report.pdf', is_dir: false, size: 524288, modified_timestamp: Date.now() / 1000 },
    ];
  }
  return await invoke<FsItem[]>('read_directory', { path: path || null });
}

export async function getDrives(): Promise<string[]> {
  if (!isRunningInTauri()) {
    return ['C:\\', 'D:\\'];
  }
  return await invoke<string[]>('get_drives');
}

export async function listArchive(path: string, password?: string): Promise<ArchiveSummary> {
  return await invoke<ArchiveSummary>('list_archive', { path, password: password || null });
}

export async function createArchive(
  archive: string,
  files: string[],
  profile: string,
  password?: string,
  solid: boolean = true
): Promise<ArchiveSummary> {
  return await invoke<ArchiveSummary>('create_archive', {
    archive,
    files,
    profile,
    password: password || null,
    solid,
  });
}

export async function extractArchive(
  archive: string,
  destination: string,
  password?: string
): Promise<number> {
  return await invoke<number>('extract_archive', {
    archive,
    destination,
    password: password || null,
  });
}

export async function testArchive(archive: string, password?: string): Promise<TestResult> {
  return await invoke<TestResult>('test_archive', {
    archive,
    password: password || null,
  });
}

export async function runBenchmark(sizeMb: number): Promise<BenchmarkReport> {
  return await invoke<BenchmarkReport>('run_benchmark', { sizeMb });
}

export async function findDuplicates(dir: string): Promise<DuplicateGroup[]> {
  return await invoke<DuplicateGroup[]>('find_duplicates', { dir });
}

export async function convertArchive(
  source: string,
  dest: string,
  profile: string,
  password?: string
): Promise<ArchiveSummary> {
  return await invoke<ArchiveSummary>('convert_archive', {
    source,
    dest,
    profile,
    password: password || null,
  });
}

export async function readFilePreview(path: string, maxBytes?: number): Promise<string> {
  return await invoke<string>('read_file_preview', {
    path,
    maxBytes: maxBytes || null,
  });
}

export async function browseFolder(): Promise<string | null> {
  if (!isRunningInTauri()) return null;
  return await invoke<string | null>('browse_folder');
}

export async function browseFiles(): Promise<string[]> {
  if (!isRunningInTauri()) return [];
  return await invoke<string[]>('browse_files');
}

export async function browseArchiveFile(): Promise<string | null> {
  if (!isRunningInTauri()) return null;
  return await invoke<string | null>('browse_archive_file');
}

export async function browseSaveArchive(): Promise<string | null> {
  if (!isRunningInTauri()) return null;
  return await invoke<string | null>('browse_save_archive');
}

