import React from 'react';
import {
  FolderPlus,
  FolderDown,
  CheckCircle2,
  Eye,
  Trash2,
  Search,
  Wand2,
  Info,
  Wrench,
  Gauge,
  MessageSquare,
  Lock,
  Settings,
  Languages,
  Sun,
  Moon,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language, Theme } from '../types';

interface ToolbarProps {
  lang: Language;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onAdd: () => void;
  onExtract: () => void;
  onTest: () => void;
  onView: () => void;
  onDelete: () => void;
  onFind: () => void;
  onWizard: () => void;
  onInfo: () => void;
  onRepair: () => void;
  onBenchmark: () => void;
  onComment: () => void;
  onProtect: () => void;
  onSettings: () => void;
  hasActiveArchive: boolean;
  hasSelection: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onAdd,
  onExtract,
  onTest,
  onView,
  onDelete,
  onFind,
  onWizard,
  onInfo,
  onRepair,
  onBenchmark,
  onComment,
  onProtect,
  onSettings,
  hasActiveArchive,
  hasSelection,
}) => {
  const t = lang === 'ar' ? ar : en;

  return (
    <header className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 px-3 py-1.5 flex items-center justify-between select-none shadow-md">
      {/* Brand logo & tagline */}
      <div className="flex items-center gap-2.5 me-2 shrink-0">
        <div className="w-9 h-9 rounded-lg overflow-hidden border border-cyan-500/30 shadow-md shadow-cyan-500/20 bg-slate-950 flex items-center justify-center">
          <img
            src="/icon.png"
            alt="XRAR"
            className="w-full h-full object-cover"
            onError={(e) => {
              // fallback if image not loaded yet
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-base tracking-wide bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              {t.appName}
            </span>
            <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              v1.0.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-none">
            {t.tagline}
          </p>
        </div>
      </div>

      {/* Main WinRAR-Style Action Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        {/* Add button */}
        <button
          onClick={onAdd}
          className="flex flex-col items-center justify-center min-w-[52px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={`${t.toolbar.add} (Alt+A)`}
        >
          <FolderPlus className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.add}</span>
        </button>

        {/* Extract To button */}
        <button
          onClick={onExtract}
          disabled={!hasActiveArchive}
          className={`flex flex-col items-center justify-center min-w-[56px] h-[54px] px-2 rounded-lg border transition group active:scale-95 ${
            hasActiveArchive
              ? 'bg-slate-800/60 hover:bg-blue-600/20 hover:border-blue-500/40 border-transparent text-slate-200 hover:text-white'
              : 'border-transparent text-slate-600 cursor-not-allowed opacity-40'
          }`}
          title={`${t.toolbar.extract} (Alt+E)`}
        >
          <FolderDown className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.extract}</span>
        </button>

        {/* Test button */}
        <button
          onClick={onTest}
          disabled={!hasActiveArchive}
          className={`flex flex-col items-center justify-center min-w-[50px] h-[54px] px-2 rounded-lg border transition group active:scale-95 ${
            hasActiveArchive
              ? 'bg-slate-800/60 hover:bg-teal-600/20 hover:border-teal-500/40 border-transparent text-slate-200 hover:text-white'
              : 'border-transparent text-slate-600 cursor-not-allowed opacity-40'
          }`}
          title={`${t.toolbar.test} (Alt+T)`}
        >
          <CheckCircle2 className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.test}</span>
        </button>

        {/* View button */}
        <button
          onClick={onView}
          disabled={!hasActiveArchive}
          className={`flex flex-col items-center justify-center min-w-[50px] h-[54px] px-2 rounded-lg border transition group active:scale-95 ${
            hasActiveArchive
              ? 'bg-slate-800/60 hover:bg-amber-600/20 hover:border-amber-500/40 border-transparent text-slate-200 hover:text-white'
              : 'border-transparent text-slate-600 cursor-not-allowed opacity-40'
          }`}
          title={`${t.toolbar.view} (Alt+V)`}
        >
          <Eye className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.view}</span>
        </button>

        {/* Delete button */}
        <button
          onClick={onDelete}
          disabled={!hasActiveArchive || !hasSelection}
          className={`flex flex-col items-center justify-center min-w-[50px] h-[54px] px-2 rounded-lg border transition group active:scale-95 ${
            hasActiveArchive && hasSelection
              ? 'bg-slate-800/60 hover:bg-rose-600/20 hover:border-rose-500/40 border-transparent text-slate-200 hover:text-rose-300'
              : 'border-transparent text-slate-600 cursor-not-allowed opacity-40'
          }`}
          title={`${t.toolbar.delete} (Del)`}
        >
          <Trash2 className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.delete}</span>
        </button>

        {/* Find button */}
        <button
          onClick={onFind}
          className="flex flex-col items-center justify-center min-w-[50px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-purple-600/20 hover:border-purple-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={`${t.toolbar.find} (Alt+F)`}
        >
          <Search className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.find}</span>
        </button>

        {/* Wizard button */}
        <button
          onClick={onWizard}
          className="flex flex-col items-center justify-center min-w-[52px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-pink-600/20 hover:border-pink-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={t.toolbar.wizard}
        >
          <Wand2 className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.wizard}</span>
        </button>

        {/* Info button */}
        <button
          onClick={onInfo}
          className="flex flex-col items-center justify-center min-w-[50px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-cyan-600/20 hover:border-cyan-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={`${t.toolbar.info} (Alt+I)`}
        >
          <Info className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.info}</span>
        </button>

        {/* Repair button */}
        <button
          onClick={onRepair}
          className="flex flex-col items-center justify-center min-w-[52px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={`${t.toolbar.repair} (Alt+R)`}
        >
          <Wrench className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.repair}</span>
        </button>

        {/* Benchmark button */}
        <button
          onClick={onBenchmark}
          className="flex flex-col items-center justify-center min-w-[58px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-blue-600/20 hover:border-blue-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={t.toolbar.benchmark}
        >
          <Gauge className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.benchmark}</span>
        </button>

        {/* Comment button */}
        <button
          onClick={onComment}
          className="flex flex-col items-center justify-center min-w-[52px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-amber-600/20 hover:border-amber-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={`${t.toolbar.comment} (Alt+M)`}
        >
          <MessageSquare className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.comment}</span>
        </button>

        {/* Protect button */}
        <button
          onClick={onProtect}
          className="flex flex-col items-center justify-center min-w-[52px] h-[54px] px-2 rounded-lg bg-slate-800/60 hover:bg-teal-600/20 hover:border-teal-500/40 border border-transparent text-slate-200 hover:text-white transition group active:scale-95"
          title={t.toolbar.protect}
        >
          <Lock className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform mb-0.5" />
          <span className="text-[11px] font-medium leading-tight">{t.toolbar.protect}</span>
        </button>
      </div>

      {/* Utilities: Language, Theme, Settings */}
      <div className="flex items-center gap-1.5 ms-2 shrink-0">
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition active:scale-95"
          title="Toggle Language / تغيير اللغة"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-sm transition active:scale-95"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-300" />
          )}
        </button>

        <button
          onClick={onSettings}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-sm transition active:scale-95"
          title={t.toolbar.settings}
        >
          <Settings className="w-4 h-4 text-slate-300 hover:rotate-45 transition-transform" />
        </button>
      </div>
    </header>
  );
};
