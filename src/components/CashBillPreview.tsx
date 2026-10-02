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
              <div>Cell: 93953 17758, 96767 74370</div>
            </div>
          </div>

          {/* Business Banner */}
          <div className="text-center py-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-950 uppercase">
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

            {(data.vehicleNo || data.transactionRef || data.motorDetails) && (
              <div className="pt-2 mt-1 text-[11px] grid grid-cols-12 gap-2 border-t border-slate-200">
                {data.vehicleNo && (
                  <div className="col-span-4 flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">Vehicle No:</span>
                    <span className="font-semibold text-slate-800">{data.vehicleNo}</span>
                  </div>
                )}
                {data.transactionRef && (
                  <div className="col-span-4 flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">Txn/UTR:</span>
                    <span className="font-semibold text-slate-800 font-mono text-[10px]">{data.transactionRef}</span>
                  </div>
                )}
                {data.motorDetails && (
                  <div className="col-span-12 flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 min-w-[70px]">Job/Motor:</span>
                    <span className="font-semibold text-blue-900">{data.motorDetails}</span>
                  </div>
                )}
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
                {Array.from({ length: Math.max(0, 5 - data.items.length) }).map((_, fIdx) => (
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
          <div className="border border-slate-900 bg-slate-50 p-2 rounded-xs text-xs flex items-center justify-between">
            <span className="font-bold text-slate-900">Amount in Words:</span>
            <span className="font-bold italic text-blue-950 text-right">
              {amountInWords}
            </span>
          </div>

          {/* Payment & Bank Details + UPI QR Code Box */}
          {(data.showBankDetails !== false || data.showQrCode !== false) && (
            <div className="border-2 border-slate-900 rounded-sm p-2.5 bg-slate-50/70 grid grid-cols-12 gap-3 text-xs">
              {/* Bank Details */}
              <div className="col-span-7 space-y-1">
                <div className="font-bold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-300 pb-0.5 flex items-center justify-between">
                  <span>Bank Details for NEFT / RTGS / IMPS:</span>
                  <span className="text-[9px] font-mono text-emerald-800 font-semibold bg-emerald-100 px-1 rounded-xs">Verified A/C</span>
                </div>
                <div className="text-[10px] space-y-0.5 pt-0.5 text-slate-800">
                  <div><strong className="text-slate-900">Bank:</strong> STATE BANK OF INDIA (IDA BOLLARAM)</div>
                  <div><strong className="text-slate-900">A/C Name:</strong> POWER LINES ELECTRICAL WORKS</div>
                  <div className="flex gap-4">
                    <span><strong className="text-slate-900">A/C No:</strong> <span className="font-mono font-bold">43335667599</span></span>
                    <span><strong className="text-slate-900">IFSC:</strong> <span className="font-mono font-bold">SBIN0018062</span></span>
                  </div>
                  <div><strong className="text-slate-900">UPI ID:</strong> <span className="font-mono font-bold text-blue-900">gadipallinaveenreddy-3@oksbi</span></div>
                </div>
              </div>

              {/* UPI QR Code */}
              <div className="col-span-5 flex items-center justify-end gap-2 border-l border-slate-300 pl-3">
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-900">Scan to Pay</div>
                  <div className="text-[9px] font-mono text-emerald-700 font-bold">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[8px] text-slate-500 font-medium">GPay • PhonePe • Paytm • BHIM</div>
                </div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=gadipallinaveenreddy-3@oksbi&pn=POWER%20LINES%20ELECTRICAL%20WORKS&am=${grandTotal}&cu=INR`}
                  alt="UPI QR Code"
                  width={68}
                  height={68}
                  style={{ width: '68px', height: '68px', minWidth: '68px', minHeight: '68px' }}
                  className="border border-slate-900 p-0.5 bg-white mix-blend-multiply flex-shrink-0 rounded-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Document Footer: Terms & Dual Signature */}
        <div className="space-y-4 pt-3 border-t-2 border-slate-900 mt-4">
          <div className="grid grid-cols-12 gap-4 items-end">
            {/* Left: Terms & Conditions */}
            <div className="col-span-5 text-[9px] text-slate-700 space-y-1">
              <span className="font-black text-slate-900 uppercase tracking-wider block">
                Terms & Conditions:
              </span>
              <p className="whitespace-pre-line leading-relaxed font-medium">
                {data.notes ||
                  '1. Goods once sold will not be accepted back or exchanged without this original bill.\n2. Warranty on motor rewinding & repairs as per standard terms.\n3. Subject to Sangareddy/Hyderabad jurisdiction.'}
              </p>
            </div>

            {/* Middle: Customer / Receiver's Signature */}
            <div className="col-span-3 text-center space-y-6">
              <div className="text-[9px] text-slate-500 italic">
                Goods/services received in good condition
              </div>
              <div className="pt-2">
                <span className="inline-block border-t border-slate-900 px-3 text-[9px] font-bold text-slate-800 uppercase tracking-wider">
                  Receiver's Signature
                </span>
              </div>
            </div>

            {/* Right: Authorized Signature Stamp Area */}
            <div className="col-span-4 text-right space-y-6">
              <div className="text-[10px] font-black text-slate-900 uppercase">
                For POWER LINES ELECTRICAL WORKS
              </div>
              <div className="pt-4">
                <span className="inline-block border-t border-slate-900 px-6 text-[9px] font-bold text-slate-800 uppercase tracking-widest">
                  Authorised Signatory
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="text-center border-t border-slate-200 pt-1.5 text-[8.5px] font-bold text-slate-500 uppercase tracking-widest">
            Thank you for your business! • This is a Computer Generated Cash Memo / Non-GST Estimate
          </div>
        </div>
      </div>
    </div>
  );
}
