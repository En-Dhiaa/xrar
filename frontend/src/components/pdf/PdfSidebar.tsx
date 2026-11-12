import React, { useState } from 'react';
import {
  Layers,
  Bookmark,
  Paperclip,
  Search,
  ChevronRight,
  ChevronDown,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { PdfOutlineItem, PdfSearchResult } from '../../types';

interface PdfSidebarProps {
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  outline: PdfOutlineItem[];
  searchResults: PdfSearchResult[];
  activeSearchIndex: number;
  onSelectSearchResult: (index: number) => void;
  thumbnailUrls: Record<number, string>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const PdfSidebar: React.FC<PdfSidebarProps> = ({
  totalPages,
  currentPage,
  onSelectPage,
  outline,
  searchResults,
  activeSearchIndex,
  onSelectSearchResult,
  thumbnailUrls,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeTab, setActiveTab] = useState<'thumbnails' | 'outline' | 'attachments' | 'search'>('thumbnails');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNode = (key: string) => {
    setExpandedNodes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isCollapsed) {
    return (
      <aside className="w-10 border-e border-slate-800 bg-slate-950 flex flex-col items-center py-2 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition mb-2"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  const renderOutlineItems = (items: PdfOutlineItem[], depth = 0) => {
    return items.map((item, idx) => {
      const key = `${depth}-${idx}-${item.title}`;
      const isExpanded = !!expandedNodes[key];
      const hasChildren = item.items && item.items.length > 0;

      return (
        <div key={key} className="text-xs">
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer text-slate-300 hover:text-white transition group ${
              item.pageNumber === currentPage ? 'bg-rose-500/15 text-rose-300 font-semibold' : ''
            }`}
            style={{ paddingInlineStart: `${depth * 14 + 8}px` }}
            onClick={() => {
              if (item.pageNumber) onSelectPage(item.pageNumber);
              if (hasChildren) toggleNode(key);
            }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(key);
                }}
                className="p-0.5 text-slate-500 hover:text-slate-300"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ) : (
              <span className="w-3" />
            )}
            <Bookmark className="w-3 h-3 text-slate-500 group-hover:text-rose-400 shrink-0" />
            <span className="truncate flex-1">{item.title}</span>
            {item.pageNumber && (
              <span className="text-[10px] font-mono text-slate-500">{item.pageNumber}</span>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className="space-y-0.5">{renderOutlineItems(item.items!, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="w-64 border-e border-slate-800 bg-slate-900/60 flex flex-col select-none overflow-hidden">
      {/* Sidebar Navigation Tabs */}
      <div className="h-10 border-b border-slate-800 flex items-center justify-between px-2 bg-slate-950/80">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('thumbnails')}
            className={`p-1.5 rounded-lg transition ${
              activeTab === 'thumbnails'
                ? 'bg-rose-500/20 text-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Page Thumbnails"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('outline')}
            className={`p-1.5 rounded-lg transition ${
              activeTab === 'outline'
                ? 'bg-rose-500/20 text-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Document Bookmarks / Outline"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`p-1.5 rounded-lg transition ${
              activeTab === 'search'
                ? 'bg-rose-500/20 text-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Search Results"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`p-1.5 rounded-lg transition ${
              activeTab === 'attachments'
                ? 'bg-rose-500/20 text-rose-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Attachments"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-500 hover:text-slate-300"
          title="Collapse Sidebar"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'thumbnails' && (
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Pages ({totalPages})
            </span>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                const isActive = pageNum === currentPage;
                const thumbUrl = thumbnailUrls[pageNum];

                return (
                  <div
                    key={pageNum}
                    onClick={() => onSelectPage(pageNum)}
                    className={`flex flex-col items-center p-1.5 rounded-xl cursor-pointer border transition ${
                      isActive
                        ? 'bg-rose-500/10 border-rose-500 shadow-md shadow-rose-500/10'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="w-full aspect-[1/1.4] bg-white rounded flex items-center justify-center overflow-hidden relative shadow-sm">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Page ${pageNum}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                          <FileText className="w-6 h-6 stroke-1 text-slate-300" />
                          <span className="text-[10px] text-slate-400 mt-1 font-mono">{pageNum}</span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-mono mt-1 font-semibold ${
                        isActive ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      Page {pageNum}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'outline' && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Document Outline
            </span>
            {outline.length === 0 ? (
              <p className="text-xs text-slate-500 p-2 text-center">
                This document contains no bookmarks.
              </p>
            ) : (
              <div className="space-y-1">{renderOutlineItems(outline)}</div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Search Results ({searchResults.length})
            </span>
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 p-2 text-center">
                No active search query or no results found.
              </p>
            ) : (
              <div className="space-y-1.5">
                {searchResults.map((res, i) => (
                  <div
                    key={i}
                    onClick={() => onSelectSearchResult(i)}
                    className={`p-2 rounded-xl border text-xs cursor-pointer transition ${
                      activeSearchIndex === i
                        ? 'bg-rose-500/15 border-rose-500 text-rose-200'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-bold text-rose-400">
                        Page {res.pageNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">#{i + 1}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                      "{res.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="space-y-2 text-center p-4">
            <Paperclip className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No embedded file attachments</p>
            <p className="text-[10px] text-slate-500">
              Attachments in this PDF will be listed here.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

