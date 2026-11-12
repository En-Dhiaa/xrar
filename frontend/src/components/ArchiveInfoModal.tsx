import React from 'react';
import { Info, ShieldCheck, Database, HardDrive, FileArchive, CheckCircle2, X } from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { ArchiveSummary, Language } from '../types';

interface ArchiveInfoModalProps {
  lang: Language;
  archiveName: string;
  summary: ArchiveSummary;
  isOpen: boolean;
  onClose: () => void;
}

export const ArchiveInfoModal: React.FC<ArchiveInfoModalProps> = ({
  lang,
  archiveName,
  summary,
  isOpen,
  onClose,
}) => {
  const t = lang === 'ar' ? ar : en;
  if (!isOpen) return null;

  const ratio = summary.uncompressed_size > 0
    ? ((summary.compressed_size / summary.uncompressed_size) * 100).toFixed(1)
    : '100.0';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]} (${bytes.toLocaleString()} bytes)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Info className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-slate-100 text-sm">
              {t.infoDialog.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* General Grid */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.archiveName}:</span>
              <span className="font-semibold text-slate-100 font-mono">{archiveName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.format}:</span>
              <span className="font-semibold text-emerald-400 font-mono">XRAR Container v1.0</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.totalFiles} / {t.infoDialog.totalFolders}:</span>
              <span className="font-medium text-slate-200">
                {summary.total_files} files, {summary.total_folders} folders
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.uncompressedSize}:</span>
              <span className="font-mono text-slate-200">{formatBytes(summary.uncompressed_size)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.packedSize}:</span>
              <span className="font-mono text-cyan-300 font-bold">{formatBytes(summary.compressed_size)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">{t.infoDialog.compressionRatio}:</span>
              <span className="font-bold text-emerald-400">{ratio}% (Space saved: {(100 - parseFloat(ratio)).toFixed(1)}%)</span>
            </div>
          </div>

          {/* Technical / Security Grid */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.solidState}:</span>
              <span className="text-teal-400 font-medium">Solid Compression (Smart Type Bundling)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.dictionary}:</span>
              <span className="font-mono text-slate-300">64 MB (LZMA2 / Zstandard)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/80">
              <span className="text-slate-400">{t.infoDialog.recoveryState}:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                3% Parity (Reed-Solomon GF(2^8))
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">{t.infoDialog.encryptionState}:</span>
              <span className="text-blue-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                AES-256-GCM + Argon2id KDF
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            {t.infoDialog.close}
          </button>
        </div>
      </div>
    </div>
  );
};
