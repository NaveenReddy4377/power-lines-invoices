'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import EmailModal from '@/components/EmailModal';
import LoadingOverlay from '@/components/LoadingOverlay';
import FailureModal from '@/components/FailureModal';
import { InvoiceData, initialInvoiceData } from '@/types';
import { Save, Printer, FileSpreadsheet, Mail, Send, ArrowLeft, Edit3, Loader2 } from 'lucide-react';
import { saveToSpreadsheet, getNextInvoiceNumber, loadInvoice } from '@/app/actions';
import Link from 'next/link';

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-100 bg-slate-950 h-full flex items-center justify-center">Loading Invoice Mode...</div>}>
      <NewInvoice />
    </Suspense>
  );
}

function NewInvoice() {
  const [data, setData] = useState<InvoiceData>(initialInvoiceData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState('');
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [failureModal, setFailureModal] = useState<{ isOpen: boolean; message: string; details?: string; onRetry?: () => void }>({
    isOpen: false,
    message: '',
    details: ''
  });

  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const hasInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = editId || 'new';
    if (hasInitializedRef.current === key) return;
    hasInitializedRef.current = key;

    (async () => {
      if (editId) {
        await handleLoad(editId);
      } else {
        setIsLoading(true);
        setLoadingDocId('Auto-Sequencing...');
        try {
          const nextNo = await getNextInvoiceNumber();
          setData(prev => ({ ...prev, invoiceNo: nextNo }));
        } catch (err) {
          console.error('Failed fetching next number:', err);
        } finally {
          setIsLoading(false);
          setLoadingDocId('');
        }
      }
    })();
  }, [editId]);

  const handleLoad = async (invoiceNo: string) => {
    if (!invoiceNo || !invoiceNo.trim()) {
      alert('Please enter an Invoice Number to load.');
      return;
    }
    const targetNo = invoiceNo.trim();
    setIsLoading(true);
    setLoadingDocId(targetNo);
    try {
      const res = await loadInvoice(targetNo);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setFailureModal({
          isOpen: true,
          message: `Failed to load Invoice "${targetNo}" from Google Sheets.`,
          details: res.error || 'Record not found in the spreadsheet.',
          onRetry: () => handleLoad(targetNo)
        });
      }
    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: `Error fetching Invoice "${targetNo}".`,
        details: e.message || 'Network error occurred.',
        onRetry: () => handleLoad(targetNo)
      });
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  };

  const handleSaveAndProcess = async () => {
    if (data.items.length === 0 || data.billTo.name.trim() === '') {
      setFailureModal({
        isOpen: true,
        message: 'Customer / Party name and at least one item are required.',
        details: 'Please enter customer details and add items before saving.'
      });
      return;
    }

    setIsSaving(true);
    try {
      if (!navigator.onLine) {
        setFailureModal({
          isOpen: true,
          message: 'You are currently offline. Invoice cannot be inserted to Google Sheets.',
          details: 'Please check your internet connection and try again.'
        });
        return;
      }

      const res = await saveToSpreadsheet(data);
      if (!res.success) {
        setFailureModal({
          isOpen: true,
          message: `Failed to save Invoice #${data.invoiceNo} into Google Sheets.`,
          details: res.error || 'Spreadsheet insertion error.',
          onRetry: handleSaveAndProcess
        });
        return;
      }

      // Open email modal which now handles downloading and sending
      setIsEmailOpen(true);

    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: `Failed to save Invoice #${data.invoiceNo} into Google Sheets.`,
        details: e.message || 'Network or spreadsheet communication error.',
        onRetry: handleSaveAndProcess
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalClose = async () => {
    setIsEmailOpen(false);
    setIsLoading(true);
    setLoadingDocId('Next Invoice...');
    try {
      const nextNo = await getNextInvoiceNumber();
      setData({
        ...initialInvoiceData,
        invoiceNo: nextNo,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  };

  return (
    <div className="h-full bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 print:hidden sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              {editId ? 'Edit Invoice' : 'New Invoice'}
            </h1>
            {editId && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Edit3 className="w-3 h-3" /> {editId}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading Invoice...</span>
            </div>
          )}
          <button
            onClick={handleSaveAndProcess}
            disabled={isSaving || isLoading || !data.billTo.name.trim() || data.items.length === 0}
            className="flex items-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <span className="animate-pulse">Processing...</span> : <><Send className="w-4 h-4" /> Save, Download & Email</>}
          </button>
        </div>
      </header>

      {/* Fullscreen Loading Overlay */}
      <LoadingOverlay
        isOpen={isLoading}
        title={loadingDocId?.includes('Next') || loadingDocId?.includes('Auto') ? 'Generating Invoice Number' : 'Loading Invoice'}
        badge={loadingDocId || data.invoiceNo}
        subtitle={loadingDocId?.includes('Next') || loadingDocId?.includes('Auto') ? 'Connecting to Google Sheets & fetching latest invoice sequence...' : 'Connecting to Google Sheets & loading full invoice details...'}
        accentColor="emerald"
        iconType="invoice"
      />

      {/* Failure Popup for Invoice */}
      <FailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
        message={failureModal.message}
        details={failureModal.details}
        onRetry={failureModal.onRetry}
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailOpen}
        onClose={handleModalClose}
        type="invoice"
        documentData={data}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print:block">

        {/* Left Pane - Form */}
        <section className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 overflow-y-auto no-scrollbar print:hidden flex flex-col md:block">
          <InvoiceForm data={data} onChange={setData} onLoad={handleLoad} isLoading={isLoading} />
        </section>

        {/* Right Pane - Live Preview */}
        <section className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 flex items-start justify-center md:items-start md:justify-center print:block print:p-0 print:bg-white min-h-[50vh] md:min-h-0">
          <div className="overflow-x-auto max-w-full">
            <InvoicePreview data={data} />
          </div>
        </section>

      </main>
    </div>
  );
}
