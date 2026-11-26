'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';
import OpenSenseLogo from '@/components/OpenSenseLogo';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Pre-validate domain
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@opensenselabs.com')) {
      setError('Access Restricted: Only verified @opensenselabs.com accounts are permitted to sign in.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({ email: cleanEmail, password });
      login(res.access_token, res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (role: 'admin' | 'dev') => {
    if (role === 'admin') {
      setEmail('admin@opensenselabs.com');
      setPassword('OpenSense@2026!');
    } else {
      setEmail('developer@opensenselabs.com');
      setPassword('OpenSense@2026!');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <OpenSenseLogo size="lg" className="justify-center mb-2" />
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-2">
            OpenSense Labs AI Assistant
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Internal Enterprise AI workspace for OpenSense Labs team members (HR, Marketing, Engineering, Sales).
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="work-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="work-email"
                  type="email"
                  required
                  placeholder="name@opensenselabs.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="work-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="work-password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to OpenSense AI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Login Helper for Review / Demo */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                Quick Fill OpenSense Credentials:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickLogin('admin')}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span className="block font-bold text-orange-400">Super Admin</span>
                <span className="text-[10px] text-slate-400 truncate block">admin@opensenselabs.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('dev')}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                <span className="block font-bold text-amber-400">Software Engineer</span>
                <span className="text-[10px] text-slate-400 truncate block">developer@opensenselabs.com</span>
              </button>
            </div>
          </div>

          {/* Domain restriction notice */}
          <div className="mt-5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strictly restricted to <strong>@opensenselabs.com</strong></span>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Need an account?{' '}
          <Link href="/register" className="text-orange-400 font-semibold hover:underline">
            Register OpenSense Account
          </Link>
        </p>
      </div>
    </main>
  );
}
