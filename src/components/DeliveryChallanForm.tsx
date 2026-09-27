'use client';

import { useState, useEffect } from 'react';
import { DeliveryChallanData, DeliveryChallanItem, Client } from '@/types';
import { extractDCFromImage, getClients, uploadRGPPhoto } from '@/app/actions';
import { Upload, Sparkles, Plus, Trash2, Building, Truck, FileText, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, ExternalLink } from 'lucide-react';

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
  }, []);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const photoRes = await uploadRGPPhoto(base64, file.name, file.type || 'image/jpeg');
          if (photoRes.success && photoRes.url) {
            onChange({ ...data, rgpPhotoUrl: photoRes.url });
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 4000);
          } else {
            setUploadError(photoRes.error || 'Failed to upload photo.');
          }
        } catch (photoErr: any) {
          setUploadError(photoErr.message || 'Photo upload failed.');
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read file from disk.');
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'Upload process failed.');
      setIsUploadingPhoto(false);
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
      
      {/* RGP / Gate Pass Photo Upload Section */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">RGP / Gate Pass Document Photo</h3>
              <p className="text-xs text-slate-400">Upload photo/scan to store permanent non-expiring URL in Google Sheets</p>
            </div>
          </div>
        </div>

        {/* Upload File Zone */}
        <label className="relative flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-500/30 rounded-xl cursor-pointer hover:border-amber-400/60 hover:bg-amber-500/5 transition-all group">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isUploadingPhoto}
            className="hidden"
          />
          {isUploadingPhoto ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
              <span className="text-xs font-semibold text-amber-300">Uploading photo to permanent storage & generating URL...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-slate-200">Click or drag RGP / Gate Pass photo or PDF to upload</span>
            </div>
          )}
        </label>

        {/* Permanent URL Field */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Stored Photo URL (Synced with Google Sheets)
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
                  className="flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                  title="Open Link"
                >
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            )}
          </div>
        </div>

        {uploadSuccess && (
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

                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Description (e.g. 18kW Stand mine motor / rewinding motor)"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                  />
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
