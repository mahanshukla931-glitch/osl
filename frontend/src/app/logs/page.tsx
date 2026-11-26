'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [statusFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.resource_type && l.resource_type.toLowerCase().includes(search.toLowerCase())) ||
      (l.user_email && l.user_email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout
      title="Audit Trail & Analytics"
      subtitle="Searchable security audit log of every MCP tool invocation, authentication event, and API transaction"
      actions={
        <button
          onClick={loadLogs}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by action, email, resource type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success Only</option>
            <option value="failure">Failures Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Resource</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    Querying audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-200">
                      <span className="font-mono text-orange-400">{log.action}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {log.resource_type || 'platform'}
                      {log.resource_id && <span className="font-mono text-[10px] ml-1 text-slate-500">#{log.resource_id}</span>}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {log.user_email || `User #${log.user_id || 'system'}`}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">
                      {log.duration_ms ? `${log.duration_ms} ms` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                        title="View payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-1">Audit Record #{selectedLog.id}</h3>
            <p className="text-xs font-mono text-orange-400 mb-4">{selectedLog.action}</p>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Metadata</span>
                <div className="mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <div>Timestamp: {new Date(selectedLog.created_at).toISOString()}</div>
                  <div>Status: {selectedLog.status}</div>
                  <div>Duration: {selectedLog.duration_ms ? `${selectedLog.duration_ms} ms` : 'N/A'}</div>
                  {selectedLog.error_message && (
                    <div className="text-rose-400">Error: {selectedLog.error_message}</div>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Redacted Payload</span>
                <pre className="mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {typeof selectedLog.details === 'object'
                    ? JSON.stringify(selectedLog.details, null, 2)
                    : String(selectedLog.details || 'No additional payload')}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
