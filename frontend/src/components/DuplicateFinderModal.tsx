import React, { useState } from 'react';
import {
  X,
  Files,
  FolderOpen,
  Search,
  Sparkles,
  ExternalLink,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { DuplicateGroup, Language } from '../types';

interface DuplicateFinderModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateGroup[];
  onScanDirectory: () => Promise<void>;
  isScanning: boolean;
  onArchiveDuplicates: (paths: string[]) => void;
}

export const DuplicateFinderModal: React.FC<DuplicateFinderModalProps> = ({
  lang,
  isOpen,
  onClose,
  duplicates,
  onScanDirectory,
  isScanning,
  onArchiveDuplicates,
}) => {
  const t = lang === 'ar' ? ar : en;
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const totalSavings = duplicates.reduce((acc, curr) => acc + curr.potential_savings, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Files className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t.duplicates.title}</h2>
              <p className="text-[11px] text-slate-400">{t.duplicates.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Duplicate Groups List */}
          <div className="w-80 border-e border-slate-800 flex flex-col bg-slate-950/40">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <button
                onClick={onScanDirectory}
                disabled={isScanning}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{isScanning ? 'Scanning...' : t.duplicates.scanFolder}</span>
              </button>
            </div>

            {duplicates.length > 0 && (
              <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 text-xs">
                <span className="text-emerald-400 font-semibold block">
                  {t.duplicates.potentialSaving}:
                </span>
                <span className="font-mono font-bold text-emerald-300 text-sm">
                  {formatBytes(totalSavings)}
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {duplicates.map((group, idx) => {
                const isSelected = selectedGroupIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedGroupIndex(idx)}
                    className={`w-full p-2.5 rounded-xl text-start border transition ${
                      isSelected
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-slate-100'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span>Group #{idx + 1}</span>
                      <span className="font-mono text-emerald-400">
                        {formatBytes(group.potential_savings)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      Hash: {group.hash.substring(0, 16)}...
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Group File Paths */}
          <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
            {duplicates.length > 0 && duplicates[selectedGroupIndex] ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">
                      Duplicate Group #{selectedGroupIndex + 1}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Single file size: {formatBytes(duplicates[selectedGroupIndex].file_size)}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      onArchiveDuplicates(duplicates[selectedGroupIndex].file_paths)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Compress Group</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Identical Copies ({duplicates[selectedGroupIndex].file_paths.length}):
                  </span>
                  <div className="space-y-1.5">
                    {duplicates[selectedGroupIndex].file_paths.map((p, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono flex items-center justify-between"
                      >
                        <span className="truncate max-w-lg">{p}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => alert(`Location: ${p}`)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                            title={t.duplicates.openLocation}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
                <Files className="w-12 h-12 mb-3 text-slate-700" />
                <p className="text-xs">No duplicate group selected.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
