'use client';

import { useState, useEffect } from 'react';
import { PendingBill, BillFollowUp, initialPendingBillData, Client } from '@/types';
import {
  getPendingBills,
  savePendingBill,
  addBillFollowUp,
  deletePendingBill,
  triggerPendingBillAlertEmail,
  importUnpaidBillsFromSystem,
  getClients,
} from '@/app/actions';
import {
  CalendarClock,
  Plus,
  Search,
  PhoneCall,
  MessageCircle,
  Mail,
  Send,
  Calendar,
  Clock,
  User,
  Building2,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Download,
  RefreshCw,
  X,
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  History,
  Info,
} from 'lucide-react';

const OWNER_EMAIL = 'gsaireddy@powerlineselectricalwork.com';

const QUICK_FOLLOWUP_CHIPS = [
  'Promised payment by this Friday',
  'Spoke with Accounts Mgr; payment in process',
  'Promised NEFT / RTGS transfer by tomorrow',
  'Invoice submitted to accounts dept for approval',
  'Will clear 50% advance now, balance next week',
  'Follow-up call scheduled for next Monday',
  'Cheque issued, will reflect in 2 working days',
];

export default function PendingBillsPage() {
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'amount' | 'dueDate' | 'promisedDate' | 'updated'>('updated');

  // Modals
  const [showBillModal, setShowBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<PendingBill>(initialPendingBillData);
  const [triggerEmailOnBillSave, setTriggerEmailOnBillSave] = useState(true);

  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [activeBillForFollowUp, setActiveBillForFollowUp] = useState<PendingBill | null>(null);
  const [followUpForm, setFollowUpForm] = useState<{
    date: string;
    time: string;
    followedUpBy: string;
    contactPerson: string;
    contactPhone: string;
    mode: 'Phone Call' | 'WhatsApp' | 'In-Person' | 'Email';
    notes: string;
    promisedDate: string;
    nextFollowUpDate: string;
    triggerEmail: boolean;
  }>({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    followedUpBy: 'Sai Reddy',
    contactPerson: '',
    contactPhone: '',
    mode: 'Phone Call',
    notes: '',
    promisedDate: '',
    nextFollowUpDate: '',
    triggerEmail: true,
  });

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  async function loadData() {
    setIsLoading(true);
    try {
      const [billsData, clientsData] = await Promise.all([
        getPendingBills(),
        getClients().catch(() => []),
      ]);
      setBills(billsData || []);
      setClients(clientsData || []);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load pending bills: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  // Auto import unpaid invoices & cash bills
  const handleAutoImport = async () => {
    setIsImporting(true);
    try {
      const res = await importUnpaidBillsFromSystem();
      if (res.success) {
        showToast(
          res.importedCount > 0
            ? `Successfully imported ${res.importedCount} unpaid bills from Invoices & Cash Bills!`
            : 'All unpaid invoices and cash bills are already up to date in the tracker.',
          'success'
        );
        await loadData();
      } else {
        showToast(res.error || 'Failed to import unpaid bills', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Import error', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Open Add Bill modal
  const handleOpenAddBill = () => {
    setEditingBill({
      ...initialPendingBillData,
      id: '',
      billDate: new Date().toISOString().split('T')[0],
    });
    setTriggerEmailOnBillSave(true);
    setShowBillModal(true);
  };

  // Open Edit Bill modal
  const handleOpenEditBill = (bill: PendingBill) => {
    setEditingBill(bill);
    setTriggerEmailOnBillSave(false);
    setShowBillModal(true);
  };

  // Save Bill
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill.billName.trim()) {
      alert('Please enter Party / Customer Name.');
      return;
    }
    if (!editingBill.pendingAmount || editingBill.pendingAmount <= 0) {
      alert('Please enter a valid pending amount.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await savePendingBill(editingBill, triggerEmailOnBillSave);
      if (res.success) {
        showToast(
          triggerEmailOnBillSave
            ? `Pending bill saved & alert triggered to ${OWNER_EMAIL}!`
            : 'Pending bill saved successfully!',
          'success'
        );
        setShowBillModal(false);
        await loadData();
      } else {
        showToast(res.error || 'Failed to save pending bill', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Save error occurred', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Follow-up modal
  const handleOpenFollowUp = (bill: PendingBill) => {
    setActiveBillForFollowUp(bill);
    setFollowUpForm({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      followedUpBy: 'Sai Reddy',
      contactPerson: bill.contactPerson || '',
      contactPhone: bill.contactPhone || '',
      mode: 'Phone Call',
      notes: '',
      promisedDate: bill.promisedDate || '',
      nextFollowUpDate: '',
      triggerEmail: true,
    });
    setShowFollowUpModal(true);
  };

  // Submit Follow-up
  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBillForFollowUp) return;
    if (!followUpForm.notes.trim()) {
      alert('Please enter follow-up conversation notes.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await addBillFollowUp(
        activeBillForFollowUp.id,
        {
          date: followUpForm.date,
          time: followUpForm.time,
          followedUpBy: followUpForm.followedUpBy,
          contactPerson: followUpForm.contactPerson,
          contactPhone: followUpForm.contactPhone,
          mode: followUpForm.mode,
          notes: followUpForm.notes.trim(),
          promisedDate: followUpForm.promisedDate || undefined,
          nextFollowUpDate: followUpForm.nextFollowUpDate || undefined,
        },
        followUpForm.triggerEmail
      );

      if (res.success) {
        showToast(
          followUpForm.triggerEmail
            ? `Follow-up logged & email alert sent to ${OWNER_EMAIL}!`
            : 'Follow-up logged successfully!',
          'success'
        );
        setShowFollowUpModal(false);
        await loadData();
      } else {
        showToast(res.error || 'Failed to log follow-up', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error occurred while saving follow-up', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Manual Trigger Alert Email
  const handleTriggerEmailAlert = async (bill: PendingBill) => {
    const confirmSend = confirm(
      `Trigger payment follow-up alert email for "${bill.billName}" (₹${bill.pendingAmount}) to ${OWNER_EMAIL}?`
    );
    if (!confirmSend) return;

    try {
      showToast(`Triggering alert email to ${OWNER_EMAIL}...`, 'info');
      const res = await triggerPendingBillAlertEmail(bill.id);
      if (res.success) {
        showToast(`Email alert successfully sent to ${OWNER_EMAIL}!`, 'success');
      } else {
        showToast(res.error || 'Failed to send alert email', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Email trigger error', 'error');
    }
  };

  // Quick Mark as Cleared
  const handleMarkCleared = async (bill: PendingBill) => {
    const confirmClear = confirm(`Mark bill for "${bill.billName}" as Cleared / Paid in full?`);
    if (!confirmClear) return;

    try {
      const updated: PendingBill = {
        ...bill,
        status: 'Cleared / Paid',
        pendingAmount: 0,
        updatedAt: new Date().toISOString(),
      };
      const res = await savePendingBill(updated, true);
      if (res.success) {
        showToast(`Marked as Cleared! Notice sent to ${OWNER_EMAIL}.`, 'success');
        await loadData();
      }
    } catch (e: any) {
      showToast('Update failed: ' + e.message, 'error');
    }
  };

  // Delete bill
  const handleDeleteBill = async (id: string, name: string) => {
    if (!confirm(`Delete pending bill record for "${name}"?`)) return;
    try {
      const res = await deletePendingBill(id);
      if (res.success) {
        showToast('Record deleted.', 'info');
        setBills(prev => prev.filter(b => b.id !== id));
      }
    } catch (e: any) {
      showToast('Delete error: ' + e.message, 'error');
    }
  };

  // Calculations & KPIs
  const totalOutstanding = bills
    .filter(b => b.status !== 'Cleared / Paid')
    .reduce((sum, b) => sum + Number(b.pendingAmount || 0), 0);

  const activeBillsCount = bills.filter(b => b.status !== 'Cleared / Paid').length;

  const promisedBills = bills.filter(
    b => b.status === 'Promised Payment' || (b.promisedDate && b.status !== 'Cleared / Paid')
  );
  const promisedTotal = promisedBills.reduce((sum, b) => sum + Number(b.pendingAmount || 0), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayOrOverdue = bills.filter(b => {
    if (b.status === 'Cleared / Paid') return false;
    if (b.promisedDate && b.promisedDate <= todayStr) return true;
    if (b.dueDate && b.dueDate <= todayStr) return true;
    return false;
  }).length;

  // Filtered & Sorted Bills
  const filteredBills = bills
    .filter(b => {
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        b.billName.toLowerCase().includes(q) ||
        (b.billNo && b.billNo.toLowerCase().includes(q)) ||
        (b.contactPerson && b.contactPerson.toLowerCase().includes(q)) ||
        (b.contactPhone && b.contactPhone.includes(q)) ||
        (b.notes && b.notes.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'amount') return Number(b.pendingAmount || 0) - Number(a.pendingAmount || 0);
      if (sortBy === 'dueDate') return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      if (sortBy === 'promisedDate') return (a.promisedDate || '9999').localeCompare(b.promisedDate || '9999');
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white text-sm font-semibold transition-all transform animate-bounce-short ${
            toast.type === 'error'
              ? 'bg-rose-600'
              : toast.type === 'info'
              ? 'bg-sky-600'
              : 'bg-emerald-600'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                Pending Bills & Follow-ups
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Payment collections, customer follow-up notes & automated email triggers to{' '}
                <span className="font-semibold text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded">
                  {OWNER_EMAIL}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleAutoImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
            title="Import unpaid records from Invoices and Cash Bills"
          >
            <RefreshCw className={`w-4 h-4 ${isImporting ? 'animate-spin text-amber-500' : 'text-slate-500'}`} />
            <span>{isImporting ? 'Syncing...' : 'Auto-Sync Unpaid Bills'}</span>
          </button>

          <button
            onClick={handleOpenAddBill}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-500/25 hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Pending Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Outstanding */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Outstanding</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹ {totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            Across {activeBillsCount} active pending bills
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Accounts</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {activeBillsCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {bills.filter(b => b.status === 'Cleared / Paid').length} bills cleared
          </div>
        </div>

        {/* Promised Payments */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Promised Payments</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">
            ₹ {promisedTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {promisedBills.length} parties committed dates
          </div>
        </div>

        {/* Due Today / Overdue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Follow-up Due / Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {dueTodayOrOverdue}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Requiring immediate follow-up
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer, bill number, contact person, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['All', 'Pending', 'Promised Payment', 'Follow-up Done', 'Partially Paid', 'Cleared / Paid'].map(st => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="updated">Recently Updated</option>
            <option value="amount">Highest Amount</option>
            <option value="promisedDate">Promised Date</option>
            <option value="dueDate">Due Date</option>
          </select>
        </div>
      </div>

      {/* Bills Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <div className="text-base font-bold text-slate-700">Loading pending bills...</div>
          <div className="text-xs text-slate-400 mt-1">Retrieving dual-synced records from Supabase & Google Sheets</div>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No pending bills found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {search || statusFilter !== 'All'
              ? 'Try changing your search keywords or filter criteria.'
              : 'Add your first pending bill or click Auto-Sync to import unpaid invoices and cash bills automatically.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleAutoImport}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              Auto-Sync from Invoices
            </button>
            <button
              onClick={handleOpenAddBill}
              className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-amber-600 transition-all"
            >
              Add Pending Bill
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBills.map(bill => {
            const isCleared = bill.status === 'Cleared / Paid';
            const hasPromised = Boolean(bill.promisedDate && !isCleared);
            const isOverdue = Boolean(
              !isCleared &&
                ((bill.dueDate && bill.dueDate < todayStr) || (bill.promisedDate && bill.promisedDate < todayStr))
            );

            const lastFu = (bill.followUps && bill.followUps.length > 0) ? bill.followUps[0] : null;

            return (
              <div
                key={bill.id}
                className={`bg-white border rounded-2xl p-5 transition-all shadow-sm hover:shadow-md ${
                  isCleared
                    ? 'border-slate-200 opacity-75'
                    : isOverdue
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Customer & Bill details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                      <span className="font-extrabold text-lg text-slate-900">{bill.billName}</span>

                      {/* Type Badge */}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {bill.billType || 'Invoice'} #{bill.billNo || 'N/A'}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isCleared
                            ? 'bg-emerald-100 text-emerald-800'
                            : bill.status === 'Promised Payment'
                            ? 'bg-amber-100 text-amber-800'
                            : bill.status === 'Follow-up Done'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {bill.status}
                      </span>

                      {/* Overdue alert */}
                      {isOverdue && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 animate-pulse">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap mt-2">
                      {bill.billDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Bill Date: {bill.billDate.split('-').reverse().join('/')}
                        </span>
                      )}
                      {bill.dueDate && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-bold' : ''}`}>
                          <Clock className="w-3.5 h-3.5" />
                          Due: {bill.dueDate.split('-').reverse().join('/')}
                        </span>
                      )}
                      {bill.contactPerson && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {bill.contactPerson}
                        </span>
                      )}
                      {bill.contactPhone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${bill.contactPhone}`}
                            className="flex items-center gap-1 text-slate-700 font-semibold hover:text-amber-600"
                            title="Call customer"
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                            {bill.contactPhone}
                          </a>
                          <a
                            href={`https://wa.me/91${bill.contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Dear ${bill.contactPerson || bill.billName}, this is a gentle reminder regarding pending payment of Rs. ${bill.pendingAmount} for ${bill.billType} #${bill.billNo} from Power Lines Electrical Works.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700"
                            title="Send WhatsApp reminder"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-100" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Latest Follow-up Box */}
                    {lastFu ? (
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-bold text-slate-900 mr-1.5">
                            Last Follow-up ({lastFu.mode || 'Call'}):
                          </span>
                          <span className="italic text-slate-600">"{lastFu.notes}"</span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            — {lastFu.followedUpBy || 'Staff'} on {lastFu.date.split('-').reverse().join('/')}
                          </span>
                        </div>
                        {lastFu.promisedDate && (
                          <div className="shrink-0 bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
                            <span>📅 Promised: {lastFu.promisedDate.split('-').reverse().join('/')}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-slate-400 italic">
                        No follow-up notes logged yet. Click &quot;Log Follow-up&quot; below to record a conversation.
                      </div>
                    )}
                  </div>

                  {/* Right Column: Amount & Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="text-left lg:text-right">
                      <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                        Pending Amount
                      </div>
                      <div
                        className={`text-2xl font-black tracking-tight ${
                          isCleared ? 'text-slate-400 line-through' : 'text-emerald-700'
                        }`}
                      >
                        ₹ {Number(bill.pendingAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                      {bill.totalAmount && bill.totalAmount > bill.pendingAmount && (
                        <div className="text-[11px] text-slate-400">
                          Total: ₹ {Number(bill.totalAmount).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Log Follow-up Button */}
                      <button
                        onClick={() => handleOpenFollowUp(bill)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow transition-all"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Log Follow-up</span>
                        {bill.followUps && bill.followUps.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.2 bg-amber-700 text-white rounded-full text-[10px]">
                            {bill.followUps.length}
                          </span>
                        )}
                      </button>

                      {/* Trigger Alert Email Button */}
                      <button
                        onClick={() => handleTriggerEmailAlert(bill)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all"
                        title={`Trigger email alert directly to ${OWNER_EMAIL}`}
                      >
                        <Mail className="w-4 h-4 text-slate-600" />
                      </button>

                      {/* Mark as Cleared */}
                      {!isCleared && (
                        <button
                          onClick={() => handleMarkCleared(bill)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all"
                          title="Mark this bill as Paid / Cleared"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Edit Bill */}
                      <button
                        onClick={() => handleOpenEditBill(bill)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                        title="Edit Bill Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteBill(bill.id, bill.billName)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: LOG CUSTOMER FOLLOW-UP
      ───────────────────────────────────────────────────────────────────────────── */}
      {showFollowUpModal && activeBillForFollowUp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Customer Discussion & Follow-up
                </div>
                <div className="text-lg font-extrabold mt-0.5 truncate max-w-md">
                  {activeBillForFollowUp.billName}
                </div>
              </div>
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary Strip */}
            <div className="bg-amber-50/80 px-6 py-3 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900 font-semibold">
              <div>
                <span>Bill: </span>
                <span className="font-bold">
                  {activeBillForFollowUp.billType} #{activeBillForFollowUp.billNo || 'N/A'}
                </span>
              </div>
              <div>
                <span>Pending Balance: </span>
                <span className="text-sm font-extrabold text-emerald-700">
                  ₹ {Number(activeBillForFollowUp.pendingAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitFollowUp} className="p-6 space-y-4">
              {/* Date & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    required
                    value={followUpForm.date}
                    onChange={e => setFollowUpForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Communication Mode
                  </label>
                  <select
                    value={followUpForm.mode}
                    onChange={e => setFollowUpForm(prev => ({ ...prev, mode: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Phone Call">📞 Phone Call</option>
                    <option value="WhatsApp">💬 WhatsApp Message</option>
                    <option value="In-Person">🤝 In-Person Visit</option>
                    <option value="Email">✉️ Email Follow-up</option>
                  </select>
                </div>
              </div>

              {/* Followed Up By & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Followed Up By
                  </label>
                  <input
                    type="text"
                    required
                    value={followUpForm.followedUpBy}
                    onChange={e => setFollowUpForm(prev => ({ ...prev, followedUpBy: e.target.value }))}
                    placeholder="Staff name (e.g. Sai Reddy)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact Person Spoken With
                  </label>
                  <input
                    type="text"
                    value={followUpForm.contactPerson}
                    onChange={e => setFollowUpForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Manager / Accounts Person name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Promised Date & Next Follow-up Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                  <label className="block text-xs font-bold text-emerald-800 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Promised Payment Date
                  </label>
                  <input
                    type="date"
                    value={followUpForm.promisedDate}
                    onChange={e => setFollowUpForm(prev => ({ ...prev, promisedDate: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-sm text-emerald-950 font-semibold focus:outline-none"
                  />
                  <span className="text-[10px] text-emerald-700 mt-1 block">
                    Customer promised to pay by this date
                  </span>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <label className="block text-xs font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Next Follow-up Due
                  </label>
                  <input
                    type="date"
                    value={followUpForm.nextFollowUpDate}
                    onChange={e => setFollowUpForm(prev => ({ ...prev, nextFollowUpDate: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm text-amber-950 focus:outline-none"
                  />
                  <span className="text-[10px] text-amber-700 mt-1 block">
                    Schedule next reminder call
                  </span>
                </div>
              </div>

              {/* Remarks / Discussion Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Discussion Summary & Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={followUpForm.notes}
                  onChange={e => setFollowUpForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Detail what the customer said (e.g. Accounts manager verified invoice, payment scheduled for Friday morning)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />

                {/* Quick chip suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] font-bold text-slate-400">Quick templates:</span>
                  {QUICK_FOLLOWUP_CHIPS.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setFollowUpForm(prev => ({
                          ...prev,
                          notes: prev.notes ? `${prev.notes}. ${chip}` : chip,
                        }))
                      }
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Trigger Checkbox */}
              <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="triggerEmailCheckbox"
                  checked={followUpForm.triggerEmail}
                  onChange={e => setFollowUpForm(prev => ({ ...prev, triggerEmail: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="triggerEmailCheckbox" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold text-slate-900 block">
                    Trigger instant notification email to {OWNER_EMAIL}
                  </span>
                  Sends an automated HTML summary with promised date, party name, and discussion notes.
                </label>
              </div>

              {/* Past follow-ups list */}
              {activeBillForFollowUp.followUps && activeBillForFollowUp.followUps.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    Past Follow-up History ({activeBillForFollowUp.followUps.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {activeBillForFollowUp.followUps.map(fu => (
                      <div key={fu.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-slate-500 font-medium">
                          <span>
                            {fu.date.split('-').reverse().join('/')} • {fu.mode}
                          </span>
                          <span className="font-semibold text-slate-700">{fu.followedUpBy}</span>
                        </div>
                        <div className="text-slate-800 mt-1 font-normal">&quot;{fu.notes}&quot;</div>
                        {fu.promisedDate && (
                          <div className="text-emerald-700 font-bold mt-1 text-[11px]">
                            Promised: {fu.promisedDate.split('-').reverse().join('/')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFollowUpModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSaving ? 'Saving & Alerting...' : 'Save Follow-up & Alert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: ADD / EDIT PENDING BILL
      ───────────────────────────────────────────────────────────────────────────── */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {editingBill.id ? 'Edit Pending Bill' : 'New Pending Bill'}
                </div>
                <div className="text-lg font-extrabold mt-0.5">
                  {editingBill.id ? editingBill.billName : 'Record Pending Account'}
                </div>
              </div>
              <button
                onClick={() => setShowBillModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveBill} className="p-6 space-y-4">
              {/* Customer / Party Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer / Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="clients-list"
                  value={editingBill.billName}
                  onChange={e => {
                    const val = e.target.value;
                    const matchedClient = clients.find(
                      c => c.name.toLowerCase() === val.toLowerCase()
                    );
                    setEditingBill(prev => ({
                      ...prev,
                      billName: val,
                      contactPerson: matchedClient?.name || prev.contactPerson,
                      contactPhone: matchedClient?.phone || prev.contactPhone,
                    }));
                  }}
                  placeholder="Enter or select customer / company name..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-semibold"
                />
                <datalist id="clients-list">
                  {clients.map(c => (
                    <option key={c.id || c.name} value={c.name} />
                  ))}
                </datalist>
              </div>

              {/* Bill No & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bill / Invoice Number
                  </label>
                  <input
                    type="text"
                    value={editingBill.billNo}
                    onChange={e => setEditingBill(prev => ({ ...prev, billNo: e.target.value }))}
                    placeholder="e.g. PLEW001230 or CB-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bill Type
                  </label>
                  <select
                    value={editingBill.billType}
                    onChange={e => setEditingBill(prev => ({ ...prev, billType: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Invoice">Tax Invoice (GST)</option>
                    <option value="Cash Bill">Cash Bill (No GST)</option>
                    <option value="Quotation">Quotation / Estimate</option>
                    <option value="Manual / Direct">Manual / Direct Work</option>
                  </select>
                </div>
              </div>

              {/* Pending Amount & Total Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Pending Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingBill.pendingAmount || ''}
                      onChange={e =>
                        setEditingBill(prev => ({
                          ...prev,
                          pendingAmount: parseFloat(e.target.value) || 0,
                          totalAmount: prev.totalAmount ? prev.totalAmount : parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Total Bill Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editingBill.totalAmount || ''}
                      onChange={e =>
                        setEditingBill(prev => ({
                          ...prev,
                          totalAmount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="Optional total original amount"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bill Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bill Date
                  </label>
                  <input
                    type="date"
                    value={editingBill.billDate}
                    onChange={e => setEditingBill(prev => ({ ...prev, billDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={editingBill.dueDate}
                    onChange={e => setEditingBill(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editingBill.contactPerson}
                    onChange={e => setEditingBill(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Name of contact person"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editingBill.contactPhone}
                    onChange={e => setEditingBill(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="Mobile / Phone number"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Current Status
                </label>
                <select
                  value={editingBill.status}
                  onChange={e => setEditingBill(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="Pending">Pending</option>
                  <option value="Promised Payment">Promised Payment</option>
                  <option value="Follow-up Done">Follow-up Done</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Cleared / Paid">Cleared / Paid</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  General Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={editingBill.notes}
                  onChange={e => setEditingBill(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about work done, purchase order reference, etc..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Trigger email toggle */}
              {!editingBill.id && (
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="triggerNewBillEmail"
                    checked={triggerEmailOnBillSave}
                    onChange={e => setTriggerEmailOnBillSave(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <label htmlFor="triggerNewBillEmail" className="text-xs text-slate-700 cursor-pointer">
                    <span className="font-bold text-slate-900 block">
                      Trigger email notification to {OWNER_EMAIL}
                    </span>
                    Notifies owner about this newly recorded pending account.
                  </label>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save Pending Bill'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
