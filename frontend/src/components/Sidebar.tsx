'use client';

import React from 'react';
import Link from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Wrench,
  Layers,
  FileCode,
  MessageSquare,
  Globe,
  Activity,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import OpenSenseLogo from './OpenSenseLogo';
import { useAuth } from '@/lib/auth-context';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'MCP Servers', href: '/servers', icon: Server, badge: 'Live' },
    { name: 'Tools Explorer', href: '/tools', icon: Wrench },
    { name: 'MCP Resources', href: '/resources', icon: Layers },
    { name: 'MCP Prompts', href: '/prompts', icon: FileCode },
    { name: 'AI Chat Hub', href: '/chat', icon: MessageSquare, highlight: true },
    { name: 'Custom APIs', href: '/custom-apis', icon: Globe },
    { name: 'Audit & Logs', href: '/logs', icon: Activity },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ name: 'Admin Panel', href: '/admin', icon: Shield, badge: 'OSL' });
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      <div>
        {/* Logo and Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <OpenSenseLogo size="md" />
        </div>

        {/* Exclusive Domain Pill */}
        <div className="mx-4 mt-3 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-orange-400">Domain Auth</span>
          <span className="text-[11px] font-mono text-slate-300">@opensenselabs.com</span>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1 mt-2 overflow-y-auto max-h-[calc(100vh-250px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-orange-400 border border-orange-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.highlight && !item.badge && !isActive && (
                  <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                )}
              </a>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'OpenSense Member'}</p>
              <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
