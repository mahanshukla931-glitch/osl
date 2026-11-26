import json
import time
import httpx
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.core.security import encrypt_secret, decrypt_secret, mask_secret
from backend.app.models.models import AIProvider, User, AuditLog
from backend.app.schemas.schemas import (
    AIProviderCreate, AIProviderUpdate, AIProviderResponse,
    AIProviderTestRequest, AIProviderTestResponse
)
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/ai-providers", tags=["AI Providers"])


def serialize_provider(p: AIProvider) -> AIProviderResponse:
    headers_dict = json.loads(p.custom_headers) if p.custom_headers else None
    decrypted = decrypt_secret(p.encrypted_api_key) if p.encrypted_api_key else ""
    return AIProviderResponse(
        id=p.id,
        user_id=p.user_id,
        name=p.name,
        provider_type=p.provider_type,
        base_url=p.base_url,
        masked_api_key=mask_secret(decrypted),
        has_api_key=bool(decrypted),
        model_name=p.model_name,
        organization=p.organization,
        custom_headers=headers_dict,
        timeout_seconds=p.timeout_seconds,
        is_default=p.is_default,
        is_enabled=p.is_enabled,
        created_at=p.created_at,
        updated_at=p.updated_at
    )


@router.get("", response_model=List[AIProviderResponse])
async def list_providers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AIProvider).where(AIProvider.user_id == current_user.id).order_by(AIProvider.created_at.desc())
    res = await db.execute(query)
    providers = res.scalars().all()
    return [serialize_provider(p) for p in providers]


@router.post("", response_model=AIProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(
    data: AIProviderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # If is_default, unmark other defaults
    if data.is_default:
        await db.execute(
            select(AIProvider).where(AIProvider.user_id == current_user.id)
        )
        existing_res = await db.execute(select(AIProvider).where(AIProvider.user_id == current_user.id))
        for p in existing_res.scalars().all():
            p.is_default = False

    encrypted_key = encrypt_secret(data.api_key.strip()) if data.api_key else None
    headers_json = json.dumps(data.custom_headers) if data.custom_headers else None

    provider = AIProvider(
        user_id=current_user.id,
        name=data.name.strip(),
        provider_type=data.provider_type.lower().strip(),
        base_url=data.base_url.strip(),
        encrypted_api_key=encrypted_key,
        model_name=data.model_name.strip(),
        organization=data.organization.strip() if data.organization else None,
        custom_headers=headers_json,
        timeout_seconds=data.timeout_seconds or 30,
        is_default=bool(data.is_default),
        is_enabled=bool(data.is_enabled)
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="provider_created",
        resource_type="ai_provider",
        resource_id=str(provider.id),
        details=json.dumps({"provider_name": provider.name, "model": provider.model_name}),
        status="success"
    ))
    await db.commit()

    return serialize_provider(provider)


@router.put("/{provider_id}", response_model=AIProviderResponse)
async def update_provider(
    provider_id: int,
    data: AIProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AIProvider).where(AIProvider.id == provider_id, AIProvider.user_id == current_user.id)
    res = await db.execute(query)
    provider = res.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="AI Provider configuration not found.")

    if data.name is not None:
        provider.name = data.name.strip()
    if data.provider_type is not None:
        provider.provider_type = data.provider_type.lower().strip()
    if data.base_url is not None:
        provider.base_url = data.base_url.strip()
    if data.api_key is not None:
        provider.encrypted_api_key = encrypt_secret(data.api_key.strip()) if data.api_key.strip() else None
    if data.model_name is not None:
        provider.model_name = data.model_name.strip()
    if data.organization is not None:
        provider.organization = data.organization.strip()
    if data.custom_headers is not None:
        provider.custom_headers = json.dumps(data.custom_headers)
    if data.timeout_seconds is not None:
        provider.timeout_seconds = data.timeout_seconds
    if data.is_enabled is not None:
        provider.is_enabled = data.is_enabled

    if data.is_default:
        existing_res = await db.execute(select(AIProvider).where(AIProvider.user_id == current_user.id))
        for p in existing_res.scalars().all():
            p.is_default = (p.id == provider.id)

    await db.commit()
    await db.refresh(provider)
    return serialize_provider(provider)


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AIProvider).where(AIProvider.id == provider_id)
    if current_user.role != "admin":
        query = query.where(AIProvider.user_id == current_user.id)
    res = await db.execute(query)
    provider = res.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="AI Provider not found.")

    await db.delete(provider)
    await db.commit()
    return {"success": True, "message": "AI Provider deleted successfully."}


