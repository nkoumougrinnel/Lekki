from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import pages

app = FastAPI(
    title="Lekki Wiki API",
    description="Corporate Knowledge Base with RAG support",
    version="0.1.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routeurs
app.include_router(pages.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to Lekki API", "docs": "/docs"}