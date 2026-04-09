'use client';

import { useState, useEffect } from 'react';
import QuotationForm from '@/components/QuotationForm';
import QuotationPreview from '@/components/QuotationPreview';
import { QuotationData, initialQuotationData } from '@/types';
import { Printer, Save, Loader2 } from 'lucide-react';
import { saveQuotation, loadQuotation, getNextQuotationNumber } from '@/app/actions';

export default function NewQuotation() {
  const [data, setData] = useState<QuotationData>(initialQuotationData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const nextNo = await getNextQuotationNumber();
        setData(prev => ({ ...prev, quotationNo: nextNo }));
      } catch {}
    })();
  }, []);

  const handleLoad = async (quotationNo: string) => {
    try {
      const res = await loadQuotation(quotationNo);
      if (res.success && res.data) {
        setData(res.data);
        alert(`Quotation ${quotationNo} loaded successfully!`);
      } else {
        alert('Not found: ' + res.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!data.billTo.name.trim()) {
      alert('Please enter a customer name before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const currentQuotationNo = data.quotationNo;
      const safeCompanyName = data.billTo.name.trim().replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_');

      if (!navigator.onLine) {
        alert("You are entirely offline! This quotation WILL NOT be saved to Google Sheets. However, you can still print it right now.");
      } else {
        await saveQuotation(data);
      }

      const originalTitle = document.title;
      document.title = `${currentQuotationNo}_${safeCompanyName}`;
      setTimeout(() => {
        window.print();
        document.title = originalTitle;
      }, 300);

      const nextNo = await getNextQuotationNumber();
      setData({
        ...initialQuotationData,
        quotationNo: nextNo,
        quotationDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    } catch (e: any) {
      alert('Error saving: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 print:hidden sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">New Quotation</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveAndPrint}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 text-sm font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all focus:ring-2 focus:ring-purple-400 focus:outline-none disabled:opacity-50"
          >
            {isSaving ? <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span> : <><Printer className="w-4 h-4" /> Save &amp; Print</>}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print:block">
        
        {/* Left Pane - Form */}
        <section className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 overflow-y-auto no-scrollbar print:hidden flex flex-col md:block">
          <QuotationForm data={data} onChange={setData} onLoad={handleLoad} />
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
