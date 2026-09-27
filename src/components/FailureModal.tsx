'use client';

import React from 'react';
import { AlertTriangle, X, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';

interface FailureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export default function FailureModal({
  isOpen,
  onClose,
  title = 'Google Sheets Insertion Failed',
  message,
  details,
  onRetry
}: FailureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-red-950/40 via-slate-900 to-slate-950 border border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.25)] rounded-2xl p-6 sm:p-7 flex flex-col text-slate-100 overflow-hidden">
        
        {/* Background Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
              Sheet Insertion Error
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1">
              {title}
            </h3>
          </div>
        </div>

        {/* Description / Message */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            {message}
          </p>

          {details && (
            <div className="bg-slate-950/80 border border-red-500/20 rounded-xl p-3.5 text-xs font-mono text-red-300/90 break-words max-h-36 overflow-auto">
              <span className="font-bold text-red-400 block mb-1 text-[11px] uppercase tracking-wider">Error Details:</span>
              {details}
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic">
            * Please check your network connection, Google Sheets permissions, or API credentials before retrying.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Dismiss
          </button>
          {onRetry && (
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Saving</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
