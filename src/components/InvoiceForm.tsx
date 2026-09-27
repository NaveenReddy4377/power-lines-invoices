'use client';

import React, { useState, useEffect, useRef } from 'react';
import { InvoiceData, Client, InventoryItem } from '@/types';
import { Plus, Trash2, Building, ScanLine, FileText, IndianRupee, Zap, Sparkles, Loader2 } from 'lucide-react';
import { getClients, getInventory } from '@/app/actions';
import { getMotorSuggestions, findMotorPrice, approvedCompanies } from '@/data/motor-rates';

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
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState<string>('');
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getClients().then(setClients).catch(() => {});
    getInventory().then(setInventory).catch(() => {});
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
            
            <div className="grid grid-cols-[1fr,80px] gap-3">
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-500">Description</label>
                  <span className="text-[9px] text-amber-400/90 font-medium">Type HP (e.g. 5 HP) for auto-rate</span>
                </div>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm placeholder:text-slate-600"
                  placeholder="e.g. 5 HP Motor Rewinding"
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
                  const motorList = getMotorSuggestions(itemSearch);
                  const invList = inventory.filter(s =>
                    s.name.toLowerCase().includes(itemSearch.toLowerCase()) && s.name.toLowerCase() !== itemSearch.toLowerCase()
                  ).slice(0, 5);

                  if (motorList.length === 0 && invList.length === 0) return null;

                  return (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-2xl max-h-60 overflow-auto no-scrollbar divide-y divide-slate-800">
                      {motorList.length > 0 && (
                        <div className="p-1.5 bg-amber-500/5 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> Approved Motor Rates (Aurobindo / Apitoria / Eugia / APL)
                        </div>
                      )}
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

                      {invList.length > 0 && (
                        <div className="p-1.5 bg-emerald-500/5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Inventory Items
                        </div>
                      )}
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
                  );
                })()}
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">HSN</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.hsn} 
                  onChange={e => updateItem(index, 'hsn', e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Qty</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.quantity} 
                  onChange={e => updateItem(index, 'quantity', Number(e.target.value))} 
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Unit</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.quantityUnit} 
                  onChange={e => updateItem(index, 'quantityUnit', e.target.value)} 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Rate (₹)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.price} 
                  onChange={e => updateItem(index, 'price', Number(e.target.value))} 
                />
              </div>
            </div>
            
             <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Discount</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.discount} 
                  onChange={e => updateItem(index, 'discount', Number(e.target.value))} 
                />
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
