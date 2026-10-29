'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import EmailModal from '@/components/EmailModal';
import LoadingOverlay from '@/components/LoadingOverlay';
import FailureModal from '@/components/FailureModal';
import SuccessModal from '@/components/SuccessModal';
import { InvoiceData, initialInvoiceData } from '@/types';
import { Save, Printer, FileSpreadsheet, Mail, Send, ArrowLeft, Edit3, Loader2, Columns2, Eye, ZoomIn, ZoomOut } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'split' | 'form' | 'preview'>('split');
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);
  const [failureModal, setFailureModal] = useState<{ isOpen: boolean; message: string; details?: string; onRetry?: () => void }>({
    isOpen: false,
    message: '',
    details: ''
  });
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    docNumber: string;
    clientName?: string;
    totalAmount?: number | string;
  }>({
    isOpen: false,
    docNumber: '',
  });

  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const hasInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    // Responsive viewMode detection for mobile and tablets
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) {
        setViewMode('form');
        setPreviewZoom(0.48);
      } else if (window.innerWidth < 1024) {
        setViewMode('form');
        setPreviewZoom(0.75);
      }
    }

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

      // Calculate grand total
      const totalAmount = (data.items || []).reduce((sum, item) => {
        let price = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        if (item.discountType === 'percentage') {
          price -= (price * (Number(item.discount) || 0) / 100);
        } else {
          price -= (Number(item.discount) || 0);
        }
        return sum + price;
      }, 0);
      const cgstAmount = totalAmount * ((data.taxes?.cgst ?? 9) / 100);
      const sgstAmount = totalAmount * ((data.taxes?.sgst ?? 9) / 100);
      const grandTotal = Math.round((totalAmount + cgstAmount + sgstAmount) * 100) / 100;

      // Show success modal confirming Google Sheets & Supabase insertion
      setSuccessModal({
        isOpen: true,
        docNumber: data.invoiceNo,
        clientName: data.billTo?.name,
        totalAmount: grandTotal,
      });

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
          {/* View Mode Switcher - Responsive across Mobile, Tablet & Desktop */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shadow-inner">
            <button
              type="button"
              onClick={() => { setViewMode('split'); setPreviewZoom(0.85); }}
              className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'split' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Split View (Form + Preview)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'form' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Form Focus"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Form</span>
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('preview'); setPreviewZoom(typeof window !== 'undefined' && window.innerWidth < 640 ? 0.48 : 1); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'preview' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Preview Focus"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Loading Invoice...</span>
            </div>
          )}
          <button
            onClick={handleSaveAndProcess}
            disabled={isSaving || isLoading || !data.billTo.name.trim() || data.items.length === 0}
            className="flex items-center gap-1.5 sm:gap-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Save, Download & Email</span>
                <span className="sm:hidden">Save & Send</span>
              </>
            )}
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

      {/* Success Popup for Invoice (Google Sheets + Supabase) */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
        title="Invoice Saved Successfully!"
        docType="Invoice"
        docNumber={successModal.docNumber}
        clientName={successModal.clientName}
        totalAmount={successModal.totalAmount}
        sheetTabName="Sheet1"
        onProceedToEmail={() => {
          setSuccessModal(prev => ({ ...prev, isOpen: false }));
          setIsEmailOpen(true);
        }}
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailOpen}
        onClose={handleModalClose}
        type="invoice"
        documentData={data}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print:block bg-slate-950">

        {/* Left Pane - Form */}
        <section className={`${viewMode === 'preview' ? 'hidden' : 'block'} border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 overflow-y-auto no-scrollbar print:hidden flex-col md:block custom-scrollbar ${
          viewMode === 'form' 
            ? 'flex-1 w-full max-w-4xl mx-auto py-6 px-4 sm:px-8' 
            : 'w-full md:w-[500px] lg:w-[550px] xl:w-[600px] flex-shrink-0'
        }`}>
          <InvoiceForm data={data} onChange={setData} onLoad={handleLoad} isLoading={isLoading} />
        </section>

        {/* Right Pane - Live Preview (Always in DOM for reliable Mobile Printing / PDF) */}
        <section className={`${viewMode === 'form' ? 'hidden md:flex print:block' : 'flex'} flex-1 overflow-auto bg-slate-950/90 p-4 sm:p-6 flex-col items-center print:block print:p-0 print:bg-white custom-scrollbar`}>
            {/* Zoom Controls Bar */}
            <div className="mb-3 flex items-center justify-between w-full max-w-[210mm] px-2 print:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="tracking-wide">Live A4 Printable Invoice</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(prev => Math.max(0.5, +(prev - 0.05).toFixed(2)))}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold text-emerald-400 px-1.5 min-w-[42px] text-center">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(prev => Math.min(1.4, +(prev + 0.05).toFixed(2)))}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(viewMode === 'split' ? 0.85 : 1)}
                  className="px-2 py-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer border-l border-slate-800 ml-1"
                  title="Reset Zoom"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Scaled Preview Wrapper with safe margins */}
            <div className="w-full flex justify-center overflow-visible">
              <div 
                className="transition-transform duration-150 origin-top shadow-[0_20px_50px_rgba(0,0,0,0.6)] print:shadow-none print:transform-none"
                style={{
                  transform: `scale(${previewZoom})`,
                  marginBottom: `${Math.max(0, (1 - previewZoom) * -297)}mm`
                }}
              >
                <InvoicePreview data={data} />
              </div>
            </div>
          </section>

      </main>
    </div>
  );
}
