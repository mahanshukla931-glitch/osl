import json
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.models.models import MCPServer, User, AuditLog
from backend.app.schemas.schemas import (
    MCPServerCreate, MCPServerUpdate, MCPServerResponse
)
from backend.app.api.deps import get_current_user
from backend.app.services.mcp_service import mcp_manager

router = APIRouter(prefix="/mcp-servers", tags=["MCP Servers"])


def serialize_server(s: MCPServer) -> MCPServerResponse:
    args_list = json.loads(s.args) if s.args else []
    env_dict = json.loads(s.env_vars) if s.env_vars else {}
    # Update real live status from mcp_manager
    is_live = mcp_manager.is_connected(s.id)
    return MCPServerResponse(
        id=s.id,
        user_id=s.user_id,
        name=s.name,
        description=s.description,
        transport_type=s.transport_type,
        command=s.command,
        args=args_list,
        env_vars=env_dict,
        endpoint_url=s.endpoint_url,
        is_connected=is_live or s.is_connected,
        status="connected" if (is_live or s.is_connected) else s.status,
        last_error=s.last_error,
        is_builtin=s.is_builtin,
        created_at=s.created_at,
        updated_at=s.updated_at
    )


@router.get("", response_model=List[MCPServerResponse])
async def list_servers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MCPServer).where(
        (MCPServer.user_id == current_user.id) | (MCPServer.is_builtin == True)
    ).order_by(MCPServer.created_at.desc())
    res = await db.execute(query)
    servers = res.scalars().all()
    return [serialize_server(s) for s in servers]


@router.post("", response_model=MCPServerResponse, status_code=status.HTTP_201_CREATED)
async def create_server(
    data: MCPServerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    args_json = json.dumps(data.args) if data.args else "[]"
    env_json = json.dumps(data.env_vars) if data.env_vars else "{}"

    server = MCPServer(
        user_id=current_user.id,
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        transport_type=data.transport_type.lower().strip(),
        command=data.command.strip() if data.command else "python3",
        args=args_json,
        env_vars=env_json,
        endpoint_url=data.endpoint_url.strip() if data.endpoint_url else None,
        is_connected=False,
        status="disconnected",
        is_builtin=False
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)

    db.add(AuditLog(
        user_id=current_user.id,
        action="mcp_server_created",
        resource_type="mcp_server",
        resource_id=str(server.id),
        details=json.dumps({"name": server.name, "transport": server.transport_type}),
        status="success"
    ))
    await db.commit()

    return serialize_server(server)


@router.put("/{server_id}", response_model=MCPServerResponse)
async def update_server(
    server_id: int,
    data: MCPServerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MCPServer).where(MCPServer.id == server_id, MCPServer.user_id == current_user.id)
    res = await db.execute(query)
    server = res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP Server not found.")

    if data.name is not None:
        server.name = data.name.strip()
    if data.description is not None:
        server.description = data.description.strip()
    if data.transport_type is not None:
        server.transport_type = data.transport_type.lower().strip()
    if data.command is not None:
        server.command = data.command.strip()
    if data.args is not None:
        server.args = json.dumps(data.args)
    if data.env_vars is not None:
        server.env_vars = json.dumps(data.env_vars)
    if data.endpoint_url is not None:
        server.endpoint_url = data.endpoint_url.strip()

    await db.commit()
    await db.refresh(server)
    return serialize_server(server)


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(
    server_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MCPServer).where(MCPServer.id == server_id, MCPServer.user_id == current_user.id)
    res = await db.execute(query)
    server = res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP Server not found.")

    await mcp_manager.disconnect_server(server.id)
    await db.delete(server)
    await db.commit()


@router.post("/{server_id}/connect", response_model=MCPServerResponse)
async def connect_server(
    server_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MCPServer).where(MCPServer.id == server_id, MCPServer.user_id == current_user.id)
    res = await db.execute(query)
    server = res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP Server not found.")

    args = json.loads(server.args) if server.args else []
    env_vars = json.loads(server.env_vars) if server.env_vars else {}

    try:
        await mcp_manager.connect_server(
            server_id=server.id,
            command=server.command or "python3",
            args=args,
            env=env_vars,
            transport_type=server.transport_type,
            endpoint_url=server.endpoint_url
        )
        server.is_connected = True
        server.status = "connected"
        server.last_error = None
        await db.commit()

        db.add(AuditLog(
            user_id=current_user.id,
            action="mcp_server_connected",
            resource_type="mcp_server",
            resource_id=str(server.id),
            details=json.dumps({"name": server.name}),
            status="success"
        ))
        await db.commit()
    except Exception as e:
        server.is_connected = False
        server.status = "error"
        server.last_error = str(e)
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to connect MCP server: {str(e)}")

    await db.refresh(server)
    return serialize_server(server)


@router.post("/{server_id}/disconnect", response_model=MCPServerResponse)
async def disconnect_server(
    server_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MCPServer).where(MCPServer.id == server_id, MCPServer.user_id == current_user.id)
    res = await db.execute(query)
    server = res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP Server not found.")

    await mcp_manager.disconnect_server(server.id)
    server.is_connected = False
    server.status = "disconnected"
    await db.commit()
    await db.refresh(server)
    return serialize_server(server)


@router.post("/{server_id}/restart", response_model=MCPServerResponse)
async def restart_server(
    server_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await disconnect_server(server_id, current_user, db)
    return await connect_server(server_id, current_user, db)


@router.post("/{server_id}/test")
async def test_server_handshake(
    server_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    t0 = time.perf_counter()
    query = select(MCPServer).where(MCPServer.id == server_id, MCPServer.user_id == current_user.id)
    res = await db.execute(query)
    server = res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP Server not found.")

    args = json.loads(server.args) if server.args else []
    env_vars = json.loads(server.env_vars) if server.env_vars else {}

    try:
        init_res = await mcp_manager.connect_server(
            server_id=server.id,
            command=server.command or "python3",
            args=args,
            env=env_vars,
            transport_type=server.transport_type,
            endpoint_url=server.endpoint_url
        )
        tools = await mcp_manager.list_tools_for_server(server.id)
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        server.is_connected = True
        server.status = "connected"
        await db.commit()

        return {
            "success": True,
            "message": "Handshake succeeded! Server protocol initialized.",
            "latency_ms": latency_ms,
            "server_info": init_res.get("serverInfo", {}),
            "tools_count": len(tools),
            "tools": [t["name"] for t in tools]
        }
    except Exception as e:
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "success": False,
            "message": f"Test failed: {str(e)}",
            "latency_ms": latency_ms
        }
