import json
import time
import httpx
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.core.security import encrypt_secret, decrypt_secret
from backend.app.models.models import CustomAPI, User, AuditLog
from backend.app.schemas.schemas import (
    CustomAPICreate, CustomAPIUpdate, CustomAPIResponse, CustomAPITestRequest
)
from backend.app.api.deps import get_current_user
from backend.app.services.ssrf_guard import validate_url_safe

router = APIRouter(prefix="/custom-apis", tags=["Custom API Integrations"])


def serialize_custom_api(api: CustomAPI) -> CustomAPIResponse:
    headers_dict = json.loads(api.headers) if api.headers else None
    params_dict = json.loads(api.query_params) if api.query_params else None
    body_dict = json.loads(api.body_schema) if api.body_schema else None
    has_auth = bool(api.encrypted_auth_value)
    return CustomAPIResponse(
        id=api.id,
        user_id=api.user_id,
        name=api.name,
        description=api.description,
        base_url=api.base_url,
        endpoint=api.endpoint,
        method=api.method,
        auth_type=api.auth_type,
        has_auth=has_auth,
        headers=headers_dict,
        query_params=params_dict,
        body_schema=body_dict,
        is_mcp_exposed=api.is_mcp_exposed,
        timeout=api.timeout,
        created_at=api.created_at
    )


@router.get("", response_model=List[CustomAPIResponse])
async def list_custom_apis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomAPI).where(CustomAPI.user_id == current_user.id).order_by(CustomAPI.created_at.desc())
    res = await db.execute(query)
    apis = res.scalars().all()
    return [serialize_custom_api(a) for a in apis]


@router.post("", response_model=CustomAPIResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_api(
    data: CustomAPICreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate SSRF
    full_url = f"{data.base_url.rstrip('/')}/{data.endpoint.lstrip('/')}"
    safe, reason = validate_url_safe(full_url, allow_local_dev=True)
    if not safe:
        raise HTTPException(status_code=400, detail=f"SSRF Protection: {reason}")

    enc_auth = encrypt_secret(data.auth_value.strip()) if data.auth_value else None
    headers_str = json.dumps(data.headers) if data.headers else None
    params_str = json.dumps(data.query_params) if data.query_params else None
    body_str = json.dumps(data.body_schema) if data.body_schema else None

    api = CustomAPI(
        user_id=current_user.id,
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        base_url=data.base_url.strip(),
        endpoint=data.endpoint.strip(),
        method=data.method.upper().strip(),
        auth_type=data.auth_type.lower().strip(),
        encrypted_auth_value=enc_auth,
        headers=headers_str,
        query_params=params_str,
        body_schema=body_str,
        is_mcp_exposed=bool(data.is_mcp_exposed),
        timeout=data.timeout or 15
    )
    db.add(api)
    await db.commit()
    await db.refresh(api)

    db.add(AuditLog(
        user_id=current_user.id,
        action="custom_api_created",
        resource_type="custom_api",
        resource_id=str(api.id),
        details=json.dumps({"name": api.name, "method": api.method, "endpoint": api.endpoint}),
        status="success"
    ))
    await db.commit()

    return serialize_custom_api(api)


@router.delete("/{api_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_api(
    api_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomAPI).where(CustomAPI.id == api_id, CustomAPI.user_id == current_user.id)
    res = await db.execute(query)
    api = res.scalar_one_or_none()
    if not api:
        raise HTTPException(status_code=404, detail="Custom API not found.")

    await db.delete(api)
    await db.commit()


@router.post("/test")
async def test_custom_api(
    data: CustomAPITestRequest,
    current_user: User = Depends(get_current_user)
):
    """Test custom API execution with SSRF validation and timing."""
    full_url = f"{data.base_url.rstrip('/')}/{data.endpoint.lstrip('/')}"
    safe, reason = validate_url_safe(full_url, allow_local_dev=True)
    if not safe:
        raise HTTPException(status_code=400, detail=f"SSRF Protection: {reason}")

    req_headers = data.headers.copy() if data.headers else {}
    if data.auth_type == "bearer" and data.auth_value:
        req_headers["Authorization"] = f"Bearer {data.auth_value}"
    elif data.auth_type == "api_key" and data.auth_value:
        req_headers["X-API-Key"] = data.auth_value

    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=float(data.timeout or 15)) as client:
            resp = await client.request(
                method=data.method.upper(),
                url=full_url,
                headers=req_headers,
                params=data.query_params,
                json=data.body_data if data.method.upper() in ("POST", "PUT", "PATCH") else None
            )
            duration_ms = round((time.perf_counter() - t0) * 1000, 2)
            try:
                body = resp.json()
            except Exception:
                body = resp.text[:500]

            return {
                "success": 200 <= resp.status_code < 300,
                "status_code": resp.status_code,
                "duration_ms": duration_ms,
                "response": body
            }
    except Exception as ex:
        duration_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "success": False,
            "status_code": 0,
            "duration_ms": duration_ms,
            "error": str(ex)
        }
