'use client';

import React from 'react';
import { CheckCircle2, Database, FileSpreadsheet, ArrowRight, X, Mail, Download } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  docType?: string; // 'Quotation' | 'Invoice' | 'Delivery Challan' | 'Cash Bill'
  docNumber: string;
  clientName?: string;
  totalAmount?: number | string;
  sheetTabName?: string; // e.g. 'Quotations' or 'Sheet1'
  onProceedToEmail?: () => void;
}

export default function SuccessModal({
  isOpen,
  onClose,
  title = 'Successfully Saved!',
  docType = 'Quotation',
  docNumber,
  clientName,
  totalAmount,
  sheetTabName = 'Quotations',
  onProceedToEmail,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.25)] rounded-2xl p-6 sm:p-7 flex flex-col text-slate-100 overflow-hidden">
        
        {/* Background Ambient Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
              Synced & Verified
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-1">
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {docType} <span className="font-semibold text-emerald-300 font-mono">#{docNumber}</span> has been stored across both systems.
            </p>
          </div>
        </div>

        {/* Dual Storage Confirmation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Google Sheets Status */}
          <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-xs font-bold text-white">Google Sheets</span>
              </div>
              <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                Inserted into <span className="underline font-mono">'{sheetTabName}'</span> tab
              </p>
              <p className="text-[10px] text-slate-400">Row written successfully</p>
            </div>
          </div>

          {/* Supabase Status */}
          <div className="bg-slate-950/70 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="text-xs font-bold text-white">Supabase DB</span>
              </div>
              <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">
                Saved & Synced
              </p>
              <p className="text-[10px] text-slate-400">Live cloud database record</p>
            </div>
          </div>
        </div>

        {/* Document Summary Info */}
        {(clientName || totalAmount !== undefined) && (
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs space-y-1 mb-6">
            {clientName && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Client / Party:</span>
                <span className="font-semibold text-white truncate max-w-[240px]">{clientName}</span>
              </div>
            )}
            {totalAmount !== undefined && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ₹{Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Dismiss
          </button>
          {onProceedToEmail && (
            <button
              onClick={() => {
                onClose();
                onProceedToEmail();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg active:scale-95 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email / Download</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
