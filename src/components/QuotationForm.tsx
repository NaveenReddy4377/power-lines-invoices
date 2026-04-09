'use client';

import React, { useState, useEffect } from 'react';
import { QuotationData } from '@/types';
import companies from '@/data/companies.json';
import { Plus, Trash2, Building, ScanLine, FileText, List, IndianRupee } from 'lucide-react';
import { getItemSuggestions } from '@/app/actions';

interface Props {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
  onLoad?: (quotationNo: string) => void;
}

export default function QuotationForm({ data, onChange, onLoad }: Props) {
  const [searchTerm, setSearchTerm] = useState(data.billTo.name);
  const [showDropdown, setShowDropdown] = useState(false);
  const [itemSuggestions, setItemSuggestions] = useState<string[]>([]);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState('');

  useEffect(() => {
    getItemSuggestions().then(setItemSuggestions).catch(() => {});
  }, []);

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);

  const updateField = (section: keyof QuotationData | 'root', field: string, value: any) => {
    if (section === 'root') {
      onChange({ ...data, [field]: value });
    } else {
      onChange({ ...data, [section]: { ...(data[section] as any), [field]: value } });
    }
  };

  const selectCompany = (company: { name: string; gstin: string; address?: string }) => {
    setSearchTerm(company.name);
    onChange({ 
      ...data, 
      billTo: { 
        ...data.billTo, 
        name: company.name, 
        gstin: company.gstin,
        ...(company.address ? { address: company.address } : {})
      } 
    });
    setShowDropdown(false);
  };

  const addItem = () => {
    onChange({
      ...data,
      items: [...data.items, { id: crypto.randomUUID(), name: '', hsn: '', quantity: 1, quantityUnit: 'NOS', price: 0, discount: 0, discountType: 'percentage' }]
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

  const addTerm = () => onChange({ ...data, termsAndConditions: [...data.termsAndConditions, ''] });
  const updateTerm = (i: number, val: string) => {
    const t = [...data.termsAndConditions];
    t[i] = val;
    onChange({ ...data, termsAndConditions: t });
  };
  const removeTerm = (i: number) => {
    const t = [...data.termsAndConditions];
    t.splice(i, 1);
    onChange({ ...data, termsAndConditions: t });
  };

  return (
    <div className="p-6 space-y-8 pb-32">

      {/* Document Info */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" /> Quotation Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Quotation No</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                value={data.quotationNo} onChange={e => updateField('root', 'quotationNo', e.target.value)} />
              <button
                onClick={() => onLoad && onLoad(data.quotationNo)}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded px-3 py-2 text-xs font-semibold shrink-0 transition-colors"
              >Load</button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
            <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 cursor-pointer focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              value={data.quotationDate}
              onClick={(e) => { try { (e.target as any).showPicker(); } catch { } }}
              onChange={e => updateField('root', 'quotationDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Valid Until</label>
            <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 cursor-pointer focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              value={data.validUntil}
              onClick={(e) => { try { (e.target as any).showPicker(); } catch { } }}
              onChange={e => updateField('root', 'validUntil', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g. Supply of Motors"
              value={data.subject} onChange={e => updateField('root', 'subject', e.target.value)} />
          </div>
        </div>
        {/* RGP / Gatepass Details */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">RGP / Gatepass No</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Optional"
              value={data.rgpNumber} onChange={e => updateField('root', 'rgpNumber', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">RGP / Gatepass Date</label>
            <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 cursor-pointer focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              value={data.rgpDate}
              onClick={(e) => { try { (e.target as any).showPicker(); } catch {} }}
              onChange={e => updateField('root', 'rgpDate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <Building className="w-4 h-4 text-purple-400" /> Quotation For
        </h2>
        <div className="relative">
          <label className="block text-xs font-medium text-slate-400 mb-1">Company Name</label>
          <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 placeholder-slate-600 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Search company..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); updateField('billTo', 'name', e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)} />
          {showDropdown && filteredCompanies.length > 0 && searchTerm && (
            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-48 overflow-auto no-scrollbar">
              {filteredCompanies.map((c, i) => (
                <div key={i} className="px-3 py-2 cursor-pointer hover:bg-purple-500/10 border-b border-slate-700/50 last:border-0 text-sm"
                  onMouseDown={e => { e.preventDefault(); selectCompany(c); }}>
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
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 uppercase font-mono focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              value={data.billTo.gstin} onChange={e => updateField('billTo', 'gstin', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Place of Supply</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              value={data.billTo.placeOfSupply} onChange={e => updateField('billTo', 'placeOfSupply', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
          <textarea className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-slate-100 focus:ring-1 focus:ring-purple-500 focus:border-purple-500" rows={2}
            value={data.billTo.address} onChange={e => updateField('billTo', 'address', e.target.value)} />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-purple-400" /> Items
        </h2>
        {data.items.map((item, index) => (
          <div key={item.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
              <button onClick={() => removeItem(index)} className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
            <div className="grid grid-cols-[1fr,80px] gap-3">
              <div className="relative">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Description</label>
                <input type="text" autoComplete="off"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.name}
                  onFocus={() => { setActiveItemIdx(index); setItemSearch(item.name); }}
                  onBlur={() => setTimeout(() => setActiveItemIdx(null), 150)}
                  onChange={e => { updateItem(index, 'name', e.target.value); setItemSearch(e.target.value); setActiveItemIdx(index); }} />
                {activeItemIdx === index && (() => {
                  const filtered = itemSuggestions.filter(s => s.toLowerCase().includes(itemSearch.toLowerCase()) && s.toLowerCase() !== itemSearch.toLowerCase()).slice(0, 8);
                  return filtered.length > 0 ? (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-48 overflow-auto no-scrollbar">
                      {filtered.map((s, si) => (
                        <div key={si} className="px-3 py-2 cursor-pointer hover:bg-purple-500/10 text-sm text-slate-200 border-b border-slate-700/50 last:border-0"
                          onMouseDown={e => { e.preventDefault(); updateItem(index, 'name', s); setActiveItemIdx(null); }}>{s}</div>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">HSN</label>
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.hsn} onChange={e => updateItem(index, 'hsn', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Qty</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Unit</label>
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.quantityUnit} onChange={e => updateItem(index, 'quantityUnit', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Rate (₹)</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm"
                  value={item.price} onChange={e => updateItem(index, 'price', Number(e.target.value))} />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addItem} className="w-full py-2 border border-dashed border-slate-700 text-slate-400 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-purple-400 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Taxes */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-purple-400" /> Taxes
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">CGST (%)</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={data.taxes.cgst} onChange={e => updateField('taxes', 'cgst', Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">SGST (%)</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={data.taxes.sgst} onChange={e => updateField('taxes', 'sgst', Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <List className="w-4 h-4 text-purple-400" /> Terms & Conditions
        </h2>
        <div className="space-y-2">
          {data.termsAndConditions.map((term, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs text-slate-500 font-bold mt-2 shrink-0">{i + 1}.</span>
              <input type="text"
                className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-100 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                value={term}
                onChange={e => updateTerm(i, e.target.value)}
                placeholder="Enter term..." />
              <button onClick={() => removeTerm(i)} className="mt-1.5 text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addTerm} className="w-full py-2 border border-dashed border-slate-700 text-slate-400 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-purple-400 transition-colors text-sm">
          <Plus className="w-4 h-4" /> Add Term
        </button>
      </div>

    </div>
  );
}
