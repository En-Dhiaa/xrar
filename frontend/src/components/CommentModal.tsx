import React, { useState } from 'react';
import { MessageSquare, Save, X } from 'lucide-react';
import { en } from '../locales/en';
import { ar } from '../locales/ar';
import { Language } from '../types';

interface CommentModalProps {
  lang: Language;
  comment: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newComment: string) => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  lang,
  comment,
  isOpen,
  onClose,
  onSave,
}) => {
  const t = lang === 'ar' ? ar : en;
  const [text, setText] = useState(comment);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-slate-100 text-sm">
              {t.comment.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text Area */}
        <div className="p-5">
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.comment.placeholder}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            {t.comment.close}
          </button>
          <button
            onClick={() => {
              onSave(text);
              onClose();
            }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold text-xs shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{t.comment.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

