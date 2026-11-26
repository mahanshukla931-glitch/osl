import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.models.models import MCPServer, User
from backend.app.schemas.schemas import MCPPromptItem
from backend.app.api.deps import get_current_user
from backend.app.services.mcp_service import mcp_manager

router = APIRouter(prefix="/mcp-prompts", tags=["MCP Prompts"])


@router.get("", response_model=List[MCPPromptItem])
async def list_prompts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(MCPServer).where((MCPServer.user_id == current_user.id) | (MCPServer.is_builtin == True))
    res = await db.execute(query)
    servers = res.scalars().all()

    all_prompts: List[MCPPromptItem] = []
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
                prompts = await mcp_manager.list_prompts_for_server(srv.id)
                for p in prompts:
                    all_prompts.append(MCPPromptItem(
                        server_id=srv.id,
                        server_name=srv.name,
                        name=p.get("name", ""),
                        description=p.get("description"),
                        arguments=p.get("arguments", [])
                    ))
            except Exception:
                pass
    return all_prompts


@router.post("/get")
async def get_prompt_template(
    server_id: int = Body(...),
    prompt_name: str = Body(...),
    arguments: Dict[str, Any] = Body(default={}),
    current_user: User = Depends(get_current_user)
):
    try:
        res = await mcp_manager.get_prompt_for_server(server_id, prompt_name, arguments)
        return {"success": True, "prompt": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load prompt: {str(e)}")
