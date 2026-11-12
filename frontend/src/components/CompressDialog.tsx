import React, { useState } from 'react';
import {
  X,
  Archive,
  Lock,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
  MessageSquare,
  FileCheck,
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
    comment?: string;
    testAfter?: boolean;
    lockArchive?: boolean;
  }) => void;
}

export const CompressDialog: React.FC<CompressDialogProps> = ({
  lang,
  isOpen,
  onClose,
  onStartCompress,
}) => {
  const t = lang === 'ar' ? ar : en;
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'comment'>('general');

  const [archiveName, setArchiveName] = useState('New_Archive');
  const [format, setFormat] = useState<SupportedFormat>('xrar');
  const [profile, setProfile] = useState<CompressionProfile>('smart');
  const [isSolid, setIsSolid] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [encryptNames, setEncryptNames] = useState(true);
  const [recoveryPercent, setRecoveryPercent] = useState<number>(3);
  const [splitVolumeMb, setSplitVolumeMb] = useState<number>(0);
  const [testAfter, setTestAfter] = useState(false);
  const [lockArchive, setLockArchive] = useState(false);
  const [comment, setComment] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  if (!isOpen) return null;

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
      solidMode: isSolid ? 'smart' : 'no_solid',
      password: password || undefined,
      recoveryRatio: recoveryPercent / 100.0,
      splitVolumeMb: splitVolumeMb > 0 ? splitVolumeMb : undefined,
      comment: comment || undefined,
      testAfter,
      lockArchive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/70">
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'general'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.compressDialog.tabGeneral}
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'advanced'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.compressDialog.tabAdvanced}
          </button>
          <button
            onClick={() => setActiveTab('comment')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'comment'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.compressDialog.tabComment}
          </button>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleStart} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {activeTab === 'general' && (
            <>
              {/* Archive Name & Format */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t.compressDialog.archiveName}:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={archiveName}
                    onChange={(e) => setArchiveName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <span className="font-mono text-slate-400 px-2 py-2 bg-slate-800 rounded-lg border border-slate-700">
                    .{format}
                  </span>
                </div>
              </div>

              {/* Format selection */}
              <div>
                <span className="block text-slate-300 font-medium mb-1.5">
                  {t.compressDialog.format}:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['xrar', 'zip', '7z'] as SupportedFormat[]).map((f) => (
                    <label
                      key={f}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer font-bold transition ${
                        format === f
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={f}
                        checked={format === f}
                        onChange={() => setFormat(f)}
                        className="hidden"
                      />
                      <span>.{f.toUpperCase()}</span>
                      {f === 'xrar' && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                          Native
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Compression Method */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {t.compressDialog.profile}:
                </label>
                <select
                  value={profile}
                  onChange={(e) => setProfile(e.target.value as CompressionProfile)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="smart">{t.compressDialog.profiles.smart}</option>
                  <option value="fast">{t.compressDialog.profiles.fast}</option>
                  <option value="balanced">{t.compressDialog.profiles.balanced}</option>
                  <option value="high">{t.compressDialog.profiles.high}</option>
                  <option value="ultra">{t.compressDialog.profiles.ultra}</option>
                  <option value="extreme">{t.compressDialog.profiles.extreme}</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  {profile === 'smart'
                    ? t.compressDialog.smartNotice
                    : profile === 'extreme'
                    ? t.compressDialog.extremeWarning
                    : 'Balanced multi-codec LZMA2 / Zstd streaming.'}
                </p>
              </div>

              {/* Split to volumes & Archiving Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {t.compressDialog.splitVolumes}:
                  </label>
                  <select
                    value={splitVolumeMb}
                    onChange={(e) => setSplitVolumeMb(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>{t.compressDialog.splitOptions.none}</option>
                    <option value={100}>{t.compressDialog.splitOptions.mb100}</option>
                    <option value={500}>{t.compressDialog.splitOptions.mb500}</option>
                    <option value={1024}>{t.compressDialog.splitOptions.gb1}</option>
                    <option value={2048}>{t.compressDialog.splitOptions.gb2}</option>
                    <option value={4096}>{t.compressDialog.splitOptions.gb4}</option>
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSolid}
                      onChange={(e) => setIsSolid(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span className="font-medium text-slate-200">{t.compressDialog.solidMode}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testAfter}
                      onChange={(e) => setTestAfter(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span className="text-slate-300">{t.compressDialog.testAfter}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockArchive}
                      onChange={(e) => setLockArchive(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span className="text-slate-300">{t.compressDialog.lockArchive}</span>
                  </label>
                </div>
              </div>

              {/* Password button */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(!isPasswordModalOpen)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border transition ${
                    password
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{password ? 'Password Set (AES-256-GCM)' : t.compressDialog.setPassword}</span>
                </button>
                {password && (
                  <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Encrypted with Argon2id KDF
                  </span>
                )}
              </div>

              {/* Password Panel if opened */}
              {isPasswordModalOpen && (
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1">{t.compressDialog.password}:</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.compressDialog.passwordPlaceholder}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">{t.compressDialog.passwordConfirm}:</label>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder={t.compressDialog.passwordConfirm}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 text-xs focus:border-blue-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={encryptNames}
                      onChange={(e) => setEncryptNames(e.target.checked)}
                      className="accent-blue-500 rounded"
                    />
                    <span>{t.compressDialog.encryptNames}</span>
                  </label>
                </div>
              )}
            </>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4">
              {/* Recovery record */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <label className="block font-semibold text-slate-200">
                  {t.compressDialog.recovery}:
                </label>
                <p className="text-[11px] text-slate-400">
                  Embeds Reed-Solomon GF(2^8) error correction blocks to recover archive in case of disk bad sectors.
                </p>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[0, 1, 3, 5, 10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setRecoveryPercent(pct)}
                      className={`py-2 rounded-lg border text-xs font-semibold transition ${
                        recoveryPercent === pct
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {pct === 0 ? 'None (0%)' : `${pct}% Parity`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comment' && (
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium">
                {t.comment.title}:
              </label>
              <textarea
                rows={9}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.comment.placeholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              {t.compressDialog.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              {t.compressDialog.compress}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
