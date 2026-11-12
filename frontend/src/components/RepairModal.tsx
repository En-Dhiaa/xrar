import React, { useState } from 'react';
import { Wrench, CheckCircle2, AlertTriangle, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language } from '../types';

interface RepairModalProps {
  lang: Language;
  archiveName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RepairModal: React.FC<RepairModalProps> = ({
  lang,
  archiveName,
  isOpen,
  onClose,
}) => {
  const t = lang === 'ar' ? ar : en;
  const [step, setStep] = useState<'idle' | 'scanning' | 'repairing' | 'done'>('idle');

  if (!isOpen) return null;

  const handleStartRepair = () => {
    setStep('scanning');
    setTimeout(() => {
      setStep('repairing');
      setTimeout(() => {
        setStep('done');
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wrench className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-slate-100 text-sm">
              {t.repairDialog.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          <p className="text-slate-400 leading-relaxed">
            {t.repairDialog.subtitle}
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Archive:</span>
              <span className="font-mono text-slate-200 font-semibold">{archiveName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recovery Record:</span>
              <span className="text-emerald-400 font-medium">Reed-Solomon GF(2^8) (3% Parity)</span>
            </div>
          </div>

          {step === 'idle' && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'الأرشيف مهيأ مع قطاعات استرداد ذاتية، جاهز لبدء الفحص والترميم.'
                  : 'Archive is configured with self-healing recovery parity. Ready to scan and reconstruct.'}
              </span>
            </div>
          )}

          {(step === 'scanning' || step === 'repairing') && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="font-semibold">
                  {step === 'scanning' ? t.repairDialog.scanning : t.repairDialog.statusRepairable}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 ${
                    step === 'scanning' ? 'w-1/2' : 'w-full'
                  }`}
                />
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.repairDialog.statusSuccess}</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {lang === 'ar'
                  ? 'تم إنشاء نسخة سليمة: ' + archiveName.replace('.xrar', '_repaired.xrar')
                  : 'Repaired archive written to: ' + archiveName.replace('.xrar', '_repaired.xrar')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end gap-2">
          {step !== 'done' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                {t.repairDialog.close}
              </button>
              <button
                onClick={handleStartRepair}
                disabled={step !== 'idle'}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                {t.repairDialog.startRepair}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
            >
              {t.repairDialog.close}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
