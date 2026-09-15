from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.workspaces import router as workspaces_router
from app.routers.drive import router as drive_router
from app.routers.wiki import router as wiki_router
from app.routers.search import router as search_router
from app.routers.rag import router as rag_router

__all__ = [
    "auth_router",
    "users_router",
    "workspaces_router",
    "drive_router",
    "wiki_router",
    "search_router",
    "rag_router",
]
