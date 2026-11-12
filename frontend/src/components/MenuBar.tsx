import React, { useState, useRef, useEffect } from 'react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language } from '../types';

interface MenuBarProps {
  lang: Language;
  onNew: () => void;
  onOpen: () => void;
  onExtract: () => void;
  onTest: () => void;
  onView: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInfo: () => void;
  onRepair: () => void;
  onBenchmark: () => void;
  onConvert: () => void;
  onComment: () => void;
  onSettings: () => void;
  onAbout: () => void;
  hasActiveArchive: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  lang,
  onNew,
  onOpen,
  onExtract,
  onTest,
  onView,
  onDelete,
  onSelectAll,
  onDeselectAll,
  onInfo,
  onRepair,
  onBenchmark,
  onConvert,
  onComment,
  onSettings,
  onAbout,
  hasActiveArchive,
}) => {
  const t = lang === 'ar' ? ar : en;
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleAction = (action: () => void) => {
    action();
    setOpenMenu(null);
  };

  return (
    <div
      ref={menuRef}
      className="bg-slate-900 border-b border-slate-800 text-slate-300 text-xs px-2 py-0.5 flex items-center select-none z-40 relative"
    >
      {/* File Menu */}
      <div className="relative">
        <button
          onClick={() => toggle('file')}
          className={`px-2.5 py-1 rounded hover:bg-slate-800 transition ${
            openMenu === 'file' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          {t.menu.file}
        </button>
        {openMenu === 'file' && (
          <div className="absolute top-full start-0 mt-0.5 w-52 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
            <button
              onClick={() => handleAction(onNew)}
              className="w-full text-start px-3 py-1.5 hover:bg-emerald-600/30 hover:text-white transition flex justify-between"
            >
              <span>{t.menu.newArchive}</span>
              <span className="text-slate-400 font-mono text-[10px]">Ctrl+N</span>
            </button>
            <button
              onClick={() => handleAction(onOpen)}
              className="w-full text-start px-3 py-1.5 hover:bg-emerald-600/30 hover:text-white transition flex justify-between"
            >
              <span>{t.menu.openArchive}</span>
              <span className="text-slate-400 font-mono text-[10px]">Ctrl+O</span>
            </button>
            <div className="h-px bg-slate-700/80 my-1" />
            <button
              onClick={() => handleAction(onSelectAll)}
              className="w-full text-start px-3 py-1.5 hover:bg-slate-700 transition flex justify-between"
            >
              <span>{t.menu.selectAll}</span>
              <span className="text-slate-400 font-mono text-[10px]">Ctrl+A</span>
            </button>
            <button
              onClick={() => handleAction(onDeselectAll)}
              className="w-full text-start px-3 py-1.5 hover:bg-slate-700 transition"
            >
              {t.menu.deselectAll}
            </button>
            <div className="h-px bg-slate-700/80 my-1" />
            <button
              onClick={() => window.close()}
              className="w-full text-start px-3 py-1.5 hover:bg-rose-600/30 hover:text-rose-300 transition flex justify-between"
            >
              <span>{t.menu.exit}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+F4</span>
            </button>
          </div>
        )}
      </div>

      {/* Commands Menu */}
      <div className="relative">
        <button
          onClick={() => toggle('commands')}
          className={`px-2.5 py-1 rounded hover:bg-slate-800 transition ${
            openMenu === 'commands' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          {t.menu.commands}
        </button>
        {openMenu === 'commands' && (
          <div className="absolute top-full start-0 mt-0.5 w-60 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
            <button
              onClick={() => handleAction(onNew)}
              className="w-full text-start px-3 py-1.5 hover:bg-emerald-600/30 hover:text-white transition flex justify-between"
            >
              <span>{t.menu.addFiles}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+A</span>
            </button>
            <button
              onClick={() => handleAction(onExtract)}
              disabled={!hasActiveArchive}
              className={`w-full text-start px-3 py-1.5 transition flex justify-between ${
                hasActiveArchive
                  ? 'hover:bg-blue-600/30 hover:text-white'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>{t.menu.extractFiles}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+E</span>
            </button>
            <button
              onClick={() => handleAction(onTest)}
              disabled={!hasActiveArchive}
              className={`w-full text-start px-3 py-1.5 transition flex justify-between ${
                hasActiveArchive
                  ? 'hover:bg-teal-600/30 hover:text-white'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>{t.menu.testFiles}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+T</span>
            </button>
            <button
              onClick={() => handleAction(onView)}
              disabled={!hasActiveArchive}
              className={`w-full text-start px-3 py-1.5 transition flex justify-between ${
                hasActiveArchive
                  ? 'hover:bg-amber-600/30 hover:text-white'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>{t.menu.viewFile}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+V</span>
            </button>
            <button
              onClick={() => handleAction(onDelete)}
              disabled={!hasActiveArchive}
              className={`w-full text-start px-3 py-1.5 transition flex justify-between ${
                hasActiveArchive
                  ? 'hover:bg-rose-600/30 hover:text-rose-300'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span>{t.menu.deleteFiles}</span>
              <span className="text-slate-400 font-mono text-[10px]">Del</span>
            </button>
            <div className="h-px bg-slate-700/80 my-1" />
            <button
              onClick={() => handleAction(onComment)}
              className="w-full text-start px-3 py-1.5 hover:bg-slate-700 transition flex justify-between"
            >
              <span>{t.menu.addComment}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+M</span>
            </button>
          </div>
        )}
      </div>

      {/* Tools Menu */}
      <div className="relative">
        <button
          onClick={() => toggle('tools')}
          className={`px-2.5 py-1 rounded hover:bg-slate-800 transition ${
            openMenu === 'tools' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          {t.menu.tools}
        </button>
        {openMenu === 'tools' && (
          <div className="absolute top-full start-0 mt-0.5 w-60 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
            <button
              onClick={() => handleAction(onInfo)}
              className="w-full text-start px-3 py-1.5 hover:bg-cyan-600/30 hover:text-white transition flex justify-between"
            >
              <span>{t.menu.showInfo}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+I</span>
            </button>
            <button
              onClick={() => handleAction(onRepair)}
              className="w-full text-start px-3 py-1.5 hover:bg-emerald-600/30 hover:text-white transition flex justify-between"
            >
              <span>{t.menu.repairArchive}</span>
              <span className="text-slate-400 font-mono text-[10px]">Alt+R</span>
            </button>
            <button
              onClick={() => handleAction(onBenchmark)}
              className="w-full text-start px-3 py-1.5 hover:bg-purple-600/30 hover:text-white transition"
            >
              {t.menu.benchmark}
            </button>
            <button
              onClick={() => handleAction(onConvert)}
              className="w-full text-start px-3 py-1.5 hover:bg-indigo-600/30 hover:text-white transition"
            >
              {t.menu.convertArchive}
            </button>
          </div>
        )}
      </div>

      {/* Options Menu */}
      <div className="relative">
        <button
          onClick={() => toggle('options')}
          className={`px-2.5 py-1 rounded hover:bg-slate-800 transition ${
            openMenu === 'options' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          {t.menu.options}
        </button>
        {openMenu === 'options' && (
          <div className="absolute top-full start-0 mt-0.5 w-48 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
            <button
              onClick={() => handleAction(onSettings)}
              className="w-full text-start px-3 py-1.5 hover:bg-slate-700 hover:text-white transition"
            >
              {t.menu.settings}
            </button>
          </div>
        )}
      </div>

      {/* Help Menu */}
      <div className="relative">
        <button
          onClick={() => toggle('help')}
          className={`px-2.5 py-1 rounded hover:bg-slate-800 transition ${
            openMenu === 'help' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          {t.menu.help}
        </button>
        {openMenu === 'help' && (
          <div className="absolute top-full start-0 mt-0.5 w-48 bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
            <button
              onClick={() => handleAction(onAbout)}
              className="w-full text-start px-3 py-1.5 hover:bg-cyan-600/30 hover:text-white transition"
            >
              {t.menu.about}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

