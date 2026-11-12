import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface PdfStatusBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  fileName: string;
  fileSizeBytes: number;
}

export const PdfStatusBar: React.FC<PdfStatusBarProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  zoom,
  fileName,
  fileSizeBytes,
}) => {
  const [pageInput, setPageInput] = useState(currentPage.toString());

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <footer className="h-7 border-t border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none">
      {/* Left: Page Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Previous Page (PageUp)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <form onSubmit={handleInputSubmit} className="flex items-center gap-1 font-mono">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => setPageInput(currentPage.toString())}
            className="w-10 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-[11px] text-slate-200 focus:outline-none focus:border-rose-500"
          />
          <span className="text-slate-500">/</span>
          <span className="text-slate-300 font-semibold">{totalPages || 1}</span>
        </form>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Next Page (PageDown / Space)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3 bg-slate-800 mx-1" />

        <span className="truncate max-w-[200px] text-slate-300 font-medium">
          {fileName}
        </span>
        {fileSizeBytes > 0 && (
          <span className="text-slate-500 font-mono">({formatBytes(fileSizeBytes)})</span>
        )}
      </div>

      {/* Right: Security & Zoom Display */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sandboxed Reader</span>
        </div>

        <div className="w-px h-3 bg-slate-800" />

        <span className="font-mono font-bold text-rose-400">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </footer>
  );
};

