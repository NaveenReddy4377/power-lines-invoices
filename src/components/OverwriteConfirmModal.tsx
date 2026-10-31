'use client';

import React from 'react';
import { AlertTriangle, X, Check, RefreshCw, FileText } from 'lucide-react';

interface OverwriteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  docType: 'Invoice' | 'Quotation' | 'Delivery Challan' | 'Cash Bill' | 'Form Field';
  docNumber?: string;
  message?: string;
  existingRecordInfo?: {
    customerName?: string;
    date?: string;
    amount?: string | number;
  };
  confirmLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
}

export default function OverwriteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  docType,
  docNumber,
  message,
  existingRecordInfo,
  confirmLabel = 'Yes, Override & Update',
  cancelLabel = 'Cancel (Keep Old Record)',
  isSaving = false
}: OverwriteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] rounded-2xl p-6 sm:p-7 flex flex-col text-slate-100 overflow-hidden">
        
        {/* Background Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <AlertTriangle className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                Existing Data Warning
              </span>
              {docNumber && (
                <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                  {docNumber}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1.5">
              {title || `Override Existing ${docType}?`}
            </h3>
          </div>
        </div>

        {/* Description / Message */}
        <div className="space-y-3 mb-5">
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            {message || (
              <>
                A record for <strong className="text-amber-300">{docType} #{docNumber}</strong> already exists in Google Sheets & the database.
              </>
            )}
          </p>

          {/* Existing Record Snapshot Card */}
          {existingRecordInfo && (
            <div className="p-3 bg-slate-950/80 border border-amber-500/30 rounded-xl space-y-1.5 text-xs text-slate-300">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Existing Record in Sheet:
              </div>
              {existingRecordInfo.customerName && (
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold text-slate-200">{existingRecordInfo.customerName}</span>
                </div>
              )}
              {existingRecordInfo.date && (
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-semibold text-slate-300">{existingRecordInfo.date}</span>
                </div>
              )}
              {existingRecordInfo.amount !== undefined && existingRecordInfo.amount !== '' && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-bold text-emerald-400">₹{Number(existingRecordInfo.amount).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg leading-relaxed">
            ⚠️ Saving this document will <strong>overwrite</strong> the existing fields for this entry in Google Sheets and Supabase.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Overwriting...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

