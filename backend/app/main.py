from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import (
    auth_router,
    users_router,
    workspaces_router,
    drive_router,
    wiki_router,
    search_router,
    rag_router,
    conversations_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    await init_db()
    # Auto-seed initial demo dataset if database is brand new
    try:
        from scripts.seed import seed_database
        await seed_database()
    except Exception as e:
        print(f"[Lekki] Seed info: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend académique et documentaire avec RAG pour Lekki Wiki",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root healthcheck
@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "ok", "app": "Lekki Wiki", "version": settings.VERSION}


# Mount API V1 routes
v1_prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=v1_prefix)
app.include_router(users_router, prefix=v1_prefix)
app.include_router(workspaces_router, prefix=v1_prefix)
app.include_router(drive_router, prefix=v1_prefix)
app.include_router(wiki_router, prefix=v1_prefix)
app.include_router(search_router, prefix=v1_prefix)
app.include_router(rag_router, prefix=v1_prefix)
app.include_router(conversations_router, prefix=v1_prefix)
