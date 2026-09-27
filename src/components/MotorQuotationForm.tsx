'use client';

import { MotorQuotationData } from '@/types';
import { Percent, Building2, MapPin, ListPlus, X, Hash, Calendar, ShieldCheck, Truck, CreditCard, Clock } from 'lucide-react';

interface MotorQuotationFormProps {
  data: MotorQuotationData;
  onChange: (data: MotorQuotationData) => void;
}

export default function MotorQuotationForm({ data, onChange }: MotorQuotationFormProps) {
  const handleTcChange = (index: number, value: string) => {
    const newTc = [...data.termsAndConditions];
    newTc[index] = value;
    onChange({ ...data, termsAndConditions: newTc });
  };

  const addTc = () => {
    onChange({ ...data, termsAndConditions: [...data.termsAndConditions, ''] });
  };

  const removeTc = (index: number) => {
    const newTc = data.termsAndConditions.filter((_, i) => i !== index);
    onChange({ ...data, termsAndConditions: newTc });
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-24">
      
      {/* Configuration Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Global Rate Adjustment</h2>
        </div>
        
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm group hover:border-amber-500/30 transition-all">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-amber-500/80 uppercase tracking-widest mb-2 px-1">Percentage Increase</label>
              <div className="relative">
                <input
                  type="number"
                  value={data.percentageIncrease}
                  onChange={(e) => onChange({ ...data, percentageIncrease: Number(e.target.value) })}
                  className="w-full bg-slate-950/50 border border-slate-800/80 rounded-lg pl-4 pr-12 py-3 text-lg font-black text-amber-500 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 outline-none transition-all placeholder:text-slate-800"
                  placeholder="0"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black text-amber-600">%</div>
              </div>
            </div>
            
            <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/10">
                <p className="text-[10px] text-amber-200/60 font-medium leading-relaxed italic">
                  * All motor rewinding rates in the preview will be recalculated instantly using this factor.
                </p>
            </div>
          </div>
        </div>
      </section>

      {/* Document Details Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Hash className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Document Information</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Quote #</label>
            <div className="relative group">
               <input
                type="text"
                value={data.quotationNo}
                onChange={(e) => onChange({ ...data, quotationNo: e.target.value })}
                className="w-full bg-slate-900/40 border border-slate-800/80 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-slate-700 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Date</label>
            <div className="relative group">
               <input
                  type="date"
                  value={data.quotationDate}
                  onChange={(e) => onChange({ ...data, quotationDate: e.target.value })}
                  className="w-full bg-slate-900/40 border border-slate-800/80 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-slate-700 outline-none transition-all"
                />
                <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-600 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Recipient Details Section */}
      <section className="space-y-4 pt-2">
         <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">Customer Details</h2>
        </div>

        <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Customer Company Name</label>
              <input
                type="text"
                value={data.companyName}
                onChange={(e) => onChange({ ...data, companyName: e.target.value })}
                className="w-full bg-slate-950/30 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all"
                placeholder="e.g. Acme Industries Ltd"
              />
          </div>
          <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Office Address</label>
              <textarea
                value={data.companyAddress}
                onChange={(e) => onChange({ ...data, companyAddress: e.target.value })}
                rows={3}
                className="w-full bg-slate-950/30 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all resize-none italic"
                placeholder="Full address of the recipient..."
              />
          </div>
        </div>
      </section>

      {/* Terms Section */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-100">Provisions & Terms</h2>
          </div>
          <button
            onClick={addTc}
            className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 transition-colors bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20"
          >
            Add New Term
          </button>
        </div>

        <div className="space-y-3">
          {data.termsAndConditions.map((tc, index) => (
            <div key={index} className="flex gap-3 group relative">
              <div className="flex flex-col items-center gap-1 mt-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-amber-500 transition-colors" />
                 <div className="w-px h-full bg-slate-800 group-last:bg-transparent" />
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={tc}
                  onChange={(e) => handleTcChange(index, e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900/30 border border-slate-800/50 rounded-lg px-4 py-2.5 text-[13px] text-slate-400 focus:text-slate-200 focus:bg-slate-900 focus:border-amber-500/50 outline-none transition-all resize-none shadow-inner"
                />
                <button
                  onClick={() => removeTc(index)}
                  className="absolute -right-2 -top-2 w-6 h-6 bg-red-900/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 active:scale-95"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
