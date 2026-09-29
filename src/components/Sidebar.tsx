'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Receipt, Quote, Users, Settings, Zap, Database, ChevronLeft, ChevronRight, Building2, Package, Truck, CalendarClock } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/invoices/new', icon: FileText, label: 'New Invoice' },
  { href: '/cash-bills/new', icon: Receipt, label: 'Cash Bill (No GST)' },
  { href: '/pending-bills', icon: CalendarClock, label: 'Pending Bills & Follow-ups' },
  { href: '/quotations/new', icon: Quote, label: 'Quotations' },
  { href: '/delivery-challan', icon: Truck, label: 'Delivery Challan' },
  { href: '/clients', icon: Building2, label: 'Clients CRM' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/motor-quotations', icon: Zap, label: 'Motor Quotation' },
  { href: '/gst-reports', icon: Database, label: 'GST Returns' },
  { href: '/attendance', icon: Users, label: 'Staff & Payroll' },
  { href: '#', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 print:hidden shadow-sm relative group`}>
      {/* Toggle Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm z-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo / Brand */}
      <div className={`px-5 py-5 border-b border-slate-100 flex items-center ${collapsed ? 'justify-center px-0' : ''}`}>
        <div className="flex items-center gap-3 w-full justify-center lg:justify-start">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shrink-0 shadow-md mx-auto lg:mx-0">
            <Zap className="w-6 h-6 text-white fill-white stroke-none" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap transition-all duration-300">
              <div className="text-[11px] font-bold text-yellow-600 uppercase tracking-widest leading-none">Power Lines</div>
              <div className="text-sm font-bold text-slate-800 leading-tight">Electrical Works</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                collapsed ? 'justify-center px-0' : 'px-3'
              } ${
                active
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-yellow-600' : 'text-slate-400'}`} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-500" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 flex justify-center">
        <div className={`flex items-center gap-3 p-2 rounded-lg bg-slate-50 ${collapsed ? 'justify-center w-full' : 'w-full'}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow mx-auto lg:mx-0">
            N
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden transition-all duration-300">
              <div className="text-xs font-semibold text-slate-800 truncate">Naveen Reddy</div>
              <div className="text-[10px] text-slate-500 truncate">Power Lines Electrical Works</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
