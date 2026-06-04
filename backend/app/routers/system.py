from fastapi import APIRouter, Depends

from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.llm_service import get_llm_service

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/llm-status")
async def llm_status(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    """
    Santé des fournisseurs LLM.

    Exemple :
        {
          "gemini": "available",
          "groq": "available",
          "cerebras": "available",
          "ollama": "fallback"
        }
    """
    return get_llm_service().get_health()
