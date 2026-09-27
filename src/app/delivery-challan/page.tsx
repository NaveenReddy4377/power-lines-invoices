'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DeliveryChallanForm from '@/components/DeliveryChallanForm';
import DeliveryChallanPreview from '@/components/DeliveryChallanPreview';
import LoadingOverlay from '@/components/LoadingOverlay';
import FailureModal from '@/components/FailureModal';
import { DeliveryChallanData, initialDeliveryChallanData } from '@/types';
import { Printer, RefreshCcw, Save, Loader2, Download, FileSpreadsheet, Sparkles, Edit3, ArrowLeft, CheckCircle2, FolderOpen } from 'lucide-react';
import { saveDeliveryChallanToSpreadsheet, getNextDeliveryChallanNumber, loadDeliveryChallan } from '@/app/actions';
import * as XLSX from 'xlsx';
import Link from 'next/link';

export default function DeliveryChallanPage() {
  return (
    <Suspense fallback={
      <div className="h-full bg-slate-950 flex items-center justify-center text-amber-400 gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-bold">Loading Delivery Challan...</span>
      </div>
    }>
      <DeliveryChallanContent />
    </Suspense>
  );
}

function DeliveryChallanContent() {
  const [data, setData] = useState<DeliveryChallanData>(initialDeliveryChallanData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDocId, setLoadingDocId] = useState<string>('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [failureModal, setFailureModal] = useState<{ isOpen: boolean; message: string; details?: string; onRetry?: () => void }>({
    isOpen: false,
    message: '',
    details: ''
  });

  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const router = useRouter();
  const hasInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    // Replace the static placeholder item ID with a real UUID after hydration
    setData((prev) => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === 'item-default-1' ? { ...item, id: crypto.randomUUID() } : item
      )
    }));

    const key = editId || 'new';
    if (hasInitializedRef.current === key) return;
    hasInitializedRef.current = key;

    if (editId) {
      handleLoad(editId);
    } else {
      initDcNumber();
    }
  }, [editId]);

  async function initDcNumber() {
    setIsLoading(true);
    setLoadingDocId('Auto-Sequencing...');
    try {
      const nextNo = await getNextDeliveryChallanNumber();
      setData((prev) => ({ ...prev, dcNo: nextNo }));
    } catch (e) {
      console.error('Failed to auto-fetch DC number:', e);
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  }

  const resetForm = async () => {
    setIsLoading(true);
    setLoadingDocId('Next Delivery Challan...');
    try {
      if (editId) {
        router.push('/delivery-challan');
      }
      const nextNo = await getNextDeliveryChallanNumber();
      setData({
        ...initialDeliveryChallanData,
        dcNo: nextNo,
        dcDate: new Date().toISOString().split('T')[0],
        items: [
          {
            id: crypto.randomUUID(),
            materialCode: '',
            description: '',
            uom: 'NOS',
            quantity: 1,
            weight: '',
            remarks: ''
          }
        ]
      });
    } catch (e) {
      console.error('Failed to reset Delivery Challan:', e);
      setData({
        ...initialDeliveryChallanData,
        dcDate: new Date().toISOString().split('T')[0],
        items: [
          {
            id: crypto.randomUUID(),
            materialCode: '',
            description: '',
            uom: 'NOS',
            quantity: 1,
            weight: '',
            remarks: ''
          }
        ]
      });
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  };

  const handleLoad = async (dcNumber: string) => {
    if (!dcNumber || !dcNumber.trim()) {
      alert('Please enter a valid DC Number to load.');
      return;
    }
    const targetNo = dcNumber.trim();
    setIsLoading(true);
    setLoadingDocId(targetNo);
    try {
      const res = await loadDeliveryChallan(targetNo);
      if (res.success && res.data) {
        setData(res.data);
        setSaveSuccessMsg(`Loaded Delivery Challan: ${targetNo}`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setFailureModal({
          isOpen: true,
          message: `Failed to load Delivery Challan "${targetNo}" from Google Sheets.`,
          details: res.error || 'Record not found in the spreadsheet.',
          onRetry: () => handleLoad(targetNo)
        });
      }
    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: `Error fetching Delivery Challan "${targetNo}".`,
        details: e.message || 'Network error occurred.',
        onRetry: () => handleLoad(targetNo)
      });
    } finally {
      setIsLoading(false);
      setLoadingDocId('');
    }
  };

  const handlePromptLoad = () => {
    const entered = prompt('Enter Delivery Challan Number to load from Google Sheets (e.g. PLEW-DC-00001):', data.dcNo);
    if (entered && entered.trim()) {
      handleLoad(entered.trim());
    }
  };

  const handlePrint = async () => {
    if (!data.customerName || !data.customerName.trim()) {
      setFailureModal({
        isOpen: true,
        message: 'Customer / Party name is required before saving and printing.',
        details: 'Please select or enter a Customer name in the form.'
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. First save to Google Sheets
      const res = await saveDeliveryChallanToSpreadsheet(data);
      if (!res.success) {
        setFailureModal({
          isOpen: true,
          message: `Insertion to Google Sheets failed for Delivery Challan #${data.dcNo}.`,
          details: res.error || 'Unable to append or update row in Google Sheets tab "Delivery Challans".',
          onRetry: handlePrint
        });
        return;
      }

      // 2. Only show print screen after successful save to Google Sheets
      setSaveSuccessMsg(`Saved DC #${data.dcNo} to Google Sheets!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);

      const originalTitle = document.title;
      document.title = `${data.dcNo || 'Delivery_Challan'}_${data.customerName}`;
      window.print();
      document.title = originalTitle;

      // 3. Reset all fields after print and save
      await resetForm();
    } catch (err: any) {
      setFailureModal({
        isOpen: true,
        message: `Insertion to Google Sheets failed for Delivery Challan #${data.dcNo}.`,
        details: err.message || 'Network/Server communication error occurred.',
        onRetry: handlePrint
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!data.customerName || !data.customerName.trim()) {
      setFailureModal({
        isOpen: true,
        message: 'Customer / Party name is required before saving to Google Sheets.',
        details: 'Please select or enter a Customer name in the form.'
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveDeliveryChallanToSpreadsheet(data);
      if (res.success) {
        setSaveSuccessMsg(`Saved Delivery Challan #${data.dcNo} to Google Sheets!`);
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        // Reset all fields after successful save
        await resetForm();
      } else {
        setFailureModal({
          isOpen: true,
          message: `Insertion to Google Sheets failed for Delivery Challan #${data.dcNo}.`,
          details: res.error || 'Failed to update or add row in "Delivery Challans" tab.',
          onRetry: handleSave
        });
      }
    } catch (err: any) {
      setFailureModal({
        isOpen: true,
        message: `Insertion to Google Sheets failed for Delivery Challan #${data.dcNo}.`,
        details: err.message || 'Network/Server communication error occurred.',
        onRetry: handleSave
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Create a new Delivery Challan? This will clear current fields.')) {
      await resetForm();
    }
  };

  const handleDownloadExcel = () => {
    setIsDownloadingExcel(true);
    try {
      // Build rows array for Excel spreadsheet
      const excelRows = data.items.map((item, idx) => ({
        'DC No': data.dcNo,
        'DC Date': data.dcDate,
        'Challan Type': data.challanType,
        'Customer / Party Name': data.customerName,
        'Customer Address': data.customerAddress,
        'Customer GSTIN': data.customerGstin,
        'RGP No': data.rgpNo,
        'RGP Date': data.rgpDate,
        'PO No': data.poNo,
        'PO Date': data.poDate,
        'Vehicle No': data.vehicleNo,
        'Transport Mode': data.modeOfTransport,
        'Item S.No': idx + 1,
        'Material Code': item.materialCode || '',
        'Material Description': item.description,
        'UOM': item.uom || 'NOS',
        'Quantity': item.quantity,
        'Weight': item.weight || '',
        'Item Remarks': item.remarks || '',
        'General Remarks': data.remarks || '',
        'RGP Photo URL': data.rgpPhotoUrl || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Delivery Challan');

      // Auto size column widths
      const max_cols = [
        { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 35 },
        { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 8 }, { wch: 15 }, { wch: 45 },
        { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 35 }
      ];
      worksheet['!cols'] = max_cols;

      XLSX.writeFile(workbook, `${data.dcNo || 'Delivery_Challan'}.xlsx`);
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

      const element = document.getElementById('dc-capture-area');
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
      pdf.save(`${data.dcNo || 'Delivery_Challan'}.pdf`);
    } catch (err: any) {
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="h-full bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-amber-500/30">

      {/* Page Sticky Header */}
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
              <h1 className="text-base sm:text-lg font-black tracking-tighter bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent uppercase leading-none flex items-center gap-2">
                Delivery Challan <Sparkles className="w-4 h-4 text-amber-400" />
              </h1>
              {editId ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <Edit3 className="w-3 h-3" /> EDITING: {editId}
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  NEW
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              AI RGP Extraction & Delivery Generator
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          <button
            onClick={handlePromptLoad}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
            title="Load DC by Number"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Load DC</span>
          </button>

          <button
            onClick={handleReset}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 text-xs font-bold transition-all cursor-pointer"
            title="Create New DC"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>New DC</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-3 py-2 text-xs font-bold transition-all cursor-pointer"
            title="Download Excel"
          >
            {isDownloadingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>Excel</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{editId ? 'Save Changes' : 'Save to Sheets'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-4 sm:px-5 py-2 text-xs font-extrabold shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Save to Google Sheets and Print Challan (Resets all fields)"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>Print & Save</span>
          </button>
        </div>
      </header>

      {/* Fullscreen Loading Overlay for Delivery Challan */}
      <LoadingOverlay
        isOpen={isLoading}
        title={loadingDocId?.includes('Next') || loadingDocId?.includes('Auto') ? 'Generating DC Number' : 'Loading Delivery Challan'}
        badge={loadingDocId || data.dcNo}
        subtitle={loadingDocId?.includes('Next') || loadingDocId?.includes('Auto') ? 'Connecting to Google Sheets & fetching latest DC sequence...' : 'Connecting to Google Sheets & loading full Delivery Challan record...'}
        accentColor="amber"
        iconType="delivery-challan"
      />

      {/* Failure Popup for Delivery Challan */}
      <FailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
        message={failureModal.message}
        details={failureModal.details}
        onRetry={failureModal.onRetry}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print:block bg-[#020617]">

        {/* Left Input Form Section */}
        <section className="w-full md:w-[450px] lg:w-[500px] flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/40 overflow-y-auto print:hidden shadow-inner custom-scrollbar">
          <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {editId ? `Editing Delivery Challan #${data.dcNo}` : 'AI Input & Data Controls'}
            </p>
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
              {data.challanType || 'RGP'} Active
            </span>
          </div>
          <DeliveryChallanForm data={data} onChange={setData} onLoad={handleLoad} isLoading={isLoading} />
        </section>

        {/* Right Preview Section */}
        <section className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-8 md:p-12 flex items-start justify-center print:block print:p-0 print:bg-white custom-scrollbar">
          <div className="relative group/preview shadow-[0_20px_50px_rgba(0,0,0,0.6)] print:shadow-none">
            <DeliveryChallanPreview data={data} />
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
        }
      `}</style>
    </div>
  );
}
