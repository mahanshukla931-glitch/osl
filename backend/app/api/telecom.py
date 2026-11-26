import os
import json
import uuid
import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.models import User, AuditLog
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/telecom", tags=["OpenSense Telecom & Calling"])

TELECOM_CONFIG_FILE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "telecom_config.json")
)


def _load_telecom_data() -> Dict[str, Any]:
    os.makedirs(os.path.dirname(TELECOM_CONFIG_FILE), exist_ok=True)
    if not os.path.exists(TELECOM_CONFIG_FILE):
        default_data = {
            "enabled": True,
            "admin_configured": True,
            "last_updated_by": "admin@opensenselabs.com",
            "contacts": [
                {
                    "id": "c1",
                    "name": "Pooja Sharma",
                    "role": "HR Lead & People Operations",
                    "department": "People & Culture (HR)",
                    "phone": "",
                    "email": "pooja.hr@opensenselabs.com",
                    "status": "Available"
                },
                {
                    "id": "c2",
                    "name": "Vikram Singh",
                    "role": "DevOps & IT Support Lead",
                    "department": "Platform Engineering",
                    "phone": "",
                    "email": "vikram.it@opensenselabs.com",
                    "status": "Available"
                },
                {
                    "id": "c3",
                    "name": "Neha Verma",
                    "role": "Marketing & Brand Growth Head",
                    "department": "Marketing & Brand Growth",
                    "phone": "",
                    "email": "neha.marketing@opensenselabs.com",
                    "status": "In Meeting"
                },
                {
                    "id": "c4",
                    "name": "Amit Roy",
                    "role": "VP Enterprise Client Partnerships",
                    "department": "Business Development (Sales)",
                    "phone": "",
                    "email": "amit.sales@opensenselabs.com",
                    "status": "Available"
                },
                {
                    "id": "c5",
                    "name": "Siddharth Jain",
                    "role": "Chief Technology Officer (CTO)",
                    "department": "Leadership & Strategy",
                    "phone": "",
                    "email": "siddharth.cto@opensenselabs.com",
                    "status": "Available"
                },
                {
                    "id": "c6",
                    "name": "OpenSense Reception Desk",
                    "role": "Noida HQ Front Desk",
                    "department": "Workplace Operations",
                    "phone": "",
                    "email": "reception@opensenselabs.com",
                    "status": "Available"
                }
            ]
        }
        with open(TELECOM_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
        return default_data

    with open(TELECOM_CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_telecom_data(data: Dict[str, Any]):
    os.makedirs(os.path.dirname(TELECOM_CONFIG_FILE), exist_ok=True)
    with open(TELECOM_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


class ContactCreate(BaseModel):
    name: str
    role: str
    department: str
    phone: str
    email: Optional[str] = ""
    status: Optional[str] = "Available"


class ToggleRequest(BaseModel):
    enabled: bool


class CallRequest(BaseModel):
    contact_name: str
    phone: str
    department: Optional[str] = "OpenSense Labs"


@router.get("/config")
async def get_telecom_config(
    current_user: User = Depends(get_current_user)
):
    """Get telecom calling setup and directory contacts for team members."""
    data = _load_telecom_data()
    return {
        "enabled": data.get("enabled", True),
        "admin_configured": data.get("admin_configured", True),
        "last_updated_by": data.get("last_updated_by", "admin@opensenselabs.com"),
        "total_contacts": len(data.get("contacts", [])),
        "contacts": data.get("contacts", []),
        "is_admin": current_user.role == "admin"
    }


@router.post("/toggle")
async def toggle_telecom_setup(
    payload: ToggleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only: Enable or disable calling setup for OpenSense team."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required. Only OpenSense Admins can configure the calling setup."
        )

    data = _load_telecom_data()
    data["enabled"] = payload.enabled
    data["last_updated_by"] = current_user.email
    _save_telecom_data(data)

    db.add(AuditLog(
        user_id=current_user.id,
        action="telecom_setup_toggled",
        resource_type="telecom",
        details=json.dumps({"enabled": payload.enabled}),
        status="success"
    ))
    await db.commit()

    return {
        "success": True,
        "enabled": payload.enabled,
        "message": f"OpenSense Telecom calling {'enabled' if payload.enabled else 'disabled'} successfully by Admin."
    }


@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def add_telecom_contact(
    payload: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only: Add a new verified phone contact to the directory."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required. Only Admins can add contacts to the OpenSense directory."
        )

    data = _load_telecom_data()
    new_contact = {
        "id": f"c_{uuid.uuid4().hex[:6]}",
        "name": payload.name.strip(),
        "role": payload.role.strip(),
        "department": payload.department.strip(),
        "phone": payload.phone.strip(),
        "email": payload.email.strip() if payload.email else f"{payload.name.lower().replace(' ', '.')}@opensenselabs.com",
        "status": payload.status.strip() if payload.status else "Available"
    }
    data.setdefault("contacts", []).append(new_contact)
    data["last_updated_by"] = current_user.email
    _save_telecom_data(data)

    db.add(AuditLog(
        user_id=current_user.id,
        action="telecom_contact_added",
        resource_type="telecom",
        resource_id=new_contact["id"],
        details=json.dumps(new_contact),
        status="success"
    ))
    await db.commit()

    return {"success": True, "contact": new_contact, "message": "Contact added successfully to directory."}


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_telecom_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Admin-only: Delete a contact from the OpenSense directory."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privilege required. Only Admins can remove directory contacts."
        )

    data = _load_telecom_data()
    orig_len = len(data.get("contacts", []))
    data["contacts"] = [c for c in data.get("contacts", []) if c.get("id") != contact_id]

    if len(data["contacts"]) == orig_len:
        raise HTTPException(status_code=404, detail="Contact not found.")

    data["last_updated_by"] = current_user.email
    _save_telecom_data(data)

    db.add(AuditLog(
        user_id=current_user.id,
        action="telecom_contact_deleted",
        resource_type="telecom",
        resource_id=contact_id,
        status="success"
    ))
    await db.commit()
    return None


@router.post("/call")
async def initiate_phone_call(
    payload: CallRequest,
    current_user: User = Depends(get_current_user)
):
    """OpenSense team member initiates a phone call to a directory contact."""
    data = _load_telecom_data()
    if not data.get("enabled", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenSense Calling Setup is currently disabled. Ask an Admin to enable it in Settings."
        )

    clean_phone = payload.phone.replace(" ", "").replace("-", "")
    call_id = f"call_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    return {
        "call_id": call_id,
        "status": "ringing",
        "contact_name": payload.contact_name,
        "phone": payload.phone,
        "tel_uri": f"tel:{clean_phone}",
        "department": payload.department,
        "initiated_by": current_user.email,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "message": f"Connecting phone call to {payload.contact_name} ({payload.phone})..."
    }
