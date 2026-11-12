import React from 'react';
import { ShieldCheck, Cpu, Code2, Globe, Github, X } from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language } from '../types';

interface AboutModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ lang, isOpen, onClose }) => {
  const t = lang === 'ar' ? ar : en;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-center">
        {/* Top Banner with App Icon */}
        <div className="p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-cyan-400/40 shadow-xl shadow-cyan-500/20 mb-3 bg-slate-950">
            <img
              src="/icon.png"
              alt="XRAR Icon"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-black bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            {t.appName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.tagline}
          </p>
          <span className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            v1.0.0 Windows x64 Official Release
          </span>
        </div>

        {/* Content Details */}
        <div className="p-5 text-xs text-slate-300 space-y-3 text-start">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Developer:</span>
              <span className="font-semibold text-white">En-Dhiaa (ضياء)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">License:</span>
              <span className="text-emerald-400 font-mono">MIT / Apache 2.0 Open Source</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Core Engine:</span>
              <span className="text-cyan-300 font-mono">Rust Stable (100% Offline)</span>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed text-[11px]">
            {t.about.features}
          </p>

          <a
            href="https://github.com/En-Dhiaa/xrar"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-medium"
          >
            <Github className="w-4 h-4 text-cyan-400" />
            <span>https://github.com/En-Dhiaa/xrar</span>
          </a>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold transition active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            {t.about.close}
          </button>
        </div>
      </div>
    </div>
  );
};

