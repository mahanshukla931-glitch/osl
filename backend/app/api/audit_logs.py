import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.models.models import AuditLog, User
from backend.app.schemas.schemas import AuditLogResponse
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/audit-logs", tags=["Logs & Analytics"])


@router.get("", response_model=List[AuditLogResponse])
async def get_audit_logs(
    action: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).where(AuditLog.user_id == current_user.id)
    if action:
        query = query.where(AuditLog.action == action)
    if status:
        query = query.where(AuditLog.status == status)

    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    res = await db.execute(query)
    logs = res.scalars().all()

    formatted = []
    for l in logs:
        details_obj = json.loads(l.details) if l.details else None
        formatted.append(AuditLogResponse(
            id=l.id,
            user_id=l.user_id,
            user_email=current_user.email,
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
    return formatted
