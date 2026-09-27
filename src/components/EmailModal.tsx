'use client';

import { useState, useEffect } from 'react';
import { X, Send, Mail, User, MessageSquare, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { InvoiceData, QuotationData } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'invoice' | 'quotation';
  documentData: InvoiceData | QuotationData;
}

type Status = 'idle' | 'generating_pdf' | 'sending' | 'success' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────
// ─── Helper to compute subject & message from current document ────────────────
function buildEmailContent(type: 'invoice' | 'quotation', documentData: InvoiceData | QuotationData) {
  const docNo = type === 'invoice'
    ? (documentData as InvoiceData).invoiceNo
    : (documentData as QuotationData).quotationNo;

  const docDate = type === 'invoice'
    ? (documentData as InvoiceData).invoiceDate
    : (documentData as QuotationData).quotationDate;

  const customerName = documentData.billTo?.name || '';
  const rgpNumber = type === 'quotation' ? (documentData as QuotationData).rgpNumber : '';
  const poNumber = type === 'invoice' ? (documentData as InvoiceData).poNumber : '';
  const rgpDate = type === 'quotation' ? (documentData as QuotationData).rgpDate : '';
  const poDate = type === 'invoice' ? (documentData as InvoiceData).poDate : '';
  const docSubject = type === 'quotation' ? (documentData as QuotationData).subject : '';
  const itemsDesc = documentData.items.map(i => i.name).filter(Boolean).join(', ');

  const subtotal = documentData.items.reduce((sum, item) => {
    let tot = item.price * item.quantity;
    if (item.discount > 0) {
      tot -= item.discountType === 'percentage' ? tot * (item.discount / 100) : item.discount;
    }
    return sum + tot;
  }, 0);
  const cgst = subtotal * (documentData.taxes.cgst / 100);
  const sgst = subtotal * (documentData.taxes.sgst / 100);
  const grandTotal = subtotal + cgst + sgst;
  const formattedTotal = grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formattedDocDate = docDate ? docDate.split('-').reverse().join('/') : '';
  const formattedRefDate = (type === 'invoice' ? poDate : rgpDate)
    ? (type === 'invoice' ? poDate : rgpDate)!.split('-').reverse().join('/')
    : '';

  const subject = type === 'invoice'
    ? `Invoice ${docNo}${poNumber ? ` (PO: ${poNumber})` : ''} - ${customerName}`
    : `Quotation ${docNo}${rgpNumber ? ` for RGP: ${rgpNumber}` : ''} - ${customerName}`;

  const message = type === 'invoice'
    ? `Hi Sir,\n\nPlease find attached the Invoice.\n\nDescription: ${itemsDesc}\nInvoice Number: ${docNo}\nDate: ${formattedDocDate}${poNumber ? `\nPO Number: ${poNumber}` : ''}${formattedRefDate ? `\nPO Date: ${formattedRefDate}` : ''}\nTotal Amount: ₹ ${formattedTotal}\n\nThank you!`
    : `Hi Sir,\n\nPlease find attached the Quotation.\n\nDescription: ${docSubject || itemsDesc}\nQuotation Number: ${docNo}\nDate: ${formattedDocDate}${rgpNumber ? `\nRGP Number: ${rgpNumber}` : ''}${formattedRefDate ? `\nRGP Date: ${formattedRefDate}` : ''}\nTotal Amount: ₹ ${formattedTotal}\n\nThank you!`;

  return { subject, message };
}

