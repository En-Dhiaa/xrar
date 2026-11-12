import React, { useState } from 'react';
import {
  X,
  Gauge,
  Play,
  RotateCw,
  Award,
  Zap,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { BenchmarkReport, Language } from '../types';

interface BenchmarkModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  report: BenchmarkReport | null;
  onRunBenchmark: () => Promise<void>;
  isRunning: boolean;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  lang,
  isOpen,
  onClose,
  report,
  onRunBenchmark,
  isRunning,
}) => {
  const t = lang === 'ar' ? ar : en;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t.benchmark.title}</h2>
              <p className="text-[11px] text-slate-400">{t.benchmark.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Top Actions & Overall Score */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">
                {t.benchmark.score}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {report ? report.overall_score : '----'}
                </span>
                {report && (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    <Award className="w-3.5 h-3.5" /> High Performance
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onRunBenchmark}
              disabled={isRunning}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                isRunning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-slate-950 shadow-lg shadow-blue-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Benchmarking Hardware...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{t.benchmark.runButton}</span>
                </>
              )}
            </button>
          </div>

          {/* Results Table */}
          {report ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 text-start">{t.benchmark.codec}</th>
                    <th className="px-4 py-2.5 text-end">{t.benchmark.compSpeed}</th>
                    <th className="px-4 py-2.5 text-end">{t.benchmark.decompSpeed}</th>
                    <th className="px-4 py-2.5 text-center">{t.benchmark.ratio}</th>
                    <th className="px-4 py-2.5 text-end">{t.benchmark.time}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {report.results.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="px-4 py-2.5 font-semibold text-slate-200">
                        {r.codec_name}
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono text-emerald-400 font-bold">
                        {r.compression_speed_mbs.toFixed(1)} MB/s
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono text-cyan-400 font-bold">
                        {r.decompression_speed_mbs.toFixed(1)} MB/s
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-slate-300">
                        {r.compression_ratio_pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-end font-mono text-slate-400">
                        {r.compression_time_ms + r.decompression_time_ms} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <Activity className="w-10 h-10 mb-3 text-slate-600" />
              <p className="text-xs">Click 'Run Benchmark' to measure your hardware.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
