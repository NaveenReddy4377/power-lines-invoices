'use client';

import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData, Client, InventoryItem } from '@/types';
import { Plus, Trash2, Building, ScanLine, FileText, IndianRupee, Zap, Sparkles, Loader2, History, Upload, AlertCircle, CheckCircle2, ExternalLink, Copy, Image as ImageIcon, Camera } from 'lucide-react';
import { prepareFileForUpload } from '@/utils/imageCompressor';
import OverwriteConfirmModal from '@/components/OverwriteConfirmModal';
import { getClients, getInventory, getPreviousDescriptions, DescriptionSuggestion, uploadPOFile, extractInvoiceFromPO, extractInvoiceFromPOUrl } from '@/app/actions';
import { getMotorSuggestions, findMotorPrice, approvedCompanies } from '@/data/motor-rates';

function normalizeDateToInput(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mon = monthMap[dmyMatch[2].toLowerCase()] || '01';
    let yr = dmyMatch[3];
    if (yr.length === 2) yr = '20' + yr;
    return `${yr}-${mon}-${day}`;
  }
  const numericMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (numericMatch) {
    const day = numericMatch[1].padStart(2, '0');
    const mon = numericMatch[2].padStart(2, '0');
    let yr = numericMatch[3];
    if (yr.length === 2) yr = '20' + yr;
    return `${yr}-${mon}-${day}`;
  }
  return trimmed;
}

interface Props {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  onLoad?: (invoiceNo: string) => void;
  isLoading?: boolean;
}

