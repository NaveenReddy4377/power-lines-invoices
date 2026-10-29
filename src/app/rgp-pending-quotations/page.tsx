'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Calendar, 
  Truck, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Save, 
  Loader2, 
  PlusCircle, 
  Eye, 
  RefreshCw, 
  ChevronRight, 
  Layers, 
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  Check
} from 'lucide-react';
import { getRGPsPendingQuotation, updateRGPQuotationDetails } from '@/app/actions';

interface RGPRecord {
  dcNo: string;
  dcDate: string;
  customerName: string;
  customerGstin: string;
  customerAddress: string;
  rgpNo: string;
  rgpDate: string;
  vehicleNo: string;
  challanType: string;
  quotationRaised: 'Yes' | 'No' | string;
  quotationNo?: string;
  quotationDate?: string;
  rgpPhotoUrl?: string;
  items?: Array<{
    id?: string;
    description: string;
    quantity: number | string;
    uom?: string;
    remarks?: string;
  }>;
  remarks?: string;
  status?: string;
}

export default function RGPPendingQuotationsPage() {
  const [records, setRecords] = useState<RGPRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'raised' | 'all'>('pending');
  
  // Track inline editing state for each row { [dcNo]: { quotationNo, quotationDate, isSaving, savedSuccess } }
  const [editState, setEditState] = useState<Record<string, {
    quotationNo: string;
    quotationDate: string;
    isSaving?: boolean;
    savedSuccess?: boolean;
    error?: string;
  }>>({});

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await getRGPsPendingQuotation();
      setRecords(data || []);

      // Initialize edit states
      const initialEdits: typeof editState = {};
      (data || []).forEach((rec: RGPRecord) => {
        initialEdits[rec.dcNo] = {
          quotationNo: rec.quotationNo || '',
          quotationDate: rec.quotationDate || (rec.quotationRaised === 'Yes' ? rec.dcDate : new Date().toISOString().split('T')[0]),
          isSaving: false,
          savedSuccess: false
        };
      });
      setEditState(initialEdits);
    } catch (err: any) {
      console.error('Failed to load RGP records:', err);
      setNotification({ type: 'error', message: 'Failed to load records from database/sheets.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleFieldChange = (dcNo: string, field: 'quotationNo' | 'quotationDate', value: string) => {
    setEditState(prev => ({
      ...prev,
      [dcNo]: {
        ...prev[dcNo],
        [field]: value,
        savedSuccess: false,
        error: undefined
      }
    }));
  };

  const handleSaveQuotation = async (dcNo: string) => {
    const itemState = editState[dcNo];
    if (!itemState) return;

    if (!itemState.quotationNo || !itemState.quotationNo.trim()) {
      alert('Please enter a Quotation Number (e.g. PLEW-Q-00123)');
      return;
    }

    setEditState(prev => ({
      ...prev,
      [dcNo]: { ...prev[dcNo], isSaving: true, error: undefined }
    }));

    try {
      const res = await updateRGPQuotationDetails(
        dcNo,
        itemState.quotationNo.trim(),
        itemState.quotationDate || new Date().toISOString().split('T')[0],
        true
      );

      if (res.success) {
        // Update local record
        setRecords(prev => prev.map(r => {
          if (r.dcNo === dcNo) {
            return {
              ...r,
              quotationRaised: 'Yes',
              quotationNo: itemState.quotationNo.trim(),
              quotationDate: itemState.quotationDate
            };
          }
          return r;
        }));

        setEditState(prev => ({
          ...prev,
          [dcNo]: { ...prev[dcNo], isSaving: false, savedSuccess: true }
        }));

        setNotification({
          type: 'success',
          message: `Quotation #${itemState.quotationNo.trim()} linked to DC #${dcNo} successfully!`
        });

        setTimeout(() => {
          setEditState(prev => ({
            ...prev,
            [dcNo]: { ...prev[dcNo], savedSuccess: false }
          }));
        }, 3000);
      } else {
        setEditState(prev => ({
          ...prev,
          [dcNo]: { ...prev[dcNo], isSaving: false, error: res.error || 'Failed to save' }
        }));
        setNotification({ type: 'error', message: res.error || 'Failed to save quotation details.' });
      }
    } catch (err: any) {
      setEditState(prev => ({
        ...prev,
        [dcNo]: { ...prev[dcNo], isSaving: false, error: err.message }
      }));
      setNotification({ type: 'error', message: err.message || 'Error communicating with server.' });
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const pending = records.filter(r => r.quotationRaised !== 'Yes' && (!r.quotationNo || r.quotationNo.trim() === '')).length;
    const raised = total - pending;
    const uniqueClients = new Set(records.map(r => r.customerName).filter(Boolean)).size;

    return { total, pending, raised, uniqueClients };
  }, [records]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const isPending = r.quotationRaised !== 'Yes' && (!r.quotationNo || r.quotationNo.trim() === '');
      
      if (activeTab === 'pending' && !isPending) return false;
      if (activeTab === 'raised' && isPending) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchDc = (r.dcNo || '').toLowerCase().includes(q);
      const matchRgp = (r.rgpNo || '').toLowerCase().includes(q);
      const matchCustomer = (r.customerName || '').toLowerCase().includes(q);
      const matchVehicle = (r.vehicleNo || '').toLowerCase().includes(q);
      const matchQNo = (r.quotationNo || '').toLowerCase().includes(q);
      const matchItems = (r.items || []).some(item => (item.description || '').toLowerCase().includes(q));

      return matchDc || matchRgp || matchCustomer || matchVehicle || matchQNo || matchItems;
    });
  }, [records, activeTab, searchQuery]);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-100 flex flex-col custom-scrollbar">
      {/* ─── Top Header ─── */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                RGPs Pending Quotation
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track received Returnable Gate Passes & Delivery Challans without quotation, and record quotation numbers.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={fetchRecords}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              href="/delivery-challan"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Delivery Challans</span>
            </Link>

            <Link
              href="/quotations/new"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-yellow-500/20 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Quotation</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Notification Banner ─── */}
      {notification && (
        <div className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between ${
          notification.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'
        }`}>
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)} 
              className="ml-auto text-white/80 hover:text-white px-2 cursor-pointer font-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 pb-24 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div 
            onClick={() => setActiveTab('pending')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Pending Quotation
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-2">
              {metrics.pending}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1">
              RGPs awaiting quotation
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('raised')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'raised'
                ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Quotation Raised
              </span>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 mt-2">
              {metrics.raised}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">
              Completed & linked
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-950/40 border-blue-500/50 ring-1 ring-blue-500/30'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Total RGPs / DCs
              </span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-300 mt-2">
              {metrics.total}
            </div>
            <div className="text-[11px] text-blue-400/80 mt-1">
              All delivery challans
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Active Clients
              </span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-300 mt-2">
              {metrics.uniqueClients}
            </div>
            <div className="text-[11px] text-purple-400/80 mt-1">
              Pharma & industrial clients
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({metrics.pending})</span>
            </button>
            <button
              onClick={() => setActiveTab('raised')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'raised'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Raised ({metrics.raised})</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All ({metrics.total})</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by RGP No, DC No, Customer Name, or Motor..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* List of RGPs */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            <div className="text-sm font-semibold text-slate-400">Loading RGPs & Delivery Challans from database...</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">
              {activeTab === 'pending' ? 'No Pending RGPs Found!' : 'No Records Match Filter'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {activeTab === 'pending'
                ? 'All Returnable Gate Passes have quotations linked, or no delivery challans have been created yet.'
                : 'Try adjusting your search query or switching tabs.'}
            </p>
            {activeTab === 'pending' && metrics.total > 0 && (
              <button
                onClick={() => setActiveTab('all')}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                View All {metrics.total} RGPs
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => {
              const currentEdit = editState[record.dcNo] || {
                quotationNo: record.quotationNo || '',
                quotationDate: record.quotationDate || record.dcDate || ''
              };

              const isQuotationRaised = record.quotationRaised === 'Yes' || (record.quotationNo && record.quotationNo.trim() !== '');

              // Build URL to open quotation with prefilled details
              const createQuotationUrl = `/quotations/new?fromRgp=1&customerName=${encodeURIComponent(record.customerName || '')}&rgpNo=${encodeURIComponent(record.rgpNo || '')}&rgpDate=${encodeURIComponent(record.rgpDate || '')}&dcNo=${encodeURIComponent(record.dcNo || '')}`;

              return (
                <div 
                  key={record.dcNo} 
                  className={`rounded-2xl border transition-all p-4 sm:p-5 shadow-lg ${
                    isQuotationRaised 
                      ? 'bg-slate-900/60 border-slate-800/90' 
                      : 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border-amber-500/30 ring-1 ring-amber-500/10'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Left: RGP & Customer Details */}
                    <div className="flex-1 space-y-3">
                      {/* Badges bar */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {isQuotationRaised ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Quotation Raised
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold animate-pulse">
                            <Clock className="w-3 h-3" />
                            Quotation Not Raised
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] font-semibold border border-slate-700">
                          DC: {record.dcNo}
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]">
                          DC Date: {record.dcDate}
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]">
                          Type: {record.challanType || 'Returnable'}
                        </span>

                        {record.vehicleNo && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px] flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {record.vehicleNo}
                          </span>
                        )}
                      </div>

                      {/* Customer & RGP Title */}
                      <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-yellow-400 shrink-0" />
                            {record.customerName || 'Unnamed Customer'}
                          </h4>
                          {record.customerGstin && (
                            <span className="text-xs font-mono text-slate-400">
                              GST: {record.customerGstin}
                            </span>
                          )}
                        </div>

                        {/* RGP Banner */}
                        <div className="mt-2 inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs">
                          <span className="font-bold text-yellow-400">
                            RGP / Gate Pass No: <span className="underline font-mono">{record.rgpNo || 'N/A'}</span>
                          </span>
                          {record.rgpDate && (
                            <span className="text-slate-400">
                              Date: <strong className="text-slate-200">{record.rgpDate}</strong>
                            </span>
                          )}
                          {record.rgpPhotoUrl && (
                            <a
                              href={record.rgpPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-yellow-400 hover:text-yellow-300 underline font-bold ml-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View RGP Copy
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Material / Motor Items Preview */}
                      {record.items && record.items.length > 0 && (
                        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Received Items / Equipment:
                          </div>
                          <div className="space-y-1">
                            {record.items.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                                <span className="font-medium text-slate-200">
                                  • {it.description || 'Motor / Equipment'}
                                </span>
                                <span className="font-mono text-slate-400 text-[11px] ml-2 shrink-0">
                                  Qty: {it.quantity} {it.uom || 'NOS'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Quotation Assignment Box & Actions */}
                    <div className="w-full lg:w-96 bg-slate-950/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between shrink-0 gap-3 shadow-inner">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-yellow-500" />
                            Quotation Details
                          </span>
                          {isQuotationRaised && (
                            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Linked
                            </span>
                          )}
                        </div>

                        {/* Inline Inputs */}
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              Quotation Number
                            </label>
                            <input
                              type="text"
                              value={currentEdit.quotationNo}
                              onChange={e => handleFieldChange(record.dcNo, 'quotationNo', e.target.value)}
                              placeholder="e.g. PLEW-Q-00123"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              Quotation Date
                            </label>
                            <input
                              type="date"
                              value={currentEdit.quotationDate}
                              onChange={e => handleFieldChange(record.dcNo, 'quotationDate', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleSaveQuotation(record.dcNo)}
                          disabled={currentEdit.isSaving}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            currentEdit.savedSuccess
                              ? 'bg-emerald-600 text-white'
                              : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-sm'
                          } disabled:opacity-50`}
                        >
                          {currentEdit.isSaving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving to Sheets...</span>
                            </>
                          ) : currentEdit.savedSuccess ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Saved Successfully!</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>{isQuotationRaised ? 'Update Quotation Details' : 'Save Quotation Details'}</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          <Link
                            href={createQuotationUrl}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors text-center"
                            title="Open New Quotation with this RGP pre-filled"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Create Quotation</span>
                          </Link>

                          <Link
                            href={`/delivery-challan`}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800 transition-colors"
                            title="Open in Delivery Challan module"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View DC</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
