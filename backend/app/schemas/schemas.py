from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


# ---------------- Auth & User Schemas ----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    department: Optional[str] = "Engineering"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None


# ---------------- AI Provider Schemas ----------------
class AIProviderCreate(BaseModel):
    name: str
    provider_type: str  # openai, anthropic, groq, openrouter, ollama, custom
    base_url: str
    api_key: Optional[str] = None
    model_name: str
    organization: Optional[str] = None
    custom_headers: Optional[Dict[str, str]] = None
    timeout_seconds: Optional[int] = 30
    is_default: Optional[bool] = False
    is_enabled: Optional[bool] = True


class AIProviderUpdate(BaseModel):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    organization: Optional[str] = None
    custom_headers: Optional[Dict[str, str]] = None
    timeout_seconds: Optional[int] = None
    is_default: Optional[bool] = None
    is_enabled: Optional[bool] = None


class AIProviderResponse(BaseModel):
    id: int
    user_id: int
    name: str
    provider_type: str
    base_url: str
    masked_api_key: str
    has_api_key: bool
    model_name: str
    organization: Optional[str] = None
    custom_headers: Optional[Dict[str, str]] = None
    timeout_seconds: int
    is_default: bool
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIProviderTestRequest(BaseModel):
    provider_type: str
    base_url: str
    api_key: Optional[str] = None
    model_name: str
    custom_headers: Optional[Dict[str, str]] = None


class AIProviderTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None
    available_models: Optional[List[str]] = None


# ---------------- MCP Server Schemas ----------------
class MCPServerCreate(BaseModel):
    name: str
    description: Optional[str] = None
    transport_type: str = "stdio"  # stdio, http_sse
    command: Optional[str] = "python3"
    args: Optional[List[str]] = []
    env_vars: Optional[Dict[str, str]] = {}
    endpoint_url: Optional[str] = None


class MCPServerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    transport_type: Optional[str] = None
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env_vars: Optional[Dict[str, str]] = None
    endpoint_url: Optional[str] = None


class MCPServerResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    transport_type: str
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env_vars: Optional[Dict[str, str]] = None
    endpoint_url: Optional[str] = None
    is_connected: bool
    status: str
    last_error: Optional[str] = None
    is_builtin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------- MCP Tools & Resources ----------------
class MCPToolItem(BaseModel):
    server_id: int
    server_name: str
    name: str
    description: Optional[str] = None
    input_schema: Dict[str, Any]
    is_risky: bool = False


class MCPToolRunRequest(BaseModel):
    server_id: int
    tool_name: str
    arguments: Dict[str, Any]
    confirmed: bool = False


class MCPToolRunResponse(BaseModel):
    success: bool
    result: Any
    duration_ms: float
    error: Optional[str] = None


class MCPResourceItem(BaseModel):
    server_id: int
    server_name: str
    uri: str
    name: str
    mime_type: Optional[str] = None
    description: Optional[str] = None


class MCPPromptItem(BaseModel):
    server_id: int
    server_name: str
    name: str
    description: Optional[str] = None
    arguments: Optional[List[Dict[str, Any]]] = None


# ---------------- Custom API Schemas ----------------
class CustomAPICreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_url: str
    endpoint: str
    method: str = "GET"
    auth_type: str = "none"  # none, api_key, bearer, basic
    auth_value: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    query_params: Optional[Dict[str, str]] = None
    body_schema: Optional[Dict[str, Any]] = None
    is_mcp_exposed: Optional[bool] = True
    timeout: Optional[int] = 15


class CustomAPIUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_url: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    auth_type: Optional[str] = None
    auth_value: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    query_params: Optional[Dict[str, str]] = None
    body_schema: Optional[Dict[str, Any]] = None
    is_mcp_exposed: Optional[bool] = None
    timeout: Optional[int] = None


class CustomAPIResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    base_url: str
    endpoint: str
    method: str
    auth_type: str
    has_auth: bool
    headers: Optional[Dict[str, str]] = None
    query_params: Optional[Dict[str, str]] = None
    body_schema: Optional[Dict[str, Any]] = None
    is_mcp_exposed: bool
    timeout: int
    created_at: datetime

    class Config:
        from_attributes = True


class CustomAPITestRequest(BaseModel):
    base_url: str
    endpoint: str
    method: str = "GET"
    auth_type: str = "none"
    auth_value: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    query_params: Optional[Dict[str, str]] = None
    body_data: Optional[Dict[str, Any]] = None
    timeout: Optional[int] = 15


# ---------------- Chat & Session Schemas ----------------
class ChatMessageCreate(BaseModel):
    content: str
    model_override: Optional[str] = None
    provider_id: Optional[int] = None
    auto_approve_tools: Optional[bool] = False
    persona: Optional[str] = "aanya"


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    tool_calls: Optional[Any] = None
    tool_results: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    model_used: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[ChatMessageResponse]] = None

    class Config:
        from_attributes = True


# ---------------- Audit Logs & Dashboard ----------------
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    status: str
    duration_ms: Optional[float] = None
    error_message: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    connected_servers: int
    total_servers: int
    available_tools: int
    custom_apis: int
    total_tool_calls: int
    success_rate: float
    active_provider: Optional[str] = None
    active_model: Optional[str] = None
    recent_activity: List[AuditLogResponse]
    chart_data: List[Dict[str, Any]]
