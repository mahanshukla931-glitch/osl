'use client';

import React, { useEffect, useState } from 'react';
import {
  FileCode,
  Play,
  Copy,
  CheckCircle2,
  AlertCircle,
  Code2,
  RefreshCw,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { MCPPrompt } from '@/types';

export default function MCPPromptsPage() {
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<MCPPrompt | null>(null);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [renderedPrompt, setRenderedPrompt] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPrompts();
      setPrompts(data);
      if (data.length > 0 && !selectedPrompt) {
        selectPrompt(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load prompts.');
    } finally {
      setLoading(false);
    }
  };

  const selectPrompt = (prompt: MCPPrompt) => {
    setSelectedPrompt(prompt);
    setRenderedPrompt(null);
    const initialArgs: Record<string, string> = {};
    if (prompt.arguments) {
      prompt.arguments.forEach((a) => {
        initialArgs[a.name] = '';
      });
    }
    setArgValues(initialArgs);
  };

  const handleGeneratePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrompt) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await api.getPromptTemplate({
        server_id: selectedPrompt.server_id,
        prompt_name: selectedPrompt.name,
        arguments: argValues,
      });
      setRenderedPrompt(res.prompt);
    } catch (err: any) {
      setError(err.message || 'Failed to render prompt.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout
      title="MCP Prompt Templates"
      subtitle="Discover and instantiate standardized agent prompt templates from connected MCP servers"
      actions={
        <button
          onClick={loadPrompts}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      }
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Prompts list */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <p className="text-center py-12 text-xs text-slate-500">Scanning prompts...</p>
          ) : prompts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <FileCode className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No prompt templates found.</p>
            </div>
          ) : (
            prompts.map((p) => {
              const isSelected = selectedPrompt?.name === p.name && selectedPrompt?.server_id === p.server_id;
              return (
                <div
                  key={`${p.server_id}-${p.name}`}
                  onClick={() => selectPrompt(p)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500/60 shadow-lg shadow-orange-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-orange-400">{p.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.server_name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
                  <div className="mt-3 text-[11px] font-mono text-slate-500">
                    {p.arguments ? `${p.arguments.length} arguments required` : 'No arguments'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Prompt Argument Form & Viewer */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-[calc(100vh-140px)] flex flex-col overflow-y-auto">
          {selectedPrompt ? (
            <div>
              <div className="pb-4 border-b border-slate-800">
                <h3 className="font-mono text-sm font-bold text-orange-400">{selectedPrompt.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{selectedPrompt.description}</p>
              </div>

              <form onSubmit={handleGeneratePrompt} className="mt-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Prompt Arguments
                </h4>

                {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 ? (
                  selectedPrompt.arguments.map((arg) => (
                    <div key={arg.name} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                      <label className="block font-mono text-xs font-semibold text-slate-200 mb-1">
                        {arg.name} {arg.required && <span className="text-orange-400">*</span>}
                      </label>
                      {arg.description && (
                        <p className="text-[11px] text-slate-400 mb-2">{arg.description}</p>
                      )}
                      <textarea
                        required={arg.required}
                        rows={3}
                        placeholder={`Enter ${arg.name}...`}
                        value={argValues[arg.name] || ''}
                        onChange={(e) =>
                          setArgValues((prev) => ({ ...prev, [arg.name]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    This prompt requires no arguments.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 disabled:opacity-50 transition-all"
                >
                  {generating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Render Prompt Template</span>
                    </>
                  )}
                </button>
              </form>

              {renderedPrompt && (
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-orange-400" />
                      Rendered Prompt
                    </span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                    {typeof renderedPrompt === 'object'
                      ? JSON.stringify(renderedPrompt, null, 2)
                      : String(renderedPrompt)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
              <FileCode className="w-10 h-10 mb-2 text-slate-700" />
              <span>Select a prompt template to preview and fill arguments.</span>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
