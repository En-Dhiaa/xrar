import React from 'react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { ArchiveSummary, Language } from '../types';
import { CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface StatusBarProps {
  lang: Language;
  summary: ArchiveSummary | null;
  selectedCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  lang,
  summary,
  selectedCount,
}) => {
  const t = lang === 'ar' ? ar : en;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <footer className="h-7 border-t border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{t.statusBar.ready}</span>
        </div>

        {summary && (
          <>
            <div className="w-px h-3 bg-slate-800" />
            <span>
              {summary.total_files} {t.statusBar.items}
              {selectedCount > 0 && ` (${selectedCount} ${t.statusBar.selected})`}
            </span>
            <div className="w-px h-3 bg-slate-800" />
            <span>
              {t.statusBar.totalSize}: {formatBytes(summary.uncompressed_size)}
            </span>
            <div className="w-px h-3 bg-slate-800" />
            <span className="text-emerald-400 font-mono">
              {t.statusBar.compressedSize}: {formatBytes(summary.compressed_size)} (
              {summary.uncompressed_size > 0
                ? (
                    (summary.compressed_size / summary.uncompressed_size) *
                    100
                  ).toFixed(1)
                : 100}
              %)
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-slate-500">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>AES-256-GCM + BLAKE3</span>
        </div>
        <div className="w-px h-3 bg-slate-800" />
        <span className="text-slate-500 font-mono">UTF-8 / 64-bit</span>
      </div>
    </footer>
  );
};
