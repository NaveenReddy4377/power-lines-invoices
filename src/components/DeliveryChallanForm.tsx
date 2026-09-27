'use client';

import { useState, useEffect, useRef } from 'react';
import { DeliveryChallanData, DeliveryChallanItem, Client } from '@/types';
import { extractDCFromImage, extractDCFromUrl, getClients, uploadRGPPhoto, getPreviousDescriptions, DescriptionSuggestion } from '@/app/actions';
import { Upload, Sparkles, Plus, Trash2, Building, Truck, FileText, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, ExternalLink, History } from 'lucide-react';

interface DeliveryChallanFormProps {
  data: DeliveryChallanData;
  onChange: (updated: DeliveryChallanData) => void;
  onLoad?: (dcNo: string) => void;
  isLoading?: boolean;
}

export default function DeliveryChallanForm({ data, onChange, onLoad, isLoading }: DeliveryChallanFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<DescriptionSuggestion[]>([]);
  const [activeDescId, setActiveDescId] = useState<string | null>(null);
  const [descSearch, setDescSearch] = useState<string>('');
  const descDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCRM() {
      try {
        const list = await getClients();
        setClients(list || []);
      } catch (e) {
        console.error('Failed to load CRM clients', e);
      }
    }
    loadCRM();
    getPreviousDescriptions().then(setSuggestions).catch(() => {});

    const handleClickOutside = (e: MouseEvent) => {
      if (descDropdownRef.current && !descDropdownRef.current.contains(e.target as Node)) {
        setActiveDescId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (itemId: string, s: DescriptionSuggestion) => {
    const updatedItems = data.items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          description: s.description,
          uom: s.unit || item.uom || 'NOS'
        };
      }
      return item;
    });
    onChange({ ...data, items: updatedItems });
    setActiveDescId(null);
  };

  const handleFieldChange = (field: keyof DeliveryChallanData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleItemChange = (id: string, field: keyof DeliveryChallanItem, value: any) => {
    const updatedItems = data.items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChange({ ...data, items: updatedItems });
  };

  const handleAddItem = () => {
    const newItem: DeliveryChallanItem = {
      id: crypto.randomUUID(),
      materialCode: '',
      description: '',
      uom: 'NOS',
      quantity: 1,
      weight: '',
      remarks: ''
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    if (data.items.length <= 1) return;
    onChange({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [extractedItemsCount, setExtractedItemsCount] = useState<number | null>(null);

  const applyExtractedData = (ext: any, photoUrl?: string) => {
    let finalCustomerName = ext.customerName || data.customerName;
    let finalCustomerAddress = ext.customerAddress || data.customerAddress;
    let finalCustomerGstin = ext.customerGstin || data.customerGstin;

    // Cross-match with CRM database if possible
    if (ext.customerName && clients.length > 0) {
      const extLower = ext.customerName.toLowerCase().trim();
      const matched = clients.find(c => 
        c.name.toLowerCase().includes(extLower) || extLower.includes(c.name.toLowerCase())
      );
      if (matched) {
        finalCustomerName = matched.name;
        if (matched.address) finalCustomerAddress = matched.address;
        if (matched.gstin) finalCustomerGstin = matched.gstin;
      }
    }

    // Format item lines
    let newItems = data.items;
    if (Array.isArray(ext.items) && ext.items.length > 0) {
      newItems = ext.items.map((it: any) => ({
        id: crypto.randomUUID(),
        materialCode: it.materialCode || '',
        description: it.description || '',
        uom: it.uom || 'NOS',
        quantity: Number(it.quantity) || 1,
        weight: it.weight || '',
        remarks: it.remarks || ''
      }));
      setExtractedItemsCount(newItems.length);
    }

    onChange({
      ...data,
      customerName: finalCustomerName || data.customerName,
      customerAddress: finalCustomerAddress || data.customerAddress,
      customerGstin: finalCustomerGstin || data.customerGstin,
      rgpNo: ext.rgpNo || data.rgpNo,
      rgpDate: ext.rgpDate || data.rgpDate,
      vehicleNo: ext.vehicleNo || data.vehicleNo,
      modeOfTransport: ext.modeOfTransport || data.modeOfTransport,
      challanType: (ext.challanType === 'Non-Returnable' ? 'Non-Returnable' : ext.challanType === 'Regular' ? 'Regular' : 'Returnable'),
      remarks: ext.remarks || data.remarks,
      items: newItems,
      rgpPhotoUrl: photoUrl !== undefined ? photoUrl : data.rgpPhotoUrl
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setIsExtracting(true);
    setUploadError(null);
    setExtractError(null);
    setUploadSuccess(false);
    setExtractSuccess(false);
    setExtractedItemsCount(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

        // Simultaneously upload photo to storage and run Gemini AI OCR
        const [photoRes, ocrRes] = await Promise.allSettled([
          uploadRGPPhoto(base64, file.name, mimeType),
          extractDCFromImage(base64, mimeType)
        ]);

        let storedUrl = data.rgpPhotoUrl;
        if (photoRes.status === 'fulfilled' && photoRes.value.success && photoRes.value.url) {
          storedUrl = photoRes.value.url;
          setUploadSuccess(true);
        } else if (photoRes.status === 'fulfilled' && photoRes.value.error) {
          console.warn('Storage upload error:', photoRes.value.error);
        }

        if (ocrRes.status === 'fulfilled' && ocrRes.value.success && ocrRes.value.data) {
          applyExtractedData(ocrRes.value.data, storedUrl);
          setExtractSuccess(true);
          setTimeout(() => setExtractSuccess(false), 8000);
        } else {
          const errMsg = ocrRes.status === 'fulfilled' 
            ? ocrRes.value.error 
            : (ocrRes.reason?.message || 'Failed to extract text from document');
          setExtractError(errMsg);
          if (storedUrl) {
            onChange({ ...data, rgpPhotoUrl: storedUrl });
          }
        }

        setIsUploadingPhoto(false);
        setIsExtracting(false);
      };

      reader.onerror = () => {
        setUploadError('Failed to read file from disk.');
        setIsUploadingPhoto(false);
        setIsExtracting(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'Upload process failed.');
      setIsUploadingPhoto(false);
      setIsExtracting(false);
    }
  };

  const handleReScanWithAI = async () => {
    if (!data.rgpPhotoUrl) {
      alert('Please upload a document or enter a valid photo URL first.');
      return;
    }
    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    try {
      const res = await extractDCFromUrl(data.rgpPhotoUrl);
      if (res.success && res.data) {
        applyExtractedData(res.data);
        setExtractSuccess(true);
        setTimeout(() => setExtractSuccess(false), 8000);
      } else {
        setExtractError(res.error || 'Failed to read document with AI.');
      }
    } catch (e: any) {
      setExtractError(e.message || 'AI document scan failed.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const selectClient = (client: Client) => {
    onChange({
      ...data,
      customerName: client.name,
      customerAddress: client.address,
      customerGstin: client.gstin || data.customerGstin
    });
    setShowClientDropdown(false);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 text-slate-100">
      
      {/* RGP / Gate Pass Photo & AI OCR Section */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">AI Document Reader & RGP Scan</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Auto-Fill Enabled
                </span>
              </div>
              <p className="text-xs text-slate-400">Upload document (image or PDF). AI reads all customer, RGP, and item details & automatically fills the form.</p>
            </div>
          </div>
        </div>

        {/* Upload File Zone */}
        <label className={`relative flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${
          isExtracting || isUploadingPhoto
            ? 'border-amber-400 bg-amber-500/10 animate-pulse'
            : 'border-amber-500/30 hover:border-amber-400/70 hover:bg-amber-500/5'
        }`}>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isUploadingPhoto || isExtracting}
            className="hidden"
          />
          {isExtracting || isUploadingPhoto ? (
            <div className="flex flex-col items-center gap-2.5 py-2 text-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
                <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
              </div>
              <span className="text-xs font-bold text-amber-300 tracking-wide">
                AI Reading Document & Auto-filling Fields...
              </span>
              <span className="text-[11px] text-slate-400">
                Extracting Customer Name, Address, RGP No, Date, Vehicle No, and Item Table
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 py-1">
              <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all shrink-0">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                  Click or drag RGP / Gate Pass document (Image or PDF) here
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  🤖 AI will read your document and auto-fill all form fields and items instantly
                </div>
              </div>
            </div>
          )}
        </label>

        {/* Permanent URL Field with AI Re-scan Button */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Stored Document URL (Synced with Google Sheets)
            </label>
            <span className="text-[10px] text-amber-400/80 font-semibold">Non-expiring link</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. https://drive.google.com/... or /uploads/rgp/..."
              value={data.rgpPhotoUrl || ''}
              onChange={(e) => handleFieldChange('rgpPhotoUrl', e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg text-xs font-mono text-amber-300 placeholder:text-slate-500 focus:outline-none"
            />
            {data.rgpPhotoUrl && (
              <>
                <button
                  type="button"
                  onClick={handleReScanWithAI}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shrink-0 active:scale-95 cursor-pointer"
                  title="Re-read document using AI and auto-fill form fields"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reading...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>AI Re-Scan</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyUrl(data.rgpPhotoUrl!)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Copy URL"
                >
                  {copiedUrl ? 'Copied!' : 'Copy'}
                </button>
                <a
                  href={data.rgpPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors shrink-0"
                  title="Open Link"
                >
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* AI Success Feedback Banner */}
        {extractSuccess && (
          <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-300">Document Processed by AI!</span>
              <p className="text-[11px] text-emerald-400/90 mt-0.5">
                Successfully extracted party details, RGP reference, vehicle number
                {extractedItemsCount ? ` and ${extractedItemsCount} material items` : ''}. Review and adjust details below.
              </p>
            </div>
          </div>
        )}

        {/* AI Error Feedback Banner */}
        {extractError && (
          <div className="flex items-center gap-2.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-300">AI Extraction Notice:</span>
              <p className="text-[11px] text-red-400/90 mt-0.5">{extractError}</p>
            </div>
          </div>
        )}

        {uploadSuccess && !extractSuccess && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>RGP photo uploaded successfully! URL stored and ready to sync with Google Sheet.</span>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 p-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Challan & Reference Details */}
      <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-4 h-4" /> Delivery Challan Info
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase">DC Number</label>
            <div className="flex gap-1.5 mt-1 relative">
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={data.dcNo}
                  disabled={isLoading}
                  placeholder={isLoading ? "Loading DC No..." : "e.g. PLEW-DC-00001"}
                  onChange={(e) => handleFieldChange('dcNo', e.target.value)}
                  className="w-full px-3 py-2 pr-8 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                />
                {isLoading && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onLoad && onLoad(data.dcNo)}
                disabled={isLoading}
                title="Load existing Delivery Challan from Google Sheets"
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isLoading ? 'Loading...' : 'Load'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase">DC Date</label>
            <input
              type="date"
              value={data.dcDate}
              onChange={(e) => handleFieldChange('dcDate', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase">Challan Type</label>
            <select
              value={data.challanType}
              onChange={(e) => handleFieldChange('challanType', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="Returnable">Returnable Gate Pass</option>
              <option value="Non-Returnable">Non-Returnable</option>
              <option value="Regular">Regular DC</option>
            </select>
          </div>
        </div>

        {/* Customer Details */}
        <div className="relative pt-2">
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" /> Customer / Party (M/s)
            </label>
            <span className="text-[10px] text-slate-500">Auto-filled or select from CRM</span>
          </div>

          <input
            type="text"
            placeholder="e.g. APITORIA PHARMA PRIVATE LIMITED"
            value={data.customerName}
            onChange={(e) => {
              handleFieldChange('customerName', e.target.value);
              setClientSearch(e.target.value);
              setShowClientDropdown(true);
            }}
            onFocus={() => setShowClientDropdown(true)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500"
          />

          {showClientDropdown && filteredClients.length > 0 && (
            <div className="absolute left-0 right-0 z-30 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => selectClient(client)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-xs text-slate-200 flex flex-col"
                >
                  <span className="font-bold text-amber-400">{client.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">{client.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase">Customer Address</label>
            <textarea
              rows={2}
              value={data.customerAddress}
              onChange={(e) => handleFieldChange('customerAddress', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="Full party address"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase">Customer GSTIN</label>
            <input
              type="text"
              value={data.customerGstin}
              onChange={(e) => handleFieldChange('customerGstin', e.target.value)}
              placeholder="e.g. 36AAQCA3500J1ZP"
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* References: RGP No, RGP Date, Vehicle No, Quotation Raised, Transport */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">RGP / Gate Pass No</label>
            <input
              type="text"
              value={data.rgpNo}
              onChange={(e) => handleFieldChange('rgpNo', e.target.value)}
              placeholder="e.g. 360/RGP/26-27/00125"
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">RGP / Gate Pass Date</label>
            <input
              type="text"
              value={data.rgpDate}
              onChange={(e) => handleFieldChange('rgpDate', e.target.value)}
              placeholder="e.g. 25-JUL-26"
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-amber-400 uppercase">Quotation Raised</label>
            <select
              value={data.quotationRaised || 'No'}
              onChange={(e) => handleFieldChange('quotationRaised', e.target.value as 'Yes' | 'No')}
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-amber-500/40 rounded-lg text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Truck className="w-3 h-3 text-amber-400" /> Vehicle No
            </label>
            <input
              type="text"
              value={data.vehicleNo}
              onChange={(e) => handleFieldChange('vehicleNo', e.target.value)}
              placeholder="e.g. TS 08UF 9062"
              className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Material / Item Details</h4>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="space-y-3">
          {data.items.map((item, index) => (
            <div key={item.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Item #{index + 1}</span>
                {data.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Material Code"
                    value={item.materialCode || ''}
                    onChange={(e) => handleItemChange(item.id, 'materialCode', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-5 relative">
                  <input
                    type="text"
                    placeholder="Description (e.g. 18kW Stand mine motor / rewinding motor)"
                    value={item.description}
                    onChange={(e) => {
                      handleItemChange(item.id, 'description', e.target.value);
                      setDescSearch(e.target.value);
                      setActiveDescId(item.id);
                    }}
                    onFocus={() => {
                      setActiveDescId(item.id);
                      setDescSearch(item.description || '');
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                  />

                  {/* Auto-suggestions dropdown */}
                  {activeDescId === item.id && (() => {
                    const query = (descSearch || '').trim().toLowerCase();
                    const filtered = suggestions.filter(s =>
                      s.description.toLowerCase().includes(query)
                    ).slice(0, 7);

                    if (filtered.length === 0) return null;

                    return (
                      <div
                        ref={descDropdownRef}
                        className="absolute z-30 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800/80 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="p-1.5 bg-slate-950/80 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <History className="w-3 h-3 text-amber-500" />
                            Previous Entries & Suggestions
                          </span>
                          <button
                            type="button"
                            onMouseDown={() => setActiveDescId(null)}
                            className="text-slate-400 hover:text-slate-200 text-xs px-1"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto">
                          {filtered.map((s, si) => (
                            <div
                              key={`dc-sug-${si}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(item.id, s);
                              }}
                              className="px-3 py-2 cursor-pointer hover:bg-amber-500/10 transition-colors flex items-center justify-between text-xs group"
                            >
                              <div className="flex-1 pr-2">
                                <p className="font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                                  {s.description}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {s.source && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-xs bg-slate-800 text-slate-400 border border-slate-700">
                                      {s.source}
                                    </span>
                                  )}
                                  {s.unit && (
                                    <span className="text-[10px] text-slate-500">
                                      UOM: <strong className="text-slate-400">{s.unit}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="UOM (EA/NOS)"
                    value={item.uom || ''}
                    onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* General Remarks */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <label className="text-[11px] font-bold text-slate-400 uppercase">General Remarks / Notes</label>
        <textarea
          rows={2}
          value={data.remarks}
          onChange={(e) => handleFieldChange('remarks', e.target.value)}
          placeholder="e.g. Sending for Rewinding / Repair - Not for Sale"
          className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
        />
      </div>

    </div>
  );
}
