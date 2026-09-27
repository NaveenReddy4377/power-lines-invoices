'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CashBillData, CashBillItem, Client, InventoryItem } from '@/types';
import { Plus, Trash2, User, Phone, MapPin, IndianRupee, CreditCard, CheckCircle2, Search, FileText, ArrowRight } from 'lucide-react';
import { getClients, getInventory } from '@/app/actions';

interface Props {
  data: CashBillData;
  onChange: (data: CashBillData) => void;
  onLoad?: (billNo: string) => void;
  isLoading?: boolean;
}

export default function CashBillForm({ data, onChange, onLoad, isLoading }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState(data.customerName || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadBillInput, setLoadBillInput] = useState(data.billNo || '');

  useEffect(() => {
    getClients().then(setClients).catch(() => {});
    getInventory().then(setInventory).catch(() => {});
  }, []);

  useEffect(() => {
    setSearchTerm(data.customerName || '');
  }, [data.customerName]);

  useEffect(() => {
    setLoadBillInput(data.billNo || '');
  }, [data.billNo]);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  ).slice(0, 8);

  const selectClient = (client: Client) => {
    setSearchTerm(client.name);
    onChange({
      ...data,
      customerName: client.name,
      customerPhone: client.phone || data.customerPhone,
      customerAddress: client.address || data.customerAddress
    });
    setShowDropdown(false);
  };

  const handleAddItem = () => {
    const newItem: CashBillItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      amount: 0
    };
    onChange({
      ...data,
      items: [...data.items, newItem]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (data.items.length <= 1) return;
    const next = [...data.items];
    next.splice(index, 1);
    onChange({ ...data, items: next });
  };

  const handleItemChange = (index: number, field: keyof CashBillItem, value: any) => {
    const next = [...data.items];
    const current = { ...next[index], [field]: value };

    if (field === 'quantity' || field === 'rate') {
      const q = field === 'quantity' ? parseFloat(value) || 0 : current.quantity;
      const r = field === 'rate' ? parseFloat(value) || 0 : current.rate;
      current.amount = Math.round(q * r * 100) / 100;
    }

    next[index] = current;
    onChange({ ...data, items: next });
  };

  const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
  const grandTotal = Math.max(0, subtotal - (Number(data.discount) || 0));

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner: Non-GST Cash Bill Indicator */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider">Cash Bill / Cash Memo (Non-GST)</span>
            <p className="text-[11px] text-emerald-400/80">Zero GST (0% Tax) • Clean Cash/Counter Sales Bill</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">Payable Amount</span>
          <p className="text-base font-black text-emerald-400">₹{grandTotal.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Bill Reference & Payment Details */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <FileText className="w-4 h-4" /> Bill & Payment Details
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Bill No with Load Button */}
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Bill Number
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={loadBillInput}
                onChange={(e) => {
                  setLoadBillInput(e.target.value);
                  onChange({ ...data, billNo: e.target.value });
                }}
                placeholder="e.g. PLEW-CB-00001"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 focus:outline-hidden focus:border-amber-500"
              />
              {onLoad && (
                <button
                  type="button"
                  onClick={() => onLoad(loadBillInput)}
                  disabled={isLoading}
                  title="Load Bill by Number"
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  Load
                </button>
              )}
            </div>
          </div>

          {/* Bill Date */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Date
            </label>
            <input
              type="date"
              value={data.billDate}
              onChange={(e) => onChange({ ...data, billDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Payment Mode
            </label>
            <select
              value={data.paymentMode}
              onChange={(e) => onChange({ ...data, paymentMode: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-emerald-400 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="Cash">💵 Cash</option>
              <option value="UPI">📱 UPI / GPay / PhonePe</option>
              <option value="Bank Transfer">🏦 Bank Transfer (NEFT/IMPS)</option>
              <option value="Cheque">📜 Cheque</option>
            </select>
          </div>
        </div>

        {/* Payment Status & Vehicle No */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Payment Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...data, paymentStatus: 'Paid', status: 'Paid' })}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  data.paymentStatus === 'Paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                ✓ PAID
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...data, paymentStatus: 'Pending', status: 'Pending' })}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  data.paymentStatus === 'Pending'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-xs'
                    : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                }`}
              >
                ⏳ PENDING
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Vehicle / Reference No (Optional)
            </label>
            <input
              type="text"
              value={data.vehicleNo || ''}
              onChange={(e) => onChange({ ...data, vehicleNo: e.target.value })}
              placeholder="e.g. TS 08 AB 1234"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Customer Information with CRM Autocomplete */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3 relative">
        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <User className="w-4 h-4" /> Customer Details
        </h4>

        <div className="relative">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Customer Name / Party Name *
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onChange({ ...data, customerName: e.target.value });
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type customer name or select from CRM..."
              className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-semibold focus:outline-hidden focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* CRM Suggestions Dropdown */}
          {showDropdown && filteredClients.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
              <div className="p-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 block">
                  CRM Client Matches
                </span>
                {filteredClients.map((client) => (
                  <button
                    key={client.id || client.name}
                    type="button"
                    onClick={() => selectClient(client)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-amber-400">{client.name}</span>
                      {client.phone && <span className="text-[11px] text-slate-400 ml-2">📞 {client.phone}</span>}
                    </div>
                    {client.address && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{client.address}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Phone / Mobile Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={data.customerPhone || ''}
                onChange={(e) => onChange({ ...data, customerPhone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Address / Town
            </label>
            <div className="relative">
              <input
                type="text"
                value={data.customerAddress || ''}
                onChange={(e) => onChange({ ...data, customerAddress: e.target.value })}
                placeholder="e.g. Balanagar, Hyderabad"
                className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
              <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <IndianRupee className="w-4 h-4" /> Items / Services Billed ({data.items.length})
          </h4>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="space-y-2.5">
          {data.items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 group hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Item #{idx + 1}
                </span>
                {data.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Remove Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2">
                {/* Description */}
                <div className="col-span-12 sm:col-span-6">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Description (e.g. 5 HP Motor Rewinding / Copper Wire / Bearing replacement)"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Qty */}
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.quantity || ''}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 text-center focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                {/* Unit */}
                <div className="col-span-4 sm:col-span-2">
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="NOS">NOS</option>
                    <option value="SET">SET</option>
                    <option value="EA">EA</option>
                    <option value="MTR">MTR</option>
                    <option value="KG">KG</option>
                    <option value="PKT">PKT</option>
                    <option value="LOT">LOT</option>
                  </select>
                </div>

                {/* Rate */}
                <div className="col-span-4 sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.rate || ''}
                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                    placeholder="Rate (₹)"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-emerald-400 text-right focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Line Amount Preview */}
              <div className="text-right text-[11px] font-bold text-slate-400">
                Line Total: <span className="text-slate-100">₹{(item.amount || (item.quantity * item.rate) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bill Calculation & Notes */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> Calculations & Terms
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Notes / Terms */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Terms / Notes on Bill
            </label>
            <textarea
              rows={3}
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-hidden focus:border-amber-500 resize-none"
            />
          </div>

          {/* Totals Breakdown */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={data.discount || ''}
                onChange={(e) => onChange({ ...data, discount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-right text-amber-400 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex justify-between text-xs text-emerald-400">
              <span>GST Tax (0%):</span>
              <span className="font-bold">₹0.00 (Exempt/Cash Bill)</span>
            </div>

            <div className="border-t border-slate-800 pt-2 flex justify-between items-baseline">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">Grand Total:</span>
              <span className="text-lg font-black text-amber-400">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
