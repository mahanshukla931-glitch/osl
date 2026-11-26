'use client';

import React, { useEffect, useState } from 'react';
import {
  Layers,
  FileText,
  RefreshCw,
  ExternalLink,
  Code2,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { MCPResource } from '@/types';

export default function MCPResourcesPage() {
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<{ uri: string; content: any } | null>(null);
  const [readLoading, setReadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getResources();
      setResources(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load resources.');
    } finally {
      setLoading(false);
    }
  };

  const handleReadResource = async (res: MCPResource) => {
    setReadLoading(true);
    setSelectedContent(null);
    try {
      const data = await api.readResource({
        server_id: res.server_id,
        uri: res.uri,
      });
      setSelectedContent({ uri: res.uri, content: data.content });
    } catch (err: any) {
      setError(err.message || 'Failed to read resource.');
    } finally {
      setReadLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="MCP Resources"
      subtitle="Examine documents, architectural guidelines, and telemetry endpoints offered by connected MCP servers"
      actions={
        <button
          onClick={loadResources}
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
        {/* Resource List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <p className="text-center py-12 text-xs text-slate-500">Discovering resources...</p>
          ) : resources.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <Layers className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No resources available on connected servers.</p>
            </div>
          ) : (
            resources.map((res) => {
              const isSelected = selectedContent?.uri === res.uri;
              return (
                <div
                  key={res.uri}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/10 border-orange-500/60 shadow-lg shadow-orange-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                  onClick={() => handleReadResource(res)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-100 flex items-center gap-2">
                      {res.mime_type?.includes('json') ? (
                        <FileJson className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <FileText className="w-4 h-4 text-orange-400" />
                      )}
                      {res.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {res.mime_type || 'text/plain'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {res.description || 'Standard OpenSense Labs MCP resource.'}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                    <span className="truncate max-w-[200px] text-orange-400/80">{res.uri}</span>
                    <span className="text-slate-400">{res.server_name}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Resource Viewer Panel */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-[calc(100vh-140px)] flex flex-col">
          <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-orange-400" />
              Resource Inspector
            </span>
            {selectedContent && (
              <span className="text-[11px] font-mono text-slate-400 truncate max-w-sm">
                {selectedContent.uri}
              </span>
            )}
          </div>

          <div className="flex-1 mt-4 overflow-y-auto">
            {readLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-500">
                Reading resource contents over MCP protocol...
              </div>
            ) : selectedContent ? (
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {typeof selectedContent.content === 'object'
                  ? JSON.stringify(selectedContent.content, null, 2)
                  : String(selectedContent.content)}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                <FileText className="w-10 h-10 mb-2 text-slate-700" />
                <span>Select a resource to read its live payload from the MCP server.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
