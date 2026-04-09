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
  List as ListIcon
} from 'lucide-react';
import Link from 'next/link';

interface Record {
  id: string;
  date: string;
  customer: string;
  amount: number;
}

interface DashboardManagerProps {
  invoices: Record[];
  quotations: Record[];
}

export default function DashboardManager({ invoices, quotations }: DashboardManagerProps) {
  const [viewAllType, setViewAllType] = useState<'invoices' | 'quotations' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month'>('all');

  const filteredInvoices = useMemo(() => {
    return filterRecords(invoices, searchQuery, dateFilter);
  }, [invoices, searchQuery, dateFilter]);

  const filteredQuotations = useMemo(() => {
    return filterRecords(quotations, searchQuery, dateFilter);
  }, [quotations, searchQuery, dateFilter]);

  function filterRecords(records: Record[], query: string, filter: string) {
    let filtered = records;
    
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(r => 
        r.id.toLowerCase().includes(q) || 
        r.customer.toLowerCase().includes(q)
      );
    }

    if (filter !== 'all') {
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

  const activeRecords = viewAllType === 'invoices' ? filteredInvoices : filteredQuotations;
  const title = viewAllType === 'invoices' ? 'Invoice Management' : 'Quotation History';
  const accentColor = viewAllType === 'invoices' ? 'blue' : 'purple';

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Summary List */}
        <RecordList 
          title="Invoice Management"
          icon={<FileText className="w-4 h-4 text-slate-400" />}
          records={invoices.slice(0, 10)}
          type="invoices"
          onViewAll={() => setViewAllType('invoices')}
          accentColor="blue"
        />

        {/* Quotation Summary List */}
        <RecordList 
          title="Quotation History"
          icon={<Quote className="w-4 h-4 text-slate-400" />}
          records={quotations.slice(0, 10)}
          type="quotations"
          onViewAll={() => setViewAllType('quotations')}
          accentColor="purple"
        />
      </div>

      {/* View All Overlay */}
      {viewAllType && (
        <div className="fixed inset-0 z-[300] bg-slate-100/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Overlay Header */}
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r ${accentColor === 'blue' ? 'from-blue-50/50' : 'from-purple-50/50'} to-transparent`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${accentColor === 'blue' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                  {viewAllType === 'invoices' ? <FileText className={`w-5 h-5 text-blue-600`} /> : <Quote className={`w-5 h-5 text-purple-600`} />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                  <p className="text-xs text-slate-500 font-medium">Search and filter all existing records</p>
                </div>
              </div>
              <button 
                onClick={() => setViewAllType(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search by Customer Name or ID (e.g. PLEW...)"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-200 focus:outline-none transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
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
                </div>
              </div>
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-y-auto p-0 min-h-0">
              <div className="min-w-full inline-block align-middle">
                <div className="overflow-hidden border-b border-gray-200">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {activeRecords.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-20 text-center">
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
                              <div className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">{r.customer}</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-slate-900">₹ {r.amount.toLocaleString('en-IN')}</span>
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
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Showing {activeRecords.length} records</span>
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

function RecordList({ title, icon, records, type, onViewAll, accentColor }: any) {
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
          records.map((r: any) => (
            <div key={r.id} className="grid grid-cols-[80px_1fr_100px_40px] gap-3 items-center px-5 py-2.5 hover:bg-slate-50 transition-colors">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-600">#{r.id}</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{r.customer}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{r.date}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-800">₹{r.amount.toLocaleString('en-IN')}</div>
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
          )
        ))}
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
