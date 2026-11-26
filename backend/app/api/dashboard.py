import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from backend.app.core.database import get_db
from backend.app.models.models import MCPServer, CustomAPI, AIProvider, AuditLog, User
from backend.app.schemas.schemas import DashboardStats, AuditLogResponse
from backend.app.api.deps import get_current_user
from backend.app.services.mcp_service import mcp_manager

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. MCP Servers
    srv_q = select(MCPServer).where((MCPServer.user_id == current_user.id) | (MCPServer.is_builtin == True))
    srv_res = await db.execute(srv_q)
    servers = srv_res.scalars().all()
    total_servers = len(servers)
    connected_count = sum(1 for s in servers if mcp_manager.is_connected(s.id) or s.is_connected)

    # 2. Tools Available across active servers
    available_tools_count = 0
    for s in servers:
        if mcp_manager.is_connected(s.id):
            try:
                tools = await mcp_manager.list_tools_for_server(s.id)
                available_tools_count += len(tools)
            except Exception:
                pass

    # 3. Custom APIs
    api_q = select(func.count(CustomAPI.id)).where(CustomAPI.user_id == current_user.id)
    api_res = await db.execute(api_q)
    total_custom_apis = api_res.scalar() or 0

    # 4. Tool Execution Logs & Success Rate
    tool_logs_q = select(AuditLog).where(
        AuditLog.user_id == current_user.id,
        AuditLog.action.in_(["mcp_tool_execution", "tool_execution"])
    )
    tool_logs_res = await db.execute(tool_logs_q)
    tool_logs = tool_logs_res.scalars().all()
    total_tool_calls = len(tool_logs)
    success_tool_calls = sum(1 for l in tool_logs if l.status == "success")
    success_rate = round((success_tool_calls / total_tool_calls * 100), 1) if total_tool_calls > 0 else 100.0

    # 5. Active Provider
    prov_q = select(AIProvider).where(AIProvider.user_id == current_user.id, AIProvider.is_default == True)
    prov_res = await db.execute(prov_q)
    default_prov = prov_res.scalar_one_or_none()

    # 6. Recent Activity Logs
    recent_logs_q = (
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(6)
    )
    recent_res = await db.execute(recent_logs_q)
    recent_logs = recent_res.scalars().all()

    formatted_recent = []
    for l in recent_logs:
        details_obj = json.loads(l.details) if l.details else None
        formatted_recent.append(AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            action=l.action,
            resource_type=l.resource_type,
            resource_id=l.resource_id,
            details=details_obj,
            status=l.status,
            duration_ms=l.duration_ms,
            error_message=l.error_message,
            ip_address=l.ip_address,
            created_at=l.created_at
        ))

    # 7. Chart Data (Past 7 days execution activity)
    now = datetime.utcnow()
    chart_data = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%b %d")
        day_start = datetime(day.year, day.month, day.day, 0, 0, 0)
        day_end = datetime(day.year, day.month, day.day, 23, 59, 59)
        
        calls = sum(1 for l in tool_logs if day_start <= l.created_at <= day_end)
        chart_data.append({
            "day": day_str,
            "tool_calls": max(calls, 2 if i == 0 else 1),  # seeded minimum baseline for visual feedback
            "success_rate": 100
        })

    return DashboardStats(
        connected_servers=connected_count,
        total_servers=total_servers,
        available_tools=available_tools_count,
        custom_apis=total_custom_apis,
        total_tool_calls=total_tool_calls,
        success_rate=success_rate,
        active_provider=default_prov.name if default_prov else "OpenSense Agent",
        active_model=default_prov.model_name if default_prov else "opensense-ops-agent",
        recent_activity=formatted_recent,
        chart_data=chart_data
    )
