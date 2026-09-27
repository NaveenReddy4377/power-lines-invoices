import { TrendingUp, Clock, Users, Quote, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getDashboardStats } from '@/app/actions';
import DashboardManager from '@/components/DashboardManager';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const result = await getDashboardStats();
  const stats = result.success && result.data ? result.data : { totalRevenue: 0, customers: 0, recentInvoices: [], recentQuotations: [], recentDeliveryChallans: [] };

  let overdueAmount = 0;
  let overdueCount = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  stats.recentInvoices.forEach((inv: any) => {
    if (inv.status === 'Pending' && inv.dueDate) {
      const due = new Date(inv.dueDate);
      if (due < today) {
        overdueAmount += inv.amount;
        overdueCount++;
      }
    }
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-50 font-sans pb-20">
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight" style={{color:"orange"}}>Power Lines Electrical Works</h1>
            {/* <p className="text-sm text-slate-500 mt-1 font-medium">Real-time Financial Insight</p> */}
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live & Syncing
          </div>
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
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            iconBg="bg-red-50"
            label="Overdue Balance"
            value={`₹ ${overdueAmount.toLocaleString('en-IN')}`}
            badge={`${overdueCount} Invoices`}
            badgeColor="text-red-700 bg-red-50 border-red-200"
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
            value={String(stats.recentQuotations.length)}
            badge="LIVE"
            badgeColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          />
        </div>

        {/* Interactive Manager */}
        <DashboardManager 
          invoices={stats.recentInvoices} 
          quotations={stats.recentQuotations} 
          deliveryChallans={stats.recentDeliveryChallans || []}
        />

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
