'use client';

import { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Filter, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Edit3, 
  FileText, 
  Quote, 
  ArrowRight,
  Monitor,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Truck,
  FileSpreadsheet,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { updateRecordStatus } from '@/app/actions';

interface Record {
  id: string;
  date: string;
  customer: string;
  amount: number;
  status: 'Pending' | 'Cleared';
  dueDate?: string;
}

export interface DeliveryChallanRecord {
  id: string;
  date: string;
  customer: string;
  rgpNo?: string;
  rgpDate?: string;
  quotationRaised?: string;
  type?: string;
  status?: string;
  rgpPhotoUrl?: string;
  rawData?: any;
}

function isOverdue(r: any) {
  if (r.status !== 'Pending' || !r.dueDate) return false;
  const due = new Date(r.dueDate);
  const today = new Date();
  today.setHours(0,0,0,0);
  return due < today;
}

interface DashboardManagerProps {
  invoices: Record[];
  quotations: Record[];
  deliveryChallans?: DeliveryChallanRecord[];
}

export default function DashboardManager({ invoices, quotations, deliveryChallans = [] }: DashboardManagerProps) {
  const [invoicesState, setInvoicesState] = useState<Record[]>(invoices);
  const [quotationsState, setQuotationsState] = useState<Record[]>(quotations);
  const [viewAllType, setViewAllType] = useState<'invoices' | 'quotations' | 'deliveryChallans' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | 'overdue'>('all');
  
  // Delivery Challan search & filter state
  const [dcSearchQuery, setDcSearchQuery] = useState('');
  const [dcDateFilter, setDcDateFilter] = useState<'all' | 'this_month' | 'last_month'>('all');

  const filteredInvoices = useMemo(() => {
    return filterRecords(invoicesState, searchQuery, dateFilter);
  }, [invoicesState, searchQuery, dateFilter]);

  const filteredQuotations = useMemo(() => {
    return filterRecords(quotationsState, searchQuery, dateFilter);
  }, [quotationsState, searchQuery, dateFilter]);

  const filteredDeliveryChallans = useMemo(() => {
    let filtered = deliveryChallans;
    if (dcSearchQuery) {
      const q = dcSearchQuery.toLowerCase();
      filtered = filtered.filter(dc => 
        (dc.id && dc.id.toLowerCase().includes(q)) ||
        (dc.customer && dc.customer.toLowerCase().includes(q)) ||
        (dc.rgpNo && dc.rgpNo.toLowerCase().includes(q)) ||
        (dc.rgpDate && dc.rgpDate.toLowerCase().includes(q))
      );
    }
    if (dcDateFilter !== 'all') {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      filtered = filtered.filter(dc => {
        const d = new Date(dc.date);
        if (isNaN(d.getTime())) return true;
        
        if (dcDateFilter === 'this_month') {
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }
        if (dcDateFilter === 'last_month') {
          const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
          const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        }
        return true;
      });
    }
    return filtered;
  }, [deliveryChallans, dcSearchQuery, dcDateFilter]);

  const handleExportDCExcel = () => {
    try {
      const excelRows = filteredDeliveryChallans.map((dc, idx) => ({
        'S.No': idx + 1,
        'DC No': dc.id,
        'DC Date': dc.date,
        'Customer / Party Name': dc.customer || '',
        'RGP / Gatepass No': dc.rgpNo || '',
        'RGP / Gatepass Date': dc.rgpDate || '',
        'Quotation Raised': dc.quotationRaised || 'No',
        'Challan Type': dc.type || 'Returnable',
        'Status': dc.status || 'Pending',
        'RGP Photo URL': dc.rawData?.rgpPhotoUrl || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Delivery Challans');

      worksheet['!cols'] = [
        { wch: 6 }, { wch: 16 }, { wch: 12 }, { wch: 35 }, { wch: 22 },
        { wch: 15 }, { wch: 16 }, { wch: 15 }, { wch: 12 }, { wch: 35 }
      ];

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Delivery_Challans_Filtered_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Failed to export Excel file: ' + err.message);
    }
  };

  function filterRecords(records: Record[], query: string, filter: string) {
    let filtered = records;
    
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(q) || 
        r.customer.toLowerCase().includes(q)
      );
    }

    if (filter === 'overdue') {
      filtered = filtered.filter(r => isOverdue(r));
    } else if (filter !== 'all') {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      filtered = filtered.filter(r => {
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return true;
        
        if (filter === 'this_month') {
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }
        if (filter === 'last_month') {
          const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
          const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        }
        return true;
      });
    }

    return filtered;
  }

  const activeRecords = viewAllType === 'invoices' ? filteredInvoices : viewAllType === 'quotations' ? filteredQuotations : [];
  const title = viewAllType === 'invoices' ? 'Invoice Management' : viewAllType === 'quotations' ? 'Quotation History' : 'Delivery Challan Management';
  const accentColor = viewAllType === 'invoices' ? 'blue' : viewAllType === 'quotations' ? 'purple' : 'amber';

  const handleToggleStatus = async (type: 'invoices' | 'quotations', id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Cleared' : 'Pending';
    
    // Optimistic update
    if (type === 'invoices') {
      setInvoicesState(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
    } else {
      setQuotationsState(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
    }

    try {
      const res = await updateRecordStatus(type, id, newStatus);
      if (!res.success) {
        alert('Failed to update status: ' + res.error);
        // Rollback
        if (type === 'invoices') {
          setInvoicesState(prev => prev.map(r => r.id === id ? { ...r, status: currentStatus as any } : r));
        } else {
          setQuotationsState(prev => prev.map(r => r.id === id ? { ...r, status: currentStatus as any } : r));
        }
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Summary List */}
        <RecordList 
          title="Invoice Management"
          icon={<FileText className="w-4 h-4 text-slate-400" />}
          records={invoicesState.slice(0, 10)}
          type="invoices"
          onViewAll={() => setViewAllType('invoices')}
          onToggleStatus={(id: string, status: string) => handleToggleStatus('invoices', id, status)}
          accentColor="blue"
        />

        {/* Quotation Summary List */}
        <RecordList 
          title="Quotation History"
          icon={<Quote className="w-4 h-4 text-slate-400" />}
          records={quotationsState.slice(0, 10)}
          type="quotations"
          onViewAll={() => setViewAllType('quotations')}
          onToggleStatus={(id: string, status: string) => handleToggleStatus('quotations', id, status)}
          accentColor="purple"
        />
      </div>

      {/* Delivery Challans Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-white gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Delivery Challan Management</h3>
              <p className="text-xs text-slate-500 font-medium">Recent Delivery Challans & RGP / Gate Pass Records</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setViewAllType('deliveryChallans')}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 transition shadow-sm"
            >
              VIEW ALL ({deliveryChallans.length})
            </button>

            <button
              onClick={handleExportDCExcel}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2 transition shadow-sm flex items-center gap-1.5"
              title="Export filtered Delivery Challans to Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <Link 
              href="/delivery-challan" 
              className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-3.5 py-2 transition shadow-sm flex items-center gap-1.5 shrink-0"
            >
              NEW DC <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Toolbar with Search and Date Filters */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by Customer, DC No, RGP No, or RGP Date..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all shadow-sm"
              value={dcSearchQuery}
              onChange={(e) => setDcSearchQuery(e.target.value)}
            />
            {dcSearchQuery && (
              <button
                onClick={() => setDcSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <FilterButton 
                active={dcDateFilter === 'all'} 
                onClick={() => setDcDateFilter('all')}
                label="All"
              />
              <FilterButton 
                active={dcDateFilter === 'this_month'} 
                onClick={() => setDcDateFilter('this_month')}
                label="This Month"
              />
              <FilterButton 
                active={dcDateFilter === 'last_month'} 
                onClick={() => setDcDateFilter('last_month')}
                label="Last Month"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {filteredDeliveryChallans.length} records
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">DC No.</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">DC Date</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer / Party Name</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">RGP / Gatepass No.</th>
                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">RGP / Gatepass Date</th>
                <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quotation Raised</th>
                <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredDeliveryChallans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400 text-xs font-medium">
                    No matching delivery challan records found. Click "NEW DC" to create one.
                  </td>
                </tr>
              ) : (
                filteredDeliveryChallans.slice(0, 10).map((dc, idx) => (
                  <tr key={`${dc.id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-mono font-bold text-amber-700">#{dc.id}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-slate-600">
                      {dc.date}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800">
                      {dc.customer || '-'}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-semibold text-blue-900">
                      <div className="flex items-center gap-1.5">
                        <span>{dc.rgpNo || '-'}</span>
                        {(dc.rgpPhotoUrl || dc.rawData?.rgpPhotoUrl) && (
                          <a
                            href={dc.rgpPhotoUrl || dc.rawData?.rgpPhotoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                            title="View RGP Document / Photo"
                          >
                            <ImageIcon className="w-3 h-3 text-amber-600" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-slate-600">
                      {dc.rgpDate || '-'}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${dc.quotationRaised === 'Yes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {dc.quotationRaised || 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {dc.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <Link
                        href={`/delivery-challan?edit=${encodeURIComponent(dc.id)}`}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors shadow-sm"
                      >
                        <Edit3 className="w-3 h-3 text-amber-600" /> EDIT
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View All Overlay */}
      {viewAllType && (
        <div className="fixed inset-0 z-[300] bg-slate-100/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Overlay Header */}
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r ${accentColor === 'blue' ? 'from-blue-50/50' : accentColor === 'purple' ? 'from-purple-50/50' : 'from-amber-50/50'} to-transparent`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${accentColor === 'blue' ? 'bg-blue-100' : accentColor === 'purple' ? 'bg-purple-100' : 'bg-amber-100'}`}>
                  {viewAllType === 'invoices' ? <FileText className="w-5 h-5 text-blue-600" /> : viewAllType === 'quotations' ? <Quote className="w-5 h-5 text-purple-600" /> : <Truck className="w-5 h-5 text-amber-600" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                  <p className="text-xs text-slate-500 font-medium">Search, filter, and manage all existing records</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {viewAllType === 'deliveryChallans' && (
                  <button
                    onClick={handleExportDCExcel}
                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-3.5 py-2 transition shadow-sm flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Filtered Excel</span>
                  </button>
                )}
                <button 
                  onClick={() => setViewAllType(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={viewAllType === 'deliveryChallans' ? "Search by Customer Name, DC No, RGP No..." : "Search by Customer Name or ID (e.g. PLEW...)"}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none transition-all shadow-sm"
                  value={viewAllType === 'deliveryChallans' ? dcSearchQuery : searchQuery}
                  onChange={(e) => viewAllType === 'deliveryChallans' ? setDcSearchQuery(e.target.value) : setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                  {viewAllType === 'deliveryChallans' ? (
                    <>
                      <FilterButton 
                        active={dcDateFilter === 'all'} 
                        onClick={() => setDcDateFilter('all')}
                        label="All Time"
                      />
                      <FilterButton 
                        active={dcDateFilter === 'this_month'} 
                        onClick={() => setDcDateFilter('this_month')}
                        label="This Month"
                      />
                      <FilterButton 
                        active={dcDateFilter === 'last_month'} 
                        onClick={() => setDcDateFilter('last_month')}
                        label="Last Month"
                      />
                    </>
                  ) : (
                    <>
                      <FilterButton 
                        active={dateFilter === 'all'} 
                        onClick={() => setDateFilter('all')}
                        label="All Time"
                      />
                      <FilterButton 
                        active={dateFilter === 'this_month'} 
                        onClick={() => setDateFilter('this_month')}
                        label="This Month"
                      />
                      <FilterButton 
                        active={dateFilter === 'last_month'} 
                        onClick={() => setDateFilter('last_month')}
                        label="Last Month"
                      />
                      {viewAllType === 'invoices' && (
                        <FilterButton 
                          active={dateFilter === 'overdue'} 
                          onClick={() => setDateFilter('overdue')}
                          label="Overdue"
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-y-auto p-0 min-h-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border-b border-gray-200">
                  {viewAllType === 'deliveryChallans' ? (
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">DC No.</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">DC Date</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer / Party Name</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">RGP / Gatepass No.</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">RGP / Gatepass Date</th>
                          <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quotation Raised</th>
                          <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50">
                        {filteredDeliveryChallans.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <Search className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm font-medium">No matching delivery challans found</p>
                                <button 
                                  onClick={() => { setDcSearchQuery(''); setDcDateFilter('all'); }}
                                  className="mt-2 text-xs text-amber-600 hover:underline font-bold"
                                >
                                  Clear filters
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredDeliveryChallans.map((dc, idx) => (
                            <tr key={`${dc.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-3.5 whitespace-nowrap">
                                <span className="text-xs font-mono font-bold text-amber-700">#{dc.id}</span>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-slate-600">
                                {dc.date}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800">
                                {dc.customer || '-'}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-xs font-semibold text-blue-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{dc.rgpNo || '-'}</span>
                                  {(dc.rgpPhotoUrl || dc.rawData?.rgpPhotoUrl) && (
                                    <a
                                      href={dc.rgpPhotoUrl || dc.rawData?.rgpPhotoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                                      title="View RGP Document / Photo"
                                    >
                                      <ImageIcon className="w-3 h-3 text-amber-600" />
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-xs font-medium text-slate-600">
                                {dc.rgpDate || '-'}
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${dc.quotationRaised === 'Yes' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                  {dc.quotationRaised || 'No'}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  {dc.status || 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-center">
                                <Link
                                  href={`/delivery-challan?edit=${encodeURIComponent(dc.id)}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all shadow-sm"
                                >
                                  <Edit3 className="w-3 h-3 text-amber-600" /> EDIT
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                          <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50">
                        {activeRecords.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <Search className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm font-medium">No matching records found</p>
                                <button 
                                  onClick={() => { setSearchQuery(''); setDateFilter('all'); }}
                                  className="mt-2 text-xs text-blue-500 hover:underline"
                                >
                                  Clear all filters
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          activeRecords.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className="text-xs font-mono font-bold text-slate-700">#{r.id}</span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className="text-xs text-slate-500 font-medium">{r.date}</span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm font-semibold text-slate-800 truncate max-w-[300px]">{r.customer}</div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-slate-900">₹ {r.amount.toLocaleString('en-IN')}</span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-center">
                                <StatusBadge
                                  status={r.status}
                                  overdue={isOverdue(r)}
                                  onClick={() => handleToggleStatus(viewAllType!, r.id, r.status)}
                                />
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-center">
                                <Link 
                                  href={`/${viewAllType === 'invoices' ? 'invoices' : 'quotations'}/new?edit=${r.id}`}
                                  className={`text-[10px] font-bold px-4 py-1.5 rounded-lg border transition-all ${accentColor === 'blue' ? 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 hover:border-blue-200' : 'text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100 hover:border-purple-200'}`}
                                >
                                  EDIT
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Showing {viewAllType === 'deliveryChallans' ? filteredDeliveryChallans.length : activeRecords.length} records</span>
              <div className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                <span>Management View</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecordList({ title, icon, records, type, onViewAll, onToggleStatus, accentColor }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-slate-800 text-sm whitespace-nowrap">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onViewAll}
            className={`text-[10px] font-bold ${accentColor === 'blue' ? 'text-blue-600 hover:text-blue-700' : 'text-purple-600 hover:text-purple-700'} border border-slate-200 rounded px-2 py-1 bg-white hover:bg-slate-50 transition shadow-sm`}
          >
            VIEW ALL
          </button>
          <Link 
            href={`/${type}/new`} 
            className={`text-[10px] font-bold ${accentColor === 'blue' ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-white bg-purple-600 hover:bg-purple-700'} rounded px-2 py-1 transition shadow-sm flex items-center gap-1`}
          >
            NEW <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>

      <div className="flex-1 max-h-[400px] overflow-y-auto divide-y divide-slate-100 no-scrollbar">
        {records.length === 0 ? (
          <div className="px-6 py-10 text-center opacity-40 text-xs font-medium">No records found.</div>
        ) : (
          records.map((r: any, idx: number) => (
            <div key={`${r.id}-${idx}`} className="grid grid-cols-[60px_1fr_90px_40px_40px] gap-2 items-center px-5 py-2.5 hover:bg-slate-50 transition-colors">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-600">#{r.id}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{r.customer}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{r.date}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-800 whitespace-nowrap">₹{r.amount.toLocaleString('en-IN')}</div>
              </div>
              <div className="flex items-center justify-center">
                <button 
                  onClick={() => onToggleStatus(r.id, r.status)}
                  className="transition-transform active:scale-95"
                  title={`Mark as ${r.status === 'Pending' ? 'Cleared' : 'Pending'}`}
                >
                  {r.status === 'Cleared' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                  ) : isOverdue(r) ? (
                    <div className="relative">
                      <AlertCircle className="w-4 h-4 text-red-600 fill-red-50 relative z-10" />
                      <div className="absolute inset-0 bg-red-400 rounded-full animate-ping blur-[2px] opacity-40"></div>
                    </div>
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 fill-amber-50" />
                  )}
                </button>
              </div>
              <div className="flex justify-end">
                <Link 
                  href={`/${type}/new?edit=${r.id}`}
                  className={`p-1.5 rounded-lg border flex items-center justify-center transition-all ${accentColor === 'blue' ? 'text-blue-400 border-blue-100 hover:bg-blue-50' : 'text-purple-400 border-purple-100 hover:bg-purple-50'}`}
                >
                  <Edit3 className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${active ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status, onClick, overdue }: { status: string, onClick: () => void, overdue?: boolean }) {
  const isCleared = status === 'Cleared';
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold transition-all active:scale-95 ${
        isCleared 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
          : overdue 
            ? 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100'
            : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
      }`}
    >
      {isCleared ? (
        <><CheckCircle2 className="w-3 h-3" /> CLEARED</>
      ) : overdue ? (
        <><AlertCircle className="w-3 h-3 text-red-600" /> OVERDUE</>
      ) : (
        <><AlertCircle className="w-3 h-3" /> PENDING</>
      )}
    </button>
  );
}
