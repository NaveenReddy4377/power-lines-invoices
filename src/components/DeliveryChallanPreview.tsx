'use client';

import { DeliveryChallanData } from '@/types';

interface DeliveryChallanPreviewProps {
  data: DeliveryChallanData;
}

export default function DeliveryChallanPreview({ data }: DeliveryChallanPreviewProps) {
  return (
    <div id="pdf-wrapper" className="w-full flex justify-center">
      <div
        id="dc-capture-area"
        className="w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-10 flex flex-col justify-between shadow-2xl relative font-sans print:shadow-none print:p-6 print:m-0"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Document Header */}
        <div className="space-y-3">

          {/* Top Title & Phone Numbers */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
            <div>
              <span className="inline-block bg-slate-900 text-white text-[11px] font-black tracking-widest px-3 py-1 uppercase rounded-sm">
                DELIVERY CHALLAN {data.challanType ? `(${data.challanType.toUpperCase()})` : ''}
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
              I.D.A. Bollaram Village, Jinnaram Mdl., Sanga Reddy District - 502 325
            </p>
            <p className="text-[10px] font-bold text-slate-600 italic mt-0.5">
              Spl. in : Rewinding of A.C. & D.C. Motors & Generators, Submersible Electrical Panel Board, Erection Works & Maintenance etc...
            </p>
          </div>

          {/* Reference Row Grid */}
          <div className="border-2 border-slate-900 rounded-sm p-3 text-xs space-y-2 bg-slate-50/50">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-300 pb-2">
              <div className="col-span-7 flex items-center gap-1.5">
                <span className="font-bold text-slate-900 min-w-[35px]">No.</span>
                <span className="font-black text-blue-900 text-sm">{data.dcNo || 'PLEW-DC-00001'}</span>
              </div>
              <div className="col-span-5 flex items-center gap-1.5 justify-end">
                <span className="font-bold text-slate-900">Date:</span>
                <span className="font-bold border-b border-slate-400 px-2">{data.dcDate || '........................'}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 border-b border-slate-300 pb-2">
              <div className="col-span-12 flex items-start gap-1.5">
                <span className="font-bold text-slate-900 shrink-0">M/s.</span>
                <div className="flex-1 font-bold text-slate-950 border-b border-dotted border-slate-400 pb-0.5">
                  {data.customerName || '........................................................................................................................'}
                  {data.customerAddress && (
                    <div className="text-[11px] font-normal text-slate-700 mt-0.5">{data.customerAddress}</div>
                  )}
                  {data.customerGstin && (
                    <div className="text-[10px] font-bold text-slate-800 mt-0.5">GSTIN: {data.customerGstin}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 text-[11px]">
              <div className="col-span-6 flex items-center gap-1.5">
                <span className="font-bold text-slate-900">RGP / Gate Pass No.:</span>
                <span className="font-bold text-blue-900 border-b border-dotted border-slate-400 px-1 flex-1">{data.rgpNo || '........................'}</span>
              </div>
              <div className="col-span-6 flex items-center gap-1.5">
                <span className="font-bold text-slate-900">RGP / Gate Pass Date:</span>
                <span className="font-medium border-b border-dotted border-slate-400 px-1 flex-1">{data.rgpDate || '........................'}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2 text-[11px] pt-1 border-t border-slate-200">
              <div className="col-span-4 flex items-center gap-1.5">
                <span className="font-bold text-slate-900">Quotation Raised:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${data.quotationRaised === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {data.quotationRaised || 'No'}
                </span>
              </div>
              {data.vehicleNo && (
                <div className="col-span-4 flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">Vehicle No:</span>
                  <span className="font-bold uppercase text-slate-900">{data.vehicleNo}</span>
                </div>
              )}
              {data.modeOfTransport && (
                <div className="col-span-4 flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">Transport:</span>
                  <span className="font-semibold">{data.modeOfTransport}</span>
                </div>
              )}
            </div>
          </div>

          {/* Table of Items */}
          <div className="border-2 border-slate-900 rounded-sm overflow-hidden mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] uppercase tracking-wider font-extrabold">
                  <th className="py-2.5 px-3 border-r border-slate-700 w-12 text-center">S.No.</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 w-32">Code / HSN</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">P A R T I C U L A R S</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 w-20 text-center">UOM</th>
                  <th className="py-2.5 px-3 w-24 text-center">QTY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-xs font-semibold">
                {data.items && data.items.length > 0 ? (
                  data.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 min-h-[40px]">
                      <td className="py-3 px-3 border-r border-slate-300 text-center font-bold text-slate-700">{idx + 1}</td>
                      <td className="py-3 px-3 border-r border-slate-300 text-slate-600 font-mono text-[11px]">{item.materialCode || '-'}</td>
                      <td className="py-3 px-3 border-r border-slate-300 font-bold text-slate-950 leading-snug">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 border-r border-slate-300 text-center text-slate-700">{item.uom || 'NOS'}</td>
                      <td className="py-3 px-3 text-center font-black text-sm text-slate-950">{item.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">No materials added yet</td>
                  </tr>
                )}

                {/* Pad empty space to match physical challan height */}
                {Array.from({ length: Math.max(0, 6 - (data.items?.length || 0)) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="h-9">
                    <td className="border-r border-slate-300" />
                    <td className="border-r border-slate-300" />
                    <td className="border-r border-slate-300" />
                    <td className="border-r border-slate-300" />
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* General Remarks / Declaration Note */}
          {data.remarks && (
            <div className="border border-slate-400 bg-slate-50 p-2.5 rounded-sm text-[11px] font-semibold text-slate-800">
              <span className="font-bold text-slate-900 uppercase">Note / Remarks:</span> {data.remarks}
            </div>
          )}

        </div>

        {/* Footer & Signatures */}
        <div className="pt-8 space-y-8">
          <div className="flex justify-between items-end">
            <div className="text-center w-40 border-t border-slate-800 pt-2 text-[11px] font-bold text-slate-800">
              Receiver Signature
            </div>

            <div className="text-center w-40 border-t border-slate-800 pt-2 text-[11px] font-bold text-slate-800">
              Prepared By
            </div>

            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-900 mb-10">
                For POWER LINES ELECTRICAL WORKS
              </div>
              <div className="text-center border-t border-slate-800 pt-1 text-[11px] font-bold text-slate-900">
                Authorized Signature
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
