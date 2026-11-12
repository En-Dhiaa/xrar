import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X, Sparkles, AlertCircle } from 'lucide-react';

interface PdfSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  currentMatchIndex: number;
  totalMatches: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  isCaseSensitive: boolean;
  onToggleCaseSensitive: () => void;
  isScannedDocument: boolean;
}

export const PdfSearchBar: React.FC<PdfSearchBarProps> = ({
  isOpen,
  onClose,
  searchTerm,
  onSearchChange,
  currentMatchIndex,
  totalMatches,
  onNextMatch,
  onPrevMatch,
  isCaseSensitive,
  onToggleCaseSensitive,
  isScannedDocument,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-3 end-6 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 min-w-[320px] animate-in fade-in slide-in-from-top-2 duration-150 select-none">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ms-1 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) onPrevMatch();
              else onNextMatch();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder="Find in document (Ctrl+F)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-medium"
        />

        {/* Matches Count Badge */}
        {searchTerm && (
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 shrink-0">
            {totalMatches > 0 ? `${currentMatchIndex + 1} of ${totalMatches}` : '0 results'}
          </span>
        )}

        {/* Up / Down navigation */}
        <button
          onClick={onPrevMatch}
          disabled={totalMatches === 0}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Previous Match (Shift+Enter)"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <button
          onClick={onNextMatch}
          disabled={totalMatches === 0}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
          title="Next Match (Enter)"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Close Search (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Case Sensitive Option & Scanned OCR Notice */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 px-1 text-[11px] text-slate-400">
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
          <input
            type="checkbox"
            checked={isCaseSensitive}
            onChange={onToggleCaseSensitive}
            className="rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-0"
          />
          <span>Match Case</span>
        </label>

        {isScannedDocument && (
          <div className="flex items-center gap-1 text-amber-400 font-medium text-[10px]">
            <AlertCircle className="w-3 h-3" />
            <span>Scanned PDF — Run OCR to search</span>
          </div>
        )}
      </div>
    </div>
  );
};

