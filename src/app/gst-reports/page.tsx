'use client';

import { useState, useEffect } from 'react';
import { Database, Download, Calendar, Filter } from 'lucide-react';
import { getAllInvoicesForGST } from '@/app/actions';

export default function GSTReports() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Default to Last Month
  const [filterMonth, setFilterMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllInvoicesForGST();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!filterMonth) return true; // Show all
    if (!inv.date) return false;
    // inv.date is expected to be YYYY-MM-DD
    return inv.date.startsWith(filterMonth);
  });

  const exportToCSV = () => {
    if (filteredInvoices.length === 0) {
      alert("No data available to export for the selected month.");
      return;
    }

    const headers = ['Invoice No', 'Date', 'Billed To', 'GSTIN', 'Sum Total (₹)', 'CGST (₹)', 'SGST (₹)', 'Grand Total (₹)', 'Status'];
    
    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(row => {
        return [
          `"${(row.invoiceNo || '').replace(/"/g, '""')}"`,
          `"${(row.date || '').replace(/"/g, '""')}"`,
          `"${(row.billedTo || '').replace(/"/g, '""')}"`,
          `"${(row.gstin || '').replace(/"/g, '""')}"`,
          row.sumTotal || 0,
          row.cgst || 0,
          row.sgst || 0,
          row.grandTotal || 0,
          `"${row.status || 'SAVED'}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Returns_${filterMonth || 'All'}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Totals for current view
  const totals = filteredInvoices.reduce((acc, row) => {
    acc.sumTotal += (row.sumTotal || 0);
    acc.cgst += (row.cgst || 0);
    acc.sgst += (row.sgst || 0);
    acc.grandTotal += (row.grandTotal || 0);
    return acc;
  }, { sumTotal: 0, cgst: 0, sgst: 0, grandTotal: 0 });

  return (
    <div className="h-full overflow-y-auto bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-600" />
              GST Returns Data
            </h1>
            <p className="text-sm text-slate-500 mt-1">Export structured invoice data formatted for GST filling.</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold outline-none text-slate-700 cursor-pointer"
              />
              {filterMonth && (
                <button 
                  onClick={() => setFilterMonth('')} 
                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-xs text-slate-600 ml-2 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm shadow-purple-200"
            >
              <Download className="w-4 h-4" /> Export to Excel
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-purple-600 rounded-full mb-4"></div>
              <p className="text-sm font-medium">Fetching GST records directly from database...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <Filter className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No invoices found</h3>
              <p className="text-sm text-slate-500 mt-1">No generated invoices match the timeframe "{filterMonth || 'Any Time'}".</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Invoice No</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 max-w-[200px]">Billed To</th>
                    <th className="px-6 py-4">GSTIN</th>
                    <th className="px-6 py-4 text-right">Sum Total</th>
                    <th className="px-6 py-4 text-right text-emerald-600">CGST</th>
                    <th className="px-6 py-4 text-right text-indigo-600">SGST</th>
                    <th className="px-6 py-4 text-right font-black">Grand Total (₹)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredInvoices.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 border-r border-slate-50 font-bold text-slate-700">
                        {inv.invoiceNo}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs">{inv.date}</td>
                      <td className="px-6 py-3 text-slate-600 truncate max-w-[200px]" title={inv.billedTo}>
                        {inv.billedTo}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-500">
                        {inv.gstin || '-'}
                      </td>
                      <td className="px-6 py-3 text-right">₹{inv.sumTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-right text-emerald-600">₹{inv.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-right text-indigo-600">₹{inv.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-800">
                        ₹{inv.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {inv.status === 'SAVED' ? (
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded">SAVED ONLINE</span>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded">OFFLINE PENDING</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-purple-50/50 border-t-2 border-purple-200">
                    <td colSpan={4} className="px-6 py-4 text-right font-bold text-purple-800">
                      AGGREGATE TOTALS FOR FILTERED PERIOD:
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-purple-900">
                      ₹{totals.sumTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">
                      ₹{totals.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-700">
                      ₹{totals.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-purple-900 text-lg border-l border-purple-100">
                      ₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
