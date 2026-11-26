'use client';

import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Search,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  ShieldAlert,
  Code2,
  Copy,
  ChevronDown,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { MCPTool } from '@/types';

export default function MCPToolsPage() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);

  // Execution runner state
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [running, setRunning] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);
  const [execDuration, setExecDuration] = useState<number | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [confirmRisk, setConfirmRisk] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await api.getTools();
      setTools(data);
      if (data.length > 0 && !selectedTool) {
        selectTool(data[0]);
      }
    } catch (err) {
      console.error('Failed to load MCP tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTool = (tool: MCPTool) => {
    setSelectedTool(tool);
    setExecResult(null);
    setExecError(null);
    setExecDuration(null);
    setConfirmRisk(false);

    // Initialize default inputs based on schema
    const initInputs: Record<string, any> = {};
    if (tool.input_schema?.properties) {
      Object.entries(tool.input_schema.properties).forEach(([key, schema]: [string, any]) => {
        if (schema.type === 'boolean') initInputs[key] = false;
        else if (schema.enum && schema.enum.length > 0) initInputs[key] = schema.enum[0];
        else initInputs[key] = '';
      });
    }
    setInputs(initInputs);
  };

  const handleInputChange = (key: string, value: any) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleRunTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;

    if (selectedTool.is_risky && !confirmRisk) {
      setExecError('Approval Required: Please acknowledge potential side effects before executing this risky tool.');
      return;
    }

    setRunning(true);
    setExecError(null);
    setExecResult(null);

    // Format inputs: parse JSON strings if necessary
    const cleanedInputs: Record<string, any> = {};
    Object.entries(inputs).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) {
        cleanedInputs[k] = v;
      }
    });

    try {
      const res = await api.runTool({
        server_id: selectedTool.server_id,
        tool_name: selectedTool.name,
        arguments: cleanedInputs,
        confirmed: confirmRisk,
      });

      if (!res.success && res.error) {
        setExecError(res.error);
      } else {
        setExecResult(res.result);
      }
      setExecDuration(res.duration_ms);
    } catch (err: any) {
      setExecError(err.message || 'Execution error.');
    } finally {
      setRunning(false);
    }
  };

  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      t.server_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="MCP Tools Explorer"
      subtitle="Discover and execute dynamic functions exposed by active Model Context Protocol servers"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Tool Listing & Filter */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-[calc(100vh-140px)]">
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search tools by name, action, server..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <p className="text-center py-8 text-xs text-slate-500">Discovering tools across servers...</p>
            ) : filteredTools.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-500">No matching tools found.</p>
            ) : (
              filteredTools.map((tool) => {
                const isSelected = selectedTool?.name === tool.name && selectedTool?.server_id === tool.server_id;
                return (
                  <button
                    key={`${tool.server_id}-${tool.name}`}
                    onClick={() => selectTool(tool)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/50 text-white shadow-md shadow-orange-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-orange-400">{tool.name}</span>
                      {tool.is_risky && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Risky
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {tool.description || 'No description available.'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Server: {tool.server_name}</span>
                      <span className="font-mono text-slate-400">
                        {tool.input_schema?.properties ? Object.keys(tool.input_schema.properties).length : 0} params
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Execution & Schema Playground */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col h-[calc(100vh-140px)] overflow-y-auto">
          {selectedTool ? (
            <div>
              {/* Header */}
              <div className="pb-4 border-b border-slate-800 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold font-mono text-orange-400">{selectedTool.name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                      {selectedTool.server_name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{selectedTool.description}</p>
                </div>
              </div>

              {/* Risky confirmation warning */}
              {selectedTool.is_risky && (
                <div className="my-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Caution: Side-Effect Operation</span>
                    <p className="text-[11px] text-amber-400/90 mt-0.5">
                      This MCP tool modifies platform state or triggers external actions. Check the approval box to run.
                    </p>
                    <label className="flex items-center gap-2 mt-2 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmRisk}
                        onChange={(e) => setConfirmRisk(e.target.checked)}
                        className="rounded border-amber-500 text-orange-500 focus:ring-0"
                      />
                      <span>I confirm and approve running this tool</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Parameter Form */}
              <form onSubmit={handleRunTool} className="mt-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Input Parameters
                </h3>

                {selectedTool.input_schema?.properties &&
                Object.keys(selectedTool.input_schema.properties).length > 0 ? (
                  Object.entries(selectedTool.input_schema.properties).map(([propName, propDef]: [string, any]) => {
                    const isRequired = selectedTool.input_schema?.required?.includes(propName);
                    return (
                      <div key={propName} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-xs font-semibold text-slate-200">
                            {propName}
                            {isRequired && <span className="text-orange-400 ml-1">*</span>}
                          </label>
                          <span className="text-[10px] text-slate-500 font-mono">{propDef.type || 'string'}</span>
                        </div>
                        {propDef.description && (
                          <p className="text-[11px] text-slate-400 mb-2">{propDef.description}</p>
                        )}

                        {propDef.enum ? (
                          <select
                            value={inputs[propName] || ''}
                            onChange={(e) => handleInputChange(propName, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                          >
                            {propDef.enum.map((opt: string) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : propDef.type === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={Boolean(inputs[propName])}
                              onChange={(e) => handleInputChange(propName, e.target.checked)}
                              className="rounded border-slate-700 text-orange-500 focus:ring-0"
                            />
                            <span>Enable {propName}</span>
                          </label>
                        ) : (
                          <input
                            type="text"
                            required={isRequired}
                            placeholder={propDef.description || `Enter ${propName}...`}
                            value={inputs[propName] || ''}
                            onChange={(e) => handleInputChange(propName, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    This tool takes no arguments.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={running}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 disabled:opacity-50 transition-all"
                >
                  {running ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute MCP Tool</span>
                    </>
                  )}
                </button>
              </form>

              {/* Execution Output Panel */}
              {(execResult !== null || execError || execDuration !== null) && (
                <div className="mt-6 pt-5 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-orange-400" />
                      Execution Output
                    </span>
                    {execDuration !== null && (
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {execDuration} ms
                      </span>
                    )}
                  </div>

                  {execError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                      <strong>Tool Error:</strong> {execError}
                    </div>
                  )}

                  {execResult !== null && (
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto max-h-72">
                      {typeof execResult === 'object'
                        ? JSON.stringify(execResult, null, 2)
                        : String(execResult)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
              <Wrench className="w-10 h-10 mb-2 text-slate-700" />
              <span>Select an MCP tool from the left panel to inspect and run.</span>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
