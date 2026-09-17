from app.identity.router import auth_router, users_router
from app.workspaces.router import router as workspaces_router
from app.routers.drive import router as drive_router
from app.routers.wiki import router as wiki_router
from app.routers.search import router as search_router
from app.ai.router import router as rag_router
from app.conversations.router import router as conversations_router

__all__ = [
    "auth_router",
    "users_router",
    "workspaces_router",
    "drive_router",
    "wiki_router",
    "search_router",
    "rag_router",
    "conversations_router",
]
