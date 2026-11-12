import React from 'react';
import {
  FolderOpen,
  Save,
  Printer,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  RotateCcw,
  BookOpen,
  Columns,
  Scroll,
  FileText,
  Sliders,
  ArrowLeft,
  ChevronDown,
  Share2,
} from 'lucide-react';

interface PdfToolbarProps {
  onOpen: () => void;
  onSaveAs: () => void;
  onPrint: () => void;
  onToggleSearch: () => void;
  isSearchOpen: boolean;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitPage: () => void;
  onFitWidth: () => void;
  onRotateCw: () => void;
  onRotateCcw: () => void;
  viewMode: 'single' | 'continuous' | 'two_page' | 'two_page_continuous';
  onChangeViewMode: (mode: 'single' | 'continuous' | 'two_page' | 'two_page_continuous') => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenWindowsIntegration: () => void;
  onExitPdfMode: () => void;
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  onOpen,
  onSaveAs,
  onPrint,
  onToggleSearch,
  isSearchOpen,
  zoom,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onFitPage,
  onFitWidth,
  onRotateCw,
  onRotateCcw,
  viewMode,
  onChangeViewMode,
  isFullscreen,
  onToggleFullscreen,
  onOpenWindowsIntegration,
  onExitPdfMode,
}) => {
  const zoomPresets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];

  return (
    <header className="h-12 border-b border-slate-800 bg-slate-900/95 px-3 flex items-center justify-between select-none shadow-sm gap-2">
      {/* Left: Branding & Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExitPdfMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition"
          title="Return to File Explorer / العودة للمتصفح"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit PDF</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* File Actions */}
        <button
          onClick={onOpen}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Open PDF Document (Ctrl+O)"
        >
          <FolderOpen className="w-4 h-4 text-rose-400" />
        </button>

        <button
          onClick={onSaveAs}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Save Copy / Export PDF (Ctrl+S)"
        >
          <Save className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={onPrint}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Print Document via Native Windows Dialog (Ctrl+P)"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Search */}
        <button
          onClick={onToggleSearch}
          className={`p-1.5 rounded-lg transition ${
            isSearchOpen
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'hover:bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Find text in document (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Zoom and View Controls */}
      <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 rounded-xl px-2 py-1">
        <button
          onClick={onZoomOut}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Zoom Out (Ctrl+-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Selector Dropdown */}
        <select
          value={zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="bg-transparent text-xs font-mono text-slate-200 border-none outline-none cursor-pointer px-1 text-center"
        >
          {zoomPresets.map((z) => (
            <option key={z} value={z} className="bg-slate-900 text-slate-200">
              {Math.round(z * 100)}%
            </option>
          ))}
          {!zoomPresets.includes(zoom) && (
            <option value={zoom} className="bg-slate-900 text-slate-200">
              {Math.round(zoom * 100)}%
            </option>
          )}
        </select>

        <button
          onClick={onZoomIn}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Zoom In (Ctrl++)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onFitWidth}
          className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          title="Fit Width (Ctrl+1)"
        >
          Fit Width
        </button>

        <button
          onClick={onFitPage}
          className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          title="Fit Page (Ctrl+0)"
        >
          Fit Page
        </button>
      </div>

      {/* Right: Layout, Rotate, Fullscreen, Windows Integration */}
      <div className="flex items-center gap-1">
        {/* Rotation */}
        <button
          onClick={onRotateCcw}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Rotate Left 90°"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onRotateCw}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Rotate Right 90°"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* View Mode Toggle */}
        <button
          onClick={() => onChangeViewMode('continuous')}
          className={`p-1.5 rounded-lg transition ${
            viewMode === 'continuous' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
          }`}
          title="Continuous Scroll Mode"
        >
          <Scroll className="w-4 h-4" />
        </button>

        <button
          onClick={() => onChangeViewMode('single')}
          className={`p-1.5 rounded-lg transition ${
            viewMode === 'single' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
          }`}
          title="Single Page Mode"
        >
          <FileText className="w-4 h-4" />
        </button>

        <button
          onClick={() => onChangeViewMode('two_page_continuous')}
          className={`p-1.5 rounded-lg transition ${
            viewMode.includes('two_page') ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-white'
          }`}
          title="Two-Page Spread Mode"
        >
          <Columns className="w-4 h-4" />
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title={isFullscreen ? 'Exit Fullscreen (F11 / Esc)' : 'Fullscreen (F11)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Windows Explorer Integration Diagnostics */}
        <button
          onClick={onOpenWindowsIntegration}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
          title="Windows Explorer Shell Integration & Settings"
        >
          <Sliders className="w-3.5 h-3.5 text-rose-400" />
          <span>Windows Shell</span>
        </button>
      </div>
    </header>
  );
};

