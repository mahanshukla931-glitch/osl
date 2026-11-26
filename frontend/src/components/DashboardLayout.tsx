'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '@/lib/auth-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function DashboardLayout({
  children,
  title,
  subtitle,
  actions,
}: DashboardLayoutProps) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center animate-spin">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
        <p className="text-sm font-medium text-slate-400">Authenticating OpenSense Labs Session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        <Navbar title={title} subtitle={subtitle} actions={actions} />
        <main className="p-6 flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
