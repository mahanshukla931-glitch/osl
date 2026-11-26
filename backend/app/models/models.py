from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="user")  # "admin" or "user"
    department = Column(String(100), default="Engineering")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    ai_providers = relationship("AIProvider", back_populates="user", cascade="all, delete-orphan")
    mcp_servers = relationship("MCPServer", back_populates="user", cascade="all, delete-orphan")
    custom_apis = relationship("CustomAPI", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class AIProvider(Base):
    __tablename__ = "ai_providers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    provider_type = Column(String(50), nullable=False)  # openai, anthropic, groq, openrouter, ollama, custom
    base_url = Column(String(255), nullable=False)
    encrypted_api_key = Column(Text, nullable=True)  # Fernet encrypted
    model_name = Column(String(100), nullable=False)
    organization = Column(String(100), nullable=True)
    custom_headers = Column(Text, nullable=True)  # JSON string
    timeout_seconds = Column(Integer, default=30)
    is_default = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="ai_providers")


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    transport_type = Column(String(50), default="stdio")  # stdio, http_sse
    command = Column(String(255), nullable=True)  # e.g., "python3", "node"
    args = Column(Text, nullable=True)  # JSON array string
    env_vars = Column(Text, nullable=True)  # JSON object string
    endpoint_url = Column(String(255), nullable=True)
    is_connected = Column(Boolean, default=False)
    status = Column(String(50), default="disconnected")  # connected, disconnected, error
    last_error = Column(Text, nullable=True)
    is_builtin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="mcp_servers")


class CustomAPI(Base):
    __tablename__ = "custom_apis"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    base_url = Column(String(255), nullable=False)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(20), default="GET")
    auth_type = Column(String(50), default="none")  # none, api_key, bearer, basic
    encrypted_auth_value = Column(Text, nullable=True)
    headers = Column(Text, nullable=True)  # JSON object
    query_params = Column(Text, nullable=True)  # JSON object
    body_schema = Column(Text, nullable=True)  # JSON object
    is_mcp_exposed = Column(Boolean, default=True)
    timeout = Column(Integer, default=15)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="custom_apis")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="New Conversation")
    model_used = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at", lazy="selectin")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String(50), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    tool_calls = Column(Text, nullable=True)  # JSON string
    tool_results = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # tool_execution, server_connect, provider_test, etc.
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)  # Safe redacted JSON string
    status = Column(String(50), default="success")  # success, failure
    duration_ms = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
