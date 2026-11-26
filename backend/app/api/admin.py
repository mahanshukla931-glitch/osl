from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.models.models import User, MCPServer, AIProvider, AuditLog
from backend.app.schemas.schemas import UserResponse, UserUpdate
from backend.app.api.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(User).order_by(User.created_at.desc())
    res = await db.execute(query)
    users = res.scalars().all()
    return users


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user_status_or_role(
    user_id: int,
    data: UserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    query = select(User).where(User.id == user_id)
    res = await db.execute(query)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if data.role is not None:
        if data.role not in ("admin", "user"):
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'.")
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.department is not None:
        user.department = data.department.strip()

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/system-summary")
async def get_system_summary(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    users_q = await db.execute(select(User))
    users = users_q.scalars().all()

    servers_q = await db.execute(select(MCPServer))
    servers = servers_q.scalars().all()

    logs_q = await db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(15))
    logs = logs_q.scalars().all()

    return {
        "organization": "OpenSense Labs",
        "total_team_members": len(users),
        "total_mcp_servers": len(servers),
        "connected_mcp_servers": sum(1 for s in servers if s.is_connected),
        "recent_audit_count": len(logs),
        "server_status": "OPERATIONAL",
        "auth_policy": "Domain Restricted (@opensenselabs.com)"
    }
