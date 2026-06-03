from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import pages

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

# Inclusion des routeurs (Préfixe global API v1)
app.include_router(pages.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to Lekki API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}