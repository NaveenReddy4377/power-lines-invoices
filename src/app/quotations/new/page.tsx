'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QuotationForm from '@/components/QuotationForm';
import QuotationPreview from '@/components/QuotationPreview';
import EmailModal from '@/components/EmailModal';
import LoadingOverlay from '@/components/LoadingOverlay';
import FailureModal from '@/components/FailureModal';
import SuccessModal from '@/components/SuccessModal';
import { QuotationData, initialQuotationData } from '@/types';
import { Printer, Save, Loader2, Mail, Send, ArrowLeft, Edit3 } from 'lucide-react';
import { saveQuotation, loadQuotation, getNextQuotationNumber } from '@/app/actions';
import Link from 'next/link';

export default function NewQuotationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-100 bg-slate-950 h-full flex items-center justify-center">Loading Quotation Mode...</div>}>
      <NewQuotation />
    </Suspense>
  );
}

function NewQuotation() {
  const [data, setData] = useState<QuotationData>(initialQuotationData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState('');
  const [isEmailOpen, setIsEmailOpen] = useState(false);
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
          const nextNo = await getNextQuotationNumber();
          setData(prev => ({ ...prev, quotationNo: nextNo }));
        } catch (err) {
          console.error('Failed fetching next quotation number:', err);
        } finally {
          setIsLoading(false);
          setLoadingDocId('');
        }
      }
    })();
  }, [editId]);

  const handleLoad = async (quotationNo: string) => {
    if (!quotationNo || !quotationNo.trim()) {
      alert('Please enter a Quotation Number to load.');
      return;
    }
    const targetNo = quotationNo.trim();
    setIsLoading(true);
    setLoadingDocId(targetNo);
    try {
      const res = await loadQuotation(targetNo);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setFailureModal({
          isOpen: true,
          message: `Failed to load Quotation "${targetNo}" from Google Sheets.`,
          details: res.error || 'Record not found in the spreadsheet.',
          onRetry: () => handleLoad(targetNo)
        });
      }
    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: `Error fetching Quotation "${targetNo}".`,
        details: e.message || 'Network error occurred.',
        onRetry: () => handleLoad(targetNo)
      });
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  };

  const handleSaveAndProcess = async () => {
    if (!data.billTo.name.trim()) {
      setFailureModal({
        isOpen: true,
        message: 'Customer / Party name is required before saving Quotation.',
        details: 'Please select or enter a Customer name in the form.'
      });
      return;
    }

    setIsSaving(true);
    try {
      if (!navigator.onLine) {
        setFailureModal({
          isOpen: true,
          message: 'You are currently offline. Quotation cannot be inserted to Google Sheets.',
          details: 'Please check your internet connection and try again.'
        });
        return;
      }

      const res = await saveQuotation(data);
      if (!res.success) {
        setFailureModal({
          isOpen: true,
          message: `Failed to save Quotation #${data.quotationNo} into Google Sheets.`,
          details: res.error || 'Spreadsheet insertion error.',
          onRetry: handleSaveAndProcess
        });
        return;
      }

      // Calculate grand total
      const itemsWithTots = (data.items || []).map(item => {
        let tot = (Number(item.quantity) || 0) * (Number(item.price) || 0);
        const discount = Number(item.discount) || 0;
        if (discount > 0) tot -= item.discountType === 'percentage' ? tot * (discount / 100) : discount;
        return tot;
      });
      const sumTotal = itemsWithTots.reduce((a, b) => a + b, 0);
      const cgst = sumTotal * ((data.taxes?.cgst ?? 9) / 100);
      const sgst = sumTotal * ((data.taxes?.sgst ?? 9) / 100);
      const grandTotal = Math.round((sumTotal + cgst + sgst) * 100) / 100;

      // Show success modal confirming Google Sheets & Supabase insertion
      setSuccessModal({
        isOpen: true,
        docNumber: data.quotationNo,
        clientName: data.billTo?.name,
        totalAmount: grandTotal,
      });

    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: `Failed to save Quotation #${data.quotationNo} into Google Sheets.`,
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
    setLoadingDocId('Next Quotation...');
    try {
      const nextNo = await getNextQuotationNumber();
      setData({
        ...initialQuotationData,
        quotationNo: nextNo,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      {/* Header */}
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
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">
              {editId ? 'Edit Quotation' : 'New Quotation'}
            </h1>
            {editId && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Edit3 className="w-3 h-3" /> {editId}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading Quotation...</span>
            </div>
          )}
          <button
            onClick={handleSaveAndProcess}
            disabled={isSaving || isLoading || !data.billTo.name.trim() || data.items.length === 0}
            className="flex items-center gap-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 text-sm font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all focus:ring-2 focus:ring-purple-400 focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span> : <><Send className="w-4 h-4" /> Save, Download & Email</>}
          </button>
        </div>
      </header>

      {/* Fullscreen Loading Overlay */}
      <LoadingOverlay
        isOpen={isLoading}
        title={loadingDocId?.includes('Next') || loadingDocId?.includes('Auto') ? 'Generating Quotation Number' : 'Loading Quotation'}
        badge={loadingDocId || data.quotationNo}
        subtitle={loadingDocId?.includes('Next') || loadingDocId?.includes('Auto') ? 'Connecting to Google Sheets & fetching latest quotation sequence...' : 'Connecting to Google Sheets & loading quotation record...'}
        accentColor="purple"
        iconType="quotation"
      />

      {/* Failure Popup for Quotation */}
      <FailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
        message={failureModal.message}
        details={failureModal.details}
        onRetry={failureModal.onRetry}
      />

      {/* Success Popup for Quotation (Google Sheets + Supabase) */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
        title="Quotation Saved Successfully!"
        docType="Quotation"
        docNumber={successModal.docNumber}
        clientName={successModal.clientName}
        totalAmount={successModal.totalAmount}
        sheetTabName="Quotations"
        onProceedToEmail={() => {
          setSuccessModal(prev => ({ ...prev, isOpen: false }));
          setIsEmailOpen(true);
        }}
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={isEmailOpen}
        onClose={handleModalClose}
        type="quotation"
        documentData={data}
      />

      {/* Main */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print:block">

        {/* Left Pane - Form */}
        <section className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 overflow-y-auto no-scrollbar print:hidden flex flex-col md:block">
          <QuotationForm data={data} onChange={setData} onLoad={handleLoad} isLoading={isLoading} />
        </section>

        {/* Right Pane - Live Preview */}
        <section className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 flex items-start justify-center md:items-start md:justify-center print:block print:p-0 print:bg-white min-h-[50vh] md:min-h-0">
          <div className="overflow-x-auto max-w-full">
            <QuotationPreview data={data} />
          </div>
        </section>
      </main>
    </div>
  );
}
