import React from 'react';
import {
  Archive,
  FolderOpen,
  PlusCircle,
  FolderArchive,
  CheckCircle2,
  RefreshCw,
  Gauge,
  Files,
  Settings,
  Languages,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language, Theme } from '../types';

interface ToolbarProps {
  lang: Language;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onNew: () => void;
  onOpen: () => void;
  onExtract: () => void;
  onTest: () => void;
  onConvert: () => void;
  onBenchmark: () => void;
  onDuplicates: () => void;
  onSettings: () => void;
  hasActiveArchive: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  lang,
  theme,
  onToggleLang,
  onToggleTheme,
  onNew,
  onOpen,
  onExtract,
  onTest,
  onConvert,
  onBenchmark,
  onDuplicates,
  onSettings,
  hasActiveArchive,
}) => {
  const t = lang === 'ar' ? ar : en;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between select-none">
      {/* Brand logo & tagline */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Archive className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {t.appName}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v1.0.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-none mt-0.5">
            {t.tagline}
          </p>
        </div>
      </div>

      {/* Main Action Tool Buttons */}
      <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/80 transition active:scale-95"
          title={t.toolbar.new}
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>{t.toolbar.new}</span>
        </button>

        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/80 transition active:scale-95"
          title={t.toolbar.open}
        >
          <FolderOpen className="w-4 h-4 text-cyan-400" />
          <span>{t.toolbar.open}</span>
        </button>

        <div className="w-px h-5 bg-slate-800 mx-0.5" />

        <button
          onClick={onExtract}
          disabled={!hasActiveArchive}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition active:scale-95 ${
            hasActiveArchive
              ? 'text-slate-200 hover:text-white hover:bg-slate-800/80'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title={t.toolbar.extract}
        >
          <FolderArchive className="w-4 h-4 text-amber-400" />
          <span>{t.toolbar.extract}</span>
        </button>

        <button
          onClick={onTest}
          disabled={!hasActiveArchive}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition active:scale-95 ${
            hasActiveArchive
              ? 'text-slate-200 hover:text-white hover:bg-slate-800/80'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title={t.toolbar.test}
        >
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{t.toolbar.test}</span>
        </button>

        <button
          onClick={onConvert}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/80 transition active:scale-95"
          title={t.toolbar.convert}
        >
          <RefreshCw className="w-4 h-4 text-purple-400" />
          <span>{t.toolbar.convert}</span>
        </button>

        <div className="w-px h-5 bg-slate-800 mx-0.5" />

        <button
          onClick={onBenchmark}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/80 transition active:scale-95"
          title={t.toolbar.benchmark}
        >
          <Gauge className="w-4 h-4 text-blue-400" />
          <span>{t.toolbar.benchmark}</span>
        </button>

        <button
          onClick={onDuplicates}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 hover:text-white hover:bg-slate-800/80 transition active:scale-95"
          title={t.toolbar.duplicates}
        >
          <Files className="w-4 h-4 text-indigo-400" />
          <span>{t.toolbar.duplicates}</span>
        </button>
      </div>

      {/* Quick Utilities & Localization */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60 transition active:scale-95"
          title="Toggle Language / تغيير اللغة"
        >
          <Languages className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition active:scale-95"
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
          className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition active:scale-95"
          title={t.toolbar.settings}
        >
          <Settings className="w-4 h-4 text-slate-300 hover:rotate-45 transition-transform" />
        </button>
      </div>
    </header>
  );
};
