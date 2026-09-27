'use client';

import React from 'react';
import { InvoiceData } from '@/types';
import { numberToWords } from '@/utils/numberToWords';

export default function InvoicePreview({ data }: { data: InvoiceData }) {

  // Calculations
  const itemsWithTots = data.items.map(item => {
    let tot = item.quantity * item.price;
    let discAmt = 0;
    let discStr = `0(0%)`;
    if (item.discount > 0) {
      if (item.discountType === 'percentage') {
        discAmt = tot * (item.discount / 100);
        discStr = `${discAmt}(${item.discount}%)`;
      } else {
        discAmt = item.discount;
        discStr = `${discAmt}`;
      }
    }
    return { ...item, total: tot - discAmt, discStr };
  });

  const sumTotal = itemsWithTots.reduce((a, b) => a + b.total, 0);
  const sumQty = data.items.reduce((a, b) => a + b.quantity, 0);
  const sumDiscount = itemsWithTots.reduce((sum, item) => sum + (item.quantity * item.price - item.total), 0);

  const cgstRate = data.taxes?.cgst || 0;
  const sgstRate = data.taxes?.sgst || 0;
  const cgstAmt = Number((sumTotal * (cgstRate / 100)).toFixed(2));
  const sgstAmt = Number((sumTotal * (sgstRate / 100)).toFixed(2));

  const grandTotal = sumTotal + cgstAmt + sgstAmt;
  const words = numberToWords(grandTotal);

  return (
    <div className="w-[210mm] shrink-0 mx-auto relative text-black bg-white pb-6 print:pb-0 font-sans" id="pdf-wrapper" style={{padding:"10px", fontFamily: "Arial, Helvetica, sans-serif"}}>
      
      {/* Top Header Row (Outside the main border box) */}
      <div className="flex justify-between items-end pb-2 px-1">
        <div className="flex items-end gap-2">
          <span className="text-sm font-semibold">TAX INVOICE</span>
          <span className="border border-slate-400 text-slate-500 px-1 py-0.5 text-[9px]">ORIGINAL FOR RECIPIENT</span>
        </div>
      </div>

      {/* Protective outer wrapper for guaranteed borders */}
      <div className="border-[2px] border-black w-full relative">
        <table id="invoice-capture-area" className="w-full text-left border-collapse bg-white text-[11px] relative">
        <thead className="bg-white">
          {/* Master Header Row - Prints on every page */}
          <tr>
            <th colSpan={7} className="p-0 border-b border-black font-normal m-0 align-top">
              <div className="flex flex-col w-full align-top">
                
                {/* Company Header */}
                <div className="flex border-b border-black h-24">
                  <div className="w-1/4 p-4 flex items-center justify-center border-r border-black/10">
                    <div className="flex items-center justify-center p-2 w-full h-full">
                     <img src="/plew-logo.jpg" alt="Power Lines Logo" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                  <div className="flex-1 p-3 text-center">
                    <h1 className="font-bold text-base mt-2">POWER LINES ELECTRICAL WORKS</h1>
                    <div className="text-[10px] flex justify-center mt-1 leading-tight text-left max-w-[350px] mx-auto">
                      <span className="font-bold mr-1 shrink-0">Address</span>
                      <span>FLAT NO.13-178, NEAR BALAJI HOTEL, HYDERABAD, SANGAREDDY, TELANGANA-502325</span>
                    </div>
                  </div>
                  <div className="p-3 w-1/3">
                    <div className="grid grid-cols-[50px_1fr] gap-x-1 text-[10px] mt-1 shrink-0">
                      <span className="font-bold">GSTIN</span><span>36PBJPK1510A1ZZ</span>
                      <span className="font-bold">Mobile</span><span>9676774370</span>
                      <span className="font-bold">PAN</span><span className="break-all whitespace-pre-wrap">PBJPK1510A</span>
                      <span className="font-bold">Email</span><span className="break-all leading-tight">gsaireddy.powerlineselectrical@gmail.com</span>
                    </div>
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="flex text-center divide-x divide-black border-b border-black min-h-[44px]">
                  <div className="flex-1 p-2 flex flex-col items-center justify-center">
                    <div className="font-bold text-[10px] pb-0.5 text-slate-700">Invoice No.</div>
                    <div className="text-xs font-bold">{data.invoiceNo || '-'}</div>
                  </div>
                  <div className="flex-1 p-2 flex flex-col items-center justify-center">
                    <div className="font-bold text-[10px] pb-0.5 text-slate-700">Invoice Date</div>
                    <div className="text-xs font-semibold">{(data.invoiceDate || '').split('-').reverse().join('/')}</div>
                  </div>
                  <div className="flex-1 p-2 flex flex-col items-center justify-center">
                    <div className="font-bold text-[10px] pb-0.5 text-slate-700">PO / Gatepass No.</div>
                    <div className="text-xs font-bold">{data.poNumber || '-'}</div>
                  </div>
                  <div className="flex-1 p-2 flex flex-col items-center justify-center">
                    <div className="font-bold text-[10px] pb-0.5 text-slate-700">PO Date</div>
                    <div className="text-xs font-semibold">{(data.poDate || '').split('-').reverse().join('/') || '-'}</div>
                  </div>
                </div>

                {/* Parties */}
                <div className="flex min-h-[90px]">
                  <div className="w-1/2 p-2 px-3 border-r border-black flex flex-col">
                    <div className="text-[10px] text-slate-600 mb-1">BILL TO</div>
                    <div className="font-bold text-xs mb-1 uppercase">{data.billTo.name || '-'}</div>
                    {data.billTo.address && <div className="leading-tight mb-2 max-w-[90%]">Address: {data.billTo.address}</div>}
                    {data.billTo.gstin && <div>GSTIN: {data.billTo.gstin}</div>}
                    <div className="mt-1">Place of Supply: {data.billTo.placeOfSupply || '-'}</div>
                    {/* PAN is hardcoded format in image but we use general mapping if available */}
                    <div>PAN Number: {(data.billTo.gstin && data.billTo.gstin.length > 11) ? data.billTo.gstin.substring(2, 12) : data.billTo.panNumber || '—'}</div>
                  </div>
                  <div className="w-1/2 p-2 px-3 flex flex-col">
                    <div className="text-[10px] text-slate-600 mb-1">SHIP TO</div>
                    <div className="font-bold text-xs mb-1 uppercase">{data.shipTo.name || data.billTo.name || '-'}</div>
                    <div className="leading-tight mb-2 max-w-[90%]">Address: {data.shipTo.address || data.billTo.address || '-'}</div>
                  </div>
                </div>

              </div>
            </th>
          </tr>

          {/* Table Header Columns */}
          <tr className="bg-sky-200/50 font-semibold text-center text-[10px] border-b border-black">
            <th className="p-2 border-r border-black w-12 font-medium">No.</th>
            <th className="p-2 border-r border-black font-medium">Items</th>
            <th className="p-2 border-r border-black w-16 font-medium">HSN</th>
            <th className="p-2 border-r border-black w-20 font-medium">Quantity</th>
            <th className="p-2 border-r border-black w-24 font-medium">PRICE/ITEM (₹)</th>
            <th className="p-2 border-r border-black w-20 font-medium">Discount</th>
            <th className="p-2 w-24 font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {itemsWithTots.map((it, i) => (
            <tr key={it.id} className="break-inside-avoid">
              <td className="p-1.5 border-r border-black text-center align-top">{i + 1}</td>
              <td className="p-1.5 border-r border-black font-medium align-top">{it.name}</td>
              <td className="p-1.5 border-r border-black text-center align-top">{it.hsn || '-'}</td>
              <td className="p-1.5 border-r border-black text-right align-top break-keep">{it.quantity} {it.quantityUnit}</td>
              <td className="p-1.5 border-r border-black text-right align-top">{it.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
              <td className="p-1.5 border-r border-black text-right align-top text-slate-500 text-[9px]">{it.discStr}</td>
              <td className="p-1.5 text-right font-medium align-top">{it.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          
          {/* Stretch filler to optionally push GST down if preferred, but usually natural flow is better */}
          <tr>
            <td className="border-r border-black py-4"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td className="border-r border-black"></td>
            <td></td>
          </tr>
          
          {/* GST Rows - Aligned exact to layout */}
          <tr className="break-inside-avoid">
            <td className="p-1.5 border-r border-black text-center"></td>
            <td className="p-1.5 border-r border-black text-right font-medium italic text-slate-700 pr-4">CGST @{cgstRate}%</td>
            <td className="p-1.5 border-r border-black text-center">-</td>
            <td className="p-1.5 border-r border-black text-center">-</td>
            <td className="p-1.5 border-r border-black text-center">-</td>
            <td className="p-1.5 border-r border-black text-center">-</td>
            <td className="p-1.5 text-right font-medium">₹ {cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr className="break-inside-avoid">
            <td className="p-1.5 border-r border-black text-center pb-3"></td>
            <td className="p-1.5 border-r border-black text-right font-medium italic text-slate-700 pr-4 pb-3">SGST @{sgstRate}%</td>
            <td className="p-1.5 border-r border-black text-center pb-3">-</td>
            <td className="p-1.5 border-r border-black text-center pb-3">-</td>
            <td className="p-1.5 border-r border-black text-center pb-3">-</td>
            <td className="p-1.5 border-r border-black text-center pb-3">-</td>
            <td className="p-1.5 text-right font-medium pb-3">₹ {sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          
          {/* TOTAL Row inside the item table space to preserve columns */}
          <tr className="break-inside-avoid border-y border-black bg-sky-200/50 font-bold">
            <td className="border-r border-black text-center p-1" colSpan={2}>TOTAL</td>
            <td className="border-r border-black p-1"></td>
            <td className="border-r border-black p-1 text-center">{sumQty}</td>
            <td className="border-r border-black p-1 text-right"></td>
            <td className="border-r border-black p-1 text-center font-medium">₹ {sumDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td className="p-1 px-2 text-right">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>

          <tr className="break-inside-avoid border-b border-black">
            <td colSpan={7} className="p-0 border-t-0">
              {/* Nested Tax Breakdown Table (Native HTML instead of flex for perfect borders) */}
              <table className="w-full text-center text-[10px] border-collapse bg-white border-y border-black">
                <thead>
                  <tr className="bg-sky-200/50 font-medium">
                    <td className="w-[15%] p-1 border-r border-black border-b border-black align-middle" rowSpan={2}>HSN/SAC</td>
                    <td className="w-[20%] p-1 border-r border-black border-b border-black align-middle" rowSpan={2}>Taxable Value</td>
                    <td className="w-[22.5%] p-1 border-r border-black border-b border-black" colSpan={2}>CGST</td>
                    <td className="w-[22.5%] p-1 border-r border-black border-b border-black" colSpan={2}>SGST</td>
                    <td className="p-1 border-b border-black align-middle" rowSpan={2}>Total Tax Amount</td>
                  </tr>
                  <tr className="bg-sky-200/50 font-medium">
                    <td className="w-1/2 p-1 border-r border-black border-b border-black">Rate</td>
                    <td className="w-1/2 p-1 border-r border-black border-b border-black">Amount</td>
                    <td className="w-1/2 p-1 border-r border-black border-b border-black">Rate</td>
                    <td className="w-1/2 p-1 border-r border-black border-b border-black">Amount</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-1 border-r border-black border-b border-black">-</td>
                    <td className="p-1 border-r border-black border-b border-black text-right pr-2">{sumTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border-r border-black border-b border-black text-right">{cgstRate}%</td>
                    <td className="p-1 border-r border-black border-b border-black text-right pr-2">{cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border-r border-black border-b border-black text-right">{sgstRate}%</td>
                    <td className="p-1 border-r border-black border-b border-black text-right pr-2">{sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border-b border-black text-right pr-2 font-medium">₹ {(cgstAmt + sgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="font-bold">
                    <td className="p-1 border-r border-black text-right pr-2">Total</td>
                    <td className="p-1 border-r border-black text-right pr-2">{sumTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border-r border-black"></td>
                    <td className="p-1 border-r border-black text-right pr-2">{cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 border-r border-black"></td>
                    <td className="p-1 border-r border-black text-right pr-2">{sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-1 text-right pr-2">₹ {(cgstAmt + sgstAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Amount In Words and Footer nested inside table */}
          <tr className="break-inside-avoid">
            <td colSpan={7} className="p-0 border-t border-black">
              <div className="flex flex-col border-t border-black">
                <div className="p-2 border-b border-black min-h-[40px] flex flex-col justify-center">
                  <div className="text-[10px] text-slate-800">Total Amount (in words)</div>
                  <div className="font-semibold text-[11px]">{words}</div>
                </div>

                <table className="w-full border-collapse break-inside-avoid table-fixed bg-white">
                  <tbody>
                    <tr>
                      <td className="w-[35%] p-2 border-r border-black align-top text-[9px]">
                        <div className="font-semibold mb-2 text-xs">Bank Details</div>
                        <div className="grid grid-cols-[60px_1fr] gap-y-1"><span className="text-slate-600">Name:</span> <span className="font-bold">{data.bankDetails?.name || '-'}</span></div>
                        <div className="grid grid-cols-[60px_1fr] gap-y-1"><span className="text-slate-600">IFSC Code:</span> <span className="font-bold uppercase">{data.bankDetails?.ifsc || '-'}</span></div>
                        <div className="grid grid-cols-[60px_1fr] gap-y-1"><span className="text-slate-600">Account No:</span> <span className="font-bold">{data.bankDetails?.accountNo || '-'}</span></div>
                        <div className="grid grid-cols-[60px_1fr] gap-y-1"><span className="text-slate-600">Bank:</span> <span className="font-bold">{data.bankDetails?.bank || '-'}</span></div>
                      </td>

                      <td className="w-[35%] p-2 border-r border-black align-top">
                        <div className="flex items-start justify-between h-full">
                          <div className="space-y-1 pr-1">
                            <div className="text-[10px] text-slate-700 mb-1">Payment QR Code</div>
                            {/* <div className="text-[10px]"><span className="text-slate-600">UPI ID: </span><br /><span className="font-bold text-[9px] break-all">{data.bankDetails?.upiId || '-'}</span></div> */}
                            <div className="text-[8px] text-slate-500 mt-2 italic flex gap-2">📱 PhonePe GPay Paytm UPI</div>
                          </div>
                          {/* Hardcoded dimensions to prevent PDF intrinsic size explosion */}
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${data.bankDetails?.upiId || ''}&pn=${encodeURIComponent(data.bankDetails?.name || '')}&am=0`}
                            alt="QR Code"
                            width={80}
                            height={80}
                            style={{width: '80px', height: '80px', minWidth: '80px', minHeight: '80px'}}
                            className="border border-slate-200 p-1 mix-blend-multiply flex-shrink-0" 
                          />
                        </div>
                      </td>

                      <td className="w-[30%] p-2 align-bottom relative text-center">
                        {/* Fake Stamp Icon Placeholder */}
                        <div className="w-16 h-16 rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center opacity-70 absolute top-4 left-1/2 -translate-x-1/2">
                          <span className="text-[6px] text-slate-400 rotate-[-15deg] text-center">Authorised<br/>Signatory</span>
                        </div>
                        <div className="font-bold text-[10px] pt-16 w-full relative z-10">
                           Authorised Signatory For<br />{data.bankDetails?.name || '-'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
        </table>
      </div>
      <div className="text-center text-[9px] text-slate-500 mt-2 pb-1 w-full italic">
        Digitally signed invoice, no signature required.
      </div>
    </div>
  );
}
