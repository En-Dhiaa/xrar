import React from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  Hash,
  Clock,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { ArchiveItem, Language } from '../types';

interface FilePreviewModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  item: ArchiveItem | null;
  previewContent: string | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  lang,
  isOpen,
  onClose,
  item,
  previewContent,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !item) return null;

  const handleCopyChecksum = () => {
    if (item.checksum) {
      navigator.clipboard.writeText(item.checksum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 truncate max-w-md">
                {item.path}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>{formatBytes(item.uncompressed_size)}</span>
                <span>•</span>
                <span className="text-emerald-400">Safe Sandbox Preview</span>
              </div>
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
        <div className="p-6 space-y-4 flex-1 flex flex-col overflow-hidden">
          {/* Metadata banner */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-500">BLAKE3:</span>
              <span className="font-mono text-[11px] truncate">{item.checksum || 'N/A'}</span>
              {item.checksum && (
                <button
                  onClick={handleCopyChecksum}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Copy Checksum"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-500">Modified:</span>
              <span>{item.modified_timestamp ? new Date(item.modified_timestamp * 1000).toLocaleString() : 'N/A'}</span>
            </div>
          </div>

          {/* Sandboxed Text Preview */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed">
            <pre className="whitespace-pre-wrap select-text">
              {previewContent || "// Loading safe preview or file is binary..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
