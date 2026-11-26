import json
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.models.models import MCPServer, User, AuditLog
from backend.app.schemas.schemas import (
    MCPToolItem, MCPToolRunRequest, MCPToolRunResponse
)
from backend.app.api.deps import get_current_user
from backend.app.services.mcp_service import mcp_manager

router = APIRouter(prefix="/mcp-tools", tags=["MCP Tools"])


@router.get("", response_model=List[MCPToolItem])
async def list_tools(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Discover all tools from currently connected MCP servers for this user."""
    query = select(MCPServer).where((MCPServer.user_id == current_user.id) | (MCPServer.is_builtin == True))
    res = await db.execute(query)
    servers = res.scalars().all()

    all_tools: List[MCPToolItem] = []
    for srv in servers:
        # Auto-connect if needed
        if srv.is_connected and not mcp_manager.is_connected(srv.id):
            args = json.loads(srv.args) if srv.args else []
            env_vars = json.loads(srv.env_vars) if srv.env_vars else {}
            try:
                await mcp_manager.connect_server(
                    srv.id, srv.command or "python3", args, env_vars, srv.transport_type, srv.endpoint_url
                )
            except Exception:
                continue

        if mcp_manager.is_connected(srv.id):
            try:
                tools = await mcp_manager.list_tools_for_server(srv.id)
                for t in tools:
                    t_name = t.get("name", "")
                    is_risky = any(w in t_name.lower() for w in ["delete", "remove", "kill", "eval", "drop", "write"])
                    all_tools.append(MCPToolItem(
                        server_id=srv.id,
                        server_name=srv.name,
                        name=t_name,
                        description=t.get("description"),
                        input_schema=t.get("inputSchema", {}),
                        is_risky=is_risky
                    ))
            except Exception:
                pass

    return all_tools


@router.post("/run", response_model=MCPToolRunResponse)
async def run_tool(
    data: MCPToolRunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Execute a selected MCP tool with user inputs and audit logging."""
    query = select(MCPServer).where(
        MCPServer.id == data.server_id,
        (MCPServer.user_id == current_user.id) | (MCPServer.is_builtin == True)
    )
    res = await db.execute(query)
    server = res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found or not owned by user.")

    # Check risky requirement
    is_risky = any(w in data.tool_name.lower() for w in ["delete", "remove", "kill", "eval", "drop", "write"])
    if is_risky and not data.confirmed:
        return MCPToolRunResponse(
            success=False,
            result=None,
            duration_ms=0,
            error="Confirmation required: This tool performs potentially destructive or external actions."
        )

    t0 = time.perf_counter()
    try:
        raw_res, duration_ms = await mcp_manager.execute_tool(
            server_id=data.server_id,
            tool_name=data.tool_name,
            arguments=data.arguments
        )
        # Parse text content from MCP result if standard format
        parsed_result = raw_res
        if isinstance(raw_res, dict) and "content" in raw_res:
            content_list = raw_res["content"]
            if isinstance(content_list, list) and len(content_list) > 0:
                first_text = content_list[0].get("text")
                try:
                    parsed_result = json.loads(first_text)
                except Exception:
                    parsed_result = first_text

        # Audit log
        db.add(AuditLog(
            user_id=current_user.id,
            action="mcp_tool_execution",
            resource_type="mcp_tool",
            resource_id=f"{server.name}:{data.tool_name}",
            details=json.dumps({"arguments": data.arguments, "server_id": server.id}),
            status="success",
            duration_ms=duration_ms
        ))
        await db.commit()

        return MCPToolRunResponse(
            success=True,
            result=parsed_result,
            duration_ms=duration_ms,
            error=None
        )
    except Exception as ex:
        duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        db.add(AuditLog(
            user_id=current_user.id,
            action="mcp_tool_execution",
            resource_type="mcp_tool",
            resource_id=f"{server.name}:{data.tool_name}",
            details=json.dumps({"arguments": data.arguments}),
            status="failure",
            duration_ms=duration_ms,
            error_message=str(ex)
        ))
        await db.commit()

        return MCPToolRunResponse(
            success=False,
            result=None,
            duration_ms=duration_ms,
            error=str(ex)
        )
