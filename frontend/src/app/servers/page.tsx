'use client';

import React, { useEffect, useState } from 'react';
import {
  Server,
  Plus,
  Play,
  Square,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Globe,
  Radio,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { MCPServer } from '@/types';

export default function MCPServersPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [transportType, setTransportType] = useState<'stdio' | 'http_sse'>('stdio');
  const [command, setCommand] = useState('python3');
  const [args, setArgs] = useState('["backend/mcp_servers/opensense_builtin.py"]');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load servers' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (id: number) => {
    setActionLoading(id);
    setMsg(null);
    try {
      await api.connectServer(id);
      setMsg({ type: 'success', text: `Server #${id} connected successfully!` });
      await loadServers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Connection failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (id: number) => {
    setActionLoading(id);
    setMsg(null);
    try {
      await api.disconnectServer(id);
      setMsg({ type: 'success', text: `Server #${id} disconnected.` });
      await loadServers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Disconnect failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = async (id: number) => {
    setActionLoading(id);
    setMsg(null);
    try {
      await api.restartServer(id);
      setMsg({ type: 'success', text: `Server #${id} restarted successfully.` });
      await loadServers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Restart failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this MCP server configuration?')) return;
    setActionLoading(id);
    try {
      await api.deleteServer(id);
      setMsg({ type: 'success', text: 'Server deleted.' });
      await loadServers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Deletion failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    let parsedArgs: string[] = [];
    if (transportType === 'stdio' && args.trim()) {
      try {
        parsedArgs = JSON.parse(args);
      } catch {
        parsedArgs = args.split(' ').map((s) => s.trim()).filter(Boolean);
      }
    }

    try {
      await api.createServer({
        name: name.trim(),
        description: description.trim() || undefined,
        transport_type: transportType,
        command: transportType === 'stdio' ? command.trim() : undefined,
        args: transportType === 'stdio' ? parsedArgs : undefined,
        endpoint_url: transportType === 'http_sse' ? endpointUrl.trim() : undefined,
      });
      setModalOpen(false);
      setName('');
      setDescription('');
      setEndpointUrl('');
      setMsg({ type: 'success', text: 'MCP Server added successfully!' });
      await loadServers();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create server.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="MCP Server Manager"
      subtitle="Manage stdio subprocesses and Streamable HTTP endpoints compliant with official MCP 2.4 protocol"
      actions={
        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add MCP Server</span>
        </button>
      }
    >
      {/* Alerts */}
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

      {/* Servers List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            Scanning active MCP servers...
          </div>
        ) : servers.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
            <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-200">No MCP Servers Configured</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your first stdio subprocess or HTTP/SSE endpoint to start discovering tools and resources.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold"
            >
              Configure Server
            </button>
          </div>
        ) : (
          servers.map((srv) => (
            <div
              key={srv.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-slate-700/80 transition-all"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      srv.is_connected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {srv.transport_type === 'stdio' ? (
                      <Terminal className="w-5 h-5" />
                    ) : (
                      <Globe className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100">{srv.name}</h3>
                      {srv.is_builtin && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
                          OpenSense Built-in
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                          srv.is_connected
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            srv.is_connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        {srv.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      {srv.description || 'No description provided.'}
                    </p>

                    {/* Technical Command / Endpoint Detail */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
                        Transport: <strong className="text-slate-200">{srv.transport_type.toUpperCase()}</strong>
                      </span>
                      {srv.transport_type === 'stdio' ? (
                        <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          Cmd: <strong className="text-orange-400">{srv.command}</strong> {srv.args}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          URL: <strong className="text-orange-400">{srv.endpoint_url}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Server Control Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {srv.is_connected ? (
                    <>
                      <button
                        onClick={() => handleRestart(srv.id)}
                        disabled={actionLoading === srv.id}
                        title="Restart MCP Subprocess"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <RotateCw className={`w-4 h-4 ${actionLoading === srv.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDisconnect(srv.id)}
                        disabled={actionLoading === srv.id}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConnect(srv.id)}
                      disabled={actionLoading === srv.id}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Connect</span>
                    </button>
                  )}

                  {!srv.is_builtin && (
                    <button
                      onClick={() => handleDelete(srv.id)}
                      disabled={actionLoading === srv.id}
                      title="Delete Server"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Server Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">Add Model Context Protocol Server</h3>
            <p className="text-xs text-slate-400 mb-5">
              Connect a custom stdio process or streaming HTTP/SSE server to OpenSense Hub.
            </p>

            <form onSubmit={handleCreateServer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OpenSense Custom Analytics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Subprocess providing domain data operations"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Transport Mechanism
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransportType('stdio')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                      transportType === 'stdio'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal className="w-4 h-4" />
                    <span>stdio (Process)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransportType('http_sse')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 ${
                      transportType === 'http_sse'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Streamable HTTP</span>
                  </button>
                </div>
              </div>

              {transportType === 'stdio' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Execution Binary / Command
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. python3 or node"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Arguments (JSON Array or space-separated)
                    </label>
                    <input
                      type="text"
                      placeholder='["path/to/server.py"]'
                      value={args}
                      onChange={(e) => setArgs(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    HTTP/SSE Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://mcp.internal.opensenselabs.com/sse"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-orange-400" />
                    <span>Protected against SSRF and private metadata ranges.</span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Validating...' : 'Save & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
