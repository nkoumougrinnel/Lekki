from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db
from app.routers import pages, internal, auth, rag, chats, users

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialisation de la base de données au démarrage (création des tables)
    await init_db()
    yield

app = FastAPI(
    title="Lekki Wiki API",
    description="Corporate Knowledge Base with RAG support",
    version="0.1.0",
    lifespan=lifespan
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gestionnaire d'erreurs global pour renvoyer du JSON plutôt que du HTML en cas de crash
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global Error: {type(exc).__name__} - {str(exc)}")
    content: dict = {"detail": "Une erreur interne est survenue."}
    if settings.DEBUG:
        content["type"] = type(exc).__name__
        content["message"] = str(exc)
    return JSONResponse(status_code=500, content=content)

# Inclusion des routeurs (Préfixe global API v1)
app.include_router(pages.router, prefix="/api/v1")
app.include_router(internal.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")  
app.include_router(rag.router, prefix="/api/v1")
app.include_router(chats.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to Lekki API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}