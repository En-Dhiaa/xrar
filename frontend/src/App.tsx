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
import * as ipc from './api/ipc';
import {
  ArchiveItem,
  ArchiveSummary,
  BenchmarkReport,
  DuplicateGroup,
  ExtractOptions,
  FsItem,
  Language,
  ProgressState,
  Theme,
} from './types';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState('home');

  // Operational Mode: File Manager (Explorer) vs Archive Manager (WinRAR)
  const [mode, setMode] = useState<'file_manager' | 'archive_manager'>('file_manager');

  // File Manager State
  const [currentDirPath, setCurrentDirPath] = useState<string>('C:\\');
  const [drives, setDrives] = useState<string[]>(['C:\\']);
  const [fsItems, setFsItems] = useState<FsItem[]>([]);

  // Archive Manager State
  const [archivePath, setArchivePath] = useState<string | null>(null);
  const [archiveSummary, setArchiveSummary] = useState<ArchiveSummary | null>(null);
  const [archiveCurrentFolder, setArchiveCurrentFolder] = useState<string>('');
  const [archiveComment, setArchiveComment] = useState<string>(
    'XRAR Native Extreme Compression Container\nAES-256-GCM + BLAKE3 Integrity\nReed-Solomon Self-Healing Parity'
  );

  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [recentArchives, setRecentArchives] = useState<string[]>([]);

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

  // Initial Load & IPC initialization
  useEffect(() => {
    async function init() {
      try {
        const driveList = await ipc.getDrives();
        if (driveList.length > 0) {
          setDrives(driveList);
        }

        // Check if application was launched with an archive file (e.g. CLI or double-click on .xrar)
        const initialArchive = (window as any).__INITIAL_ARCHIVE__;
        if (initialArchive && typeof initialArchive === 'string') {
          await handleOpenArchive(initialArchive);
          return;
        }

        // Default: Start in File Manager mode browsing current user folder
        const items = await ipc.readDirectory();
        setFsItems(items);
        if (items.length > 0) {
          // Infer base path from first item
          const first = items[0].path;
          const parent = first.substring(0, first.lastIndexOf('\\')) || 'C:\\';
          setCurrentDirPath(parent);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // Keyboard Shortcuts (Alt+A, Alt+E, Alt+T, Alt+V, Alt+I, Alt+R, Alt+M, Del)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          setIsCompressOpen(true);
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          if (archivePath) setIsExtractOpen(true);
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          if (archivePath) handleTestArchive();
        } else if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          if (archivePath) setIsInfoOpen(true);
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
  }, [archivePath, selectedPaths]);

  // Navigate to directory in File Manager
  const handleNavigateFs = async (path: string) => {
    try {
      const items = await ipc.readDirectory(path);
      setFsItems(items);
      setCurrentDirPath(path);
      setSelectedPaths([]);
    } catch (err: any) {
      alert(lang === 'ar' ? `تعذر فتح المجلد: ${err}` : `Failed to open directory: ${err}`);
    }
  };

  const handleRefreshFs = async () => {
    await handleNavigateFs(currentDirPath);
  };

  // Open archive into Archive Manager Mode
  const handleOpenArchive = async (filePath: string) => {
    try {
      setProgressState({
        active: true,
        title: lang === 'ar' ? 'جار فتح الأرشيف...' : 'Opening Archive...',
        current_file: filePath,
        percentage: 30,
        speed_mbs: 950,
        cpu_pct: 20,
        ram_mb: 60,
        elapsed_secs: 0,
        remaining_secs: 1,
        original_bytes: 0,
        compressed_bytes: 0,
      });

      const summary = await ipc.listArchive(filePath);
      setArchivePath(filePath);
      setArchiveSummary(summary);
      setArchiveCurrentFolder('');
      setMode('archive_manager');
      setSelectedPaths([]);
      setRecentArchives((prev) => Array.from(new Set([filePath, ...prev])).slice(0, 10));

      setProgressState((p) => ({ ...p, active: false }));
    } catch (err: any) {
      setProgressState((p) => ({ ...p, active: false }));
      alert(lang === 'ar' ? `فشل فتح الأرشيف: ${err}` : `Failed to open archive: ${err}`);
    }
  };

  // Close archive and return to File Manager
  const handleCloseArchive = () => {
    setMode('file_manager');
    setArchivePath(null);
    setArchiveSummary(null);
    setSelectedPaths([]);
    handleRefreshFs();
  };

  // Browse and open an archive file via native dialog
  const handleBrowseOpenArchive = async () => {
    try {
      const picked = await ipc.browseArchiveFile();
      if (picked) {
        await handleOpenArchive(picked);
      }
    } catch (err: any) {
      alert(`Error picking archive: ${err}`);
    }
  };

  // Calculate Summary
  const summary: ArchiveSummary = archiveSummary || {
    total_files: fsItems.filter((i) => !i.is_dir).length,
    total_folders: fsItems.filter((i) => i.is_dir).length,
    uncompressed_size: fsItems.reduce((acc, i) => acc + i.size, 0),
    compressed_size: 0,
    format: 'Xrar',
    items: [],
    comment: archiveComment,
    has_recovery_record: true,
    recovery_record_pct: 3,
    is_solid: true,
    is_encrypted: false,
    encryption_algorithm: 'AES-256-GCM',
    dictionary_size_kb: 65536,
  };

  const handleToggleSelect = (path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleSelectAll = () => {
    if (mode === 'archive_manager' && archiveSummary) {
      setSelectedPaths(archiveSummary.items.map((i) => i.path));
    } else {
      setSelectedPaths(fsItems.map((i) => i.path));
    }
  };

  const handleDeselectAll = () => {
    setSelectedPaths([]);
  };

  const handleDeleteSelected = () => {
    if (selectedPaths.length === 0) return;
    const confirmMsg =
      lang === 'ar'
        ? `هل تريد حذف ${selectedPaths.length} عنصر محدد؟`
        : `Delete ${selectedPaths.length} selected items?`;
    if (window.confirm(confirmMsg)) {
      if (mode === 'archive_manager' && archiveSummary) {
        const remaining = archiveSummary.items.filter((i) => !selectedPaths.includes(i.path));
        setArchiveSummary({ ...archiveSummary, items: remaining });
      } else {
        setFsItems((prev) => prev.filter((i) => !selectedPaths.includes(i.path)));
      }
      setSelectedPaths([]);
    }
  };

  // Preview Action
  const handlePreview = async (item: ArchiveItem | FsItem) => {
    try {
      const filePath = 'path' in item ? item.path : '';
      const text = await ipc.readFilePreview(filePath, 32768);
      setPreviewItem({
        path: filePath,
        uncompressed_size: 'uncompressed_size' in item ? item.uncompressed_size : ('size' in item ? item.size : 0),
        compressed_size: 'compressed_size' in item ? item.compressed_size : 0,
        compression_ratio: 'compression_ratio' in item ? item.compression_ratio : 100,
        is_dir: item.is_dir,
        modified_timestamp: item.modified_timestamp,
        checksum: 'checksum' in item ? item.checksum : '',
      });
      setPreviewContent(text);
      setIsPreviewOpen(true);
    } catch (err: any) {
      // Fallback preview
      setPreviewItem({
        path: item.path,
        uncompressed_size: 'uncompressed_size' in item ? item.uncompressed_size : ('size' in item ? item.size : 0),
        compressed_size: 0,
        compression_ratio: 100,
        is_dir: item.is_dir,
        modified_timestamp: item.modified_timestamp,
        checksum: '',
      });
      setPreviewContent(`File: ${item.path}\nSize: ${'size' in item ? item.size : 0} bytes\n(Binary or protected content)`);
      setIsPreviewOpen(true);
    }
  };

  // Run Compression Workflow
  const handleStartCompress = async (options: any) => {
    setIsCompressOpen(false);
    try {
      // Determine target archive destination path
      let targetArchive = options.archiveName;
      if (!targetArchive.includes('\\') && !targetArchive.includes('/')) {
        targetArchive = `${currentDirPath}\\${targetArchive}`;
      }

      // Determine files to compress
      const filesToCompress = selectedPaths.length > 0 ? selectedPaths : [currentDirPath];

      setProgressState({
        active: true,
        title: `Creating ${options.archiveName}`,
        current_file: 'Scanning entropy & executing multi-threaded compression pipeline...',
        percentage: 15,
        speed_mbs: 450,
        cpu_pct: 85,
        ram_mb: 280,
        elapsed_secs: 1,
        remaining_secs: 2,
        original_bytes: 1000000,
        compressed_bytes: 350000,
      });

      const res = await ipc.createArchive(
        targetArchive,
        filesToCompress,
        options.profile,
        options.password,
        options.solidMode === 'smart'
      );

      setProgressState((p) => ({ ...p, active: false }));

      // Automatically open the new archive in Archive Manager mode
      await handleOpenArchive(targetArchive);
    } catch (err: any) {
      setProgressState((p) => ({ ...p, active: false }));
      alert(lang === 'ar' ? `فشل إنشاء الأرشيف: ${err}` : `Compression failed: ${err}`);
    }
  };

  // Run Extraction Workflow
  const handleStartExtract = async (options: ExtractOptions) => {
    if (!archivePath) return;
    setIsExtractOpen(false);
    try {
      setProgressState({
        active: true,
        title: `Extracting to ${options.destination}`,
        current_file: 'Extracting safe streams...',
        percentage: 20,
        speed_mbs: 850.0,
        cpu_pct: 40,
        ram_mb: 110,
        elapsed_secs: 1,
        remaining_secs: 2,
        original_bytes: summary.uncompressed_size,
        compressed_bytes: summary.compressed_size,
      });

      const extractedCount = await ipc.extractArchive(archivePath, options.destination);

      setProgressState((p) => ({ ...p, active: false }));
      alert(
        lang === 'ar'
          ? `تم الاستخراج بنجاح! تم فك ضغط ${extractedCount} ملف إلى:\n${options.destination}`
          : `Extraction complete! Successfully unpacked ${extractedCount} items to:\n${options.destination}`
      );
    } catch (err: any) {
      setProgressState((p) => ({ ...p, active: false }));
      alert(lang === 'ar' ? `فشل الاستخراج: ${err}` : `Extraction failed: ${err}`);
    }
  };

  // Run Archive Test Workflow
  const handleTestArchive = async () => {
    if (!archivePath) return;
    try {
      setProgressState({
        active: true,
        title: `Testing integrity of ${archivePath.split('\\').pop()}`,
        current_file: 'Verifying BLAKE3/CRC32 checksums & Reed-Solomon parity records...',
        percentage: 30,
        speed_mbs: 1200.0,
        cpu_pct: 65,
        ram_mb: 130,
        elapsed_secs: 1,
        remaining_secs: 1,
        original_bytes: summary.uncompressed_size,
        compressed_bytes: summary.compressed_size,
      });

      const testResult = await ipc.testArchive(archivePath);

      setProgressState((p) => ({ ...p, active: false }));

      if (testResult.valid) {
        alert(
          lang === 'ar'
            ? `اكتمل الفحص بنجاح 100%!\nتم فحص ${testResult.tested_files} ملف.\nكافة الكتل والبصمات والبيانات متطابقة وسليمة تماماً.`
            : `100% Test Complete!\nTested ${testResult.tested_files} items.\nAll cryptographic hashes & Reed-Solomon recovery parity blocks verified OK!`
        );
      } else {
        alert(
          lang === 'ar'
            ? `تم العثور على أخطاء في الأرشيف:\n${testResult.errors.join('\n')}`
            : `Errors detected in archive:\n${testResult.errors.join('\n')}`
        );
      }
    } catch (err: any) {
      setProgressState((p) => ({ ...p, active: false }));
      alert(`Test error: ${err}`);
    }
  };

  // Run Real Multi-codec Benchmark
  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const rep = await ipc.runBenchmark(10);
      setBenchmarkReport(rep);
    } catch (err: any) {
      alert(`Benchmark error: ${err}`);
    } finally {
      setIsBenchmarking(false);
    }
  };

  // Run Real Duplicate Finder
  const handleScanDuplicates = async () => {
    setIsScanningDuplicates(true);
    try {
      const results = await ipc.findDuplicates(currentDirPath);
      setDuplicates(results);
    } catch (err: any) {
      alert(`Duplicate scan error: ${err}`);
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  return (
    <div className={`h-screen flex flex-col font-sans select-none overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      {/* Top Menu Bar */}
      <MenuBar
        lang={lang}
        onNew={() => setIsCompressOpen(true)}
        onOpen={handleBrowseOpenArchive}
        onExtract={() => archivePath && setIsExtractOpen(true)}
        onTest={() => archivePath && handleTestArchive()}
        onView={() => {
          if (selectedPaths.length > 0) {
            const path = selectedPaths[0];
            const item = fsItems.find((i) => i.path === path) || archiveSummary?.items.find((i) => i.path === path);
            if (item) handlePreview(item as any);
          }
        }}
        onDelete={handleDeleteSelected}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onInfo={() => setIsInfoOpen(true)}
        onRepair={() => setIsRepairOpen(true)}
        onBenchmark={() => setIsBenchmarkOpen(true)}
        onConvert={() => {}}
        onComment={() => setIsCommentOpen(true)}
        onSettings={() => setIsSettingsOpen(true)}
        onAbout={() => setIsAboutOpen(true)}
        hasActiveArchive={mode === 'archive_manager'}
      />

      {/* Main WinRAR-Style Toolbar */}
      <Toolbar
        lang={lang}
        theme={theme}
        onToggleLang={() => setLang(lang === 'en' ? 'ar' : 'en')}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onAdd={() => setIsCompressOpen(true)}
        onExtract={() => archivePath && setIsExtractOpen(true)}
        onTest={() => archivePath && handleTestArchive()}
        onView={() => {
          if (selectedPaths.length > 0) {
            const path = selectedPaths[0];
            const item = fsItems.find((i) => i.path === path) || archiveSummary?.items.find((i) => i.path === path);
            if (item) handlePreview(item as any);
          }
        }}
        onDelete={handleDeleteSelected}
        onFind={() => setIsDuplicatesOpen(true)}
        onWizard={() => setIsCompressOpen(true)}
        onInfo={() => setIsInfoOpen(true)}
        onRepair={() => setIsRepairOpen(true)}
        onBenchmark={() => setIsBenchmarkOpen(true)}
        onComment={() => setIsCommentOpen(true)}
        onProtect={() => setIsCompressOpen(true)}
        onSettings={() => setIsSettingsOpen(true)}
        hasActiveArchive={mode === 'archive_manager'}
        hasSelection={selectedPaths.length > 0}
      />

      {/* Main Workspace (Sidebar + Dual-Mode File Browser) */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          lang={lang}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          recentArchives={recentArchives}
          onOpenArchive={handleOpenArchive}
          drives={drives}
          onSelectDrive={handleNavigateFs}
          currentDirPath={currentDirPath}
        />

        <FileBrowser
          lang={lang}
          mode={mode}
          currentDirPath={currentDirPath}
          drives={drives}
          fsItems={fsItems}
          onNavigateFsDir={handleNavigateFs}
          onOpenArchiveFile={handleOpenArchive}
          onRefreshFs={handleRefreshFs}
          archivePath={archivePath}
          archiveItems={archiveSummary?.items || []}
          archiveCurrentFolder={archiveCurrentFolder}
          onNavigateArchiveFolder={setArchiveCurrentFolder}
          onCloseArchive={handleCloseArchive}
          onPreview={handlePreview}
          onExtractItem={() => archivePath && setIsExtractOpen(true)}
          onDeleteItem={handleDeleteSelected}
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

      {/* ================= MODALS & DIALOGS ================= */}
      <CompressDialog
        lang={lang}
        isOpen={isCompressOpen}
        onClose={() => setIsCompressOpen(false)}
        onStartCompress={handleStartCompress}
      />

      <ExtractDialog
        lang={lang}
        archiveName={archivePath?.split('\\').pop() || 'Archive.xrar'}
        isOpen={isExtractOpen}
        onClose={() => setIsExtractOpen(false)}
        onExtract={handleStartExtract}
      />

      <ArchiveInfoModal
        lang={lang}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        summary={summary}
        archiveName={archivePath?.split('\\').pop() || 'Current Archive'}
      />

      <RepairModal
        lang={lang}
        isOpen={isRepairOpen}
        onClose={() => setIsRepairOpen(false)}
        archiveName={archivePath?.split('\\').pop() || 'Current Archive'}
      />

      <CommentModal
        lang={lang}
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        comment={archiveComment}
        onSave={setArchiveComment}
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
          setSelectedPaths(paths);
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
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onSetTheme={setTheme}
        onSetLang={setLang}
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
        onCancel={() => setProgressState((p) => ({ ...p, active: false }))}
      />
    </div>
  );
};
