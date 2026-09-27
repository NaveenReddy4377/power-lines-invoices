'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CashBillForm from '@/components/CashBillForm';
import CashBillPreview from '@/components/CashBillPreview';
import LoadingOverlay from '@/components/LoadingOverlay';
import FailureModal from '@/components/FailureModal';
import { CashBillData, initialCashBillData } from '@/types';
import { Printer, RefreshCcw, Save, Loader2, Download, FileSpreadsheet, ArrowLeft, CheckCircle2, FolderOpen, Receipt, Sparkles } from 'lucide-react';
import { saveCashBillToSpreadsheet, getNextCashBillNumber, loadCashBill } from '@/app/actions';
import * as XLSX from 'xlsx';
import Link from 'next/link';

export default function NewCashBillPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full bg-slate-950 flex items-center justify-center text-amber-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-bold">Loading Cash Bill Module...</span>
        </div>
      }
    >
      <CashBillContent />
    </Suspense>
  );
}

function CashBillContent() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<CashBillData>(initialCashBillData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [failureModal, setFailureModal] = useState<{
    isOpen: boolean;
    message: string;
    details?: string;
    onRetry?: () => void;
  }>({
    isOpen: false,
    message: '',
    details: ''
  });

  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const router = useRouter();
  const hasInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Replace default item ID with real UUID
    setData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === 'cb-item-1' ? { ...item, id: crypto.randomUUID() } : item
      )
    }));

    const key = editId || 'new';
    if (hasInitializedRef.current === key) return;
    hasInitializedRef.current = key;

    if (editId) {
      handleLoad(editId);
    } else {
      initBillNumber();
    }
  }, [editId]);

  async function initBillNumber() {
    setIsLoading(true);
    setLoadingDocId('Auto-Sequencing...');
    try {
      const nextNo = await getNextCashBillNumber();
      setData((prev) => ({ ...prev, billNo: nextNo }));
    } catch (e) {
      console.error('Failed to auto-fetch next Bill number:', e);
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  }

  const resetForm = async () => {
    setIsLoading(true);
    setLoadingDocId('Next Cash Bill...');
    try {
      if (editId) {
        router.push('/cash-bills/new');
      }
      const nextNo = await getNextCashBillNumber();
      setData({
        ...initialCashBillData,
        billNo: nextNo,
        billDate: new Date().toISOString().split('T')[0],
        items: [
          {
            id: crypto.randomUUID(),
            description: '',
            quantity: 1,
            unit: 'NOS',
            rate: 0,
            amount: 0
          }
        ]
      });
    } catch (e) {
      setData({
        ...initialCashBillData,
        billDate: new Date().toISOString().split('T')[0],
        items: [
          {
            id: crypto.randomUUID(),
            description: '',
            quantity: 1,
            unit: 'NOS',
            rate: 0,
            amount: 0
          }
        ]
      });
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  };

  const handleLoad = async (billNoToLoad: string) => {
    if (!billNoToLoad || !billNoToLoad.trim()) {
      alert('Please enter a Bill Number to load.');
      return;
    }
    const targetNo = billNoToLoad.trim();
    setIsLoading(true);
    setLoadingDocId(targetNo);

    try {
      const res = await loadCashBill(targetNo);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setFailureModal({
          isOpen: true,
          message: `Failed to load Cash Bill "${targetNo}".`,
          details: res.error || 'Record not found in Google Sheets.',
          onRetry: () => handleLoad(targetNo)
        });
      }
    } catch (err: any) {
      setFailureModal({
        isOpen: true,
        message: `Failed to load Cash Bill "${targetNo}".`,
        details: err.message || 'Server connection error occurred.',
        onRetry: () => handleLoad(targetNo)
      });
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  };

  const handlePromptLoad = () => {
    const billNo = prompt('Enter Cash Bill Number to Load (e.g. PLEW-CB-00001):', data.billNo || '');
    if (billNo && billNo.trim()) {
      handleLoad(billNo.trim());
    }
  };

  const handleSave = async () => {
    if (!data.billNo) {
      alert('Bill Number is required.');
      return;
    }
    if (!data.customerName || !data.customerName.trim()) {
      alert('Customer Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveCashBillToSpreadsheet(data);
      if (res.success) {
        setSaveSuccessMsg(`Cash Bill #${data.billNo} saved to Google Sheets successfully!`);
        setTimeout(() => setSaveSuccessMsg(null), 5000);
      } else {
        setFailureModal({
          isOpen: true,
          message: `Insertion to Google Sheets failed for Cash Bill #${data.billNo}.`,
          details: res.error || 'Check Google Sheets credentials or permissions.',
          onRetry: handleSave
        });
      }
    } catch (err: any) {
      setFailureModal({
        isOpen: true,
        message: `Insertion to Google Sheets failed for Cash Bill #${data.billNo}.`,
        details: err.message || 'Network/Server communication error occurred.',
        onRetry: handleSave
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Create a new Cash Bill? This will clear current fields.')) {
      await resetForm();
    }
  };

  const getDocumentFileName = (extension: string) => {
    const rawBillNo = data.billNo?.trim() || 'PLEW-CB-00001';
    const safeBillNo = rawBillNo.replace(/[/\\?%*:|"<>]/g, '-').trim();
    
    const rawCustomer = data.customerName?.trim() || '';
    const safeCustomer = rawCustomer ? rawCustomer.replace(/[/\\?%*:|"<>]/g, '').trim() : '';

    const baseName = safeCustomer ? `${safeBillNo}_${safeCustomer}` : safeBillNo;
    return `${baseName}.${extension}`;
  };

  const handleDownloadExcel = () => {
    setIsDownloadingExcel(true);
    try {
      const subtotal = data.items.reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.rate || 0)), 0);
      const grandTotal = Math.max(0, subtotal - Number(data.discount || 0));

      const excelRows = data.items.map((item, idx) => ({
        'Bill No': data.billNo,
        'Bill Date': data.billDate,
        'Customer Name': data.customerName,
        'Phone': data.customerPhone,
        'Address': data.customerAddress,
        'Payment Mode': data.paymentMode,
        'Payment Status': data.paymentStatus,
        'Item S.No': idx + 1,
        'Description': item.description,
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Rate (₹)': item.rate,
        'Line Amount (₹)': item.amount || item.quantity * item.rate,
        'Bill Subtotal (₹)': subtotal,
        'Bill Discount (₹)': data.discount,
        'Grand Total (₹)': grandTotal,
        'Vehicle No': data.vehicleNo || '',
        'Notes': data.notes
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Bill');

      worksheet['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 35 },
        { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 40 }, { wch: 8 },
        { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 35 }
      ];

      XLSX.writeFile(workbook, getDocumentFileName('xlsx'));
    } catch (err: any) {
      alert('Failed to generate Excel file: ' + err.message);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const domtoimage = (await import('dom-to-image')).default;
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('cb-capture-area');
      if (!element) throw new Error('Preview element not found');

      const dataUrl = await domtoimage.toJpeg(element, {
        quality: 0.9,
        bgcolor: '#ffffff',
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(getDocumentFileName('pdf'));
    } catch (err: any) {
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (data.billNo && data.customerName) {
      try {
        await saveCashBillToSpreadsheet(data);
      } catch (e) {
        console.warn('Auto-save before print error:', e);
      }
    }

    const originalTitle = document.title;
    const rawBillNo = data.billNo?.trim() || 'Cash_Bill';
    const rawCustomer = data.customerName?.trim() || '';
    const safeCustomer = rawCustomer ? rawCustomer.replace(/[/\\?%*:|"<>]/g, '').trim() : '';
    document.title = safeCustomer ? `${rawBillNo} - ${safeCustomer}` : rawBillNo;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  if (!mounted) {
    return (
      <div className="h-full bg-slate-950 flex items-center justify-center text-amber-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-bold">Loading Cash Bill Module...</span>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-amber-500/30">
      {/* Sticky Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 print:hidden sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent uppercase leading-none flex items-center gap-2">
                Cash Bill <Receipt className="w-4 h-4 text-emerald-400" />
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                NON-GST
              </span>
              {editId && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  EDITING: {editId}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              Normal Cash Sales & Repairs Invoice (Zero GST)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handlePromptLoad}
            title="Load Bill by Number"
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Load Bill</span>
          </button>

          <button
            onClick={handleReset}
            title="Create New Bill"
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            title="Download Excel"
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 px-3 py-1.5 text-xs font-semibold border border-emerald-500/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDownloadingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>Excel</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            title="Download PDF"
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>PDF</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Save to Sheets</span>
            <span className="sm:hidden">Save</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print Cash Bill"
            className="flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-4 py-1.5 text-xs font-bold transition-all shadow-lg shadow-amber-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print Bill</span>
            <span className="sm:hidden">Print</span>
          </button>
        </div>
      </header>

      {/* Save Success Notice Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-600/90 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-white/80 hover:text-white text-sm">
            ×
          </button>
        </div>
      )}

      {/* Main Workspace: Form & Live A4 Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input Form Panel */}
        <div className="w-full lg:w-1/2 overflow-y-auto p-4 sm:p-6 border-r border-slate-800 print:hidden">
          <CashBillForm
            data={data}
            onChange={setData}
            onLoad={handleLoad}
            isLoading={isLoading}
          />
        </div>

        {/* Right: Live A4 Printable Preview */}
        <div className="hidden lg:flex lg:w-1/2 overflow-y-auto p-6 bg-slate-900/50 justify-center items-start print:w-full print:p-0 print:m-0 print:bg-white print:overflow-visible">
          <CashBillPreview data={data} />
        </div>
      </div>

      {/* Print only display on small screens */}
      <div className="hidden print:block print:w-full print:m-0">
        <CashBillPreview data={data} />
      </div>

      <LoadingOverlay isOpen={isLoading} title={`Loading Cash Bill: ${loadingDocId}`} accentColor="emerald" />

      <FailureModal
        isOpen={failureModal.isOpen}
        message={failureModal.message}
        details={failureModal.details}
        onRetry={failureModal.onRetry}
        onClose={() => setFailureModal({ isOpen: false, message: '', details: '' })}
      />
    </div>
  );
}
