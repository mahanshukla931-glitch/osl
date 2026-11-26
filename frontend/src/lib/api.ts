// API client for OpenSense Labs MCP Hub
function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('opensense_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('opensense_token');
    localStorage.removeItem('opensense_user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errData = await res.json();
      errorMsg = errData.detail || errData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Handle HTTP 204 No Content safely without SyntaxError
  if (res.status === 204) {
    return null as any;
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (null as any);
}

export const api = {
  // Authentication
  login: (credentials: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (data: { email: string; password: string; full_name: string; department?: string }) =>
    request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProfile: () => request<any>('/auth/me'),

  updateProfile: (data: { full_name?: string; department?: string; password?: string }) =>
    request<any>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboardStats: () => request<any>('/dashboard/stats'),

  // MCP Servers
  getServers: () => request<any[]>('/mcp-servers'),
  createServer: (data: any) =>
    request<any>('/mcp-servers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateServer: (id: number, data: any) =>
    request<any>(`/mcp-servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteServer: (id: number) =>
    request<any>(`/mcp-servers/${id}`, {
      method: 'DELETE',
    }),
  connectServer: (id: number) =>
    request<any>(`/mcp-servers/${id}/connect`, {
      method: 'POST',
    }),
  disconnectServer: (id: number) =>
    request<any>(`/mcp-servers/${id}/disconnect`, {
      method: 'POST',
    }),
  restartServer: (id: number) =>
    request<any>(`/mcp-servers/${id}/restart`, {
      method: 'POST',
    }),
  testServer: (data: any) =>
    request<any>('/mcp-servers/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // MCP Tools
  getTools: () => request<any[]>('/mcp-tools'),
  runTool: (data: { server_id: number; tool_name: string; arguments: any; confirmed?: boolean }) =>
    request<any>('/mcp-tools/run', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // MCP Resources
  getResources: () => request<any[]>('/mcp-resources'),
  readResource: (data: { server_id: number; uri: string }) =>
    request<any>('/mcp-resources/read', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // MCP Prompts
  getPrompts: () => request<any[]>('/mcp-prompts'),
  getPromptTemplate: (data: { server_id: number; prompt_name: string; arguments?: any }) =>
    request<any>('/mcp-prompts/get', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI Providers
  getAIProviders: () => request<any[]>('/ai-providers'),
  createAIProvider: (data: any) =>
    request<any>('/ai-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAIProvider: (id: number, data: any) =>
    request<any>(`/ai-providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAIProvider: (id: number) =>
    request<any>(`/ai-providers/${id}`, {
      method: 'DELETE',
    }),
  testAIProvider: (data: any) =>
    request<any>('/ai-providers/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Custom APIs
  getCustomAPIs: () => request<any[]>('/custom-apis'),
  createCustomAPI: (data: any) =>
    request<any>('/custom-apis', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomAPI: (id: number, data: any) =>
    request<any>(`/custom-apis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCustomAPI: (id: number) =>
    request<any>(`/custom-apis/${id}`, {
      method: 'DELETE',
    }),
  testCustomAPI: (id: number, data?: { override_params?: any; override_body?: any }) =>
    request<any>(`/custom-apis/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  // Chat
  getChatSessions: () => request<any[]>('/chat/sessions'),
  createChatSession: (title?: string) =>
    request<any>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New OpenSense Conversation' }),
    }),
  getChatSession: (id: number) => request<any>(`/chat/sessions/${id}`),
  deleteChatSession: (id: number) =>
    request<any>(`/chat/sessions/${id}`, {
      method: 'DELETE',
    }),
  clearAllChatSessions: () =>
    request<any>('/chat/sessions', {
      method: 'DELETE',
    }),
  sendMessage: (sessionId: number, data: { content: string; provider_id?: number; auto_approve_tools?: boolean; persona?: string }, options?: RequestInit) =>
    request<any>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),
  guestChat: (data: { content: string; messages?: any[]; guest_chat_count?: number; persona?: string }, options?: RequestInit) =>
    request<any>('/chat/guest', {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),

  // OpenSense Telecom & Directory
  getTelecomConfig: () => request<any>('/telecom/config'),
  toggleTelecomSetup: (enabled: boolean) =>
    request<any>('/telecom/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
  addTelecomContact: (data: { name: string; role: string; department: string; phone: string; email?: string; status?: string }) =>
    request<any>('/telecom/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteTelecomContact: (id: string) =>
    request<any>(`/telecom/contacts/${id}`, {
      method: 'DELETE',
    }),
  initiateCall: (data: { contact_name: string; phone: string; department?: string }) =>
    request<any>('/telecom/call', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Audit Logs
  getAuditLogs: (params?: { action?: string; status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set('action', params.action);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return request<any[]>(`/audit-logs?${q.toString()}`);
  },

  // Admin
  getAdminSummary: () => request<any>('/admin/summary'),
  getAdminUsers: () => request<any[]>('/admin/users'),
  updateAdminUser: (id: number, data: { role?: string; is_active?: boolean; department?: string }) =>
    request<any>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Import / Export
  exportConfig: () => request<any>('/export-import/export'),
  importConfig: (data: any) =>
    request<any>('/export-import/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
