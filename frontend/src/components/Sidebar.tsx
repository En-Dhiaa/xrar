import React from 'react';
import {
  Home,
  FolderTree,
  Clock,
  Star,
  Wrench,
  HardDrive,
  FileArchive,
  Folder,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language } from '../types';

interface SidebarProps {
  lang: Language;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  recentArchives: string[];
  onOpenArchive: (name: string) => void;
  drives: string[];
  onSelectDrive: (drive: string) => void;
  currentDirPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lang,
  activeTab,
  onSelectTab,
  recentArchives,
  onOpenArchive,
  drives,
  onSelectDrive,
  currentDirPath,
}) => {
  const t = lang === 'ar' ? ar : en;

  const navItems = [
    { id: 'home', label: t.sidebar.home, icon: Home },
    { id: 'archives', label: t.sidebar.archives, icon: FolderTree },
    { id: 'recent', label: t.sidebar.recent, icon: Clock },
    { id: 'favorites', label: t.sidebar.favorites, icon: Star },
    { id: 'tools', label: t.sidebar.tools, icon: Wrench },
  ];

  return (
    <aside className="w-56 border-e border-slate-800 bg-slate-900/60 flex flex-col justify-between p-3 select-none">
      <div className="space-y-4">
        {/* Navigation Section */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Real Windows Volumes / Drives */}
        <div className="pt-2 border-t border-slate-800/80">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            {lang === 'ar' ? 'الأقراص ووحدات التخزين' : 'Drives & Volumes'}
          </p>
          <div className="space-y-1">
            {drives.map((drive) => {
              const isDriveActive = currentDirPath.toUpperCase().startsWith(drive.toUpperCase());
              return (
                <button
                  key={drive}
                  onClick={() => onSelectDrive(drive)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition ${
                    isDriveActive
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  }`}
                  title={drive}
                >
                  <HardDrive className={`w-3.5 h-3.5 ${isDriveActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="font-mono">Local Disk ({drive.replace('\\', '')})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick User Folders */}
        <div className="pt-2 border-t border-slate-800/80">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            {lang === 'ar' ? 'المجلدات السريعة' : 'Quick Folders'}
          </p>
          <div className="space-y-1">
            <button
              onClick={() => onSelectDrive('C:\\Users')}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/50 text-start"
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Users</span>
            </button>
          </div>
        </div>

        {/* Recent Archives List */}
        {recentArchives.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              {lang === 'ar' ? 'أحدث الأرشيفات' : 'Recent Archives'}
            </p>
            <div className="space-y-1">
              {recentArchives.map((name, i) => (
                <button
                  key={i}
                  onClick={() => onOpenArchive(name)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/50 text-start truncate"
                  title={name}
                >
                  <FileArchive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{name.split('\\').pop() || name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Engine Status Tag */}
      <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold">{t.sidebar.smartEngine}</span>
        </div>
        <p className="text-[10px] text-slate-500 text-center">
          {t.sidebar.offlineMode}
        </p>
      </div>
    </aside>
  );
};
