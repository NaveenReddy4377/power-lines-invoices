'use client';

import React from 'react';
import { Loader2, FileText, Quote, Truck, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  isOpen: boolean;
  title: string;
  badge?: string;
  subtitle?: string;
  accentColor?: 'emerald' | 'purple' | 'amber' | 'blue';
  iconType?: 'invoice' | 'quotation' | 'delivery-challan' | 'default';
}

export default function LoadingOverlay({
  isOpen,
  title,
  badge,
  subtitle = 'Connecting to Google Sheets & retrieving latest document data...',
  accentColor = 'emerald',
  iconType = 'default'
}: LoadingOverlayProps) {
  if (!isOpen) return null;

  const colorStyles = {
    emerald: {
      border: 'border-emerald-500/30',
      glow: 'shadow-[0_0_50px_rgba(16,185,129,0.15)]',
      bgGrad: 'from-emerald-500/10 via-slate-900 to-slate-950',
      spinner: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      bar: 'from-emerald-500 to-teal-400',
      iconColor: 'text-emerald-400'
    },
    purple: {
      border: 'border-purple-500/30',
      glow: 'shadow-[0_0_50px_rgba(168,85,247,0.15)]',
      bgGrad: 'from-purple-500/10 via-slate-900 to-slate-950',
      spinner: 'text-purple-400',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      bar: 'from-purple-500 to-indigo-400',
      iconColor: 'text-purple-400'
    },
    amber: {
      border: 'border-amber-500/30',
      glow: 'shadow-[0_0_50px_rgba(245,158,11,0.15)]',
      bgGrad: 'from-amber-500/10 via-slate-900 to-slate-950',
      spinner: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      bar: 'from-amber-500 to-yellow-400',
      iconColor: 'text-amber-400'
    },
    blue: {
      border: 'border-blue-500/30',
      glow: 'shadow-[0_0_50px_rgba(59,130,246,0.15)]',
      bgGrad: 'from-blue-500/10 via-slate-900 to-slate-950',
      spinner: 'text-blue-400',
      badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      bar: 'from-blue-500 to-cyan-400',
      iconColor: 'text-blue-400'
    }
  }[accentColor];

  const renderIcon = () => {
    switch (iconType) {
      case 'invoice':
        return <FileText className={`w-6 h-6 ${colorStyles.iconColor}`} />;
      case 'quotation':
        return <Quote className={`w-6 h-6 ${colorStyles.iconColor}`} />;
      case 'delivery-challan':
        return <Truck className={`w-6 h-6 ${colorStyles.iconColor}`} />;
      default:
        return <Sparkles className={`w-6 h-6 ${colorStyles.iconColor}`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md bg-gradient-to-b ${colorStyles.bgGrad} border ${colorStyles.border} ${colorStyles.glow} rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden`}>
        
        {/* Animated Background Pulse */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        {/* Central Spinning Ring & Icon */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center shadow-inner relative z-10">
            {renderIcon()}
          </div>
          <Loader2 className={`w-20 h-20 ${colorStyles.spinner} animate-spin absolute -inset-2 z-0 opacity-80`} />
        </div>

        {/* Badge */}
        {badge && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${colorStyles.badgeBg} mb-3`}>
            <span>{badge}</span>
          </div>
        )}

        {/* Title & Description */}
        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mb-1.5">
          {title}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
          {subtitle}
        </p>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${colorStyles.bar} rounded-full animate-[progress_1.5s_ease-in-out_infinite]`} style={{ width: '60%' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(180%); }
        }
      `}</style>
    </div>
  );
}
