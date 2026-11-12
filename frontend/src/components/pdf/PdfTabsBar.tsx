import React from 'react';
import { FileText, X, Plus } from 'lucide-react';
import { PdfDocumentTab } from '../../types';

interface PdfTabsBarProps {
  tabs: PdfDocumentTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export const PdfTabsBar: React.FC<PdfTabsBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="h-9 bg-slate-950 border-b border-slate-800 flex items-center px-2 gap-1 overflow-x-auto select-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer border-t border-x transition group max-w-[200px] ${
              isActive
                ? 'bg-slate-900 border-slate-700 text-rose-400 font-bold shadow-sm'
                : 'bg-slate-950 border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
            title={tab.filePath}
          >
            <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-rose-400' : 'text-slate-500'}`} />
            <span className="truncate flex-1">{tab.fileName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition opacity-60 group-hover:opacity-100"
              title="Close Tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      <button
        onClick={onNewTab}
        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition ms-1"
        title="Open PDF Document..."
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

