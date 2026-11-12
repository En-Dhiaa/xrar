import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Copy, Search, Highlighter, MessageSquare } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfCanvasViewerProps {
  pdfDocument: any;
  currentPage: number;
  onPageChange: (page: number) => void;
  zoom: number;
  rotation: number;
  viewMode: 'single' | 'continuous' | 'two_page' | 'two_page_continuous';
  searchTerm: string;
  isCaseSensitive: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  pdfDocument,
  currentPage,
  onPageChange,
  zoom,
  rotation,
  viewMode,
  searchTerm,
  isCaseSensitive,
  onZoomIn,
  onZoomOut,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedPages, setRenderedPages] = useState<Record<number, boolean>>({});
  const [textContents, setTextContents] = useState<Record<number, string>>({});

  // Context Menu for text selection
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({ visible: false, x: 0, y: 0, selectedText: '' });

  const numPages = pdfDocument?.numPages || 1;

  // Pages to render depending on view mode
  const getPagesToRender = (): number[] => {
    if (viewMode === 'single') {
      return [currentPage];
    } else if (viewMode === 'two_page') {
      const first = currentPage % 2 === 0 ? currentPage - 1 : currentPage;
      const second = first + 1;
      return second <= numPages ? [first, second] : [first];
    } else {
      // Continuous / two_page_continuous: render all pages
      return Array.from({ length: numPages }, (_, i) => i + 1);
    }
  };

  const pagesToRender = getPagesToRender();

  // Handle Ctrl + Wheel Zoom and Keyboard shortcuts
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          onZoomIn();
        } else {
          onZoomOut();
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [onZoomIn, onZoomOut]);

  // Handle Keyboard Navigation (PageUp, PageDown, Arrows, Home, End, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'PageDown' || e.key === ' ' && !e.shiftKey) {
        e.preventDefault();
        onPageChange(Math.min(numPages, currentPage + 1));
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        onPageChange(Math.max(1, currentPage - 1));
      } else if (e.key === 'Home' || (e.ctrlKey && e.key === 'Home')) {
        e.preventDefault();
        onPageChange(1);
      } else if (e.key === 'End' || (e.ctrlKey && e.key === 'End')) {
        e.preventDefault();
        onPageChange(numPages);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (viewMode === 'single' || viewMode === 'two_page') {
          e.preventDefault();
          onPageChange(Math.min(numPages, currentPage + 1));
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (viewMode === 'single' || viewMode === 'two_page') {
          e.preventDefault();
          onPageChange(Math.max(1, currentPage - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages, onPageChange, viewMode]);

  // Context menu on selection
  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selectedText: selection,
      });
    } else {
      setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
    }
  };

  const closeContextMenu = () => {
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={closeContextMenu}
      onContextMenu={handleContextMenu}
      className="flex-1 bg-slate-950 overflow-auto flex flex-col items-center p-6 select-text relative"
    >
      <div
        className={`flex ${
          viewMode.includes('two_page') ? 'flex-row flex-wrap justify-center gap-6' : 'flex-col items-center gap-6'
        }`}
      >
        {pagesToRender.map((pageNum) => (
          <PageCanvas
            key={`${pageNum}-${zoom}-${rotation}`}
            pdfDocument={pdfDocument}
            pageNumber={pageNum}
            zoom={zoom}
            rotation={rotation}
            searchTerm={searchTerm}
            isCaseSensitive={isCaseSensitive}
            onTextExtracted={(text) => {
              setTextContents((prev) => ({ ...prev, [pageNum]: text }));
            }}
          />
        ))}
      </div>

      {/* Right-Click Selection Context Menu */}
      {contextMenu.visible && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.selectedText);
              closeContextMenu();
            }}
            className="w-full text-start px-3 py-1.5 hover:bg-rose-600/30 hover:text-white flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-rose-400" />
            <span>Copy Text (Ctrl+C)</span>
          </button>
          <button
            onClick={() => {
              window.open(
                `https://www.google.com/search?q=${encodeURIComponent(contextMenu.selectedText)}`,
                '_blank'
              );
              closeContextMenu();
            }}
            className="w-full text-start px-3 py-1.5 hover:bg-rose-600/30 hover:text-white flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <span>Search Web</span>
          </button>
          <div className="h-px bg-slate-800 my-1" />
          <button
            onClick={() => {
              alert(`Highlighted: "${contextMenu.selectedText}"`);
              closeContextMenu();
            }}
            className="w-full text-start px-3 py-1.5 hover:bg-rose-600/30 hover:text-white flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span>Highlight</span>
          </button>
          <button
            onClick={() => {
              alert(`Add note to: "${contextMenu.selectedText}"`);
              closeContextMenu();
            }}
            className="w-full text-start px-3 py-1.5 hover:bg-rose-600/30 hover:text-white flex items-center gap-2"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Comment</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Individual Page Canvas Renderer with Text Overlay
interface PageCanvasProps {
  pdfDocument: any;
  pageNumber: number;
  zoom: number;
  rotation: number;
  searchTerm: string;
  isCaseSensitive: boolean;
  onTextExtracted: (text: string) => void;
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  pdfDocument,
  pageNumber,
  zoom,
  rotation,
  searchTerm,
  isCaseSensitive,
  onTextExtracted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 800 });

  useEffect(() => {
    let isCancelled = false;

    async function renderPage() {
      if (!pdfDocument) return;

      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (isCancelled) return;

        const dpr = window.devicePixelRatio || 1;
        const totalRotation = (page.rotate + rotation) % 360;
        const viewport = page.getViewport({ scale: zoom, rotation: totalRotation });

        setDimensions({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
            const renderContext = {
              canvasContext: ctx,
              viewport,
            };
            await page.render(renderContext).promise;
          }
        }

        // Render Text Content Layer for text selection & search highlighting
        const textContent = await page.getTextContent();
        if (isCancelled) return;

        const fullPageText = textContent.items.map((i: any) => i.str).join(' ');
        onTextExtracted(fullPageText);

        const textDiv = textLayerRef.current;
        if (textDiv) {
          textDiv.innerHTML = '';
          textDiv.style.width = `${Math.floor(viewport.width)}px`;
          textDiv.style.height = `${Math.floor(viewport.height)}px`;

          for (const item of textContent.items as any[]) {
            if (!item.str || item.str.trim() === '') continue;

            const span = document.createElement('span');
            let text = item.str;

            // Highlight search matches
            if (searchTerm) {
              const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, isCaseSensitive ? 'g' : 'gi');
              text = text.replace(regex, '<mark class="bg-amber-400/80 text-slate-950 rounded px-0.5">$1</mark>');
            }

            span.innerHTML = text;
            span.style.position = 'absolute';
            span.style.transformOrigin = 'left bottom';
            span.style.whiteSpace = 'pre';
            span.style.color = 'transparent';
            span.style.cursor = 'text';

            // Calculate font and coordinate matrix from pdf.js transform
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

            span.style.fontSize = `${fontHeight}px`;
            span.style.fontFamily = item.fontName || 'sans-serif';
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - fontHeight}px`;

            textDiv.appendChild(span);
          }
        }
      } catch (err) {
        console.error(`Error rendering page ${pageNumber}:`, err);
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, pageNumber, zoom, rotation, searchTerm, isCaseSensitive]);

  return (
    <div
      className="relative bg-white shadow-2xl rounded-sm overflow-hidden select-text border border-slate-700/50"
      style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
    >
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="absolute inset-0 overflow-hidden pointer-events-auto leading-none"
        style={{ userSelect: 'text' }}
      />
    </div>
  );
};
