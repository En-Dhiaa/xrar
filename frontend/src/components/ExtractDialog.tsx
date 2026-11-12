import React, { useState } from 'react';
import { FolderDown, Folder, HardDrive, Check, X } from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { ExtractOptions, Language } from '../types';

interface ExtractDialogProps {
  lang: Language;
  archiveName: string;
  isOpen: boolean;
  onClose: () => void;
  onExtract: (options: ExtractOptions) => void;
}

export const ExtractDialog: React.FC<ExtractDialogProps> = ({
  lang,
  archiveName,
  isOpen,
  onClose,
  onExtract,
}) => {
  const t = lang === 'ar' ? ar : en;
  const baseName = archiveName.replace(/\.[^/.]+$/, '');
  const [destPath, setDestPath] = useState(`C:\\Users\\USER\\Downloads\\${baseName}`);
  const [overwriteMode, setOverwriteMode] = useState<'ask' | 'overwrite' | 'skip'>('ask');
  const [extractToSubfolder, setExtractToSubfolder] = useState(true);
  const [openAfter, setOpenAfter] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onExtract({
      destination: destPath,
      overwrite_mode: overwriteMode,
      extract_to_subfolder: extractToSubfolder,
      open_folder_after: openAfter,
    });
  };

  const sampleFolders = [
    { name: 'This PC', icon: HardDrive },
    { name: 'C:\\Users\\USER\\Downloads', icon: Folder },
    { name: 'C:\\Users\\USER\\Documents', icon: Folder },
    { name: 'C:\\Users\\USER\\Desktop', icon: Folder },
    { name: 'D:\\Backups', icon: Folder },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FolderDown className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-slate-100 text-sm">
              {t.extractDialog.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Destination Path Input */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">
              {t.extractDialog.destinationPath}:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={destPath}
                onChange={(e) => setDestPath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setDestPath('C:\\Users\\USER\\Desktop\\' + baseName)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition"
              >
                {t.extractDialog.browse}
              </button>
            </div>
          </div>

          {/* Quick Target Selector Folder Tree */}
          <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-2.5 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium block mb-1">
              {lang === 'ar' ? 'مجلدات الوجهة السريعة:' : 'Quick Target Locations:'}
            </span>
            {sampleFolders.map((f, i) => (
              <div
                key={i}
                onClick={() => f.name !== 'This PC' && setDestPath(f.name + '\\' + baseName)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer text-slate-300 hover:text-white transition"
              >
                <f.icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-mono text-[11px] truncate">{f.name}</span>
              </div>
            ))}
          </div>

          {/* Overwrite mode radio buttons */}
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/40">
            <span className="font-semibold text-slate-200 block mb-2">
              {t.extractDialog.overwriteMode}:
            </span>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="overwrite"
                  checked={overwriteMode === 'ask'}
                  onChange={() => setOverwriteMode('ask')}
                  className="accent-blue-500"
                />
                <span>{t.extractDialog.overwriteAsk}</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="overwrite"
                  checked={overwriteMode === 'overwrite'}
                  onChange={() => setOverwriteMode('overwrite')}
                  className="accent-blue-500"
                />
                <span>{t.extractDialog.overwriteAlways}</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="overwrite"
                  checked={overwriteMode === 'skip'}
                  onChange={() => setOverwriteMode('skip')}
                  className="accent-blue-500"
                />
                <span>{t.extractDialog.overwriteSkip}</span>
              </label>
            </div>
          </div>

          {/* Advanced checkboxes */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={extractToSubfolder}
                onChange={(e) => setExtractToSubfolder(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>{t.extractDialog.extractSubfolder}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={openAfter}
                onChange={(e) => setOpenAfter(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span>{t.extractDialog.openAfter}</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            {t.extractDialog.cancel}
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/20 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{t.extractDialog.ok}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

