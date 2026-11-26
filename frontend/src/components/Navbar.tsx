'use client';

import React from 'react';
import { Bell, Sparkles, ShieldCheck, Terminal, Cpu } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface NavbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Navbar({ title, subtitle, actions }: NavbarProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-400">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Actions slot */}
        {actions}

        {/* MCP Status pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>MCP Protocol 2.4 Active</span>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden sm:inline">SSRF & Fernet Guard</span>
        </div>

        {/* Role tag */}
        <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[11px] font-bold uppercase tracking-wider">
          {user?.role === 'admin' ? 'Super Admin' : 'Engineer'}
        </span>
      </div>
    </header>
  );
}
