import React from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Gauge,
  Pause,
  Play,
  XCircle,
  Archive,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language, ProgressState } from '../types';

interface ProgressDialogProps {
  lang: Language;
  state: ProgressState;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
}

export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  lang,
  state,
  isPaused,
  onTogglePause,
  onCancel,
}) => {
  const t = lang === 'ar' ? ar : en;

  if (!state.active) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const ratio =
    state.original_bytes > 0
      ? ((state.compressed_bytes / state.original_bytes) * 100).toFixed(1)
      : '100.0';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 animate-pulse">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{state.title}</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-xs mt-0.5">
                {state.current_file || t.progress.currentFile}
              </p>
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-emerald-400">
            {state.percentage.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${state.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>{formatBytes(state.compressed_bytes)}</span>
            <span>of {formatBytes(state.original_bytes)}</span>
          </div>
        </div>

        {/* Real-time Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">{t.progress.speed}</span>
              <span className="font-mono font-bold text-slate-200">
                {state.speed_mbs.toFixed(1)} MB/s
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">{t.progress.ratio}</span>
              <span className="font-mono font-bold text-slate-200">{ratio}%</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">{t.progress.cpu}</span>
              <span className="font-mono font-bold text-slate-200">
                {state.cpu_pct.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-500 block">
                {t.progress.elapsed} / {t.progress.remaining}
              </span>
              <span className="font-mono font-bold text-slate-200">
                {formatTime(state.elapsed_secs)} / {formatTime(state.remaining_secs)}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition active:scale-95"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.progress.resume}</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.progress.pause}</span>
              </>
            )}
          </button>

          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition active:scale-95"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{t.progress.cancel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
