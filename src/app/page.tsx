import { TrendingUp, Clock, Users, Quote, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getDashboardStats } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const result = await getDashboardStats();
  const stats = result.success && result.data ? result.data : { totalRevenue: 0, customers: 0, recentInvoices: [] };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 font-sans">
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Power Lines Electrical Works — Invoice Overview</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            label="Total Revenue"
            value={`₹ ${stats.totalRevenue.toLocaleString('en-IN')}`}
            badge="LIVE"
            badgeColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            iconBg="bg-amber-50"
            label="Pending Amount"
            value="₹ 0"
            badge="N/A"
            badgeColor="text-slate-500 bg-slate-100 border-slate-200"
            muted
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            label="Customers Billed"
            value={String(stats.customers)}
            badge="LIVE"
            badgeColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          />
          <StatCard
            icon={<Quote className="w-5 h-5 text-purple-600" />}
            iconBg="bg-purple-50"
            label="Quotations Raised"
            value="0"
            badge="N/A"
            badgeColor="text-slate-500 bg-slate-100 border-slate-200"
            muted
          />
        </div>

        {/* Recent Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-800 text-sm">Recent Invoices</h3>
              </div>
              <Link href="/invoices/new" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                New Invoice <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {stats.recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">No invoices saved yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Table Header */}
                <div className="grid grid-cols-[100px_1fr_auto] gap-3 px-5 py-2 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Invoice No.</span>
                  <span>Customer</span>
                  <span className="text-right">Amount</span>
                </div>
                {stats.recentInvoices.map((inv: any) => (
                  <div key={inv.id} className="grid grid-cols-[100px_1fr_auto] gap-3 items-center px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-700">#{inv.id}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 truncate">{inv.customer}</div>
                      <div className="text-xs text-slate-400">{inv.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">₹{inv.amount.toLocaleString('en-IN')}</div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">SAVED</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Quotations */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-800 text-sm">Recent Quotations</h3>
              </div>
              <Link href="/quotations/new" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                New Quotation <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                <Quote className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-sm text-slate-500 font-medium">No quotations yet.</p>
              <Link href="/quotations/new" className="mt-3 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg transition-colors">
                Create First Quotation
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, badge, badgeColor, muted }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  badge: string;
  badgeColor: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>{badge}</span>
      </div>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${muted ? 'text-slate-300' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}
