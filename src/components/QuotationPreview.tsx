'use client';

import React from 'react';
import { QuotationData } from '@/types';
import { numberToWords } from '@/utils/numberToWords';
import { Black_And_White_Picture } from 'next/font/google';

export default function QuotationPreview({ data }: { data: QuotationData }) {
  const itemsWithTots = data.items.map(item => {
    let tot = item.quantity * item.price;
    let discAmt = 0;
    if (item.discount > 0) {
      if (item.discountType === 'percentage') {
        discAmt = tot * (item.discount / 100);
      } else {
        discAmt = item.discount;
      }
    }
    return { ...item, total: tot - discAmt };
  });

  const sumTotal = itemsWithTots.reduce((a, b) => a + b.total, 0);
  const sumQty = data.items.reduce((a, b) => a + b.quantity, 0);
  const cgstAmt = Number((sumTotal * (data.taxes.cgst / 100)).toFixed(2));
  const sgstAmt = Number((sumTotal * (data.taxes.sgst / 100)).toFixed(2));
  const grandTotal = sumTotal + cgstAmt + sgstAmt;
  const words = numberToWords(grandTotal);

  return (
    <div className="w-[210mm] shrink-0 mx-auto relative text-black bg-white pb-6 print:pb-0" id="pdf-wrapper" style={{padding:"10px", fontFamily: '"Roboto", sans-serif'}}>
      <table id="quotation-capture-area" className="w-full text-left border border-black border-collapse bg-white shadow-2xl flex-1 text-[11px] border-t-[8px] border-t-purple-600 relative" style={{ color: "black" }} >
        <thead className="bg-white">
          {/* Master Header Row - Prints on every page */}
          <tr>
            <th colSpan={6} className="p-0 border-0 font-normal m-0 relative align-top">
              {/* Top Tag */}
              <div className="absolute top-2 left-6 text-xl text-black font-semibold flex gap-2">
                <span>QUOTATION</span>
                <span className="border border-slate-300 text-slate-500 px-1 rounded-sm text-[10px]">FOR APPROVAL</span>
              </div>

              <div className="px-6 pt-12 pb-0 flex flex-col w-full h-full align-top">
                {/* Company Header */}
                <div className="flex border-b border-black">
                  <div className="flex-1 p-3">
                    <h1 className="font-bold text-sm">POWER LINES ELECTRICAL WORKS</h1>
                    <div className="flex text-[10px] mt-0.5">
                      <span className="font-medium mr-1">Address</span>
                      <span>FLAT NO.13-178, NEAR BALAJI HOTEL, HYDERABAD, SANGAREDDY, TELANGANA-502325</span>
                    </div>
                  </div>
                  <div className="p-3 border-l border-black bg-slate-50/50 w-1/3">
                    <div className="grid grid-cols-[50px_1fr] gap-x-1 text-[10px]">
                      <span className="font-medium">GSTIN</span><span>36PBJPK1510A1ZZ</span>
                      <span className="font-medium">Mobile</span><span>9676774370</span>
                      <span className="font-medium">PAN</span><span>PBJPK1510A</span>
                      <span className="font-medium">Email</span><span className="break-all leading-tight">gsaireddy.powerlineselectrical@gmail.com</span>
                    </div>
                  </div>
                </div>

                {/* Quotation Meta */}
                <div className="flex border-b border-black text-center divide-x divide-black bg-purple-50/40">
                  <div className="flex-1 p-2">
                    <div className="font-bold text-[10px] uppercase pb-1">Quotation No.</div>
                    <div className="text-sm font-semibold">{data.quotationNo}</div>
                  </div>
                  <div className="flex-1 p-2">
                    <div className="font-bold text-[10px] uppercase pb-1">Date</div>
                    <div className="text-sm">{data.quotationDate.split('-').reverse().join('/')}</div>
                  </div>
                  <div className="flex-1 p-2">
                    <div className="font-bold text-[10px] uppercase pb-1">Valid Until</div>
                    <div className="text-sm">{data.validUntil.split('-').reverse().join('/')}</div>
                  </div>
                  {data.rgpNumber && (
                    <div className="flex-1 p-2">
                      <div className="font-bold text-[10px] uppercase pb-1">RGP / Gatepass No.</div>
                      <div className="text-sm font-semibold">{data.rgpNumber}</div>
                    </div>
                  )}
                  {data.rgpDate && (
                    <div className="flex-1 p-2">
                      <div className="font-bold text-[10px] uppercase pb-1">RGP Date</div>
                      <div className="text-sm">{data.rgpDate.split('-').reverse().join('/')}</div>
                    </div>
                  )}
                </div>

                {/* Subject */}
                {data.subject && (
                  <div className="px-3 py-2 border-b border-black bg-slate-50/30 text-[10px]">
                    <span className="font-bold">Subject: </span>{data.subject}
                  </div>
                )}

                {/* Parties */}
                <div className="flex border-b border-black" style={{ minHeight: '80px' }}>
                  <div className="flex-1 p-3">
                    <div className="text-[10px] text-slate-500 mb-1">QUOTATION FOR</div>
                    <div className="font-bold text-xs uppercase">{data.billTo.name || '—'}</div>
                    {data.billTo.address && <div className="text-[10px] mt-1">{data.billTo.address}</div>}
                    {data.billTo.gstin && <div className="text-[10px] mt-0.5">GSTIN: {data.billTo.gstin}</div>}
                    <div className="text-[10px] mt-0.5">Place of Supply: {data.billTo.placeOfSupply}</div>
                  </div>
                </div>
              </div>
            </th>
          </tr>

          {/* Table Header Columns */}
          <tr className="bg-purple-50/40 font-semibold border-b border-black text-center text-[10px] break-inside-avoid">
            <th className="p-2 border-r border-black w-10 font-semibold border-l-0">No.</th>
            <th className="p-2 border-r border-black font-semibold">Description</th>
            <th className="p-2 border-r border-black w-16 font-semibold">HSN</th>
            <th className="p-2 border-r border-black w-20 font-semibold">Qty</th>
            <th className="p-2 border-r border-black w-24 font-semibold">Rate (₹)</th>
            <th className="p-2 w-24 font-semibold border-r-0">Amount (₹)</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {itemsWithTots.map((it, i) => (
            <tr key={i} className="break-inside-avoid">
              <td className="p-1.5 border-r border-black text-center align-top">{i + 1}</td>
              <td className="p-1.5 border-r border-black font-medium align-top">{it.name}</td>
              <td className="p-1.5 border-r border-black text-center align-top">{it.hsn || '-'}</td>
              <td className="p-1.5 border-r border-black text-right align-top break-keep">{it.quantity} {it.quantityUnit}</td>
              <td className="p-1.5 border-r border-black text-right align-top">{it.price.toLocaleString('en-IN')}</td>
              <td className="p-1.5 text-right font-medium align-top">{it.total.toLocaleString('en-IN')}</td>
            </tr>
          ))}

          {/* Empty filler space to push GST to bottom if needed, or just let it stack */}
          <tr>
            <td className="border-r border-black min-h-[40px]"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td></td>
          </tr>

          {/* GST Rows directly appended at the end of the items */}
          <tr className="break-inside-avoid">
            <td className="p-1.5 border-r border-black text-center"></td>
            <td className="p-1.5 border-r border-black text-right font-medium italic text-slate-500 pr-4">CGST @{data.taxes.cgst}%</td>
            <td className="p-1.5 border-r border-black text-center">-</td>
            <td className="p-1.5 border-r border-black text-right"></td>
            <td className="p-1.5 border-r border-black text-right"></td>
            <td className="p-1.5 text-right font-medium">₹ {cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr className="break-inside-avoid border-b border-black">
            <td className="p-1.5 border-r border-black text-center pb-3"></td>
            <td className="p-1.5 border-r border-black text-right font-medium italic text-slate-500 pr-4 pb-3">SGST @{data.taxes.sgst}%</td>
            <td className="p-1.5 border-r border-black text-center pb-3">-</td>
            <td className="p-1.5 border-r border-black text-right pb-3"></td>
            <td className="p-1.5 border-r border-black text-right pb-3"></td>
            <td className="p-1.5 text-right font-medium pb-3">₹ {sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr className="break-inside-avoid">
            <td colSpan={6} className="p-0 border-t border-black">
              {/* Total Row */}
              <div className="flex border-b border-black bg-purple-50/40 font-black">
                <div className="flex-1 p-1 text-center">TOTAL</div>
                <div className="w-20 border-l border-black p-1 text-right">{sumQty}</div>
                <div className="w-24 border-l border-black p-1"></div>
                <div className="w-24 border-l border-black p-1 px-2 text-right">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              {/* Amount in words */}
              <div className="p-2 border-b border-black">
                <div className="text-[10px] text-slate-500">Total Amount (in words)</div>
                <div className="font-semibold text-[11px]">{words}</div>
              </div>

              {/* Terms & Conditions */}
              {data.termsAndConditions.length > 0 && (
                <div className="p-3 border-b border-black">
                  <div className="font-bold text-[10px] uppercase mb-2 text-slate-700">Terms & Conditions</div>
                  <ol className="list-decimal list-inside space-y-1">
                    {data.termsAndConditions.map((term, i) => (
                      <li key={i} className="text-[10px] text-slate-700">{term}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Signature */}
              <div className="flex justify-end p-4 pt-10 pb-6">
                <div className="text-center">
                  <div className="border-t border-black w-40 mb-1"></div>
                  <div className="text-[10px] font-bold">Authorised Signatory</div>
                  <div className="text-[10px] text-slate-500">POWER LINES ELECTRICAL WORKS</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
