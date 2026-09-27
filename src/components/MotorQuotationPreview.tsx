'use client';

import { MotorQuotationData } from '@/types';
import { motorRates } from '@/data/motor-rates';
import React from 'react';

interface MotorQuotationPreviewProps {
  data: MotorQuotationData;
}

export default function MotorQuotationPreview({ data }: MotorQuotationPreviewProps) {
  const calculateRate = (baseRate: number) => {
    if (baseRate === 0) return 0;
    const increase = (baseRate * data.percentageIncrease) / 100;
    return Math.round(baseRate + increase);
  };

  const formattedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-[210mm] shrink-0 mx-auto relative text-black bg-white pb-6 print:pb-0" id="pdf-wrapper" style={{padding:"10px", fontFamily: "Arial, Helvetica, sans-serif"}}>
      <div 
        id="quotation-capture-area" 
        className="w-full text-left border border-black border-collapse bg-white flex flex-col text-[11px] border-t-[8px] border-t-amber-600 relative overflow-hidden" 
        style={{ color: "black", minHeight: "297mm" }}
      >
        {/* Top Tag */}
        <div className="absolute top-2 left-6 text-xl text-black font-semibold flex gap-2">
          <span>MOTOR QUOTATION</span>
          <span className="border border-amber-300 text-amber-600 px-1.5 rounded-sm text-[10px] font-bold">PRICE LIST</span>
        </div>

        <div className="px-6 pt-12 pb-0 flex flex-col w-full h-full align-top">
          {/* Company Header */}
          <div className="flex border-b border-black">
            <div className="flex-1 p-3">
              <h1 className="font-bold text-sm tracking-tight">POWER LINES ELECTRICAL WORKS</h1>
              <div className="flex text-[10px] mt-0.5">
                <span className="font-medium mr-1 text-slate-500 italic">Address:</span>
                <span className="font-medium">FLAT NO.13-178, NEAR BALAJI HOTEL, HYDERABAD, SANGAREDDY, TELANGANA-502325</span>
              </div>
            </div>
            <div className="p-3 border-l border-black bg-slate-50/50 w-1/3">
              <div className="grid grid-cols-[50px_1fr] gap-x-1 text-[10px]">
                <span className="font-medium text-slate-500">GSTIN</span><span className="font-bold">36PBJPK1510A1ZZ</span>
                <span className="font-medium text-slate-500">Mobile</span><span className="font-bold">9676774370</span>
                <span className="font-medium text-slate-500">PAN</span><span className="font-bold">PBJPK1510A</span>
                <span className="font-medium text-slate-500 leading-tight pt-0.5">Email</span><span className="break-all leading-tight font-medium">gsaireddy.powerlineselectrical@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Quotation Meta */}
          <div className="flex border-b border-black text-center divide-x divide-black bg-amber-50/40">
            <div className="flex-1 p-2">
              <div className="font-bold text-[9px] uppercase pb-0.5 text-amber-800">Quotation No.</div>
              <div className="text-sm font-bold tracking-tight">{data.quotationNo}</div>
            </div>
            <div className="flex-1 p-2 border-r border-black">
              <div className="font-bold text-[9px] uppercase pb-0.5 text-amber-800">Date</div>
              <div className="text-sm font-bold">{data.quotationDate.split('-').reverse().join('/')}</div>
            </div>
            {/* <div className="flex-1 p-2">
                <div className="font-bold text-[9px] uppercase pb-0.5 text-amber-800">Rate Increase</div>
                <div className="text-sm font-bold text-amber-700">{data.percentageIncrease}%</div>
            </div> */}
          </div>

          {/* Target Customer Info */}
           <div className="px-5 py-4 border-b border-black flex gap-10">
                <div className="flex-1">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 underline decoration-amber-500 decoration-2 underline-offset-4">To Company</div>
                    <div className="font-black text-xs uppercase leading-tight mb-1">{data.companyName}</div>
                    <div className="text-[10px] text-slate-700 leading-snug italic whitespace-pre-wrap">{data.companyAddress}</div>
                </div>
           </div>

          {/* Table Body Area */}
          <div className="flex-1">
            <div className="bg-slate-900 text-white text-[10px] font-black py-2 px-3 flex justify-between uppercase tracking-widest print:bg-black">
                <span>Motor Rewinding Charges</span>
                <span>Rates in INR (₹)</span>
            </div>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-amber-50/50 border-b border-black text-[10px] font-bold">
                        <th className="p-2 border-r border-black w-12 text-center">S.NO.</th>
                        <th className="p-2 border-r border-black text-left pl-4">CAPACITY (HP)</th>
                        <th className="p-2 border-r border-black w-32 text-right pr-4">1440/2880 RPM</th>
                        <th className="p-2 w-32 text-right pr-4">960 RPM</th>
                    </tr>
                </thead>
                <tbody>
                    {motorRates.map((motor, index) => {
                        const r1440 = calculateRate(motor.rpm1440);
                        const r960 = calculateRate(motor.rpm960);
                        return (
                            <tr key={index} className={`border-b border-black/5 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                <td className="p-1.5 border-r border-black text-center text-slate-500 font-medium">{index + 1}</td>
                                <td className="p-1.5 border-r border-black pl-4 font-black text-slate-900">{motor.hp}</td>
                                <td className="p-1.5 border-r border-black text-right pr-4 font-bold text-slate-800">
                                    {r1440 > 0 ? `₹ ${r1440.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="p-1.5 text-right pr-4 font-bold text-slate-800">
                                    {r960 > 0 ? `₹ ${r960.toLocaleString('en-IN')}` : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
          </div>

          {/* Footer Area */}
          <div className="mt-auto border-t-2 border-black">
              {/* Terms and Conditions */}
              {data.termsAndConditions.length > 0 && (
                <div className="px-5 py-4 border-b border-black bg-slate-50/30">
                  <div className="font-black text-[9px] uppercase mb-2 text-slate-500 tracking-widest leading-none">Terms & Conditions</div>
                  <ol className="list-decimal list-inside space-y-1">
                    {data.termsAndConditions.filter(t => t.trim() !== '').map((term, i) => (
                      <li key={i} className="text-[10px] text-slate-700 font-medium leading-tight">{term}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Bottom Signature Area */}
              <div className="flex justify-between items-end p-5 pt-8 pb-8">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
                  * All prices are subject to GST extra as applicable.
                </div>
                <div className="text-center">
                  <div className="border-t border-black w-48 mb-1.5"></div>
                  <div className="text-[10px] font-black text-slate-900 uppercase">Authorised Signatory</div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase">POWER LINES ELECTRICAL WORKS</div>
                </div>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
}
