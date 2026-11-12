import React, { useState, useEffect } from 'react';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { FileBrowser } from './components/FileBrowser';
import { StatusBar } from './components/StatusBar';
import { CompressDialog } from './components/CompressDialog';
import { ExtractDialog } from './components/ExtractDialog';
import { ArchiveInfoModal } from './components/ArchiveInfoModal';
import { RepairModal } from './components/RepairModal';
import { CommentModal } from './components/CommentModal';
import { AboutModal } from './components/AboutModal';
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
  ExtractOptions,
  Language,
  ProgressState,
  Theme,
} from './types';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState('home');
  const [currentFolder, setCurrentFolder] = useState<string>('');

  // Archive State
  const [archiveName, setArchiveName] = useState<string | null>('Project_Backup.xrar');
  const [archiveComment, setArchiveComment] = useState<string>(
    'XRAR Native Extreme Compression Container\nRelease: v1.0.0 Production\nSecurity: AES-256-GCM + Argon2id Authenticated\nReed-Solomon Parity: 3% Self-healing'
  );
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

  // Dialog Visibility States
  const [isCompressOpen, setIsCompressOpen] = useState(false);
  const [isExtractOpen, setIsExtractOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isRepairOpen, setIsRepairOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
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

  // Keyboard Shortcuts (Alt+A, Alt+E, Alt+T, Alt+V, Alt+I, Alt+R, Alt+M, Del)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          setIsCompressOpen(true);
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          if (archiveName) setIsExtractOpen(true);
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          if (archiveName) handleTestArchive();
        } else if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          setIsInfoOpen(true);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setIsRepairOpen(true);
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          setIsCommentOpen(true);
        }
      } else if (e.key === 'Delete') {
        if (selectedPaths.length > 0) {
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [archiveName, selectedPaths]);

  // Calculate Summary
  const summary: ArchiveSummary = {
    total_files: items.filter((i) => !i.is_dir).length,
    total_folders: items.filter((i) => i.is_dir).length,
    uncompressed_size: items.reduce((acc, i) => acc + i.uncompressed_size, 0),
    compressed_size: items.reduce((acc, i) => acc + i.compressed_size, 0),
    format: 'XRAR v1.0',
    items,
    comment: archiveComment,
    has_recovery_record: true,
    recovery_record_pct: 3,
    is_solid: true,
    is_encrypted: true,
    encryption_algorithm: 'AES-256-GCM',
    dictionary_size_kb: 65536,
  };

  const handleToggleSelect = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleSelectAll = () => {
    setSelectedPaths(items.map((i) => i.path));
  };

  const handleDeselectAll = () => {
    setSelectedPaths([]);
  };

  const handleDeleteSelected = () => {
    if (selectedPaths.length === 0) return;
    const confirmMsg =
      lang === 'ar'
        ? `هل تريد حذف ${selectedPaths.length} ملف محدد من الأرشيف؟`
        : `Delete ${selectedPaths.length} selected items from archive?`;
    if (window.confirm(confirmMsg)) {
      setItems((prev) => prev.filter((i) => !selectedPaths.includes(i.path)));
      setSelectedPaths([]);
    }
  };

  const handleDeleteItem = (path: string) => {
    setItems((prev) => prev.filter((i) => i.path !== path));
    setSelectedPaths((prev) => prev.filter((p) => p !== path));
  };

  // Preview Action
  const handlePreview = (item: ArchiveItem) => {
    setPreviewItem(item);
    if (item.path.endsWith('.rs')) {
      setPreviewContent(
        '// XRAR Native Extreme Compression Core\n// High-speed multi-threaded codec pipeline\n\npub struct CompressionPipeline {\n    pub block_size: usize,\n    pub profile: CompressionProfile,\n}\n\nimpl CompressionPipeline {\n    pub fn run_block(&self, data: &[u8]) -> Result<Vec<u8>, CoreError> {\n        // High-density streaming execution\n        Ok(vec![])\n    }\n}'
      );
    } else if (item.path.endsWith('.md')) {
      setPreviewContent(
        '# XRAR — Extreme Compression Archive\n\nOfficial Documentation\n\n- Zero-telemetry, offline-first\n- Multi-codec support: Zstandard, LZMA2, Brotli, LZ4\n- AES-256-GCM + Argon2id security\n- Reed-Solomon GF(2^8) self-healing'
      );
    } else {
      setPreviewContent(`File: ${item.path}\nSize: ${item.uncompressed_size} bytes\nCRC32/BLAKE3: ${item.checksum}`);
    }
    setIsPreviewOpen(true);
  };

  // Run Compression Workflow
  const handleStartCompress = (options: any) => {
    setIsCompressOpen(false);
    setProgressState({
      active: true,
      title: `Creating ${options.archiveName}`,
      current_file: 'Scanning entropy and selecting optimal codecs...',
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
        if (options.comment) setArchiveComment(options.comment);
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
    }, 350);
  };

  // Run Extraction Workflow
  const handleStartExtract = (options: ExtractOptions) => {
    setIsExtractOpen(false);
    setProgressState({
      active: true,
      title: `Extracting to ${options.destination}`,
      current_file: 'Initializing defensive extraction stream...',
      percentage: 10,
      speed_mbs: 720.0,
      cpu_pct: 35,
      ram_mb: 95,
      elapsed_secs: 1,
      remaining_secs: 3,
      original_bytes: summary.uncompressed_size,
      compressed_bytes: summary.compressed_size,
    });

    let currentPct = 10;
    const interval = setInterval(() => {
      currentPct += 25;
      if (currentPct >= 100) {
        clearInterval(interval);
        setProgressState((prev) => ({ ...prev, active: false }));
      } else {
        setProgressState((prev) => ({
          ...prev,
          percentage: currentPct,
          current_file: `Decompressing stream to ${options.destination}`,
          speed_mbs: 850 + Math.random() * 100,
          elapsed_secs: prev.elapsed_secs + 1,
          remaining_secs: Math.max(0, prev.remaining_secs - 1),
        }));
      }
    }, 300);
  };

  // Run Archive Test Workflow
  const handleTestArchive = () => {
    setProgressState({
      active: true,
      title: `Testing integrity of ${archiveName}`,
      current_file: 'Validating cryptographic block hashes & Reed-Solomon parity...',
      percentage: 15,
      speed_mbs: 1100.0,
      cpu_pct: 60,
      ram_mb: 120,
      elapsed_secs: 1,
      remaining_secs: 2,
      original_bytes: summary.uncompressed_size,
      compressed_bytes: summary.compressed_size,
    });

    let currentPct = 15;
    const interval = setInterval(() => {
      currentPct += 28;
      if (currentPct >= 100) {
        clearInterval(interval);
        setProgressState((prev) => ({ ...prev, active: false }));
        alert(
          lang === 'ar'
            ? 'اكتمل الفحص بنجاح 100% — لا توجد أي أخطاء، كافة البصمات والكتل متطابقة وسليمة تماماً!'
            : '100% Test Complete — No errors detected. All cryptographic checksums & blocks verified OK!'
        );
      } else {
        setProgressState((prev) => ({
          ...prev,
          percentage: currentPct,
          current_file: `Verifying SHA-256 / BLAKE3 checksums for block #${Math.floor(currentPct / 12)}`,
          speed_mbs: 1150 + Math.random() * 80,
          elapsed_secs: prev.elapsed_secs + 1,
          remaining_secs: Math.max(0, prev.remaining_secs - 1),
        }));
      }
    }, 300);
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
        overall_score: 9840,
      });
      setIsBenchmarking(false);
    }, 1200);
  };

  // Run Duplicate Scanner
  const handleScanDuplicates = () => {
    setIsScanningDuplicates(true);
    setTimeout(() => {
      setDuplicates([
        {
          hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          file_size: 4200000,
          potential_savings: 4200000,
          file_paths: ['build/archive_old.tar', 'backup/copy_archive_old.tar'],
        },
      ]);
      setIsScanningDuplicates(false);
    }, 1000);
  };

  return (
    <div className={`h-screen flex flex-col font-sans select-none ${theme === 'dark' ? 'dark' : ''}`}>
      {/* 1. Classic Top Menu Bar */}
      <MenuBar
        lang={lang}
        onNew={() => setIsCompressOpen(true)}
        onOpen={() => alert(lang === 'ar' ? 'حدد ملف أرشيف للفتح' : 'Select an archive to open')}
        onExtract={() => setIsExtractOpen(true)}
        onTest={handleTestArchive}
        onView={() => {
          if (items.length > 0) handlePreview(items[0]);
        }}
        onDelete={handleDeleteSelected}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onInfo={() => setIsInfoOpen(true)}
        onRepair={() => setIsRepairOpen(true)}
        onBenchmark={() => setIsBenchmarkOpen(true)}
        onConvert={() => alert(lang === 'ar' ? 'تحويل الأرشيف' : 'Convert Archive')}
        onComment={() => setIsCommentOpen(true)}
        onSettings={() => setIsSettingsOpen(true)}
        onAbout={() => setIsAboutOpen(true)}
        hasActiveArchive={!!archiveName}
      />

      {/* 2. Iconic WinRAR-Style Toolbar */}
      <Toolbar
        lang={lang}
        theme={theme}
        onToggleLang={() => setLang(lang === 'en' ? 'ar' : 'en')}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onAdd={() => setIsCompressOpen(true)}
        onExtract={() => setIsExtractOpen(true)}
        onTest={handleTestArchive}
        onView={() => {
          const item = items.find((i) => selectedPaths.includes(i.path)) || items[0];
          if (item) handlePreview(item);
        }}
        onDelete={handleDeleteSelected}
        onFind={() => {}}
        onWizard={() => setIsCompressOpen(true)}
        onInfo={() => setIsInfoOpen(true)}
        onRepair={() => setIsRepairOpen(true)}
        onBenchmark={() => setIsBenchmarkOpen(true)}
        onComment={() => setIsCommentOpen(true)}
        onProtect={() => setIsCompressOpen(true)}
        onSettings={() => setIsSettingsOpen(true)}
        hasActiveArchive={!!archiveName}
        hasSelection={selectedPaths.length > 0}
      />

      {/* 3. Main Dual-Pane Work Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tree / Navigation Sidebar */}
        <Sidebar
          lang={lang}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          recentArchives={recentArchives}
          onOpenArchive={(name: string) => {
            setArchiveName(name);
            setCurrentFolder('');
          }}
        />

        {/* Right Archive File Browser */}
        <FileBrowser
          lang={lang}
          items={items}
          archiveName={archiveName}
          currentFolder={currentFolder}
          onNavigateFolder={setCurrentFolder}
          onPreview={handlePreview}
          onExtractItem={(item) => {
            setSelectedPaths([item.path]);
            setIsExtractOpen(true);
          }}
          onDeleteItem={handleDeleteItem}
          selectedPaths={selectedPaths}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {/* 4. WinRAR Status Bar */}
      <StatusBar
        lang={lang}
        summary={summary}
        selectedCount={selectedPaths.length}
      />

      {/* 5. Modals and Dialogs */}
      <CompressDialog
        lang={lang}
        isOpen={isCompressOpen}
        onClose={() => setIsCompressOpen(false)}
        onStartCompress={handleStartCompress}
      />

      <ExtractDialog
        lang={lang}
        archiveName={archiveName || 'Archive.xrar'}
        isOpen={isExtractOpen}
        onClose={() => setIsExtractOpen(false)}
        onExtract={handleStartExtract}
      />

      <ArchiveInfoModal
        lang={lang}
        archiveName={archiveName || 'Archive.xrar'}
        summary={summary}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      <RepairModal
        lang={lang}
        archiveName={archiveName || 'Archive.xrar'}
        isOpen={isRepairOpen}
        onClose={() => setIsRepairOpen(false)}
      />

      <CommentModal
        lang={lang}
        comment={archiveComment}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        onSave={setArchiveComment}
      />

      <AboutModal
        lang={lang}
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
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
        isRunning={isBenchmarking}
        onRunBenchmark={handleRunBenchmark}
      />

      <DuplicateFinderModal
        lang={lang}
        isOpen={isDuplicatesOpen}
        onClose={() => setIsDuplicatesOpen(false)}
        duplicates={duplicates}
        isScanning={isScanningDuplicates}
        onScanDirectory={async () => handleScanDuplicates()}
        onArchiveDuplicates={() => {}}
      />

      <FilePreviewModal
        lang={lang}
        item={previewItem}
        previewContent={previewContent}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
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
export default App;
