import React, { useState } from 'react';
import {
  X,
  Settings,
  Shield,
  Palette,
  Sliders,
  Cpu,
  Monitor,
  Info,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language, Theme } from '../types';

interface SettingsModalProps {
  lang: Language;
  theme: Theme;
  onSetLang: (lang: Language) => void;
  onSetTheme: (theme: Theme) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  lang,
  theme,
  onSetLang,
  onSetTheme,
  isOpen,
  onClose,
}) => {
  const t = lang === 'ar' ? ar : en;
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'security' | 'explorer' | 'about'>('general');

  // Setting states
  const [safeExtraction, setSafeExtraction] = useState(true);
  const [bombProtection, setBombProtection] = useState(true);
  const [explorerIntegration, setExplorerIntegration] = useState(true);
  const [threads, setThreads] = useState('auto');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-100">{t.settings.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation & Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Settings Sidebar */}
          <div className="w-48 border-e border-slate-800 p-3 space-y-1 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'general'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.settings.general}</span>
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'appearance'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{t.settings.appearance}</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'security'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.settings.security}</span>
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'explorer'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t.settings.explorer}</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'about'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t.settings.about}</span>
            </button>
          </div>

          {/* Settings Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {t.settings.language}
                  </label>
                  <select
                    value={lang}
                    onChange={(e) => onSetLang(e.target.value as Language)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="en">English (LTR)</option>
                    <option value="ar">العربية (RTL - Arabic First-Class)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {t.settings.threads}
                  </label>
                  <select
                    value={threads}
                    onChange={(e) => setThreads(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="auto">{t.settings.autoThreads}</option>
                    <option value="4">4 Threads</option>
                    <option value="8">8 Threads</option>
                    <option value="16">16 Threads</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {t.settings.theme}
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => onSetTheme(e.target.value as Theme)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="dark">{t.settings.themes.dark}</option>
                    <option value="light">{t.settings.themes.light}</option>
                    <option value="system">{t.settings.themes.system}</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safeExtraction}
                    onChange={(e) => setSafeExtraction(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {t.settings.safeExtraction}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Rejects traversal attacks (../, absolute paths, and reserved device names).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bombProtection}
                    onChange={(e) => setBombProtection(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {t.settings.bombProtection}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Monitors decompression ratio to avoid disk exhaustion bombs.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {activeTab === 'explorer' && (
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={explorerIntegration}
                    onChange={(e) => setExplorerIntegration(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      {t.settings.contextMenu}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Adds "Add to XRAR" and "Extract with XRAR" to Windows Explorer right-click.
                    </span>
                  </div>
                </label>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-4 text-xs text-slate-300">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-emerald-400">XRAR</span>
                    <span className="text-xs text-slate-400">{t.settings.version}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    XRAR is an extreme-compression open-source archive manager created as a modern alternative to WinRAR, 7-Zip, and PeaZip.
                  </p>
                  <p className="text-emerald-400 text-[11px]">{t.settings.offlineNotice}</p>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>Developed with Rust & Tauri 2.</p>
                  <p>Repository: https://github.com/En-Dhiaa/xrar</p>
                  <p>License: MIT / Apache-2.0</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-slate-800 px-6 flex items-center justify-end bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition active:scale-95"
          >
            {t.settings.close}
          </button>
        </div>
      </div>
    </div>
  );
};
