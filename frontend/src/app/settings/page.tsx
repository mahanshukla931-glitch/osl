'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Download,
  Upload,
  Cpu,
  KeyRound,
  Check,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { AIProvider } from '@/types';
import { useAuth } from '@/lib/auth-context';

export default function SettingsPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<'openai' | 'anthropic' | 'groq' | 'ollama' | 'custom'>('openai');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-4o');
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Edit State
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [department, setDepartment] = useState(user?.department || 'AI Solutions');
  const [newPassword, setNewPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const data = await api.getAIProviders();
      setProviders(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load AI providers' });
    } finally {
      setLoading(false);
    }
  };

  const handleProviderTypeChange = (type: any) => {
    setProviderType(type);
    if (type === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModelName('gpt-4o');
    } else if (type === 'anthropic') {
      setBaseUrl('https://api.anthropic.com');
      setModelName('claude-3-5-sonnet-20241022');
    } else if (type === 'groq') {
      setBaseUrl('https://api.groq.com/openai/v1');
      setModelName('llama-3.3-70b-versatile');
    } else if (type === 'ollama') {
      setBaseUrl('http://localhost:11434/v1');
      setModelName('llama3.2');
    } else {
      setBaseUrl('http://localhost:8000/api/v1');
      setModelName('opensense-ops-agent');
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);
    try {
      await api.createAIProvider({
        name: name.trim(),
        provider_type: providerType,
        base_url: baseUrl.trim(),
        api_key: apiKey.trim() || undefined,
        model_name: modelName.trim(),
        is_default: isDefault,
      });

      setModalOpen(false);
      setName('');
      setApiKey('');
      setMsg({ type: 'success', text: 'AI Provider configured with AES Fernet encryption.' });
      await loadProviders();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to configure provider.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProvider = async (id: number) => {
    if (!confirm('Are you sure you want to remove this AI provider?')) return;
    try {
      await api.deleteAIProvider(id);
      setMsg({ type: 'success', text: 'AI Provider removed.' });
      await loadProviders();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Deletion failed.' });
    }
  };

  const handleTestProvider = async (p: AIProvider) => {
    setTestingId(p.id);
    setMsg(null);
    try {
      const res = await api.testAIProvider({
        provider_type: p.provider_type,
        base_url: p.base_url,
        model_name: p.model_name,
      });
      setMsg({ type: 'success', text: `Test successful: ${res.message || 'Connected'}` });
    } catch (err: any) {
      setMsg({ type: 'error', text: `Test failed: ${err.message}` });
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setMsg(null);
    try {
      await api.updateProfile({
        full_name: fullName.trim(),
        department: department.trim(),
        password: newPassword ? newPassword : undefined,
      });
      await refreshUser();
      setNewPassword('');
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.exportConfig();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opensense-mcp-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: 'Non-secret configuration safely exported.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Export failed.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.importConfig(parsed);
      setMsg({
        type: 'success',
        text: `Import complete! Imported ${res.imported?.mcp_servers || 0} servers and ${res.imported?.custom_apis || 0} APIs.`,
      });
      await loadProviders();
    } catch (err: any) {
      setMsg({ type: 'error', text: `Import failed: ${err.message}` });
    }
  };

  return (
    <DashboardLayout
      title="Platform Settings & AI Providers"
      subtitle="Manage AI model keys with Fernet encryption, backup non-secret configs, and update user preferences"
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Providers & Export */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI Providers Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-orange-400" />
                  AI Model Providers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Secrets are AES-Fernet encrypted at rest and masked in responses.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Provider</span>
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <p className="text-xs text-slate-500 text-center py-6">Loading providers...</p>
              ) : providers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No custom providers added.</p>
              ) : (
                providers.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">{p.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-orange-400">
                          {p.provider_type}
                        </span>
                        {p.is_default && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-slate-400">
                        <span>Model: {p.model_name}</span>
                        <span className="truncate max-w-xs">{p.base_url}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestProvider(p)}
                        disabled={testingId === p.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1"
                      >
                        <Play className={`w-3 h-3 ${testingId === p.id ? 'animate-spin' : ''}`} />
                        <span>Test</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(p.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 text-slate-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Backup & JSON Migration */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-orange-400" />
              Backup & Configuration Migration
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Safely export and import non-secret server topologies and custom API configurations.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Configuration JSON</span>
              </button>

              <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Account Profile */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-fit">
          <h3 className="text-sm font-bold text-slate-100 mb-1">OpenSense Member Profile</h3>
          <p className="text-xs text-slate-400 mb-5">
            Update your account details and password.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                OpenSense Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-sm text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep unchanged"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold disabled:opacity-50 transition-all mt-2"
            >
              {profileSaving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      </div>

      {/* Add Provider Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-1">Configure AI Provider</h3>
            <p className="text-xs text-slate-400 mb-5">
              Keys are encrypted with server-side Fernet encryption and never sent to logs or clients.
            </p>

            <form onSubmit={handleCreateProvider} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Provider Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production OpenAI or Groq Cloud"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Provider Ecosystem
                </label>
                <select
                  value={providerType}
                  onChange={(e) => handleProviderTypeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="openai">OpenAI (GPT-4o, o1, etc.)</option>
                  <option value="anthropic">Anthropic (Claude 3.5)</option>
                  <option value="groq">Groq (Ultra-fast Llama)</option>
                  <option value="ollama">Ollama (Local Host)</option>
                  <option value="custom">Custom OpenAI-Compatible API</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Base API URL
                </label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Model Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. gpt-4o or claude-3-5-sonnet"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-700 text-orange-500 focus:ring-0"
                />
                <span>Set as default provider for AI chat completions</span>
              </label>

              <div className="flex justify-end gap-3 pt-3">
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
                  {isSubmitting ? 'Encrypting & Saving...' : 'Save Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
