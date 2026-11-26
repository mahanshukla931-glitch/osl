import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select
from backend.app.core.config import settings
from backend.app.core.database import engine, Base, AsyncSessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.models import User, MCPServer, AIProvider, AuditLog
from backend.app.services.mcp_service import mcp_manager

# Import API routers
from backend.app.api.auth import router as auth_router
from backend.app.api.ai_providers import router as ai_providers_router
from backend.app.api.mcp_servers import router as mcp_servers_router
from backend.app.api.mcp_tools import router as mcp_tools_router
from backend.app.api.mcp_resources import router as mcp_resources_router
from backend.app.api.mcp_prompts import router as mcp_prompts_router
from backend.app.api.custom_apis import router as custom_apis_router
from backend.app.api.chat import router as chat_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.audit_logs import router as audit_logs_router
from backend.app.api.admin import router as admin_router
from backend.app.api.export_import import router as export_import_router
from backend.app.api.telecom import router as telecom_router


async def seed_opensense_default_data():
    """Seed initial OpenSense Labs admin and developer accounts with built-in MCP server."""
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "admin@opensenselabs.com"))
        admin_user = res.scalar_one_or_none()

        if not admin_user:
            # 1. Create Super Admin
            admin_user = User(
                email="admin@opensenselabs.com",
                hashed_password=get_password_hash("OpenSense@2026!"),
                full_name="OpenSense Labs Administrator",
                department="Platform Engineering",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            await db.commit()
            await db.refresh(admin_user)

            # 2. Create Developer Account
            dev_user = User(
                email="developer@opensenselabs.com",
                hashed_password=get_password_hash("OpenSense@2026!"),
                full_name="OpenSense Software Engineer",
                department="AI Solutions",
                role="user",
                is_active=True
            )
            db.add(dev_user)

            # 3. Provision Built-in MCP Server for Admin
            script_path = os.path.abspath("backend/mcp_servers/opensense_builtin.py")
            builtin_server = MCPServer(
                user_id=admin_user.id,
                name="OpenSense Labs Ops MCP",
                description="Built-in Model Context Protocol server providing system telemetry, office times, and text/JSON analyzers.",
                transport_type="stdio",
                command="python3",
                args=json.dumps([script_path]),
                env_vars="{}",
                is_connected=True,
                status="connected",
                is_builtin=True
            )
            db.add(builtin_server)

            # 4. Provision Default AI Provider
            default_ai = AIProvider(
                user_id=admin_user.id,
                name="OpenSense Autonomous Agent",
                provider_type="custom",
                base_url="http://localhost:8000/api/v1",
                model_name="opensense-ops-agent",
                is_default=True,
                is_enabled=True,
                timeout_seconds=30
            )
            db.add(default_ai)

            # Initial log
            db.add(AuditLog(
                user_id=admin_user.id,
                action="system_initialized",
                resource_type="platform",
                details=json.dumps({"organization": "OpenSense Labs", "edition": "Enterprise"}),
                status="success"
            ))
            await db.commit()

            # Auto-connect built-in server in memory
            try:
                await mcp_manager.connect_server(
                    server_id=builtin_server.id,
                    command="python3",
                    args=[script_path],
                    env={},
                    transport_type="stdio"
                )
                print(f"[OpenSense MCP Hub] Auto-connected built-in MCP server #{builtin_server.id}")
            except Exception as e:
                print(f"[OpenSense MCP Hub] Auto-connect note: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed default OpenSense data
    await seed_opensense_default_data()
    yield
    # Shutdown logic: cleanup MCP processes
    for srv_id in list(mcp_manager._instances.keys()):
        await mcp_manager.disconnect_server(srv_id)


app = FastAPI(
    title="OpenSense Labs MCP Hub",
    description="Enterprise Model Context Protocol (MCP) Integration & AI Management Platform exclusively for OpenSense Labs.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=prefix)
app.include_router(ai_providers_router, prefix=prefix)
app.include_router(mcp_servers_router, prefix=prefix)
app.include_router(mcp_tools_router, prefix=prefix)
app.include_router(mcp_resources_router, prefix=prefix)
app.include_router(mcp_prompts_router, prefix=prefix)
app.include_router(custom_apis_router, prefix=prefix)
app.include_router(chat_router, prefix=prefix)
app.include_router(dashboard_router, prefix=prefix)
app.include_router(audit_logs_router, prefix=prefix)
app.include_router(admin_router, prefix=prefix)
app.include_router(export_import_router, prefix=prefix)
app.include_router(telecom_router, prefix=prefix)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "platform": settings.PROJECT_NAME,
        "organization": settings.ORGANIZATION_NAME,
        "authorized_domain": settings.ORGANIZATION_DOMAIN,
        "mcp_active_clients": len(mcp_manager._instances)
    }
