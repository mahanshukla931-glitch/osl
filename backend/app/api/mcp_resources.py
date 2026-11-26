import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.models.models import MCPServer, User
from backend.app.schemas.schemas import MCPResourceItem
from backend.app.api.deps import get_current_user
from backend.app.services.mcp_service import mcp_manager

router = APIRouter(prefix="/mcp-resources", tags=["MCP Resources"])


@router.get("", response_model=List[MCPResourceItem])
async def list_resources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MCPServer).where((MCPServer.user_id == current_user.id) | (MCPServer.is_builtin == True))
    res = await db.execute(query)
    servers = res.scalars().all()

    all_resources: List[MCPResourceItem] = []
    for srv in servers:
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
                res_list = await mcp_manager.list_resources_for_server(srv.id)
                for r in res_list:
                    all_resources.append(MCPResourceItem(
                        server_id=srv.id,
                        server_name=srv.name,
                        uri=r.get("uri", ""),
                        name=r.get("name", ""),
                        mime_type=r.get("mimeType"),
                        description=r.get("description")
                    ))
            except Exception:
                pass
    return all_resources


@router.post("/read")
async def read_resource(
    server_id: int = Body(...),
    uri: str = Body(...),
    current_user: User = Depends(get_current_user)
):
    try:
        content = await mcp_manager.read_resource_for_server(server_id, uri)
        return {"success": True, "uri": uri, "content": content}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read resource: {str(e)}")
