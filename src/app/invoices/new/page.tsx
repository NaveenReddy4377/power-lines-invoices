'use client';

import { useState, useEffect } from 'react';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import { InvoiceData, initialInvoiceData } from '@/types';
import { Save, Printer, FileSpreadsheet } from 'lucide-react';
import { saveToSpreadsheet, getNextInvoiceNumber } from '@/app/actions';

export default function NewInvoice() {
  const [data, setData] = useState<InvoiceData>(initialInvoiceData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const nextNo = await getNextInvoiceNumber();
        setData(prev => ({ ...prev, invoiceNo: nextNo }));
      } catch (err) {
        console.error('Failed fetching next number:', err);
      }
    })();
  }, []);

  const handleLoad = async (invoiceNo: string) => {
    try {
      const { loadInvoice } = await import('@/app/actions');
      const res = await loadInvoice(invoiceNo);
      if (res.success && res.data) {
        setData(res.data);
        alert(`Invoice ${invoiceNo} loaded successfully!`);
      } else {
        alert('Failed to load: ' + res.error);
      }
    } catch (e: any) {
      alert('Error fetching invoice: ' + e.message);
    }
  };

  const handleSaveAndPrint = async () => {
    setIsSaving(true);
    try {
      if (data.items.length === 0 || data.billTo.name.trim() === '') {
         alert('Please add at least one item and a customer name.');
         return;
      }
      
      const currentInvoiceNo = data.invoiceNo;
      const safeCompanyName = data.billTo.name.trim().replace(/[^a-zA-Z0-9-]/g, '_').replace(/_+/g, '_');
      
      if (!navigator.onLine) {
        alert("You are entirely offline! This invoice WILL NOT be saved to Google Sheets. However, you can still print it right now.");
      } else {
        await saveToSpreadsheet(data);
      }
      
      const originalTitle = document.title;
      document.title = `${currentInvoiceNo}_${safeCompanyName}`;
      
      setTimeout(() => {
        window.print();
        document.title = originalTitle;
      }, 500);
      
      const nextNo = await getNextInvoiceNumber();
      setData({
        ...initialInvoiceData,
        invoiceNo: nextNo,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      
    } catch (e: any) {
      alert('Error saving data: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 print:hidden sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">New Invoice</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveAndPrint}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2 text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:opacity-50"
          >
            {isSaving ? <span className="animate-pulse">Processing...</span> : <><Printer className="w-4 h-4" /> Save &amp; Print</>}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden print:block">
        
        {/* Left Pane - Form */}
        <section className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/40 overflow-y-auto no-scrollbar print:hidden flex flex-col md:block">
          <InvoiceForm data={data} onChange={setData} onLoad={handleLoad} />
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
