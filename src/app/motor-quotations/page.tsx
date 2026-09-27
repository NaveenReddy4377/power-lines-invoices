'use client';

import { useState } from 'react';
import MotorQuotationForm from '@/components/MotorQuotationForm';
import MotorQuotationPreview from '@/components/MotorQuotationPreview';
import FailureModal from '@/components/FailureModal';
import { MotorQuotationData, initialMotorQuotationData } from '@/types';
import { Printer, RefreshCcw, Save, Loader2, ArrowLeft } from 'lucide-react';
import { saveMotorQuotation } from '@/app/actions';
import Link from 'next/link';

export default function MotorQuotationPage() {
  const [data, setData] = useState<MotorQuotationData>(initialMotorQuotationData);
  const [isSaving, setIsSaving] = useState(false);
  const [failureModal, setFailureModal] = useState<{ isOpen: boolean; message: string; details?: string; onRetry?: () => void }>({
    isOpen: false,
    message: '',
    details: ''
  });

  const handlePrint = async () => {
    if (!data.companyName || !data.companyName.trim()) {
      setFailureModal({
        isOpen: true,
        message: 'Customer Company Name is required before saving and printing.',
        details: 'Please enter a company name in Customer Details.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveMotorQuotation(data);
      if (!res.success) {
        setFailureModal({
          isOpen: true,
          message: `Failed to insert Motor Quotation #${data.quotationNo} into Google Sheets.`,
          details: res.error || 'Spreadsheet row insertion failed.',
          onRetry: handlePrint
        });
        return;
      }

      const originalTitle = document.title;
      document.title = `${data.quotationNo}_Motor_Quotation`;
      window.print();
      document.title = originalTitle;
    } catch (err: any) {
      setFailureModal({
        isOpen: true,
        message: `Failed to insert Motor Quotation #${data.quotationNo} into Google Sheets.`,
        details: err.message || 'Network/Server communication error occurred.',
        onRetry: handlePrint
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!data.companyName || !data.companyName.trim()) {
      setFailureModal({
        isOpen: true,
        message: 'Customer Company Name is required before saving to Google Sheets.',
        details: 'Please enter a company name in Customer Details.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveMotorQuotation(data);
      if (res.success) {
        alert('Motor Quotation saved to Google Sheets successfully!');
      } else {
        setFailureModal({
          isOpen: true,
          message: `Failed to save Motor Quotation #${data.quotationNo} into Google Sheets.`,
          details: res.error || 'Spreadsheet update error.',
          onRetry: handleSave
        });
      }
    } catch (err: any) {
      setFailureModal({
        isOpen: true,
        message: `Failed to save Motor Quotation #${data.quotationNo} into Google Sheets.`,
        details: err.message || 'Network error occurred.',
        onRetry: handleSave
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all rates and fields to defaults?')) {
      setData(initialMotorQuotationData);
    }
  };

  return (
    <div className="h-full bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-amber-500/30">
      {/* Professional Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl px-6 print:hidden sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent uppercase leading-none">Motor Quotation</h1>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Professional Rate Configurator</span>
          </div>
          <div className="h-6 w-px bg-slate-800 hidden md:block" />
          <div className="hidden md:flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] font-black text-amber-500 uppercase">Live Preview</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 px-4 py-2 text-xs font-bold transition-all hover:text-slate-200"
            title="Reset to defaults"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Reset
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save to Sheet
          </button>
          
          <button
            onClick={handlePrint}
            className="group flex items-center gap-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 text-sm font-black shadow-[0_0_20px_rgba(217,119,6,0.2)] transition-all active:scale-95 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
          >
            <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
            <span>Print Quotation</span>
          </button>
        </div>
      </header>

      {/* Failure Popup for Motor Quotations */}
      <FailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
        message={failureModal.message}
        details={failureModal.details}
        onRetry={failureModal.onRetry}
      />

      {/* Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print:block bg-[#020617]">
        
        {/* Input Panel */}
        <section className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/40 overflow-y-auto no-scrollbar print:hidden shadow-inner">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed"> 
                Configuration Panel 
             </p>
          </div>
          <MotorQuotationForm data={data} onChange={setData} />
        </section>

        {/* Output Panel (The Paper) */}
        <section className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-12 md:p-16 flex items-start justify-center print:block print:p-0 print:bg-white custom-scrollbar">
          <div className="relative group/preview shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:shadow-none">
            {/* Professional Frame Shadow for the paper */}
            <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/10 to-transparent blur-2xl opacity-0 group-hover/preview:opacity-100 transition-opacity pointer-events-none" />
            <MotorQuotationPreview data={data} />
          </div>
        </section>
      </main>

      {/* Global CSS for Print Optimization */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, section:first-of-type, button {
            display: none !important;
          }
          main {
            display: block !important;
            overflow: visible !important;
            background: white !important;
          }
          section {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            overflow: visible !important;
            border: none !important;
          }
          #pdf-wrapper {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
          }
          #quotation-capture-area {
            border-top-width: 8px !important;
            border-top-color: #d97706 !important; /* amber-600 */
          }
        }
      `}</style>
    </div>
  );
}
