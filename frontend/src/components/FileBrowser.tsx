import React, { useState } from 'react';
import {
  FileText,
  FileCode,
  FileImage,
  FileArchive,
  File,
  Folder,
  CornerLeftUp,
  Search,
  Eye,
  Download,
  ArrowUpDown,
  Check,
  RefreshCw,
  Trash2,
  Copy,
  Info,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { ArchiveItem, Language } from '../types';

interface FileBrowserProps {
  lang: Language;
  items: ArchiveItem[];
  archiveName: string | null;
  currentFolder: string;
  onNavigateFolder: (folder: string) => void;
  onPreview: (item: ArchiveItem) => void;
  onExtractItem: (item: ArchiveItem) => void;
  onDeleteItem: (path: string) => void;
  selectedPaths: string[];
  onToggleSelect: (path: string) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  lang,
  items,
  archiveName,
  currentFolder,
  onNavigateFolder,
  onPreview,
  onExtractItem,
  onDeleteItem,
  selectedPaths,
  onToggleSelect,
}) => {
  const t = lang === 'ar' ? ar : en;
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'path' | 'uncompressed_size' | 'compression_ratio'>('path');
  const [sortAsc, setSortAsc] = useState(true);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: ArchiveItem | null;
  }>({ visible: false, x: 0, y: 0, item: null });

  const getFileIcon = (path: string, isDir: boolean) => {
    if (isDir) return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'rs':
      case 'ts':
      case 'js':
      case 'py':
      case 'json':
      case 'html':
      case 'css':
        return <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp':
        return <FileImage className="w-4 h-4 text-pink-400 shrink-0" />;
      case 'xrar':
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
        return <FileArchive className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'txt':
      case 'md':
      case 'log':
        return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleUpLevel = () => {
    if (!currentFolder) return;
    const parts = currentFolder.split('/').filter(Boolean);
    parts.pop();
    onNavigateFolder(parts.join('/'));
  };

  const handleContextMenu = (e: React.MouseEvent, item: ArchiveItem) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  const closeContextMenu = () => {
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0, item: null });
    }
  };

  const filteredItems = items
    .filter((item) => {
      if (search) {
        return item.path.toLowerCase().includes(search.toLowerCase());
      }
      if (currentFolder) {
        return item.path.startsWith(currentFolder + '/') || item.path === currentFolder;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;

      let res = 0;
      if (sortField === 'path') {
        res = a.path.localeCompare(b.path);
      } else if (sortField === 'uncompressed_size') {
        res = a.uncompressed_size - b.uncompressed_size;
      } else if (sortField === 'compression_ratio') {
        res = a.compression_ratio - b.compression_ratio;
      }
      return sortAsc ? res : -res;
    });

  const toggleSort = (field: 'path' | 'uncompressed_size' | 'compression_ratio') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div
      onClick={closeContextMenu}
      className="flex-1 flex flex-col bg-slate-950 overflow-hidden select-none relative"
    >
      {/* WinRAR Address / Path Bar */}
      <div className="h-10 border-b border-slate-800 px-3 flex items-center justify-between gap-3 bg-slate-900/40">
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
          {/* Up folder button */}
          <button
            onClick={handleUpLevel}
            disabled={!currentFolder}
            className={`p-1 rounded-md border transition ${
              currentFolder
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                : 'text-slate-600 border-transparent cursor-not-allowed opacity-40'
            }`}
            title={t.addressBar.up}
          >
            <CornerLeftUp className="w-4 h-4" />
          </button>

          {/* Current Path Bar */}
          <div className="flex-1 flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 overflow-hidden">
            <span className="text-slate-500">{t.addressBar.computer} &gt;</span>
            <span className="font-semibold text-emerald-400 truncate">
              {archiveName || 'No Archive'}
            </span>
            {currentFolder && (
              <>
                <span className="text-slate-500">&gt;</span>
                <span className="text-cyan-300 font-semibold">{currentFolder}</span>
              </>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-56 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 start-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.browser.searchPlaceholder}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg text-xs ps-8 pe-3 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Main Files Table */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4">
            <FileArchive className="w-8 h-8 text-emerald-500/40" />
          </div>
          <h3 className="text-sm font-bold text-slate-300">{t.browser.emptyTitle}</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">{t.browser.emptySubtitle}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-[11px] font-semibold text-slate-400 select-none z-10">
              <tr>
                <th className="w-10 px-3 py-2 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th
                  onClick={() => toggleSort('path')}
                  className="px-3 py-2 text-start cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t.browser.name}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('uncompressed_size')}
                  className="w-24 px-3 py-2 text-end cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>{t.browser.size}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="w-24 px-3 py-2 text-end">{t.browser.packed}</th>
                <th
                  onClick={() => toggleSort('compression_ratio')}
                  className="w-28 px-3 py-2 text-center cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{t.browser.ratio}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="w-24 px-3 py-2 text-center">{t.browser.checksum}</th>
                <th className="w-20 px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {/* Parent Directory (..) Row if inside subfolder */}
              {currentFolder && (
                <tr
                  onDoubleClick={handleUpLevel}
                  className="hover:bg-slate-800/40 cursor-pointer text-slate-400"
                >
                  <td className="px-3 py-1.5 text-center">
                    <CornerLeftUp className="w-3.5 h-3.5 mx-auto text-cyan-400" />
                  </td>
                  <td colSpan={6} className="px-3 py-1.5 font-bold font-mono text-cyan-300">
                    ..
                  </td>
                </tr>
              )}

              {filteredItems.map((item, idx) => {
                const isSelected = selectedPaths.includes(item.path);
                const displayName = currentFolder
                  ? item.path.replace(currentFolder + '/', '')
                  : item.path;

                return (
                  <tr
                    key={idx}
                    onClick={() => onToggleSelect(item.path)}
                    onDoubleClick={() => {
                      if (item.is_dir) {
                        onNavigateFolder(item.path);
                      } else {
                        onPreview(item);
                      }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`group hover:bg-slate-800/40 transition cursor-pointer ${
                      isSelected ? 'bg-cyan-500/10' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div
                        onClick={() => onToggleSelect(item.path)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 group-hover:border-slate-500'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {getFileIcon(item.path, item.is_dir)}
                        <span className="font-medium text-slate-200 truncate max-w-md">
                          {displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-slate-400">
                      {item.is_dir ? '-' : formatBytes(item.uncompressed_size)}
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-slate-400">
                      {item.is_dir ? '-' : formatBytes(item.compressed_size)}
                    </td>
                    <td className="px-3 py-2">
                      {!item.is_dir && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                              style={{ width: `${item.compression_ratio}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 w-9 text-end">
                            {item.compression_ratio.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[10px] text-slate-500 truncate max-w-[100px]">
                      {item.checksum ? item.checksum.substring(0, 8) + '...' : '-'}
                    </td>
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {!item.is_dir && (
                          <button
                            onClick={() => onPreview(item)}
                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                            title={t.browser.preview}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onExtractItem(item)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                          title={t.toolbar.extract}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* WinRAR Right-Click Context Menu */}
      {contextMenu.visible && contextMenu.item && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onExtractItem(contextMenu.item!);
              closeContextMenu();
            }}
            className="w-full text-start px-3 py-1.5 hover:bg-blue-600/30 hover:text-white flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>{t.toolbar.extract}</span>
          </button>
          {!contextMenu.item.is_dir && (
            <button
              onClick={() => {
                onPreview(contextMenu.item!);
                closeContextMenu();
              }}
              className="w-full text-start px-3 py-1.5 hover:bg-amber-600/30 hover:text-white flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.browser.preview}</span>
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(contextMenu.item!.checksum);
              closeContextMenu();
            }}
            className="w-full text-start px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Checksum</span>
          </button>
          <div className="h-px bg-slate-800 my-1" />
          <button
            onClick={() => {
              onDeleteItem(contextMenu.item!.path);
              closeContextMenu();
            }}
            className="w-full text-start px-3 py-1.5 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.browser.delete}</span>
          </button>
        </div>
      )}
    </div>
  );
};
