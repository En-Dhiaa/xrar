import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfTabsBar } from './PdfTabsBar';
import { PdfToolbar } from './PdfToolbar';
import { PdfSidebar } from './PdfSidebar';
import { PdfCanvasViewer } from './PdfCanvasViewer';
import { PdfSearchBar } from './PdfSearchBar';
import { PdfStatusBar } from './PdfStatusBar';
import { WindowsIntegrationModal } from './WindowsIntegrationModal';
import * as ipc from '../../api/ipc';
import { PdfDocumentTab, PdfOutlineItem, PdfSearchResult } from '../../types';

interface PdfViewerWorkspaceProps {
  initialPdfPath?: string | null;
  onExit: () => void;
}

export const PdfViewerWorkspace: React.FC<PdfViewerWorkspaceProps> = ({
  initialPdfPath,
  onExit,
}) => {
  // Document Tabs
  const [tabs, setTabs] = useState<PdfDocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Active Document State
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [outline, setOutline] = useState<PdfOutlineItem[]>([]);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [isScanned, setIsScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [searchResults, setSearchResults] = useState<PdfSearchResult[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWindowsIntegrationOpen, setIsWindowsIntegrationOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Open initial PDF on mount if provided
  useEffect(() => {
    if (initialPdfPath) {
      openPdfFile(initialPdfPath);
    }
  }, [initialPdfPath]);

  // Open a PDF file path
  const openPdfFile = async (filePath: string) => {
    const fileName = filePath.split(/[\\/]/).pop() || 'Document.pdf';
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    setIsLoading(true);

    try {
      const bytes = await ipc.readPdfBytes(filePath);
      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const doc = await loadingTask.promise;

      const newTab: PdfDocumentTab = {
        id: tabId,
        filePath,
        fileName,
        fileSize: bytes.length,
        currentPage: 1,
        totalPages: doc.numPages,
        zoom: 1.0,
        rotation: 0,
        viewMode: 'continuous',
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
      setPdfDocument(doc);

      // Load Document Outline / Bookmarks
      const docOutline = await doc.getOutline();
      if (docOutline) {
        setOutline(mapOutlineItems(docOutline));
      } else {
        setOutline([]);
      }

      // Generate Async Thumbnails
      generateThumbnails(doc);

      // Check if scanned document (check first 2 pages for text)
      checkIfScanned(doc);
    } catch (err: any) {
      alert(`Failed to load PDF '${fileName}': ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const mapOutlineItems = (items: any[]): PdfOutlineItem[] => {
    return items.map((item) => ({
      title: item.title,
      dest: item.dest,
      pageNumber: typeof item.dest === 'number' ? item.dest : undefined,
      items: item.items ? mapOutlineItems(item.items) : undefined,
    }));
  };

  const generateThumbnails = async (doc: any) => {
    const thumbs: Record<number, string> = {};
    const pagesCount = Math.min(doc.numPages, 100); // virtualized thumbnail limit

    for (let p = 1; p <= pagesCount; p++) {
      try {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs[p] = canvas.toDataURL('image/jpeg', 0.7);
        }
      } catch (e) {
        console.error('Thumb error:', e);
      }
    }
    setThumbnailUrls(thumbs);
  };

  const checkIfScanned = async (doc: any) => {
    try {
      const page1 = await doc.getPage(1);
      const tc = await page1.getTextContent();
      const hasText = tc.items.some((i: any) => i.str && i.str.trim().length > 0);
      setIsScanned(!hasText);
    } catch {
      setIsScanned(false);
    }
  };

  // Perform document search across all pages
  useEffect(() => {
    if (!searchTerm || !pdfDocument) {
      setSearchResults([]);
      setActiveSearchIndex(0);
      return;
    }

    let isCancelled = false;

    async function searchAllPages() {
      const results: PdfSearchResult[] = [];
      const numPages = pdfDocument.numPages;

      for (let p = 1; p <= numPages; p++) {
        if (isCancelled) break;
        try {
          const page = await pdfDocument.getPage(p);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((i: any) => i.str).join(' ');

          const query = isCaseSensitive ? searchTerm : searchTerm.toLowerCase();
          const target = isCaseSensitive ? pageText : pageText.toLowerCase();

          let pos = target.indexOf(query);
          while (pos !== -1) {
            const start = Math.max(0, pos - 25);
            const end = Math.min(pageText.length, pos + query.length + 25);
            const snippet = pageText.substring(start, end).replace(/\s+/g, ' ');

            results.push({
              pageNumber: p,
              matchIndex: results.length,
              snippet,
            });

            pos = target.indexOf(query, pos + query.length);
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!isCancelled) {
        setSearchResults(results);
        setActiveSearchIndex(0);
        if (results.length > 0) {
          handlePageChange(results[0].pageNumber);
        }
      }
    }

    const timer = setTimeout(searchAllPages, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, isCaseSensitive, pdfDocument]);

  const handleNextSearchMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (activeSearchIndex + 1) % searchResults.length;
    setActiveSearchIndex(nextIdx);
    handlePageChange(searchResults[nextIdx].pageNumber);
  };

  const handlePrevSearchMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
    setActiveSearchIndex(prevIdx);
    handlePageChange(searchResults[prevIdx].pageNumber);
  };

  const handlePageChange = (page: number) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, currentPage: page } : t))
    );
  };

  const handleZoomChange = (zoom: number) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, zoom } : t))
    );
  };

  const handleViewModeChange = (viewMode: any) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, viewMode } : t))
    );
  };

  const handleRotateCw = () => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, rotation: (t.rotation + 90) % 360 } : t))
    );
  };

  const handleRotateCcw = () => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, rotation: (t.rotation + 270) % 360 } : t))
    );
  };

  const handleBrowseOpen = async () => {
    const picked = await ipc.browsePdfFile();
    if (picked) {
      openPdfFile(picked);
    }
  };

  const handleSaveAs = async () => {
    if (!activeTab) return;
    const savePath = await ipc.browseSavePdf();
    if (savePath) {
      try {
        const bytes = await ipc.readPdfBytes(activeTab.filePath);
        await ipc.savePdfBytes(savePath, bytes);
        alert(`Document exported successfully to:\n${savePath}`);
      } catch (err: any) {
        alert(`Save failed: ${err}`);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseTab = (id: string) => {
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (remaining.length > 0) {
      setActiveTabId(remaining[0].id);
    } else {
      onExit();
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Drag & drop PDF files into the workspace
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.name.toLowerCase().endsWith('.pdf') && (file as any).path) {
          openPdfFile((file as any).path);
        }
      }
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="h-screen flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden relative"
    >
      {/* Top Document Tabs */}
      {tabs.length > 0 && (
        <PdfTabsBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
          onCloseTab={handleCloseTab}
          onNewTab={handleBrowseOpen}
        />
      )}

      {/* Main Foxit-Style Toolbar */}
      <PdfToolbar
        onOpen={handleBrowseOpen}
        onSaveAs={handleSaveAs}
        onPrint={handlePrint}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        isSearchOpen={isSearchOpen}
        zoom={activeTab?.zoom || 1.0}
        onZoomChange={handleZoomChange}
        onZoomIn={() => handleZoomChange(Math.min(4.0, (activeTab?.zoom || 1.0) + 0.25))}
        onZoomOut={() => handleZoomChange(Math.max(0.25, (activeTab?.zoom || 1.0) - 0.25))}
        onFitPage={() => handleZoomChange(1.0)}
        onFitWidth={() => handleZoomChange(1.3)}
        onRotateCw={handleRotateCw}
        onRotateCcw={handleRotateCcw}
        viewMode={activeTab?.viewMode || 'continuous'}
        onChangeViewMode={handleViewModeChange}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenWindowsIntegration={() => setIsWindowsIntegrationOpen(true)}
        onExitPdfMode={onExit}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Search Bar (Ctrl+F) */}
        <PdfSearchBar
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          currentMatchIndex={activeSearchIndex}
          totalMatches={searchResults.length}
          onNextMatch={handleNextSearchMatch}
          onPrevMatch={handlePrevSearchMatch}
          isCaseSensitive={isCaseSensitive}
          onToggleCaseSensitive={() => setIsCaseSensitive(!isCaseSensitive)}
          isScannedDocument={isScanned}
        />

        {/* Left Sidebar (Thumbnails, Outline, Attachments, Search Results) */}
        <PdfSidebar
          totalPages={activeTab?.totalPages || 1}
          currentPage={activeTab?.currentPage || 1}
          onSelectPage={handlePageChange}
          outline={outline}
          searchResults={searchResults}
          activeSearchIndex={activeSearchIndex}
          onSelectSearchResult={(idx) => {
            setActiveSearchIndex(idx);
            handlePageChange(searchResults[idx].pageNumber);
          }}
          thumbnailUrls={thumbnailUrls}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Central PDF Canvas & Text Layer Viewport */}
        {activeTab && pdfDocument ? (
          <PdfCanvasViewer
            pdfDocument={pdfDocument}
            currentPage={activeTab.currentPage}
            onPageChange={handlePageChange}
            zoom={activeTab.zoom}
            rotation={activeTab.rotation}
            viewMode={activeTab.viewMode}
            searchTerm={searchTerm}
            isCaseSensitive={isCaseSensitive}
            onZoomIn={() => handleZoomChange(Math.min(4.0, (activeTab.zoom || 1.0) + 0.25))}
            onZoomOut={() => handleZoomChange(Math.max(0.25, (activeTab.zoom || 1.0) - 0.25))}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <button
              onClick={handleBrowseOpen}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/20 active:scale-95 transition"
            >
              Open PDF Document
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Or drag & drop any PDF document from Windows File Explorer
            </p>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      {activeTab && (
        <PdfStatusBar
          currentPage={activeTab.currentPage}
          totalPages={activeTab.totalPages}
          onPageChange={handlePageChange}
          zoom={activeTab.zoom}
          fileName={activeTab.fileName}
          fileSizeBytes={activeTab.fileSize}
        />
      )}

      {/* Windows Shell Integration & Diagnostics Modal */}
      <WindowsIntegrationModal
        isOpen={isWindowsIntegrationOpen}
        onClose={() => setIsWindowsIntegrationOpen(false)}
      />
    </div>
  );
};

