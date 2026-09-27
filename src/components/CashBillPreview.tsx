'use client';

import React from 'react';
import { CashBillData } from '@/types';
import { numberToWords } from '@/utils/numberToWords';

interface Props {
  data: CashBillData;
}

export default function CashBillPreview({ data }: Props) {
  const subtotal = (data.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)),
    0
  );
  const discount = Number(data.discount || 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const amountInWords = numberToWords(grandTotal);

  return (
    <div id="pdf-wrapper" className="w-full flex justify-center">
      <div
        id="cb-capture-area"
        className="w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-10 flex flex-col justify-between shadow-2xl relative font-sans print:shadow-none print:p-6 print:m-0"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Document Header */}
        <div className="space-y-3">
          {/* Top Title & Phone Numbers */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block bg-slate-900 text-white text-[11px] font-black tracking-widest px-3 py-1 uppercase rounded-sm">
                CASH BILL / CASH MEMO
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                NON-GST
              </span>
            </div>
            <div className="text-right text-[11px] font-bold text-slate-800 leading-tight">
              <div>Cell: 93953 17758</div>
              <div>: 96767 74370</div>
            </div>
          </div>

          {/* Business Banner */}
          <div className="text-center py-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-950 uppercase font-serif">
              POWER LINES ELECTRICAL WORKS
            </h1>
            <p className="text-[11px] font-semibold text-slate-700 mt-1">
              I.D.A. Bollaram Village, Jinnaram Mdl., Sanga Reddy District - 502 325, Telangana
            </p>
            <p className="text-[10px] font-bold text-slate-600 italic mt-0.5">
              Spl. in: Rewinding of A.C. & D.C. Motors, Generators, Transformers, Electrical Panel Boards, Erection Works & Industrial Maintenance
            </p>
          </div>

          {/* Reference & Customer Grid */}
          <div className="border-2 border-slate-900 rounded-sm p-3 text-xs space-y-2 bg-slate-50/50">
            {/* Row 1: Bill No & Date */}
            <div className="grid grid-cols-12 gap-2 border-b border-slate-300 pb-2">
              <div className="col-span-6 flex items-center gap-1.5">
                <span className="font-bold text-slate-900 min-w-[50px]">Bill No:</span>
                <span className="font-black text-blue-900 text-sm">{data.billNo || 'PLEW-CB-00001'}</span>
              </div>
              <div className="col-span-6 flex items-center gap-1.5 justify-end">
                <span className="font-bold text-slate-900">Date:</span>
                <span className="font-bold border-b border-slate-400 px-2">{data.billDate || '........................'}</span>
              </div>
            </div>

            {/* Row 2: Customer Name & Phone */}
            <div className="grid grid-cols-12 gap-2 border-b border-slate-300 pb-2">
              <div className="col-span-7 flex items-start gap-1.5">
                <span className="font-bold text-slate-900 min-w-[70px]">M/s / To:</span>
                <span className="font-bold text-slate-900 text-sm leading-tight">
                  {data.customerName || '...........................................................................'}
                </span>
              </div>
              <div className="col-span-5 flex items-center gap-1.5 justify-end">
                <span className="font-bold text-slate-900">Phone:</span>
                <span className="font-semibold text-slate-800">{data.customerPhone || '...........................'}</span>
              </div>
            </div>

            {/* Row 3: Address & Payment Details */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 flex items-start gap-1.5">
                <span className="font-bold text-slate-900 min-w-[70px]">Address:</span>
                <span className="font-semibold text-slate-700 leading-tight">
                  {data.customerAddress || '...........................................................................'}
                </span>
              </div>
              <div className="col-span-3 flex items-center gap-1.5 justify-end">
                <span className="font-bold text-slate-900">Mode:</span>
                <span className="font-bold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-xs text-[10px]">
                  {data.paymentMode || 'Cash'}
                </span>
              </div>
              <div className="col-span-3 flex items-center gap-1.5 justify-end">
                <span className="font-bold text-slate-900">Status:</span>
                <span className={`font-black px-2 py-0.5 rounded-xs text-[10px] uppercase tracking-wider ${data.paymentStatus === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                  {data.paymentStatus || 'Paid'}
                </span>
              </div>
            </div>

            {data.vehicleNo && (
              <div className="pt-1 text-[11px] flex items-center gap-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Vehicle No:</span>
                <span className="font-semibold text-slate-800">{data.vehicleNo}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="border-2 border-slate-900 rounded-sm overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-center">
                  <th className="border-r border-slate-700 p-2 w-10">S.No</th>
                  <th className="border-r border-slate-700 p-2 text-left">Description of Goods / Services</th>
                  <th className="border-r border-slate-700 p-2 w-16">Qty</th>
                  <th className="border-r border-slate-700 p-2 w-16">Unit</th>
                  <th className="border-r border-slate-700 p-2 w-24 text-right">Rate (₹)</th>
                  <th className="p-2 w-28 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {data.items.map((item, idx) => {
                  const lineTotal = item.amount || (Number(item.quantity || 0) * Number(item.rate || 0));
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="border-r border-slate-300 p-2 text-center font-bold text-slate-700">
                        {idx + 1}
                      </td>
                      <td className="border-r border-slate-300 p-2 font-medium text-slate-900">
                        {item.description || '—'}
                      </td>
                      <td className="border-r border-slate-300 p-2 text-center font-bold text-slate-800">
                        {item.quantity || 1}
                      </td>
                      <td className="border-r border-slate-300 p-2 text-center font-semibold text-slate-600">
                        {item.unit || 'NOS'}
                      </td>
                      <td className="border-r border-slate-300 p-2 text-right font-semibold text-slate-800">
                        {Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-bold text-slate-900">
                        {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}

                {/* Blank Filler Rows for Professional Full A4 Print Look */}
                {Array.from({ length: Math.max(0, 6 - data.items.length) }).map((_, fIdx) => (
                  <tr key={`filler-${fIdx}`} className="h-8">
                    <td className="border-r border-slate-300 p-2"></td>
                    <td className="border-r border-slate-300 p-2"></td>
                    <td className="border-r border-slate-300 p-2"></td>
                    <td className="border-r border-slate-300 p-2"></td>
                    <td className="border-r border-slate-300 p-2"></td>
                    <td className="p-2"></td>
                  </tr>
                ))}
              </tbody>

              {/* Totals Section */}
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold">
                  <td colSpan={4} className="border-r border-slate-300 p-2 text-right font-semibold text-slate-700">
                    Subtotal:
                  </td>
                  <td colSpan={2} className="p-2 text-right text-slate-900">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {discount > 0 && (
                  <tr className="border-t border-slate-300 bg-slate-50 font-bold text-slate-600">
                    <td colSpan={4} className="border-r border-slate-300 p-2 text-right font-semibold">
                      Discount:
                    </td>
                    <td colSpan={2} className="p-2 text-right text-red-700">
                      - ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                <tr className="border-t-2 border-slate-900 bg-slate-900 text-white font-black text-sm">
                  <td colSpan={4} className="border-r border-slate-700 p-2.5 text-right uppercase tracking-wider">
                    Total Amount Payable:
                  </td>
                  <td colSpan={2} className="p-2.5 text-right text-base text-amber-300">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount In Words Banner */}
          <div className="border border-slate-900 bg-slate-50 p-2.5 rounded-xs text-xs flex items-center justify-between">
            <span className="font-bold text-slate-900">Amount in Words:</span>
            <span className="font-bold italic text-blue-950 text-right">
              {amountInWords}
            </span>
          </div>
        </div>

        {/* Document Footer: Terms & Signature */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-900 mt-6">
          <div className="grid grid-cols-12 gap-4 items-end">
            {/* Left: Terms & Conditions */}
            <div className="col-span-7 text-[10px] text-slate-700 space-y-1">
              <span className="font-black text-slate-900 uppercase tracking-wider block">
                Terms & Conditions:
              </span>
              <p className="whitespace-pre-line leading-relaxed font-medium">
                {data.notes ||
                  '1. Goods once sold will not be accepted back or exchanged without this original bill.\n2. Warranty on motor rewinding & repairs as per agreed company terms.\n3. Subject to Sangareddy/Hyderabad jurisdiction.'}
              </p>
            </div>

            {/* Right: Authorized Signature Stamp Area */}
            <div className="col-span-5 text-right space-y-8">
              <div className="text-[11px] font-black text-slate-900 uppercase">
                For POWER LINES ELECTRICAL WORKS
              </div>
              <div className="pt-6">
                <span className="inline-block border-t border-slate-900 px-8 text-[10px] font-bold text-slate-800 uppercase tracking-widest">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="text-center border-t border-slate-200 pt-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Thank you for your business! • This is a Cash Memo / Non-GST Estimate Bill
          </div>
        </div>
      </div>
    </div>
  );
}
