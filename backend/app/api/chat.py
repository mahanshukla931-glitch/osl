import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from backend.app.core.database import get_db
from backend.app.models.models import ChatSession, ChatMessage, MCPServer, AIProvider, User, AuditLog
from backend.app.schemas.schemas import (
    ChatSessionResponse, ChatMessageCreate, ChatMessageResponse
)
from backend.app.api.deps import get_current_user
from backend.app.services.mcp_service import mcp_manager
from backend.app.services.ai_service import ai_service

router = APIRouter(prefix="/chat", tags=["AI Chat & Sessions"])


class GuestChatMessageRequest(BaseModel):
    content: str
    messages: Optional[List[Dict[str, Any]]] = []
    guest_chat_count: Optional[int] = 0
    persona: Optional[str] = "aanya"


@router.post("/guest")
async def guest_chat_message(
    msg_data: GuestChatMessageRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Public guest chat endpoint: allows new users to test the AI Assistant for up to 5 messages.
    After 5 messages, prompts them to register / login to continue unlimited.
    """
    count = msg_data.guest_chat_count or 0
    if count >= 5:
        return {
            "role": "assistant",
            "content": (
                "🔒 **Aapne apne 5 free guest messages use kar liye hain!** 🎉✨\n\n"
                "OpenSense AI Assistant ke saath unlimited chat jari rakhne, profile manage karne, "
                "aur apni saari conversation history save karne ke liye kripya **Create Account** par click karein ya **Sign In** karein! 🚀"
            ),
            "requires_auth": True,
            "remaining_chats": 0,
            "model": "OpenSense-Guest"
        }

    # Format messages
    formatted_messages = [
        {
            "role": "system",
            "content": (
                "You are OpenSense Labs AI Assistant. You are warm, engaging, lively with emojis, "
                "and helpful across HR, Marketing, Tech, and Creative.\n\n"
                "CRITICAL AUTOMATIC LANGUAGE DETECTION & MIRRORING RULE (HIGHEST PRIORITY):\n"
                "- Always detect the language of the user's latest query and answer in the EXACT SAME LANGUAGE.\n"
                "- IF THE USER WRITES OR SPEAKS IN ENGLISH (e.g. 'hello', 'what is this', 'how does this work', 'explain', 'tell me', or any English text):\n"
                "  You MUST respond 100% IN CLEAR, NATURAL, FLUENT ENGLISH! NEVER respond in Hindi or Hinglish when the user communicates in English.\n"
                "- IF THE USER WRITES OR SPEAKS IN HINDI OR HINGLISH (e.g. 'kaisa hai buddy', 'batao', 'leave policy kya hai', 'chhutti kitni milti hai', 'kya scene hai'):\n"
                "  You MUST respond in natural, friendly, expressive Hindi / Hinglish. Never reply in English when the user communicates in Hindi or Hinglish.\n"
                "- Seamlessly auto-switch languages turn-by-turn based on the user's latest message.\n\n"
                "STRICT SESSION ISOLATION & DATA PRIVACY:\n"
                "- Each chat session is 100% private and isolated.\n"
                "- If this is a new conversation or if previous messages do not contain user-provided facts, you have NO prior memory of the user or other conversations.\n"
                "- If the user asks 'kya yaad hai?', 'mera naam kya hai?', 'who am I?', or what was discussed earlier, and it was NOT mentioned in this current active session's conversation history:\n"
                "  Politely state in the user's language that this is a fresh conversation with complete privacy and zero prior memory/context.\n"
                "- NEVER fabricate, assume, or leak names, prompts, or information from any previous or other chats.\n\n"
                "AUTHORITATIVE OPENSENSE LABS ENTERPRISE KNOWLEDGE (REAL FACTS):\n"
                "- OpenSense Labs (OSL) is an enterprise digital experience & Drupal 10/11 consultancy founded in 2013.\n"
                "- HQ: Logix Cyber Park, Sector 62, Noida, UP 201309, India. Global hubs in London (UK) and Wilmington, Delaware (USA).\n"
                "- Accreditations: Acquia Certified Partner, Drupal Association Supporting Partner, AWS Consulting Partner.\n"
                "- Leaves: 12 Casual Leaves (CL), 12 Sick Leaves (SL), 15 Earned Leaves (EL) (up to 10 carry-forward per year), 2 Optional Festival leaves, 26 weeks paid Maternity leave, 2 weeks Paternity leave.\n"
                "- Health Insurance: ₹5,00,000 INR Family Floater Policy (covers employee, spouse, 2 children), cashless at 10,000+ hospitals, day-1 pre-existing cover, maternity benefit up to ₹50,000.\n"
                "- Work Timings: 9:30 AM to 6:30 PM IST (Mon-Fri, 5-day week). Hybrid: 3 days in-office at Sector 62 Noida, 2 days remote.\n"
                "- Key Contacts: Pooja Sharma (HR Lead, pooja.hr@opensenselabs.com), Vikram Singh (DevOps Lead), Neha Verma (Marketing Head), Siddharth Jain (CTO).\n"
                "- CRITICAL: Never output fake or dummy phone numbers (e.g. 9876543210). Always share official email channels or company portal links."
            )
        }
    ]
    if msg_data.messages:
        for m in msg_data.messages:
            formatted_messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
    
    # Avoid duplicate user message if already present at the end of msg_data.messages
    latest_content = msg_data.content.strip()
    if not formatted_messages or formatted_messages[-1].get("content", "").strip() != latest_content:
        formatted_messages.append({"role": "user", "content": latest_content})

    # Check for active provider with key
    p_res = await db.execute(select(AIProvider).where(AIProvider.encrypted_api_key.isnot(None), AIProvider.is_enabled == True))
    guest_provider = p_res.scalars().first()

    ai_res = await ai_service.chat_completion(
        messages=formatted_messages,
        provider=guest_provider,
        connected_servers=[],
        persona=msg_data.persona or "aanya"
    )

    new_count = count + 1
    return {
        "role": "assistant",
        "content": ai_res.get("content", ""),
        "tool_calls": ai_res.get("tool_calls"),
        "tool_results": ai_res.get("tool_results"),
        "remaining_chats": max(0, 5 - new_count),
        "requires_auth": new_count >= 5,
        "model": ai_res.get("model", "OpenSense-Neural-Core")
    }


@router.delete("/sessions", status_code=status.HTTP_204_NO_CONTENT)
async def clear_all_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete all chat sessions for the logged in user (like ChatGPT Clear All)."""
    query = select(ChatSession).where(ChatSession.user_id == current_user.id)
    res = await db.execute(query)
    sessions = res.scalars().all()
    for s in sessions:
        await db.delete(s)
    await db.commit()
    return None


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    res = await db.execute(query)
    sessions = res.scalars().all()
    return sessions


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    payload: dict = {},
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    title = payload.get("title", "OpenSense MCP Assistant") if isinstance(payload, dict) else "OpenSense MCP Assistant"
    session = ChatSession(
        user_id=current_user.id,
        title=title
    )
    db.add(session)
    await db.commit()
    res = await db.execute(
        select(ChatSession).options(selectinload(ChatSession.messages)).where(ChatSession.id == session.id)
    )
    return res.scalar_one()


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    res = await db.execute(query)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    # Parse json strings for tool calls and results
    msgs = []
    for m in session.messages:
        tc = json.loads(m.tool_calls) if m.tool_calls else None
        tr = json.loads(m.tool_results) if m.tool_results else None
        msgs.append(ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            tool_calls=tc,
            tool_results=tr,
            created_at=m.created_at
        ))
    
    return ChatSessionResponse(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        model_used=session.model_used,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=msgs
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    res = await db.execute(query)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    await db.delete(session)
    await db.commit()


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    session_id: int,
    msg_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    res = await db.execute(query)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    # 1. Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=msg_data.content.strip()
    )
    db.add(user_msg)
    await db.commit()

    # Update session title if first message
    if len(session.messages) <= 1:
        words = msg_data.content.strip().split()
        session.title = " ".join(words[:5]) if words else "Conversation"
        await db.commit()

    # 2. Gather active connected MCP servers & tools
    srv_query = select(MCPServer).where((MCPServer.user_id == current_user.id) | (MCPServer.is_builtin == True))
    srv_res = await db.execute(srv_query)
    servers = srv_res.scalars().all()

    connected_servers_data = []
    for srv in servers:
        # Check or auto-connect
        if srv.is_connected and not mcp_manager.is_connected(srv.id):
            args = json.loads(srv.args) if srv.args else []
            env_vars = json.loads(srv.env_vars) if srv.env_vars else {}
            try:
                await mcp_manager.connect_server(
                    srv.id, srv.command or "python3", args, env_vars, srv.transport_type, srv.endpoint_url
                )
            except Exception:
                pass

        if mcp_manager.is_connected(srv.id):
            tools = await mcp_manager.list_tools_for_server(srv.id)
            connected_servers_data.append({
                "id": srv.id,
                "name": srv.name,
                "tools": tools
            })

    # 3. Resolve active AI Provider
    provider = None
    if msg_data.provider_id:
        p_res = await db.execute(select(AIProvider).where(AIProvider.id == msg_data.provider_id, AIProvider.user_id == current_user.id))
        provider = p_res.scalar_one_or_none()
    else:
        # Find default provider for user
        p_res = await db.execute(select(AIProvider).where(AIProvider.user_id == current_user.id, AIProvider.is_default == True))
        provider = p_res.scalar_one_or_none()
        # If default provider has no API key, prefer any configured provider that has an API key
        if not provider or not provider.encrypted_api_key:
            p_res_key = await db.execute(select(AIProvider).where(AIProvider.user_id == current_user.id, AIProvider.encrypted_api_key.isnot(None), AIProvider.is_enabled == True))
            p_with_key = p_res_key.scalars().first()
            if p_with_key:
                provider = p_with_key
            elif not provider:
                p_res2 = await db.execute(select(AIProvider).where(AIProvider.user_id == current_user.id))
                provider = p_res2.scalars().first()

    # 4. Assemble message history
    formatted_messages = []
    # System message setting context
    formatted_messages.append({
        "role": "system",
        "content": (
            "You are OpenSense Labs MCP Assistant.\n\n"
            "CRITICAL AUTOMATIC LANGUAGE DETECTION & MIRRORING RULE:\n"
            "- Always detect the language of the user's latest query and answer in the EXACT SAME LANGUAGE.\n"
            "- If the user communicates in Hindi or Hinglish (e.g. 'kaisa hai buddy', 'batao', 'leave policy kya hai', 'chhutti kitni milti hai', 'kya scene hai'):\n"
            "  You MUST respond in natural, friendly, expressive Hindi / Hinglish. Never reply in English when the user communicates in Hindi or Hinglish.\n"
            "- If the user communicates in English:\n"
            "  Respond in clear, professional English.\n"
            "- Seamlessly auto-switch languages based on each message without requiring any manual settings.\n\n"
            "STRICT SESSION ISOLATION & DATA PRIVACY:\n"
            "- Each chat session is 100% private and isolated.\n"
            "- If this is a new conversation or if previous messages do not contain user-provided facts, you have NO prior memory of the user or other conversations.\n"
            "- If the user asks 'kya yaad hai?', 'mera naam kya hai?', 'who am I?', or what was discussed earlier, and it was NOT mentioned in this current active session's conversation history:\n"
            "  Politely state in the user's language that this is a fresh conversation with complete privacy and zero prior memory/context.\n"
            "- NEVER fabricate, assume, or leak names, prompts, or information from any previous or other chats.\n\n"
            "You have access to Model Context Protocol (MCP) tools for real-time operations. "
            "When appropriate, call available tools to query data and execute operations accurately."
        )
    })
    for m in session.messages:
        if m.id != user_msg.id:
            formatted_messages.append({"role": m.role, "content": m.content})
    formatted_messages.append({"role": "user", "content": user_msg.content})

    # 5. Invoke AI Service
    ai_response = await ai_service.chat_completion(
        messages=formatted_messages,
        provider=provider,
        connected_servers=connected_servers_data,
        auto_approve_tools=bool(msg_data.auto_approve_tools),
        persona=msg_data.persona or "aanya"
    )

    # 6. Save assistant message
    tool_calls_json = json.dumps(ai_response.get("tool_calls")) if ai_response.get("tool_calls") else None
    tool_results_json = json.dumps(ai_response.get("tool_results")) if ai_response.get("tool_results") else None

    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=ai_response.get("content", ""),
        tool_calls=tool_calls_json,
        tool_results=tool_results_json
    )
    db.add(assistant_msg)
    session.model_used = ai_response.get("model") or (provider.model_name if provider else "OpenSense-Agent")
    await db.commit()
    await db.refresh(assistant_msg)

    # Log audit
    db.add(AuditLog(
        user_id=current_user.id,
        action="chat_message_generated",
        resource_type="chat_session",
        resource_id=str(session.id),
        details=json.dumps({"has_tools": bool(tool_calls_json), "model": session.model_used}),
        status="success"
    ))
    await db.commit()

    return ChatMessageResponse(
        id=assistant_msg.id,
        session_id=assistant_msg.session_id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        tool_calls=ai_response.get("tool_calls"),
        tool_results=ai_response.get("tool_results"),
        created_at=assistant_msg.created_at
    )
