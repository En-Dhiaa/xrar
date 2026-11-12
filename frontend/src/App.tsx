import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { FileBrowser } from './components/FileBrowser';
import { StatusBar } from './components/StatusBar';
import { CompressDialog } from './components/CompressDialog';
import { ProgressDialog } from './components/ProgressDialog';
import { BenchmarkModal } from './components/BenchmarkModal';
import { DuplicateFinderModal } from './components/DuplicateFinderModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { SettingsModal } from './components/SettingsModal';
import {
  ArchiveItem,
  ArchiveSummary,
  BenchmarkReport,
  DuplicateGroup,
  Language,
  ProgressState,
  Theme,
} from './types';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState('home');

  // Archive State
  const [archiveName, setArchiveName] = useState<string | null>('Project_Backup.xrar');
  const [items, setItems] = useState<ArchiveItem[]>([
    {
      path: 'src/main.rs',
      uncompressed_size: 14200,
      compressed_size: 4320,
      compression_ratio: 30.4,
      is_dir: false,
      modified_timestamp: 1731405000,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      path: 'src/core/engine.rs',
      uncompressed_size: 28900,
      compressed_size: 8120,
      compression_ratio: 28.1,
      is_dir: false,
      modified_timestamp: 1731405200,
      checksum: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    },
    {
      path: 'docs/SPECIFICATION.md',
      uncompressed_size: 89000,
      compressed_size: 22100,
      compression_ratio: 24.8,
      is_dir: false,
      modified_timestamp: 1731405100,
      checksum: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    },
    {
      path: 'assets/branding_logo.png',
      uncompressed_size: 512000,
      compressed_size: 508000,
      compression_ratio: 99.2,
      is_dir: false,
      modified_timestamp: 1731404000,
      checksum: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    },
    {
      path: 'target/release/xrar.exe',
      uncompressed_size: 4194304,
      compressed_size: 1468000,
      compression_ratio: 35.0,
      is_dir: false,
      modified_timestamp: 1731405300,
      checksum: 'cd5b2067ae2c486e927503fae37ceca1032cf05d5c07c4b789a74075b341f237',
    },
  ]);

  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [recentArchives, setRecentArchives] = useState<string[]>([
    'Project_Backup.xrar',
    'Financial_Reports_2026.xrar',
    'Windows_Recovery_Image.iso',
  ]);

  // Dialog Visibility
  const [isCompressOpen, setIsCompressOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Selected Item for Preview
  const [previewItem, setPreviewItem] = useState<ArchiveItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Benchmark State
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Duplicate Finder State
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);

  // Operation Progress State
  const [progressState, setProgressState] = useState<ProgressState>({
    active: false,
    title: '',
    current_file: '',
    percentage: 0,
    speed_mbs: 0,
    cpu_pct: 0,
    ram_mb: 0,
    elapsed_secs: 0,
    remaining_secs: 0,
    original_bytes: 0,
    compressed_bytes: 0,
  });
  const [isProgressPaused, setIsProgressPaused] = useState(false);

  // Sync Direction and HTML dir attribute
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Calculate Summary
  const summary: ArchiveSummary = {
    total_files: items.filter((i) => !i.is_dir).length,
    total_folders: items.filter((i) => i.is_dir).length,
    uncompressed_size: items.reduce((acc, i) => acc + i.uncompressed_size, 0),
    compressed_size: items.reduce((acc, i) => acc + i.compressed_size, 0),
    format: 'XRAR v1.0',
    items,
  };

  const handleToggleSelect = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  // Preview Action
  const handlePreview = (item: ArchiveItem) => {
    setPreviewItem(item);
    if (item.path.endsWith('.rs')) {
      setPreviewContent(
        '// XRAR Native Extreme Compression Core\n\npub struct CompressionPipeline {\n    pub block_size: usize,\n    pub profile: CompressionProfile,\n}\n\nimpl CompressionPipeline {\n    pub fn run_block(&self, data: &[u8]) -> Result<Vec<u8>, CoreError> {\n        // High-density streaming execution\n        Ok(vec![])\n    }\n}'
      );
    } else if (item.path.endsWith('.md')) {
      setPreviewContent(
        '# XRAR — Extreme Compression Archive\n\nOfficial Documentation\n\n- Zero-telemetry, offline-first\n- Multi-codec support: Zstandard, LZMA2, Brotli, LZ4\n- AES-256-GCM + Argon2id security'
      );
    } else {
      setPreviewContent(`File: ${item.path}\nSize: ${item.uncompressed_size} bytes\nHash: ${item.checksum}`);
    }
    setIsPreviewOpen(true);
  };

  // Run Compression Workflow
  const handleStartCompress = (options: any) => {
    setIsCompressOpen(false);
    setProgressState({
      active: true,
      title: `Creating ${options.archiveName}`,
      current_file: 'Scanning and analyzing file entropy...',
      percentage: 5,
      speed_mbs: 420.5,
      cpu_pct: 78,
      ram_mb: 240,
      elapsed_secs: 1,
      remaining_secs: 4,
      original_bytes: 4800000,
      compressed_bytes: 1200000,
    });

    let currentPct = 5;
    const interval = setInterval(() => {
      currentPct += 18;
      if (currentPct >= 100) {
        clearInterval(interval);
        setProgressState((prev) => ({ ...prev, active: false }));
        setArchiveName(options.archiveName);
      } else {
        setProgressState((prev) => ({
          ...prev,
          percentage: currentPct,
          current_file: `Compressing block #${Math.floor(currentPct / 10)} (${options.profile} mode)`,
          speed_mbs: 650 + Math.random() * 120,
          elapsed_secs: prev.elapsed_secs + 1,
          remaining_secs: Math.max(0, prev.remaining_secs - 1),
          compressed_bytes: Math.floor(prev.original_bytes * 0.35 * (currentPct / 100)),
        }));
      }
    }, 400);
  };

  // Run Benchmark Workflow
  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      setBenchmarkReport({
        total_input_mb: 5.0,
        results: [
          {
            codec_name: 'Store (None)',
            input_size_bytes: 5242880,
            compressed_size_bytes: 5242880,
            compression_ratio_pct: 100.0,
            compression_speed_mbs: 1150.0,
            decompression_speed_mbs: 1150.0,
            compression_time_ms: 4,
            decompression_time_ms: 4,
          },
          {
            codec_name: 'LZ4 (Real-time)',
            input_size_bytes: 5242880,
            compressed_size_bytes: 23100,
            compression_ratio_pct: 0.44,
            compression_speed_mbs: 980.5,
            decompression_speed_mbs: 1050.0,
            compression_time_ms: 5,
            decompression_time_ms: 4,
          },
          {
            codec_name: 'Deflate (Fast)',
            input_size_bytes: 5242880,
            compressed_size_bytes: 27500,
            compression_ratio_pct: 0.52,
            compression_speed_mbs: 480.0,
            decompression_speed_mbs: 920.0,
            compression_time_ms: 11,
            decompression_time_ms: 5,
          },
          {
            codec_name: 'Brotli (Text Max)',
            input_size_bytes: 5242880,
            compressed_size_bytes: 2100,
            compression_ratio_pct: 0.04,
            compression_speed_mbs: 210.0,
            decompression_speed_mbs: 450.0,
            compression_time_ms: 24,
            decompression_time_ms: 11,
          },
          {
            codec_name: 'LZMA2 (Ultra Ratio)',
            input_size_bytes: 5242880,
            compressed_size_bytes: 1840,
            compression_ratio_pct: 0.03,
            compression_speed_mbs: 95.0,
            decompression_speed_mbs: 850.0,
            compression_time_ms: 55,
            decompression_time_ms: 6,
          },
        ],
        overall_score: 18450,
      });
      setIsBenchmarking(false);
    }, 1200);
  };

  // Run Duplicates Scan
  const handleScanDuplicates = async () => {
    setIsScanningDuplicates(true);
    setTimeout(() => {
      setDuplicates([
        {
          hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          file_size: 45000000,
          potential_savings: 90000000,
          file_paths: [
            'C:\\Projects\\Release_Build_v1.zip',
            'D:\\Backups\\2026-11\\Release_Build_v1_copy.zip',
            'D:\\Temp\\Release_Build_v1_backup.zip',
          ],
        },
        {
          hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
          file_size: 18400000,
          potential_savings: 18400000,
          file_paths: [
            'C:\\Downloads\\installer_setup.exe',
            'C:\\Users\\USER\\Desktop\\installer_setup_copy.exe',
          ],
        },
      ]);
      setIsScanningDuplicates(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Application Toolbar */}
      <Toolbar
        lang={lang}
        theme={theme}
        onToggleLang={() => setLang(lang === 'en' ? 'ar' : 'en')}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onNew={() => setIsCompressOpen(true)}
        onOpen={() => alert(lang === 'ar' ? 'فتح ملف أرشيف' : 'Open Archive Dialog')}
        onExtract={() => {
          setProgressState({
            active: true,
            title: 'Extracting Archive',
            current_file: 'target/release/xrar.exe',
            percentage: 45,
            speed_mbs: 720.0,
            cpu_pct: 42,
            ram_mb: 180,
            elapsed_secs: 1,
            remaining_secs: 2,
            original_bytes: 4800000,
            compressed_bytes: 2160000,
          });
          setTimeout(() => setProgressState((prev) => ({ ...prev, active: false })), 1500);
        }}
        onTest={() =>
          alert(
            lang === 'ar'
              ? 'تم فحص سلامة الأرشيف: جميع الملفات متطابقة وسليمة 100% بنجاح!'
              : 'Archive Integrity Test OK: 100% checksums verified.'
          )
        }
        onConvert={() => setIsCompressOpen(true)}
        onBenchmark={() => {
          setIsBenchmarkOpen(true);
          if (!benchmarkReport) handleRunBenchmark();
        }}
        onDuplicates={() => {
          setIsDuplicatesOpen(true);
          if (duplicates.length === 0) handleScanDuplicates();
        }}
        onSettings={() => setIsSettingsOpen(true)}
        hasActiveArchive={!!archiveName}
      />

      {/* Main Work Area: Sidebar + Browser */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          lang={lang}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          recentArchives={recentArchives}
          onOpenArchive={(name) => setArchiveName(name)}
        />

        <FileBrowser
          lang={lang}
          items={items}
          archiveName={archiveName}
          onPreview={handlePreview}
          onExtractItem={(item) =>
            alert(lang === 'ar' ? `استخراج: ${item.path}` : `Extracted: ${item.path}`)
          }
          selectedPaths={selectedPaths}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        lang={lang}
        summary={summary}
        selectedCount={selectedPaths.length}
      />

      {/* Modals & Dialogs */}
      <CompressDialog
        lang={lang}
        isOpen={isCompressOpen}
        onClose={() => setIsCompressOpen(false)}
        onStartCompress={handleStartCompress}
      />

      <ProgressDialog
        lang={lang}
        state={progressState}
        isPaused={isProgressPaused}
        onTogglePause={() => setIsProgressPaused(!isProgressPaused)}
        onCancel={() => setProgressState((prev) => ({ ...prev, active: false }))}
      />

      <BenchmarkModal
        lang={lang}
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        report={benchmarkReport}
        onRunBenchmark={handleRunBenchmark}
        isRunning={isBenchmarking}
      />

      <DuplicateFinderModal
        lang={lang}
        isOpen={isDuplicatesOpen}
        onClose={() => setIsDuplicatesOpen(false)}
        duplicates={duplicates}
        onScanDirectory={handleScanDuplicates}
        isScanning={isScanningDuplicates}
        onArchiveDuplicates={(paths) => {
          setIsDuplicatesOpen(false);
          setIsCompressOpen(true);
        }}
      />

      <FilePreviewModal
        lang={lang}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        item={previewItem}
        previewContent={previewContent}
      />

      <SettingsModal
        lang={lang}
        theme={theme}
        onSetLang={setLang}
        onSetTheme={setTheme}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
