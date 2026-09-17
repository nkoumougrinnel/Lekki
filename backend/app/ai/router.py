import json
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.rag_service import execute_rag_pipeline
from app.ai.schemas import AskRequest, AskResponse
from app.core.database import get_db
from app.identity.models import User
from app.middleware.auth import get_current_user
from app.conversations.models import ChatMessage

router = APIRouter(tags=["RAG & AI"])


@router.post("/ask", response_model=AskResponse)
async def ask_question(data: AskRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    answer, sources, contradiction, confidence = await execute_rag_pipeline(
        db,
        data.question,
        data.workspace_id,
        current_user.id,
    )
    user_message = ChatMessage(id=f"msg-{uuid.uuid4().hex[:8]}", user_id=current_user.id, workspace_id=data.workspace_id, role="user", content=data.question)
    assistant_id = f"msg-{uuid.uuid4().hex[:8]}"
    assistant_message = ChatMessage(id=assistant_id, user_id=current_user.id, workspace_id=data.workspace_id, role="assistant", content=answer, sources_json=json.dumps([source.model_dump() for source in sources]), contradiction=contradiction)
    db.add_all([user_message, assistant_message])
    await db.commit()
    return AskResponse(message_id=assistant_id, answer=answer, sources=sources, contradiction=contradiction, confidence=confidence, provider="Lekki AI (Groq / Gemini / Cerebras)")


