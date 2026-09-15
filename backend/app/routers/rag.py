from typing import List
import json
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.chat import ChatMessage
from app.schemas.rag import AskRequest, AskResponse, AskSource
from app.services.rag_service import execute_rag_pipeline
from app.middleware.auth import get_current_user

router = APIRouter(tags=["RAG & AI"])


@router.post("/ask", response_model=AskResponse)
async def ask_question(
    data: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    answer, sources, contradiction, confidence = await execute_rag_pipeline(
        db=db,
        question=data.question,
        workspace_id=data.workspace_id
    )

    msg_user = ChatMessage(
        id=f"msg-{uuid.uuid4().hex[:8]}",
        user_id=current_user.id,
        workspace_id=data.workspace_id,
        role="user",
        content=data.question
    )
    db.add(msg_user)

    msg_id = f"msg-{uuid.uuid4().hex[:8]}"
    msg_ai = ChatMessage(
        id=msg_id,
        user_id=current_user.id,
        workspace_id=data.workspace_id,
        role="assistant",
        content=answer,
        sources_json=json.dumps([s.dict() for s in sources]),
        contradiction=contradiction
    )
    db.add(msg_ai)
    await db.commit()

    return AskResponse(
        message_id=msg_id,
        answer=answer,
        sources=sources,
        contradiction=contradiction,
        confidence=confidence,
        provider="Lekki AI (Gemini 2.5 Flash / Academic RAG)"
    )


@router.get("/chats/history")
async def get_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at)
    )
    msgs = result.scalars().all()
    out = []
    for m in msgs:
        sources = []
        try:
            sources = json.loads(m.sources_json or "[]")
        except Exception:
            pass
        out.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "timestamp": m.created_at.isoformat() if m.created_at else None,
            "sources": sources,
            "contradiction": m.contradiction
        })
    return out


@router.delete("/chats/history")
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == current_user.id)
    )
    for m in result.scalars().all():
        await db.delete(m)
    await db.commit()
    return None
