from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.app.core.database import get_db
from backend.app.core.security import (
    verify_password, get_password_hash, create_access_token, validate_opensense_email
)
from backend.app.models.models import User, MCPServer, AIProvider, AuditLog
from backend.app.schemas.schemas import UserRegister, UserLogin, Token, UserResponse, UserUpdate
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    # 1. Enforce OpenSense Labs domain check
    if not validate_opensense_email(user_in.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Restricted: Only verified OpenSense Labs (@opensenselabs.com) members are authorized."
        )

    # 2. Check if user already exists
    existing_query = select(User).where(User.email == user_in.email.lower().strip())
    res = await db.execute(existing_query)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this OpenSense Labs email already exists. Please log in."
        )

    # 3. Create user
    # Check if first user, make admin
    count_res = await db.execute(select(User))
    is_first = len(count_res.scalars().all()) == 0
    role = "admin" if is_first else "user"

    new_user = User(
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        department=user_in.department or "Engineering",
        role=role,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # 4. Provision built-in OpenSense Labs Ops MCP Server for this user
    builtin_server = MCPServer(
        user_id=new_user.id,
        name="OpenSense Labs Ops MCP",
        description="Core telemetry, timezones, and text/JSON transformation tools for OpenSense Labs team.",
        transport_type="stdio",
        command="python3",
        args='["backend/mcp_servers/opensense_builtin.py"]',
        env_vars='{}',
        is_connected=False,
        status="disconnected",
        is_builtin=True
    )
    db.add(builtin_server)

    # 5. Provision default Local/OpenSense AI Provider
    default_provider = AIProvider(
        user_id=new_user.id,
        name="OpenSense Autonomous Agent",
        provider_type="custom",
        base_url="http://localhost:8000/api/v1",
        model_name="opensense-ops-agent",
        is_default=True,
        is_enabled=True,
        timeout_seconds=30
    )
    db.add(default_provider)

    # Log registration
    log = AuditLog(
        user_id=new_user.id,
        action="user_registered",
        resource_type="user",
        resource_id=str(new_user.id),
        details='{"organization": "OpenSense Labs"}',
        status="success"
    )
    db.add(log)
    await db.commit()

    # Generate token
    token = create_access_token(new_user.id, new_user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    email = credentials.email.lower().strip()
    query = select(User).where(User.email == email)
    res = await db.execute(query)
    user = res.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your OpenSense Labs account is suspended. Contact an administrator."
        )

    # Log login
    log = AuditLog(
        user_id=user.id,
        action="user_login",
        resource_type="user",
        resource_id=str(user.id),
        status="success"
    )
    db.add(log)
    await db.commit()

    token = create_access_token(user.id, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name.strip()
    if user_update.department is not None:
        current_user.department = user_update.department.strip()
    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)

    await db.commit()
    await db.refresh(current_user)
    return current_user
