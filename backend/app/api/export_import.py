import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.models.models import MCPServer, CustomAPI, AIProvider, User, AuditLog
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/export-import", tags=["Import & Export"])


@router.get("/export")
async def export_configuration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Safely export user's configurations in JSON.
    Secrets and API keys are strictly excluded/redacted by design.
    """
    srv_q = await db.execute(select(MCPServer).where(MCPServer.user_id == current_user.id))
    servers = srv_q.scalars().all()

    api_q = await db.execute(select(CustomAPI).where(CustomAPI.user_id == current_user.id))
    apis = api_q.scalars().all()

    prov_q = await db.execute(select(AIProvider).where(AIProvider.user_id == current_user.id))
    providers = prov_q.scalars().all()

    export_data = {
        "export_metadata": {
            "platform": "OpenSense Labs MCP Hub",
            "organization": "OpenSense Labs",
            "version": "1.0.0",
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "user_email": current_user.email
        },
        "mcp_servers": [
            {
                "name": s.name,
                "description": s.description,
                "transport_type": s.transport_type,
                "command": s.command,
                "args": json.loads(s.args) if s.args else [],
                "endpoint_url": s.endpoint_url
            }
            for s in servers if not s.is_builtin
        ],
        "custom_apis": [
            {
                "name": a.name,
                "description": a.description,
                "base_url": a.base_url,
                "endpoint": a.endpoint,
                "method": a.method,
                "auth_type": a.auth_type,
                "headers": json.loads(a.headers) if a.headers else {},
                "query_params": json.loads(a.query_params) if a.query_params else {},
                "is_mcp_exposed": a.is_mcp_exposed,
                "timeout": a.timeout
            }
            for a in apis
        ],
        "ai_providers": [
            {
                "name": p.name,
                "provider_type": p.provider_type,
                "base_url": p.base_url,
                "model_name": p.model_name,
                "organization": p.organization,
                "timeout_seconds": p.timeout_seconds,
                "is_default": p.is_default
            }
            for p in providers
        ]
    }

    db.add(AuditLog(
        user_id=current_user.id,
        action="configuration_exported",
        resource_type="backup",
        status="success"
    ))
    await db.commit()

    return export_data


@router.post("/import")
async def import_configuration(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Import non-secret configuration items."""
    servers_imported = 0
    apis_imported = 0

    mcp_servers_data = payload.get("mcp_servers", [])
    for s_item in mcp_servers_data:
        if isinstance(s_item, dict) and "name" in s_item:
            server = MCPServer(
                user_id=current_user.id,
                name=s_item["name"],
                description=s_item.get("description"),
                transport_type=s_item.get("transport_type", "stdio"),
                command=s_item.get("command", "python3"),
                args=json.dumps(s_item.get("args", [])),
                endpoint_url=s_item.get("endpoint_url"),
                is_connected=False,
                status="disconnected",
                is_builtin=False
            )
            db.add(server)
            servers_imported += 1

    custom_apis_data = payload.get("custom_apis", [])
    for a_item in custom_apis_data:
        if isinstance(a_item, dict) and "name" in a_item and "base_url" in a_item:
            api = CustomAPI(
                user_id=current_user.id,
                name=a_item["name"],
                description=a_item.get("description"),
                base_url=a_item["base_url"],
                endpoint=a_item.get("endpoint", "/"),
                method=a_item.get("method", "GET"),
                auth_type=a_item.get("auth_type", "none"),
                headers=json.dumps(a_item.get("headers", {})),
                query_params=json.dumps(a_item.get("query_params", {})),
                is_mcp_exposed=a_item.get("is_mcp_exposed", True),
                timeout=a_item.get("timeout", 15)
            )
            db.add(api)
            apis_imported += 1

    await db.commit()

    db.add(AuditLog(
        user_id=current_user.id,
        action="configuration_imported",
        resource_type="backup",
        details=json.dumps({"servers_imported": servers_imported, "apis_imported": apis_imported}),
        status="success"
    ))
    await db.commit()

    return {
        "success": True,
        "servers_imported": servers_imported,
        "custom_apis_imported": apis_imported,
        "message": f"Successfully imported {servers_imported} servers and {apis_imported} custom APIs."
    }
