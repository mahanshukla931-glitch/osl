'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Check,
  ShieldCheck,
  Trash2,
  Clock,
  Code2,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { ChatSession, ChatMessage } from '@/types';
import { useAuth } from '@/lib/auth-context';

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions();
      setSessions(data);
      if (data.length > 0) {
        selectSession(data[0].id);
      } else {
        await handleNewSession();
      }
    } catch (err: any) {
      console.error('Failed to load chat sessions:', err);
    }
  };

  const selectSession = async (id: number) => {
    try {
      const sessionData = await api.getChatSession(id);
      setCurrentSession(sessionData);
      setMessages(sessionData.messages || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation.');
    }
  };

  const handleNewSession = async () => {
    try {
      const newSession = await api.createChatSession('OpenSense MCP Assistant');
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (err: any) {
      setError(err.message || 'Failed to create chat session.');
    }
  };

  const handleDeleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSession?.id === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          handleNewSession();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete session.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending || !currentSession) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      session_id: currentSession.id,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const assistantMsg = await api.sendMessage(currentSession.id, {
        content: userText,
        auto_approve_tools: autoApprove,
      });

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Chat generation error.');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout
      title="OpenSense Autonomous AI Chat"
      subtitle="Context-aware chat agent with autonomous MCP tool execution across connected servers"
      actions={
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="rounded border-slate-700 text-orange-500 focus:ring-0"
            />
            <span className="font-semibold text-orange-400">Auto-Approve MCP Tools</span>
          </label>
          <button
            onClick={handleNewSession}
            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
        {/* Left: Session List */}
        <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Conversations
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {sessions.map((sess) => {
              const isActive = currentSession?.id === sess.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => selectSession(sess.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-orange-500/10 border-orange-500/50 text-white font-semibold'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
                    <span className="truncate">{sess.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-60 hover:opacity-100"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Chat Thread */}
        <div className="lg:col-span-9 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden">
          {/* Thread header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200">
                  {currentSession?.title || 'OpenSense MCP Assistant'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  Model: {currentSession?.model_used || 'opensense-ops-agent'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>MCP Protocol Ready</span>
            </div>
          </div>

          {/* Messages display */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">Start an MCP-Powered Conversation</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Try asking questions that trigger connected tools, such as:
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-md">
                  <button
                    onClick={() => setInput('What is the current time across OpenSense Labs offices?')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
                  >
                    &ldquo;Current office times across OpenSense hubs&rdquo;
                  </button>
                  <button
                    onClick={() => setInput('Inspect system diagnostics and Python environment.')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
                  >
                    &ldquo;Run OpenSense system diagnostics&rdquo;
                  </button>
                  <button
                    onClick={() => setInput('Analyze this text: OpenSense Labs builds advanced enterprise AI systems with high reliability.')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition-colors"
                  >
                    &ldquo;Analyze text sentiment and keywords&rdquo;
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === 'user';
                let parsedToolCalls = null;
                let parsedToolResults = null;
                if (m.tool_calls) {
                  try {
                    parsedToolCalls = typeof m.tool_calls === 'string' ? JSON.parse(m.tool_calls) : m.tool_calls;
                  } catch {}
                }
                if (m.tool_results) {
                  try {
                    parsedToolResults = typeof m.tool_results === 'string' ? JSON.parse(m.tool_results) : m.tool_results;
                  } catch {}
                }

                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/20">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-2xl space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Bubble */}
                      <div
                        className={`p-4 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-tr-none shadow-md shadow-orange-500/20'
                            : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>

                      {/* Tool Calls Accordion Card */}
                      {parsedToolCalls && parsedToolCalls.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                          <div className="flex items-center gap-2 text-orange-400 font-semibold">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Executed MCP Tool:</span>
                            <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {parsedToolCalls[0].function?.name || 'mcp_tool'}
                            </span>
                          </div>

                          {parsedToolCalls[0].function?.arguments && (
                            <div className="text-[11px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                              <span className="text-slate-500">Args: </span>
                              {parsedToolCalls[0].function.arguments}
                            </div>
                          )}

                          {parsedToolResults && (
                            <div className="text-[11px] font-mono text-emerald-400 bg-slate-900/90 p-2.5 rounded border border-slate-800 overflow-x-auto max-h-48">
                              <span className="text-slate-500 block mb-1">Result:</span>
                              <pre className="whitespace-pre-wrap">
                                {typeof parsedToolResults === 'object'
                                  ? JSON.stringify(parsedToolResults, null, 2)
                                  : String(parsedToolResults)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}

                      <span className="text-[10px] text-slate-500 font-mono block px-1">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                  <span>Agent is reasoning and executing tools...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error notice */}
          {error && (
            <div className="px-6 py-2 bg-rose-500/10 border-t border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Chat input box */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/90">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask assistant to query telemetry, timezones, analyze text, or invoke MCP tools..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-600/20 disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
