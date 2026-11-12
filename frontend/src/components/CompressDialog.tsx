import React, { useState } from 'react';
import {
  X,
  Archive,
  Lock,
  ShieldAlert,
  Layers,
  Cpu,
  Sparkles,
  Sliders,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { CompressionProfile, Language, SolidMode, SupportedFormat } from '../types';

interface CompressDialogProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onStartCompress: (options: {
    archiveName: string;
    format: SupportedFormat;
    profile: CompressionProfile;
    solidMode: SolidMode;
    password?: string;
    recoveryRatio: number;
    splitVolumeMb?: number;
  }) => void;
}

export const CompressDialog: React.FC<CompressDialogProps> = ({
  lang,
  isOpen,
  onClose,
  onStartCompress,
}) => {
  const t = lang === 'ar' ? ar : en;

  const [archiveName, setArchiveName] = useState('New_Archive');
  const [format, setFormat] = useState<SupportedFormat>('xrar');
  const [profile, setProfile] = useState<CompressionProfile>('smart');
  const [solidMode, setSolidMode] = useState<SolidMode>('smart');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryRatio, setRecoveryRatio] = useState<number>(0.03);
  const [splitVolumeMb, setSplitVolumeMb] = useState<number>(0);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    return Math.min(score, 100);
  };

  const strength = getPasswordStrength();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== passwordConfirm) {
      alert(lang === 'ar' ? 'كلمات المرور غير متطابقة!' : 'Passwords do not match!');
      return;
    }
    onStartCompress({
      archiveName: `${archiveName}.${format}`,
      format,
      profile,
      solidMode,
      password: password || undefined,
      recoveryRatio,
      splitVolumeMb: splitVolumeMb > 0 ? splitVolumeMb : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Archive className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-100">{t.compressDialog.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleStart} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Archive Name & Format */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t.compressDialog.archiveName}
              </label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {t.compressDialog.format}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as SupportedFormat)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="xrar">.xrar (Native High Density)</option>
                <option value="zip">.zip (Universal Standard)</option>
                <option value="tar">.tar (UNIX Archive)</option>
                <option value="7z">.7z (LZMA2 Archive)</option>
              </select>
            </div>
          </div>

          {/* Compression Profile Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.compressDialog.profile}</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(['smart', 'fast', 'balanced', 'high', 'ultra', 'extreme'] as CompressionProfile[]).map(
                (p) => {
                  const isSelected = profile === p;
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setProfile(p)}
                      className={`p-3 rounded-xl border text-start flex flex-col justify-between transition ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold capitalize">
                          {p === 'smart' ? '✨ Smart' : p}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        {t.compressDialog.profiles[p]}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {profile === 'smart' && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <p>{t.compressDialog.smartNotice}</p>
              </div>
            )}

            {profile === 'extreme' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <p>{t.compressDialog.extremeWarning}</p>
              </div>
            )}
          </div>

          {/* Solid Mode & Volumes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.compressDialog.solidMode}</span>
              </label>
              <select
                value={solidMode}
                onChange={(e) => setSolidMode(e.target.value as SolidMode)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="smart">{t.compressDialog.solidOptions.smart}</option>
                <option value="no_solid">{t.compressDialog.solidOptions.none}</option>
                <option value="small">{t.compressDialog.solidOptions.small}</option>
                <option value="medium">{t.compressDialog.solidOptions.medium}</option>
                <option value="maximum">{t.compressDialog.solidOptions.maximum}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.compressDialog.splitVolumes}</span>
              </label>
              <select
                value={splitVolumeMb}
                onChange={(e) => setSplitVolumeMb(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value={0}>{t.compressDialog.splitOptions.none}</option>
                <option value={100}>{t.compressDialog.splitOptions.mb100}</option>
                <option value={500}>{t.compressDialog.splitOptions.mb500}</option>
                <option value={1024}>{t.compressDialog.splitOptions.gb1}</option>
                <option value={2048}>{t.compressDialog.splitOptions.gb2}</option>
                <option value={4096}>{t.compressDialog.splitOptions.gb4}</option>
              </select>
            </div>
          </div>

          {/* Recovery Records */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-teal-400" />
              <span>{t.compressDialog.recovery}</span>
            </label>
            <select
              value={recoveryRatio}
              onChange={(e) => setRecoveryRatio(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value={0}>{t.compressDialog.recoveryOptions.none}</option>
              <option value={0.01}>{t.compressDialog.recoveryOptions.one}</option>
              <option value={0.03}>{t.compressDialog.recoveryOptions.three}</option>
              <option value={0.05}>{t.compressDialog.recoveryOptions.five}</option>
              <option value={0.1}>{t.compressDialog.recoveryOptions.ten}</option>
            </select>
          </div>

          {/* Encryption (Optional AES-256-GCM) */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>{t.compressDialog.encryption}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">
                  {t.compressDialog.password}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.compressDialog.passwordPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">
                  {t.compressDialog.passwordConfirm}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={t.compressDialog.passwordConfirm}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {password && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Strength: {strength}%</span>
                  <span
                    className={
                      strength > 75
                        ? 'text-emerald-400'
                        : strength > 40
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }
                  >
                    {strength > 75 ? 'Strong' : strength > 40 ? 'Moderate' : 'Weak'}
                  </span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      strength > 75
                        ? 'bg-emerald-500'
                        : strength > 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${strength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {t.compressDialog.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            >
              {t.compressDialog.compress}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
