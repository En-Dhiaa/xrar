import React from 'react';
import {
  Home,
  FolderTree,
  Clock,
  Star,
  Wrench,
  ShieldCheck,
  Cpu,
  HardDrive,
  FileArchive,
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  lang,
  activeTab,
  onSelectTab,
  recentArchives,
  onOpenArchive,
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
    <aside className="w-60 border-e border-slate-800 bg-slate-900/50 flex flex-col justify-between p-3 select-none">
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

        {/* Quick Volumes / Drives */}
        <div className="pt-2 border-t border-slate-800/80">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            {lang === 'ar' ? 'وحدات التخزين' : 'Drives & Locations'}
          </p>
          <div className="space-y-0.5">
            <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/40">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Local Disk (C:)</span>
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/40">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Data Volume (D:)</span>
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
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Engine & Offline Badges */}
      <div className="space-y-2 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.sidebar.smartEngine}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/40 border border-slate-700/40 text-slate-400 text-[11px] font-medium">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
          <span className="truncate">{t.sidebar.offlineMode}</span>
        </div>
      </div>
    </aside>
  );
};