export default function EmailModal({ isOpen, onClose, type, documentData }: EmailModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Re-compute subject & message every time the modal opens or the document changes
  useEffect(() => {
    if (isOpen) {
      const { subject, message } = buildEmailContent(type, documentData);
      setSubject(subject);
      setMessage(message);
      setTo('');
      setStatus('idle');
      setErrorMsg('');
    }
  }, [isOpen, documentData, type]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!to.trim()) {
      setErrorMsg('Please enter a recipient email address.');
      setStatus('error');
      return;
    }
    if (!to.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('generating_pdf');
    setErrorMsg('');

    try {
      // Dynamically import to avoid SSR issues
      const domtoimage = (await import('dom-to-image')).default;
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('pdf-wrapper');
      if (!element) throw new Error('Preview element not found. Please ensure the preview is visible.');

      // Capture the element as an image using JPEG for significantly smaller file size
      const dataUrl = await domtoimage.toJpeg(element, { 
        quality: 0.75, 
        bgcolor: '#ffffff',
        style: { transform: 'scale(1)', transformOrigin: 'top left' } 
      });
      
      // Create PDF with internal compression enabled
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      // Add as JPEG with FAST compression alias to keep size minimal
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      setStatus('sending');

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          message: message.trim(),
          type,
          documentData,
          pdfBase64
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStatus('success');
        
        // Download the PDF locally after successful email
        pdf.save(`${subject.replace(/[^a-zA-Z0-9 \-_]/g, '_')}.pdf`);
        
        setTimeout(() => {
          setStatus('idle');
          onClose();
        }, 2500);
      } else {
        setErrorMsg(json.error || 'Failed to send email. Please try again.');
        setStatus('error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error. Please check your connection.');
      setStatus('error');
    }
  };

  const handleClose = () => {
    if (status === 'sending' || status === 'generating_pdf') return;
    setStatus('idle');
    setErrorMsg('');
    onClose();
  };

  const handleDownloadLocal = () => {
    const docNo = type === 'invoice'
      ? (documentData as InvoiceData).invoiceNo
      : (documentData as QuotationData).quotationNo;
    const customerName = documentData.billTo?.name || 'Unknown';
    
    const originalTitle = document.title;
    // Set title to dictate the default file name when 'Save as PDF' is chosen
    document.title = `${docNo} - ${customerName}`;

    // Open the browser print dialog, from which the user can save as PDF or print.
    window.print();

    // Restore the title after a short delay to ensure print dialog catches the new title
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const accentColor = type === 'invoice' ? '#10b981' : '#a855f7';
  const accentBg = type === 'invoice' ? 'rgba(16,185,129,0.12)' : 'rgba(168,85,247,0.12)';
  const accentRing = type === 'invoice' ? 'focus:ring-emerald-500/40 focus:border-emerald-500' : 'focus:ring-purple-500/40 focus:border-purple-500';
  const sendBtnClass = type === 'invoice'
    ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
    : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.35)]';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm print:hidden"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none print:hidden">
        <div
          className="pointer-events-auto w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
          style={{ animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accentBg }}>
                <Mail className="w-4 h-4" style={{ color: accentColor }} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  Send & Download {type === 'invoice' ? 'Invoice' : 'Quotation'}
                </h2>
                <p className="text-xs text-slate-400">
                  {type === 'invoice' ? (documentData as InvoiceData).invoiceNo : (documentData as QuotationData).quotationNo}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={status === 'sending' || status === 'generating_pdf'}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">

            {/* Success state */}
            {status === 'success' && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm font-medium animate-pulse">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                Email sent successfully to <strong className="ml-1">{to}</strong>!
              </div>
            )}

            {/* Error state */}
            {status === 'error' && errorMsg && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* To Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Recipient Email *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="customer@example.com"
                  disabled={status === 'sending' || status === 'success' || status === 'generating_pdf'}
                  className={`w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 ${accentRing} transition-all disabled:opacity-50`}
                />
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                disabled={status === 'sending' || status === 'success' || status === 'generating_pdf'}
                className={`w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 ${accentRing} transition-all disabled:opacity-50`}
              />
            </div>

            {/* Message Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Message (optional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                disabled={status === 'sending' || status === 'success' || status === 'generating_pdf'}
                className={`w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 ${accentRing} transition-all disabled:opacity-50 leading-relaxed`}
                placeholder="Optional personal message to the customer..."
              />
            </div>

            {/* Preview note */}
            <p className="text-xs text-slate-500 flex items-start gap-2">
              <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
              A PDF of the {type === 'invoice' ? 'invoice' : 'quotation'} will be generated and attached to this email.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={status === 'sending' || status === 'generating_pdf'}
              className="px-5 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadLocal}
              disabled={status === 'sending' || status === 'generating_pdf' || status === 'success'}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              onClick={handleSend}
              disabled={status === 'sending' || status === 'generating_pdf' || status === 'success'}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-xl transition-all ${sendBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {status === 'generating_pdf' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : status === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : status === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Sent!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Email & Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
