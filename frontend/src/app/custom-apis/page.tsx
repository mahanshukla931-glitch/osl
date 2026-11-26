'use client';

import React, { useEffect, useState } from 'react';
import {
  Globe,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Code2,
  Lock,
  Clock,
  Layers,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { CustomAPI } from '@/types';

export default function CustomAPIsPage() {
  const [apis, setApis] = useState<CustomAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedApi, setSelectedApi] = useState<CustomAPI | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [authType, setAuthType] = useState<'none' | 'api_key' | 'bearer' | 'basic'>('none');
  const [authValue, setAuthValue] = useState('');
  const [exposeAsMcpTool, setExposeAsMcpTool] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAPIs();
  }, []);

  const loadAPIs = async () => {
    try {
      const data = await api.getCustomAPIs();
      setApis(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load APIs' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAPI = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      await api.createCustomAPI({
        name: name.trim(),
        description: description.trim() || undefined,
        base_url: baseUrl.trim(),
        endpoint: endpoint.trim(),
        method,
        auth_type: authType,
        auth_value: authValue.trim() || undefined,
        expose_as_mcp_tool: exposeAsMcpTool,
      });

      setModalOpen(false);
      setName('');
      setDescription('');
      setBaseUrl('');
      setEndpoint('');
      setAuthValue('');
      setMsg({ type: 'success', text: 'Custom REST API integration created and verified.' });
      await loadAPIs();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to create API.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAPI = async (id: number) => {
    if (!confirm('Are you sure you want to remove this API integration?')) return;
    try {
      await api.deleteCustomAPI(id);
      setMsg({ type: 'success', text: 'API deleted.' });
      await loadAPIs();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Deletion failed.' });
    }
  };

  const handleOpenTest = (item: CustomAPI) => {
    setSelectedApi(item);
    setTestResult(null);
    setTestModalOpen(true);
  };

  const handleExecuteTest = async () => {
    if (!selectedApi) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testCustomAPI(selectedApi.id);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <DashboardLayout
      title="Custom REST API Integrations"
      subtitle="Register external APIs, apply SSRF defense filters, and expose endpoints as autonomous MCP tools"
      actions={
        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register REST API</span>
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

      {/* API Cards list */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-16 text-xs text-slate-500">Loading registered APIs...</p>
        ) : apis.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-200">No Custom APIs Registered</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Register third-party or internal REST APIs to be securely callable by the AI agent through the MCP protocol.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold"
            >
              Add First API
            </button>
          </div>
        ) : (
          apis.map((apiItem) => (
            <div
              key={apiItem.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-slate-700/80 transition-all"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100">{apiItem.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-orange-400 uppercase">
                        {apiItem.method}
                      </span>
                      {apiItem.expose_as_mcp_tool && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Exposed as MCP Tool
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {apiItem.description || 'Custom OpenSense API integration'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {apiItem.base_url}{apiItem.endpoint}
                      </span>
                      <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400">
                        Auth: {apiItem.auth_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleOpenTest(apiItem)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Test API</span>
                  </button>
                  <button
                    onClick={() => handleDeleteAPI(apiItem.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add API Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">Register Custom REST API</h3>
            <p className="text-xs text-slate-400 mb-5">
              URLs are vetted against SSRF attacks and internal cloud metadata queries.
            </p>

            <form onSubmit={handleCreateAPI} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Integration Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jira Issue Tracker or Stripe Gateway"
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
                  placeholder="e.g. Fetch project tickets or process invoices"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Method
                  </label>
                  <select
                    value={method}
                    onChange={(e: any) => setMethod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Base URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.github.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Endpoint Path
                </label>
                <input
                  type="text"
                  required
                  placeholder="/zen or /v1/users"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Authentication
                  </label>
                  <select
                    value={authType}
                    onChange={(e: any) => setAuthType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api_key">API Key</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Secret Key / Token
                  </label>
                  <input
                    type="password"
                    disabled={authType === 'none'}
                    placeholder={authType === 'none' ? 'None' : 'Secret Value'}
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500 disabled:opacity-40"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={exposeAsMcpTool}
                  onChange={(e) => setExposeAsMcpTool(e.target.checked)}
                  className="rounded border-slate-700 text-orange-500 focus:ring-0"
                />
                <span>Automatically expose this REST API as a callable MCP tool</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4">
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
                  {isSubmitting ? 'Validating SSRF...' : 'Save API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test API Modal */}
      {testModalOpen && selectedApi && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Live API Execution Test</h3>
                <p className="text-xs font-mono text-orange-400 mt-0.5">
                  {selectedApi.method} {selectedApi.base_url}{selectedApi.endpoint}
                </p>
              </div>
            </div>

            <button
              onClick={handleExecuteTest}
              disabled={testing}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
            >
              {testing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Send Test Request</span>
                </>
              )}
            </button>

            {testResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={testResult.status_code >= 200 && testResult.status_code < 300 ? 'text-emerald-400' : 'text-rose-400'}>
                    HTTP Status: {testResult.status_code || (testResult.success ? 200 : 'Error')}
                  </span>
                  {testResult.duration_ms && (
                    <span className="text-slate-400">{testResult.duration_ms} ms</span>
                  )}
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(testResult.data || testResult, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setTestModalOpen(false)}
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