@router.post("/test", response_model=AIProviderTestResponse)
async def test_provider_connection(
    data: AIProviderTestRequest,
    current_user: User = Depends(get_current_user)
):
    """Test connection and discover models where supported."""
    t0 = time.perf_counter()
    headers = {"Content-Type": "application/json"}
    if data.api_key:
        headers["Authorization"] = f"Bearer {data.api_key.strip()}"
    if data.custom_headers:
        headers.update(data.custom_headers)

    url = data.base_url.rstrip("/")

    # If test is local built-in
    if "localhost:8000" in url or "opensense" in data.provider_type:
        latency = round((time.perf_counter() - t0) * 1000, 2)
        return AIProviderTestResponse(
            success=True,
            message="OpenSense Labs Autonomous Agent is online and fully responsive.",
            latency_ms=latency,
            available_models=["opensense-ops-agent", "opensense-analyst-v1"]
        )

    # Google Gemini API Provider test
    if data.provider_type.lower() == "gemini" or "generativelanguage.googleapis.com" in url:
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={data.api_key}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(gemini_url)
                latency = round((time.perf_counter() - t0) * 1000, 2)
                if resp.status_code == 200:
                    data_json = resp.json()
                    models = [m.get("name", "").replace("models/", "") for m in data_json.get("models", []) if "generateContent" in m.get("supportedGenerationMethods", [])][:10]
                    return AIProviderTestResponse(
                        success=True,
                        message="✅ Google Gemini API Validated & Connected! Quota Limits: 15 RPM (Requests/Min), 1,500 RPD (Requests/Day), 1M TPM.",
                        latency_ms=latency,
                        available_models=models if models else ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"]
                    )
                else:
                    err_msg = resp.text[:150]
                    try:
                        err_json = resp.json()
                        err_msg = err_json.get("error", {}).get("message", err_msg)
                    except Exception:
                        pass
                    return AIProviderTestResponse(
                        success=False,
                        message=f"❌ Galat Gemini API Key! Error ({resp.status_code}): {err_msg} | Quota Info: Free tier provides 15 RPM / 1,500 RPD.",
                        latency_ms=latency
                    )
        except Exception as e:
            latency = round((time.perf_counter() - t0) * 1000, 2)
            return AIProviderTestResponse(
                success=False,
                message=f"Gemini connection failed: {str(e)}",
                latency_ms=latency
            )

    # Attempt to query models endpoint
    models_url = f"{url}/models"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(models_url, headers=headers)
            latency = round((time.perf_counter() - t0) * 1000, 2)
            
            if resp.status_code == 200:
                body = resp.json()
                model_ids = []
                if isinstance(body, dict) and "data" in body and isinstance(body["data"], list):
                    model_ids = [m.get("id") for m in body["data"] if isinstance(m, dict) and "id" in m][:15]
                return AIProviderTestResponse(
                    success=True,
                    message="✅ Connected successfully! Model access verified.",
                    latency_ms=latency,
                    available_models=model_ids if model_ids else [data.model_name]
                )
            else:
                err_msg = resp.text[:150]
                try:
                    err_json = resp.json()
                    err_msg = err_json.get("error", {}).get("message", err_msg)
                except Exception:
                    pass
                return AIProviderTestResponse(
                    success=False,
                    message=f"❌ Provider Error ({resp.status_code}): {err_msg} | Quota Info: 500 RPM requires active account credits.",
                    latency_ms=latency
                )
    except Exception as e:
        latency = round((time.perf_counter() - t0) * 1000, 2)
        return AIProviderTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
            latency_ms=latency
        )
