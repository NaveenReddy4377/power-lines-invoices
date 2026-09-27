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
  ExternalLink,
  Download,
  Sparkles,
  ArrowUpDown,
  Receipt
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { updateRecordStatus } from '@/app/actions';

export interface Record {
  id: string;
  date: string;
  customer: string;
  amount: number;
  status: 'Pending' | 'Cleared';
  dueDate?: string;
  gstin?: string;
  sumTotal?: number;
  cgst?: number;
  sgst?: number;
  poNumber?: string;
  poDate?: string;
  validUntil?: string;
  rgpNo?: string;
  rgpDate?: string;
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

export interface CashBillRecord {
  id: string;
  date: string;
  customer: string;
  phone?: string;
  paymentMode?: string;
  amount: number;
  status?: string;
  rawData?: any;
}

function isOverdue(r: any) {
  if (r.status !== 'Pending' || !r.dueDate) return false;
  const due = new Date(r.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

interface DashboardManagerProps {
  invoices: Record[];
  quotations: Record[];
  deliveryChallans?: DeliveryChallanRecord[];
  cashBills?: CashBillRecord[];
}

export default function DashboardManager({ invoices, quotations, deliveryChallans = [], cashBills = [] }: DashboardManagerProps) {
  const [invoicesState, setInvoicesState] = useState<Record[]>(invoices);
  const [quotationsState, setQuotationsState] = useState<Record[]>(quotations);
  const [viewAllType, setViewAllType] = useState<'invoices' | 'quotations' | 'deliveryChallans' | null>(null);
  
  // Filtering states for Invoices & Quotations
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | 'this_fy' | 'overdue' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Cleared'>('all');
  
  // Delivery Challan search & filter state
  const [dcSearchQuery, setDcSearchQuery] = useState('');
  const [dcDateFilter, setDcDateFilter] = useState<'all' | 'this_month' | 'last_month'>('all');

  // Dedicated Export Hub Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalTab, setExportModalTab] = useState<'invoices' | 'quotations' | 'deliveryChallans' | 'all'>('invoices');
  const [exportModalDatePreset, setExportModalDatePreset] = useState<'all' | 'this_month' | 'last_month' | 'this_fy' | 'custom'>('all');
  const [exportModalStartDate, setExportModalStartDate] = useState('');
  const [exportModalEndDate, setExportModalEndDate] = useState('');
  const [exportModalStatus, setExportModalStatus] = useState<'all' | 'Pending' | 'Cleared'>('all');
  const [exportModalSearch, setExportModalSearch] = useState('');

  // Filtering implementation
  function filterRecords(
    records: Record[], 
    query: string, 
    dateF: string, 
    statusF: string, 
    startD?: string, 
    endD?: string
  ) {
    let filtered = records;
    
    if (query) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(r => 
        (r.id && r.id.toLowerCase().includes(q)) || 
        (r.customer && r.customer.toLowerCase().includes(q)) ||
        (r.gstin && r.gstin.toLowerCase().includes(q)) ||
        (r.poNumber && r.poNumber.toLowerCase().includes(q)) ||
        (r.rgpNo && r.rgpNo.toLowerCase().includes(q))
      );
    }

    if (statusF !== 'all') {
      filtered = filtered.filter(r => r.status === statusF);
    }

    if (dateF === 'overdue') {
      filtered = filtered.filter(r => isOverdue(r));
    } else if (dateF === 'custom') {
      if (startD) {
        filtered = filtered.filter(r => r.date >= startD);
      }
      if (endD) {
        filtered = filtered.filter(r => r.date <= endD);
      }
    } else if (dateF === 'this_fy') {
      const now = new Date();
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const startFY = `${currentYear}-04-01`;
      const endFY = `${currentYear + 1}-03-31`;
      filtered = filtered.filter(r => r.date >= startFY && r.date <= endFY);
    } else if (dateF !== 'all') {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      filtered = filtered.filter(r => {
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return true;
        
        if (dateF === 'this_month') {
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }
        if (dateF === 'last_month') {
          const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
          const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        }
        return true;
      });
    }

    return filtered;
  }

  const filteredInvoices = useMemo(() => {
    return filterRecords(invoicesState, searchQuery, dateFilter, statusFilter, customStartDate, customEndDate);
  }, [invoicesState, searchQuery, dateFilter, statusFilter, customStartDate, customEndDate]);

  const filteredQuotations = useMemo(() => {
    return filterRecords(quotationsState, searchQuery, dateFilter, statusFilter, customStartDate, customEndDate);
  }, [quotationsState, searchQuery, dateFilter, statusFilter, customStartDate, customEndDate]);

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

  // Total amounts of filtered sets
  const filteredInvoicesTotal = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [filteredInvoices]);

  const filteredQuotationsTotal = useMemo(() => {
    return filteredQuotations.reduce((sum, q) => sum + (q.amount || 0), 0);
  }, [filteredQuotations]);

  // ────────────────────── EXCEL EXPORT HANDLERS ──────────────────────

  const handleExportInvoicesExcel = (recordsToExport = filteredInvoices, customLabel = '') => {
    try {
      if (recordsToExport.length === 0) {
        alert('No invoice records found matching your filters to export.');
        return;
      }

      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalGrand = 0;

      const excelRows: any[] = recordsToExport.map((inv, idx) => {
        const grandTot = inv.amount || 0;
        const subTot = inv.sumTotal !== undefined ? inv.sumTotal : Math.round((grandTot / 1.18) * 100) / 100;
        const cgstVal = inv.cgst !== undefined ? inv.cgst : Math.round((subTot * 0.09) * 100) / 100;
        const sgstVal = inv.sgst !== undefined ? inv.sgst : Math.round((subTot * 0.09) * 100) / 100;

        totalTaxable += subTot;
        totalCgst += cgstVal;
        totalSgst += sgstVal;
        totalGrand += grandTot;

        return {
          'S.No': idx + 1,
          'Invoice No': inv.id,
          'Invoice Date': inv.date,
          'Due Date': inv.dueDate || '-',
          'Customer / Party Name': inv.customer || '',
          'GSTIN': inv.gstin || '',
          'PO Number': inv.poNumber || '-',
          'PO Date': inv.poDate || '-',
          'Taxable Value (₹)': Number(subTot.toFixed(2)),
          'CGST 9% (₹)': Number(cgstVal.toFixed(2)),
          'SGST 9% (₹)': Number(sgstVal.toFixed(2)),
          'Grand Total (₹)': Number(grandTot.toFixed(2)),
          'Payment Status': inv.status || 'Pending'
        };
      });

      // Total summary row
      excelRows.push({
        'S.No': '' as any,
        'Invoice No': 'TOTAL',
        'Invoice Date': '',
        'Due Date': '',
        'Customer / Party Name': `${recordsToExport.length} INVOICES`,
        'GSTIN': '',
        'PO Number': '',
        'PO Date': '',
        'Taxable Value (₹)': Number(totalTaxable.toFixed(2)),
        'CGST 9% (₹)': Number(totalCgst.toFixed(2)),
        'SGST 9% (₹)': Number(totalSgst.toFixed(2)),
        'Grand Total (₹)': Number(totalGrand.toFixed(2)),
        'Payment Status': ''
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

      worksheet['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 16 }, // Invoice No
        { wch: 14 }, // Date
        { wch: 14 }, // Due Date
        { wch: 38 }, // Customer
        { wch: 18 }, // GSTIN
        { wch: 18 }, // PO Number
        { wch: 13 }, // PO Date
        { wch: 18 }, // Taxable Value
        { wch: 14 }, // CGST
        { wch: 14 }, // SGST
        { wch: 18 }, // Grand Total
        { wch: 16 }  // Payment Status
      ];

      const dateStr = new Date().toISOString().split('T')[0];
      const tag = customLabel ? `_${customLabel}` : (dateFilter !== 'all' ? `_${dateFilter}` : '');
      XLSX.writeFile(workbook, `Invoices_Export${tag}_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Failed to export Invoices to Excel: ' + err.message);
    }
  };

  const handleExportQuotationsExcel = (recordsToExport = filteredQuotations, customLabel = '') => {
    try {
      if (recordsToExport.length === 0) {
        alert('No quotation records found matching your filters to export.');
        return;
      }

      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalGrand = 0;

      const excelRows: any[] = recordsToExport.map((q, idx) => {
        const grandTot = q.amount || 0;
        const subTot = q.sumTotal !== undefined ? q.sumTotal : Math.round((grandTot / 1.18) * 100) / 100;
        const cgstVal = q.cgst !== undefined ? q.cgst : Math.round((subTot * 0.09) * 100) / 100;
        const sgstVal = q.sgst !== undefined ? q.sgst : Math.round((subTot * 0.09) * 100) / 100;

        totalTaxable += subTot;
        totalCgst += cgstVal;
        totalSgst += sgstVal;
        totalGrand += grandTot;

        return {
          'S.No': idx + 1,
          'Quotation No': q.id,
          'Quotation Date': q.date,
          'Valid Until': q.validUntil || '-',
          'Customer / Party Name': q.customer || '',
          'GSTIN': q.gstin || '',
          'RGP / Gatepass No': q.rgpNo || '-',
          'RGP Date': q.rgpDate || '-',
          'Estimated Subtotal (₹)': Number(subTot.toFixed(2)),
          'CGST 9% (₹)': Number(cgstVal.toFixed(2)),
          'SGST 9% (₹)': Number(sgstVal.toFixed(2)),
          'Grand Total (₹)': Number(grandTot.toFixed(2)),
          'Status': q.status || 'Pending'
        };
      });

      // Total summary row
      excelRows.push({
        'S.No': '' as any,
        'Quotation No': 'TOTAL',
        'Quotation Date': '',
        'Valid Until': '',
        'Customer / Party Name': `${recordsToExport.length} QUOTATIONS`,
        'GSTIN': '',
        'RGP / Gatepass No': '',
        'RGP Date': '',
        'Estimated Subtotal (₹)': Number(totalTaxable.toFixed(2)),
        'CGST 9% (₹)': Number(totalCgst.toFixed(2)),
        'SGST 9% (₹)': Number(totalSgst.toFixed(2)),
        'Grand Total (₹)': Number(totalGrand.toFixed(2)),
        'Status': ''
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations');

      worksheet['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 16 }, // Quotation No
        { wch: 14 }, // Date
        { wch: 14 }, // Valid Until
        { wch: 38 }, // Customer
        { wch: 18 }, // GSTIN
        { wch: 20 }, // RGP No
        { wch: 14 }, // RGP Date
        { wch: 22 }, // Subtotal
        { wch: 14 }, // CGST
        { wch: 14 }, // SGST
        { wch: 18 }, // Grand Total
        { wch: 14 }  // Status
      ];

      const dateStr = new Date().toISOString().split('T')[0];
      const tag = customLabel ? `_${customLabel}` : (dateFilter !== 'all' ? `_${dateFilter}` : '');
      XLSX.writeFile(workbook, `Quotations_Export${tag}_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Failed to export Quotations to Excel: ' + err.message);
    }
  };

  const handleExportDCExcel = () => {
    try {
      if (filteredDeliveryChallans.length === 0) {
        alert('No delivery challans found matching your filters to export.');
        return;
      }

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

  // Export Combined Multi-Sheet Workbook
  const handleExportCombinedExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Invoices
      if (filteredInvoices.length > 0) {
        const invRows = filteredInvoices.map((inv, idx) => ({
          'S.No': idx + 1,
          'Invoice No': inv.id,
          'Invoice Date': inv.date,
          'Due Date': inv.dueDate || '-',
          'Customer / Party Name': inv.customer || '',
          'GSTIN': inv.gstin || '',
          'PO Number': inv.poNumber || '-',
          'Grand Total (₹)': inv.amount || 0,
          'Status': inv.status || 'Pending'
        }));
        const invSheet = XLSX.utils.json_to_sheet(invRows);
        invSheet['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(workbook, invSheet, 'Invoices');
      }

      // Sheet 2: Quotations
      if (filteredQuotations.length > 0) {
        const quotRows = filteredQuotations.map((q, idx) => ({
          'S.No': idx + 1,
          'Quotation No': q.id,
          'Quotation Date': q.date,
          'Valid Until': q.validUntil || '-',
          'Customer / Party Name': q.customer || '',
          'GSTIN': q.gstin || '',
          'RGP No': q.rgpNo || '-',
          'Grand Total (₹)': q.amount || 0,
          'Status': q.status || 'Pending'
        }));
        const quotSheet = XLSX.utils.json_to_sheet(quotRows);
        quotSheet['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(workbook, quotSheet, 'Quotations');
      }

      // Sheet 3: Delivery Challans
      if (filteredDeliveryChallans.length > 0) {
        const dcRows = filteredDeliveryChallans.map((dc, idx) => ({
          'S.No': idx + 1,
          'DC No': dc.id,
          'DC Date': dc.date,
          'Customer / Party Name': dc.customer || '',
          'RGP No': dc.rgpNo || '',
          'Quotation Raised': dc.quotationRaised || 'No',
          'Status': dc.status || 'Pending'
        }));
        const dcSheet = XLSX.utils.json_to_sheet(dcRows);
        dcSheet['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 14 }, { wch: 35 }, { wch: 20 }, { wch: 16 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(workbook, dcSheet, 'Delivery Challans');
      }

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Power_Lines_Complete_Financial_Export_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Failed to export multi-sheet workbook: ' + err.message);
    }
  };

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

  const handleExportCashBillsExcel = () => {
    try {
      const rows = cashBills.map((cb, idx) => ({
        'S.No': idx + 1,
        'Bill No': cb.id,
        'Date': cb.date,
        'Customer Name': cb.customer,
        'Phone': cb.phone || '',
        'Payment Mode': cb.paymentMode || 'Cash',
        'Amount (₹)': Number(cb.amount || 0),
        'Status': cb.status || 'Paid'
      }));

      const totalAmount = cashBills.reduce((sum, cb) => sum + Number(cb.amount || 0), 0);
      rows.push({
        'S.No': '',
        'Bill No': 'TOTAL',
        'Date': '',
        'Customer Name': '',
        'Phone': '',
        'Payment Mode': '',
        'Amount (₹)': totalAmount,
        'Status': ''
      } as any);

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cash Bills');
      worksheet['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
      XLSX.writeFile(workbook, `Cash_Bills_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e: any) {
      alert('Failed to export Cash Bills: ' + e.message);
    }
  };

  return (
    <>
      {/* Quick Excel Export Hub Action Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white rounded-xl border border-emerald-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Export Financial Data to Excel</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                XLSX Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter by date range, customer name, or payment status, and export structured Excel spreadsheets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleExportInvoicesExcel(filteredInvoices)}
            className="text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 transition shadow-sm flex items-center gap-1.5"
            title="Quick export Invoices to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Invoices ({filteredInvoices.length})</span>
          </button>

          <button
            onClick={() => handleExportQuotationsExcel(filteredQuotations)}
            className="text-xs font-bold text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 transition shadow-sm flex items-center gap-1.5"
            title="Quick export Quotations to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            <span>Export Quotations ({filteredQuotations.length})</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3.5 py-2 transition shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Advanced Export Hub</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Summary List */}
        <RecordList 
          title="Invoice Management"
          icon={<FileText className="w-4 h-4 text-slate-400" />}
          records={invoicesState.slice(0, 10)}
          type="invoices"
          onViewAll={() => setViewAllType('invoices')}
          onExportExcel={() => handleExportInvoicesExcel()}
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
          onExportExcel={() => handleExportQuotationsExcel()}
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

      {/* Cash Bills (Non-GST) Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-white gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Cash Bills (Non-GST)</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {cashBills.length} Bills
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  0% GST
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Counter cash sales, motor repairs, and non-tax retail bills</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCashBillsExcel}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Export Cash Bills to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <Link
              href="/cash-bills/new"
              className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-1.5 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ New Cash Bill</span>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Bill No</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Customer / Party</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3 text-center">Payment Mode</th>
                <th className="px-6 py-3 text-right">Amount (₹)</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400 font-medium">
                    No cash bills recorded yet. Click &ldquo;+ New Cash Bill&rdquo; to create your first non-GST cash bill.
                  </td>
                </tr>
              ) : (
                cashBills.slice(0, 10).map((cb) => (
                  <tr key={cb.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {cb.id}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-500">
                      {cb.date}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">
                      {cb.customer || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {cb.phone || '—'}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {cb.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{Number(cb.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        cb.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {cb.status || 'Paid'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <Link
                        href={`/cash-bills/new?edit=${encodeURIComponent(cb.id)}`}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-xs"
                      >
                        <Edit3 className="w-3 h-3 text-emerald-600" /> EDIT
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View All Overlay Modal */}
      {viewAllType && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-6xl h-full max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Overlay Header */}
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r ${accentColor === 'blue' ? 'from-blue-50/70' : accentColor === 'purple' ? 'from-purple-50/70' : 'from-amber-50/70'} to-transparent shrink-0`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shadow-sm ${accentColor === 'blue' ? 'bg-blue-600 text-white' : accentColor === 'purple' ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white'}`}>
                  {viewAllType === 'invoices' ? <FileText className="w-5 h-5" /> : viewAllType === 'quotations' ? <Quote className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {viewAllType === 'deliveryChallans' ? filteredDeliveryChallans.length : activeRecords.length} records
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Search, filter, edit, and export to Excel</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Export Button inside Modal Header */}
                {viewAllType === 'invoices' && (
                  <button
                    onClick={() => handleExportInvoicesExcel(filteredInvoices)}
                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl px-4 py-2 transition shadow-sm flex items-center gap-2"
                    title="Export currently filtered Invoices to Excel spreadsheet"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export to Excel ({filteredInvoices.length})</span>
                  </button>
                )}

                {viewAllType === 'quotations' && (
                  <button
                    onClick={() => handleExportQuotationsExcel(filteredQuotations)}
                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl px-4 py-2 transition shadow-sm flex items-center gap-2"
                    title="Export currently filtered Quotations to Excel spreadsheet"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export to Excel ({filteredQuotations.length})</span>
                  </button>
                )}

                {viewAllType === 'deliveryChallans' && (
                  <button
                    onClick={handleExportDCExcel}
                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl px-4 py-2 transition shadow-sm flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export to Excel ({filteredDeliveryChallans.length})</span>
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

            {/* Filter Toolbar */}
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col gap-3 shrink-0">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder={viewAllType === 'deliveryChallans' ? "Search by Customer Name, DC No, RGP No..." : "Search by Customer, ID (e.g. PLEW00...), GSTIN, or PO..."}
                    className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-300 focus:outline-none transition-all shadow-sm"
                    value={viewAllType === 'deliveryChallans' ? dcSearchQuery : searchQuery}
                    onChange={(e) => viewAllType === 'deliveryChallans' ? setDcSearchQuery(e.target.value) : setSearchQuery(e.target.value)}
                  />
                  {(viewAllType === 'deliveryChallans' ? dcSearchQuery : searchQuery) && (
                    <button
                      onClick={() => viewAllType === 'deliveryChallans' ? setDcSearchQuery('') : setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Date Filter Buttons */}
                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm shrink-0">
                    {viewAllType === 'deliveryChallans' ? (
                      <>
                        <FilterButton active={dcDateFilter === 'all'} onClick={() => setDcDateFilter('all')} label="All Time" />
                        <FilterButton active={dcDateFilter === 'this_month'} onClick={() => setDcDateFilter('this_month')} label="This Month" />
                        <FilterButton active={dcDateFilter === 'last_month'} onClick={() => setDcDateFilter('last_month')} label="Last Month" />
                      </>
                    ) : (
                      <>
                        <FilterButton active={dateFilter === 'all'} onClick={() => setDateFilter('all')} label="All Time" />
                        <FilterButton active={dateFilter === 'this_month'} onClick={() => setDateFilter('this_month')} label="This Month" />
                        <FilterButton active={dateFilter === 'last_month'} onClick={() => setDateFilter('last_month')} label="Last Month" />
                        <FilterButton active={dateFilter === 'this_fy'} onClick={() => setDateFilter('this_fy')} label="This FY" />
                        {viewAllType === 'invoices' && (
                          <FilterButton active={dateFilter === 'overdue'} onClick={() => setDateFilter('overdue')} label="Overdue" />
                        )}
                        <FilterButton active={dateFilter === 'custom'} onClick={() => setDateFilter('custom')} label="Custom" />
                      </>
                    )}
                  </div>
                </div>

                {/* Status Filter for Invoices / Quotations */}
                {viewAllType !== 'deliveryChallans' && (
                  <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm shrink-0">
                    <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="All Status" />
                    <FilterButton active={statusFilter === 'Pending'} onClick={() => setStatusFilter('Pending')} label="Pending" />
                    <FilterButton active={statusFilter === 'Cleared'} onClick={() => setStatusFilter('Cleared')} label="Cleared" />
                  </div>
                )}
              </div>

              {/* Custom Date Range Row when selected */}
              {dateFilter === 'custom' && viewAllType !== 'deliveryChallans' && (
                <div className="flex items-center gap-3 pt-1 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>From Date:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <span>To Date:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 underline ml-2"
                    >
                      Clear Range
                    </button>
                  )}
                </div>
              )}

              {/* Status and Total Summary Bar */}
              {viewAllType !== 'deliveryChallans' && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-700">
                      Filtered: <strong className="text-slate-900">{activeRecords.length}</strong> {viewAllType}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">
                      Total Value: <strong className="text-emerald-700">₹ {(viewAllType === 'invoices' ? filteredInvoicesTotal : filteredQuotationsTotal).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setDateFilter('all');
                        setStatusFilter('all');
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-y-auto p-0 min-h-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border-b border-gray-200">
                  {viewAllType === 'deliveryChallans' ? (
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/70 sticky top-0 z-10">
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
                      <thead className="bg-slate-50/70 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                          <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {viewAllType === 'invoices' ? 'PO Number' : 'RGP No'}
                          </th>
                          <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50">
                        {activeRecords.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <Search className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm font-medium">No matching records found</p>
                                <button 
                                  onClick={() => { 
                                    setSearchQuery(''); 
                                    setDateFilter('all'); 
                                    setStatusFilter('all');
                                    setCustomStartDate('');
                                    setCustomEndDate('');
                                  }}
                                  className="mt-2 text-xs text-blue-500 hover:underline font-bold"
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
                                <div className="text-sm font-semibold text-slate-800 truncate max-w-[280px]">{r.customer}</div>
                                {r.gstin && <div className="text-[10px] text-slate-400 font-mono">GSTIN: {r.gstin}</div>}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-600 font-medium">
                                {viewAllType === 'invoices' ? (r.poNumber || '-') : (r.rgpNo || '-')}
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
                                  className={`text-[10px] font-bold px-3.5 py-1.5 rounded-lg border transition-all ${accentColor === 'blue' ? 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100 hover:border-blue-200' : 'text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100 hover:border-purple-200'}`}
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
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
              <div className="flex items-center gap-3">
                <span>Showing {viewAllType === 'deliveryChallans' ? filteredDeliveryChallans.length : activeRecords.length} records</span>
                {viewAllType !== 'deliveryChallans' && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600">Total: ₹ {(viewAllType === 'invoices' ? filteredInvoicesTotal : filteredQuotationsTotal).toLocaleString('en-IN')}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (viewAllType === 'invoices') handleExportInvoicesExcel(filteredInvoices);
                    else if (viewAllType === 'quotations') handleExportQuotationsExcel(filteredQuotations);
                    else handleExportDCExcel();
                  }}
                  className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-bold lowercase tracking-normal text-xs bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>download .xlsx</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Advanced Export Hub Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[350] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Financial Export Hub</h3>
                  <p className="text-xs text-emerald-100 font-medium">Generate clean Excel (.xlsx) reports with custom filters</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Step 1: Select Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  1. What would you like to export?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setExportModalTab('invoices')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      exportModalTab === 'invoices' 
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold ring-2 ring-blue-500/20 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">Invoices</span>
                    <span className="text-[10px] font-mono text-slate-500">({invoicesState.length})</span>
                  </button>

                  <button
                    onClick={() => setExportModalTab('quotations')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      exportModalTab === 'quotations' 
                        ? 'border-purple-500 bg-purple-50/70 text-purple-900 font-bold ring-2 ring-purple-500/20 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Quote className="w-5 h-5 text-purple-600" />
                    <span className="text-xs">Quotations</span>
                    <span className="text-[10px] font-mono text-slate-500">({quotationsState.length})</span>
                  </button>

                  <button
                    onClick={() => setExportModalTab('deliveryChallans')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      exportModalTab === 'deliveryChallans' 
                        ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold ring-2 ring-amber-500/20 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Truck className="w-5 h-5 text-amber-600" />
                    <span className="text-xs">Challans</span>
                    <span className="text-[10px] font-mono text-slate-500">({deliveryChallans.length})</span>
                  </button>

                  <button
                    onClick={() => setExportModalTab('all')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      exportModalTab === 'all' 
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold ring-2 ring-emerald-500/20 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs">Multi-Sheet</span>
                    <span className="text-[10px] font-mono text-slate-500">(All 3)</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Date Filters */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  2. Select Date Period
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <FilterButton active={exportModalDatePreset === 'all'} onClick={() => setExportModalDatePreset('all')} label="All Time" />
                  <FilterButton active={exportModalDatePreset === 'this_month'} onClick={() => setExportModalDatePreset('this_month')} label="This Month" />
                  <FilterButton active={exportModalDatePreset === 'last_month'} onClick={() => setExportModalDatePreset('last_month')} label="Last Month" />
                  <FilterButton active={exportModalDatePreset === 'this_fy'} onClick={() => setExportModalDatePreset('this_fy')} label="This FY (Apr-Mar)" />
                  <FilterButton active={exportModalDatePreset === 'custom'} onClick={() => setExportModalDatePreset('custom')} label="Custom Dates" />
                </div>

                {exportModalDatePreset === 'custom' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">From Date:</span>
                      <input 
                        type="date"
                        value={exportModalStartDate}
                        onChange={(e) => setExportModalStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">To Date:</span>
                      <input 
                        type="date"
                        value={exportModalEndDate}
                        onChange={(e) => setExportModalEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Status & Search Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    3. Status
                  </label>
                  <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5">
                    <FilterButton active={exportModalStatus === 'all'} onClick={() => setExportModalStatus('all')} label="All" />
                    <FilterButton active={exportModalStatus === 'Pending'} onClick={() => setExportModalStatus('Pending')} label="Pending" />
                    <FilterButton active={exportModalStatus === 'Cleared'} onClick={() => setExportModalStatus('Cleared')} label="Cleared" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Filter by Party / Keyword
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="e.g. Aurobindo, Granules..."
                      value={exportModalSearch}
                      onChange={(e) => setExportModalSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Summary of what will be exported */}
              {(() => {
                let targetList: Record[] = [];
                if (exportModalTab === 'invoices') targetList = invoicesState;
                else if (exportModalTab === 'quotations') targetList = quotationsState;
                
                const filtered = filterRecords(
                  targetList, 
                  exportModalSearch, 
                  exportModalDatePreset, 
                  exportModalStatus, 
                  exportModalStartDate, 
                  exportModalEndDate
                );

                const sumAmount = filtered.reduce((s, r) => s + (r.amount || 0), 0);

                return (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs text-emerald-800 font-semibold">Ready to Generate Spreadsheet:</div>
                      <div className="text-sm font-extrabold text-emerald-950 mt-0.5">
                        {exportModalTab === 'all' 
                          ? `${invoicesState.length} Invoices + ${quotationsState.length} Quotations + ${deliveryChallans.length} Challans`
                          : `${filtered.length} matching ${exportModalTab} records`}
                      </div>
                      {exportModalTab !== 'all' && (
                        <div className="text-xs text-emerald-700 font-bold mt-0.5">
                          Total Value: ₹ {sumAmount.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                    <FileSpreadsheet className="w-8 h-8 text-emerald-500 shrink-0 opacity-80" />
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (exportModalTab === 'all') {
                    handleExportCombinedExcel();
                  } else if (exportModalTab === 'invoices') {
                    const toExport = filterRecords(
                      invoicesState, 
                      exportModalSearch, 
                      exportModalDatePreset, 
                      exportModalStatus, 
                      exportModalStartDate, 
                      exportModalEndDate
                    );
                    handleExportInvoicesExcel(toExport, exportModalDatePreset);
                  } else if (exportModalTab === 'quotations') {
                    const toExport = filterRecords(
                      quotationsState, 
                      exportModalSearch, 
                      exportModalDatePreset, 
                      exportModalStatus, 
                      exportModalStartDate, 
                      exportModalEndDate
                    );
                    handleExportQuotationsExcel(toExport, exportModalDatePreset);
                  } else {
                    handleExportDCExcel();
                  }
                  setShowExportModal(false);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel Sheet (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecordList({ title, icon, records, type, onViewAll, onExportExcel, onToggleStatus, accentColor }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-slate-800 text-sm whitespace-nowrap">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-2.5 py-1 transition shadow-sm flex items-center gap-1"
              title={`Export ${title} to Excel`}
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>EXCEL</span>
            </button>
          )}

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
      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
        active 
          ? 'bg-slate-900 text-white shadow-sm' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
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