export default function InvoiceForm({ data, onChange, onLoad, isLoading }: Props) {
  const [searchTerm, setSearchTerm] = useState(data.billTo.name);
  const [showDropdown, setShowDropdown] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [previousSuggestions, setPreviousSuggestions] = useState<DescriptionSuggestion[]>([]);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState<string>('');
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  // AI PO Upload state
  const [isUploadingPO, setIsUploadingPO] = useState(false);
  const [isExtractingPO, setIsExtractingPO] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [pendingAiData, setPendingAiData] = useState<{ data: any; url?: string } | null>(null);
  const [extractedCount, setExtractedCount] = useState<number | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    getClients().then(setClients).catch(() => {});
    getInventory().then(setInventory).catch(() => {});
    getPreviousDescriptions().then(setPreviousSuggestions).catch(() => {});
  }, []);

  useEffect(() => {
    setSearchTerm(data.billTo.name);
  }, [data.billTo.name]);

  const filteredCompanies = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  const updateField = (section: keyof InvoiceData | 'root', field: string, value: any) => {
    if (section === 'root') {
      onChange({ ...data, [field]: value });
    } else {
      onChange({ ...data, [section]: { ...(data[section] as any), [field]: value } });
    }
  };

  const selectCompany = (company: Client) => {
    setSearchTerm(company.name);
    onChange({
      ...data,
      billTo: {
        ...data.billTo,
        name: company.name,
        gstin: company.gstin,
        ...(company.address ? { address: company.address } : {}),
        ...(company.placeOfSupply ? { placeOfSupply: company.placeOfSupply } : {})
      }
    });
    setShowDropdown(false);
  };

  const applyExtractedPO = (ext: any, fileUrl?: string) => {
    if (!ext) return;

    let matchedClient = clients.find(c =>
      c.name.toLowerCase().includes((ext.customerName || '').toLowerCase()) ||
      (ext.customerName && ext.customerName.toLowerCase().includes(c.name.toLowerCase()))
    );

    const finalClientName = matchedClient?.name || ext.customerName || data.billTo.name;
    const finalAddress = matchedClient?.address || ext.customerAddress || data.billTo.address;
    const finalGstin = matchedClient?.gstin || ext.customerGstin || data.billTo.gstin;
    const finalPan = ext.customerPan || data.billTo.panNumber;
    const finalPlaceOfSupply = matchedClient?.placeOfSupply || ext.placeOfSupply || data.billTo.placeOfSupply || 'Telangana';

    let newItems = [...data.items];
    if (Array.isArray(ext.items) && ext.items.length > 0) {
      newItems = ext.items.map((it: any) => ({
        id: crypto.randomUUID(),
        name: (it.description || '').trim(),
        hsn: (it.hsn || '9987').trim(),
        quantity: Number(it.quantity) || 1,
        quantityUnit: (it.quantityUnit || 'EA').toUpperCase(),
        price: Number(it.price) || 0,
        discount: Number(it.discount) || 0,
        discountType: 'percentage' as const,
      }));
      setExtractedCount(newItems.length);
    }

    setSearchTerm(finalClientName);

    onChange({
      ...data,
      poNumber: ext.poNumber || data.poNumber,
      poDate: normalizeDateToInput(ext.poDate) || data.poDate,
      poCopyUrl: fileUrl !== undefined ? fileUrl : (ext.poCopyUrl || data.poCopyUrl),
      billTo: {
        ...data.billTo,
        name: finalClientName,
        address: finalAddress,
        gstin: finalGstin,
        panNumber: finalPan,
        placeOfSupply: finalPlaceOfSupply,
      },
      taxes: {
        cgst: typeof ext.cgstRate === 'number' ? ext.cgstRate : (data.taxes.cgst || 9),
        sgst: typeof ext.sgstRate === 'number' ? ext.sgstRate : (data.taxes.sgst || 9),
      },
      items: newItems,
    });
  };

  const processPOFile = async (file: File) => {
    setIsUploadingPO(true);
    setIsExtractingPO(true);
    setUploadError(null);
    setExtractError(null);
    setUploadSuccess(false);
    setExtractSuccess(false);
    setExtractedCount(null);
    setUploadStatusText('Compressing document for fast AI upload...');

    try {
      // 1. Client-side compression
      const { base64, mimeType, fileName } = await prepareFileForUpload(file);

      setUploadStatusText('AI reading PO details & auto-filling form...');

      const [uploadRes, ocrRes] = await Promise.allSettled([
        uploadPOFile(base64, fileName, mimeType),
        extractInvoiceFromPO(base64, mimeType)
      ]);

      let storedUrl = data.poCopyUrl;
      if (uploadRes.status === 'fulfilled' && uploadRes.value.success && uploadRes.value.url) {
        storedUrl = uploadRes.value.url;
        setUploadSuccess(true);
      } else if (uploadRes.status === 'fulfilled' && uploadRes.value.error) {
        console.warn('PO upload notice:', uploadRes.value.error);
      }

      if (ocrRes.status === 'fulfilled' && ocrRes.value.success && ocrRes.value.data) {
        const hasExisting = Boolean(data.billTo?.name?.trim() || (data.items?.length > 0 && data.items[0]?.name?.trim()));
        if (hasExisting) {
          setPendingAiData({ data: ocrRes.value.data, url: storedUrl });
        } else {
          applyExtractedPO(ocrRes.value.data, storedUrl);
          setExtractSuccess(true);
          setTimeout(() => setExtractSuccess(false), 8000);
        }
      } else {
        const errMsg = ocrRes.status === 'fulfilled' 
          ? ocrRes.value.error 
          : (ocrRes.reason?.message || 'Failed to extract PO details');
        setExtractError(errMsg);
        if (storedUrl) {
          onChange({ ...data, poCopyUrl: storedUrl });
        }
      }
    } catch (err: any) {
      setUploadError(err.message || 'PO file upload failed.');
    } finally {
      setIsUploadingPO(false);
      setIsExtractingPO(false);
      setUploadStatusText('');
    }
  };

  const handlePOFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      processPOFile(file);
    }
  };

  const handleReScanPOWithAI = async () => {
    if (!data.poCopyUrl) {
      alert('Please upload a PO document first.');
      return;
    }
    setIsExtractingPO(true);
    setExtractError(null);
    setExtractSuccess(false);

    try {
      const res = await extractInvoiceFromPOUrl(data.poCopyUrl);
      if (res.success && res.data) {
        applyExtractedPO(res.data);
        setExtractSuccess(true);
        setTimeout(() => setExtractSuccess(false), 8000);
      } else {
        setExtractError(res.error || 'Failed to read PO document with AI.');
      }
    } catch (e: any) {
      setExtractError(e.message || 'AI document scan failed.');
    } finally {
      setIsExtractingPO(false);
    }
  };

  const handleCopyPOUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const addItem = () => {
    onChange({
      ...data,
      items: [
        ...data.items,
        { id: crypto.randomUUID(), name: '', hsn: '9987', quantity: 1, quantityUnit: 'NOS', price: 0, discount: 0, discountType: 'percentage' }
      ]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...data, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = [...data.items];
    newItems.splice(index, 1);
    onChange({ ...data, items: newItems });
  };

  const handleLoad = () => {
    if (onLoad) onLoad(data.invoiceNo);
  };

  return (
    <div className="p-6 space-y-8 pb-32">

      {/* AI PO Document Reader & Auto-Fill Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl shadow-emerald-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-300 tracking-wide uppercase">
                  AI PO Reader & Auto-Fill
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  PO Auto-Fill
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload Purchase Order / Service Order (PDF or Image). AI extracts Customer, PO No, Date, & Line Items instantly.
              </p>
            </div>
          </div>
          {data.poCopyUrl && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-300 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PO Attached
            </span>
          )}
        </div>

        {/* Upload Status Alerts */}
        {extractSuccess && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">AI Extraction Complete!</span> PO details, Client details{extractedCount ? `, and ${extractedCount} item(s)` : ''} have been auto-filled.
            </div>
          </div>
        )}
        {(uploadError || extractError) && (
          <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-xs text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <div className="flex-1 font-medium">{uploadError || extractError}</div>
          </div>
        )}

        {/* Dual Upload Options: Direct Camera & Gallery / PDF */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Direct Camera Button */}
            <label className={`flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-teal-600/10 hover:from-emerald-500/30 hover:to-teal-600/20 active:scale-[0.99] border border-emerald-500/40 hover:border-emerald-400 rounded-xl cursor-pointer transition-all text-emerald-300 font-bold text-xs shadow-sm ${
              isExtractingPO || isUploadingPO ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePOFileUpload}
                disabled={isUploadingPO || isExtractingPO}
                className="hidden"
              />
              <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Take Photo (Camera)</span>
            </label>

            {/* Gallery / PDF Button */}
            <label className={`flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] border border-slate-700 hover:border-slate-600 rounded-xl cursor-pointer transition-all text-slate-200 font-bold text-xs shadow-sm ${
              isExtractingPO || isUploadingPO ? 'opacity-50 pointer-events-none' : ''
            }`}>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handlePOFileUpload}
                disabled={isUploadingPO || isExtractingPO}
                className="hidden"
              />
              <ImageIcon className="w-4 h-4 text-slate-300 shrink-0" />
              <span>Choose from Gallery / PDF</span>
            </label>
          </div>

          {/* Progress / Dropzone */}
          {isExtractingPO || isUploadingPO ? (
            <div className="flex flex-col items-center gap-2 p-3.5 border border-emerald-500/40 bg-emerald-500/10 rounded-xl text-center animate-pulse">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
              <span className="text-xs font-bold text-emerald-300 tracking-wide">
                {uploadStatusText || 'AI Reading PO Document & Auto-filling Form...'}
              </span>
              <span className="text-[11px] text-slate-400">
                Extracting Customer Name, GSTIN, PO Number, Date, Price, and Item Table
              </span>
            </div>
          ) : (
            <label className="hidden md:flex flex-col items-center justify-center p-3 border border-dashed border-emerald-500/20 hover:border-emerald-400/50 hover:bg-emerald-500/5 rounded-xl cursor-pointer transition-all text-center">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handlePOFileUpload}
                className="hidden"
              />
              <span className="text-[11px] text-slate-400">Or drag and drop PO copy file here</span>
            </label>
          )}
        </div>

        {/* AI Overwrite Confirmation Modal */}
        <OverwriteConfirmModal
          isOpen={Boolean(pendingAiData)}
          onClose={() => {
            if (pendingAiData?.url) {
              onChange({ ...data, poCopyUrl: pendingAiData.url });
            }
            setPendingAiData(null);
          }}
          onConfirm={() => {
            if (pendingAiData) {
              applyExtractedPO(pendingAiData.data, pendingAiData.url);
              setExtractSuccess(true);
              setTimeout(() => setExtractSuccess(false), 8000);
              setPendingAiData(null);
            }
          }}
          docType="Form Field"
          title="Overwrite Existing Fields with PO Data?"
          message="This invoice form already has client or line item details entered. Do you want to overwrite these fields with the data extracted from the PO document?"
          confirmLabel="Yes, Overwrite Fields"
          cancelLabel="Keep Current Fields"
        />

        {/* Document Preview Card if attached */}
        {data.poCopyUrl && (
          <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center gap-3.5 shadow-inner">
            <div className="relative group shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
              {data.poCopyUrl.toLowerCase().includes('.pdf') ? (
                <div className="flex flex-col items-center justify-center text-emerald-400 p-2 text-center">
                  <FileText className="w-8 h-8 mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">PDF PO</span>
                </div>
              ) : (
                <img
                  src={data.poCopyUrl}
                  alt="Stored PO Document"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <a
                href={data.poCopyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-bold gap-1"
                title="Click to view full PO document in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Stored in Cloud Storage
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={data.poCopyUrl}>
                  {data.poCopyUrl.split('/').pop()?.split('?')[0] || 'po_document'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                This PO document is safely stored in database storage for future audit and reference.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <a
                  href={data.poCopyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" /> View PO Copy
                </a>
                <button
                  type="button"
                  onClick={() => handleCopyPOUrl(data.poCopyUrl!)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> {copiedUrl ? 'Copied Link!' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={handleReScanPOWithAI}
                  disabled={isExtractingPO}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-md text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" /> Re-scan with AI
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...data, poCopyUrl: '' })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Header Info */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" /> Document Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Invoice No</label>
            <div className="flex gap-2 relative">
              <div className="relative flex-1 min-w-0">
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 pr-8 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60"
                  value={data.invoiceNo} 
                  disabled={isLoading}
                  placeholder={isLoading ? "Loading Invoice No..." : "e.g. PLEW001231"}
                  onChange={e => updateField('root', 'invoiceNo', e.target.value)} 
                />
                {isLoading && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  </div>
                )}
              </div>
              <button 
                type="button"
                onClick={handleLoad} 
                disabled={isLoading}
                title="Load existing invoice"
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded p-2 px-3 text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isLoading ? 'Loading...' : 'Load'}</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
              value={data.invoiceDate} 
              onClick={(e) => { try { (e.target as any).showPicker() } catch(err) {} }}
              onChange={e => updateField('root', 'invoiceDate', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">PO / Gatepass No</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              value={data.poNumber} 
              onChange={e => updateField('root', 'poNumber', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">PO / Gatepass Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
              value={data.poDate} 
              onClick={(e) => { try { (e.target as any).showPicker() } catch(err) {} }}
              onChange={e => updateField('root', 'poDate', e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <Building className="w-4 h-4 text-emerald-400" /> Billed To
        </h2>
        
        <div className="relative">
          <label className="block text-xs font-medium text-slate-400 mb-1">Company Name</label>
          <input 
            type="text" 
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder-slate-600"
            placeholder="Search company..."
            value={searchTerm} 
            onChange={e => {
              setSearchTerm(e.target.value);
              updateField('billTo', 'name', e.target.value);
              setShowDropdown(true);
            }} 
            onFocus={() => setShowDropdown(true)}
          />
          
          {showDropdown && filteredCompanies.length > 0 && searchTerm && (
            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-60 overflow-auto no-scrollbar">
              {filteredCompanies.map((c, i) => (
                <div 
                  key={i} 
                  className="px-3 py-2 cursor-pointer hover:bg-emerald-500/10 border-b border-slate-700/50 last:border-0 truncate text-sm"
                  onMouseDown={(e) => { // Using onMouseDown instead of onClick to prevent onBlur race condition
                    e.preventDefault();
                    selectCompany(c);
                  }}
                >
                  <div className="text-slate-100 font-medium">{c.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{c.gstin}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">GSTIN</label>
             <input 
               type="text" 
               className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 uppercase font-mono placeholder-slate-600 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
               value={data.billTo.gstin} 
               onChange={e => updateField('billTo', 'gstin', e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Place of Supply</label>
             <input 
               type="text" 
               className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
               value={data.billTo.placeOfSupply} 
               onChange={e => updateField('billTo', 'placeOfSupply', e.target.value)} 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
           <textarea 
             className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
             rows={2}
             value={data.billTo.address} 
             onChange={e => updateField('billTo', 'address', e.target.value)} 
          />
        </div>
      </div>

       {/* Items */}
       <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-emerald-400" /> Items
        </h2>
        
        {data.items.map((item, index) => (
          <div key={item.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg space-y-3 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
              <button 
                onClick={() => removeItem(index)}
                className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
            
            {/* Full-width Description with Auto-suggestions */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] uppercase font-bold text-slate-400">Description / Particulars</label>
                <span className="text-[10px] text-amber-400 font-medium">Type HP (e.g. 5 HP) for auto-rate</span>
              </div>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 placeholder:text-slate-600 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g. 5 HP Motor Rewinding / Bearing Replacement"
                value={item.name} 
                autoComplete="off"
                onFocus={() => { setActiveItemIdx(index); setItemSearch(item.name); }}
                onBlur={() => setTimeout(() => setActiveItemIdx(null), 200)}
                onChange={e => {
                  const val = e.target.value;
                  setItemSearch(val);
                  setActiveItemIdx(index);

                  const motorMatch = findMotorPrice(val);
                  if (motorMatch) {
                    const newItems = [...data.items];
                    newItems[index] = {
                      ...newItems[index],
                      name: val,
                      price: motorMatch.price,
                      hsn: newItems[index].hsn || motorMatch.hsn || '9987'
                    };
                    onChange({ ...data, items: newItems });
                  } else {
                    updateItem(index, 'name', val);
                  }
                }} 
              />
              {activeItemIdx === index && (() => {
                const query = (itemSearch || '').trim().toLowerCase();
                const motorList = getMotorSuggestions(itemSearch);
                const invList = inventory.filter(s =>
                  s.name.toLowerCase().includes(query) && s.name.toLowerCase() !== query
                ).slice(0, 5);
                const prevList = previousSuggestions.filter(s =>
                  s.description.toLowerCase().includes(query) &&
                  !motorList.some(m => m.name.toLowerCase() === s.description.toLowerCase())
                ).slice(0, 7);

                if (motorList.length === 0 && invList.length === 0 && prevList.length === 0) return null;

                return (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-2xl max-h-64 overflow-auto no-scrollbar divide-y divide-slate-800">
                    {prevList.length > 0 && (
                      <div>
                        <div className="p-1.5 bg-blue-500/10 text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3 h-3 text-blue-400" /> Previous Entries & History
                        </div>
                        {prevList.map((s, si) => (
                          <div
                            key={`prev-${si}`}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-500/10 text-sm text-slate-200 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const newItems = [...data.items];
                              newItems[index] = { 
                                ...newItems[index], 
                                name: s.description, 
                                hsn: s.hsn || newItems[index].hsn || '9987', 
                                price: s.rate !== undefined && s.rate > 0 ? s.rate : newItems[index].price, 
                                quantityUnit: s.unit || newItems[index].quantityUnit || 'NOS' 
                              };
                              onChange({ ...data, items: newItems });
                              setActiveItemIdx(null);
                            }}
                          >
                            <div className="font-semibold text-slate-100 flex items-center justify-between">
                              <span>{s.description}</span>
                              {s.rate !== undefined && s.rate > 0 && (
                                <span className="text-emerald-400 font-mono font-bold text-xs">
                                  ₹{s.rate.toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex gap-3">
                              {s.source && <span>Source: <strong className="text-slate-300">{s.source}</strong></span>}
                              {s.unit && <span>Unit: <strong className="text-slate-300">{s.unit}</strong></span>}
                              {s.hsn && <span>HSN: <strong className="text-slate-300">{s.hsn}</strong></span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {motorList.length > 0 && (
                      <div>
                        <div className="p-1.5 bg-amber-500/5 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> Approved Motor Rates (Aurobindo / Apitoria / Eugia / APL)
                        </div>
                        {motorList.map((s, si) => (
                          <div
                            key={`motor-${si}`}
                            className="px-3 py-2 cursor-pointer hover:bg-amber-500/10 text-sm text-slate-200 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const newItems = [...data.items];
                              newItems[index] = { 
                                ...newItems[index], 
                                name: s.name, 
                                hsn: s.hsn || '9987', 
                                price: s.price, 
                                quantityUnit: s.quantityUnit || 'NOS' 
                              };
                              onChange({ ...data, items: newItems });
                              setActiveItemIdx(null);
                            }}
                          >
                            <div className="font-semibold text-slate-100 flex items-center justify-between">
                              <span>{s.name}</span>
                              <span className="text-amber-400 font-mono font-bold text-xs">₹{s.price.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex gap-3">
                              <span>HSN: <strong className="text-slate-300">{s.hsn}</strong></span>
                              <span>Speed: <strong className="text-slate-300">{s.rpm}</strong></span>
                              <span className="text-amber-300 font-semibold">(Editable Rate)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {invList.length > 0 && (
                      <div>
                        <div className="p-1.5 bg-emerald-500/5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Inventory Items
                        </div>
                        {invList.map((s, si) => (
                          <div
                            key={`inv-${si}`}
                            className="px-3 py-2 cursor-pointer hover:bg-emerald-500/10 text-sm text-slate-200 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const newItems = [...data.items];
                              newItems[index] = { 
                                ...newItems[index], 
                                name: s.name, 
                                hsn: s.hsn || '9987', 
                                price: s.price || 0, 
                                quantityUnit: s.quantityUnit || 'NOS' 
                              };
                              onChange({ ...data, items: newItems });
                              setActiveItemIdx(null);
                            }}
                          >
                            <div className="font-semibold text-slate-100">{s.name}</div>
                            <div className="text-[10px] text-emerald-400 font-mono">₹{s.price} • HSN: {s.hsn || '9987'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Numerical details: HSN, Qty, Unit, Rate */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">HSN Code</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-sm text-slate-100"
                  placeholder="e.g. 9987"
                  value={item.hsn} 
                  onChange={e => updateItem(index, 'hsn', e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  step="any"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-sm text-slate-100 font-semibold"
                  value={item.quantity} 
                  onChange={e => updateItem(index, 'quantity', Number(e.target.value))} 
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Unit</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-sm text-slate-100"
                  placeholder="NOS / SET"
                  value={item.quantityUnit} 
                  onChange={e => updateItem(index, 'quantityUnit', e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Rate (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  step="any"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-sm font-semibold text-emerald-400 text-right"
                  value={item.price} 
                  onChange={e => updateItem(index, 'price', Number(e.target.value))} 
                />
              </div>
            </div>
            
            {/* Discount and Line Total */}
            <div className="grid grid-cols-2 gap-3 items-center pt-1 border-t border-slate-800/60">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Discount (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  step="any"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-sm text-slate-100"
                  placeholder="0"
                  value={item.discount || ''} 
                  onChange={e => updateItem(index, 'discount', Number(e.target.value))} 
                />
              </div>
              <div className="text-right pt-4">
                <span className="text-[11px] font-bold text-slate-400">Total: </span>
                <span className="text-sm font-bold text-slate-100 font-mono">
                  ₹{Math.max(0, ((item.quantity || 1) * (item.price || 0)) - (item.discount || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

          </div>
        ))}

        <button 
          onClick={addItem}
          className="w-full py-2 border border-dashed border-slate-700 text-slate-400 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-emerald-400 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

       {/* Taxes */}
       <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-emerald-400" /> Taxes
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">CGST (%)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={data.taxes.cgst} 
              onChange={e => updateField('taxes', 'cgst', Number(e.target.value))} 
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">SGST (%)</label>
            <input 
              type="number" 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={data.taxes.sgst} 
              onChange={e => updateField('taxes', 'sgst', Number(e.target.value))} 
            />
          </div>
        </div>
      </div>

    </div>
  );
}
