'use client';

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
  Building,
  RefreshCw,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { User } from '@/types';
import { useAuth } from '@/lib/auth-context';

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, summaryData] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminSummary(),
      ]);
      setUsers(userData);
      setSummary(summaryData);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load admin data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (targetUser: User) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await api.updateAdminUser(targetUser.id, { role: nextRole });
      setMsg({ type: 'success', text: `Updated ${targetUser.email} role to ${nextRole}.` });
      await loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update role.' });
    }
  };

  const handleActiveToggle = async (targetUser: User) => {
    const nextActive = !targetUser.is_active;
    try {
      await api.updateAdminUser(targetUser.id, { is_active: nextActive });
      setMsg({
        type: 'success',
        text: `${targetUser.email} account has been ${nextActive ? 'activated' : 'deactivated'}.`,
      });
      await loadData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to change status.' });
    }
  };

  return (
    <DashboardLayout
      title="OpenSense Labs Governance & Admin Panel"
      subtitle="Super administrator controls for team membership, roles, and platform health"
      actions={
        <button
          onClick={loadData}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {msg && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-xs ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total OpenSense Members
          </span>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary?.total_users || users.length}
          </div>
          <p className="text-[11px] text-orange-400 mt-1">Verified @opensenselabs.com accounts</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Active MCP Servers
          </span>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary?.total_servers || 1}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">Live stdio / HTTP endpoints</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Audit Records
          </span>
          <div className="text-3xl font-extrabold text-white mt-1">
            {summary?.total_audit_logs || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Indexed in persistent store</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100">OpenSense Labs Team Roster</h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage permissions, administrative roles, and active status</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Work Email</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Account Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Loading team members...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-200">
                      {u.full_name}
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {u.email}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {u.department || 'AI Solutions'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {u.role === 'admin' ? 'Super Admin' : 'Engineer'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      {u.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleRoleToggle(u)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300"
                          >
                            {u.role === 'admin' ? 'Demote' : 'Promote to Admin'}
                          </button>
                          <button
                            onClick={() => handleActiveToggle(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                              u.is_active
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
