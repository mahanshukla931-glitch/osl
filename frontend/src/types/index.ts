// TypeScript definitions for OpenSense Labs MCP Hub

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  department?: string;
  is_active: boolean;
  created_at: string;
}

export interface MCPServer {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  transport_type: 'stdio' | 'http_sse';
  command?: string;
  args?: string;
  env_vars?: string;
  endpoint_url?: string;
  is_connected: boolean;
  status: 'connected' | 'disconnected' | 'error';
  last_error?: string;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface MCPTool {
  server_id: number;
  server_name: string;
  name: string;
  description?: string;
  input_schema: {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  is_risky?: boolean;
}

export interface MCPResource {
  server_id: number;
  server_name: string;
  uri: string;
  name: string;
  mime_type?: string;
  description?: string;
}

export interface MCPPrompt {
  server_id: number;
  server_name: string;
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface AIProvider {
  id: number;
  name: string;
  provider_type: 'openai' | 'anthropic' | 'groq' | 'ollama' | 'custom';
  base_url: string;
  model_name: string;
  organization?: string;
  is_default: boolean;
  is_enabled: boolean;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface CustomAPI {
  id: number;
  name: string;
  description?: string;
  base_url: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  auth_type: 'none' | 'api_key' | 'bearer' | 'basic';
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body_schema?: Record<string, any>;
  timeout_seconds: number;
  expose_as_mcp_tool: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  model_used?: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any;
  tool_results?: any;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  status: 'success' | 'failure';
  duration_ms?: number;
  error_message?: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  connected_servers: number;
  total_servers: number;
  available_tools: number;
  custom_apis: number;
  total_tool_calls: number;
  success_rate: number;
  active_provider?: string;
  active_model?: string;
  recent_activity: AuditLog[];
  chart_data: Array<{
    day: string;
    tool_calls: number;
    success_rate: number;
  }>;
}
