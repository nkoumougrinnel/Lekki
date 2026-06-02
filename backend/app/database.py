import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "sqlite+aiosqlite:///./data/wiki.db"

# Création du dossier 'data' s'il n'existe pas pour éviter l'erreur OperationalError
os.makedirs("./data", exist_ok=True)

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        # On importe les modèles ici pour qu'ils soient enregistrés dans Base.metadata
        # Si vous n'avez pas encore créé tous ces fichiers, commentez ceux qui manquent
        try:
            from app.models import user, workspace, document, permission, embedding, chat, page
        except ImportError as e:
            print(f"Note: Certains modèles n'ont pas pu être chargés : {e}")
        
        # Crée les tables dans la base de données
        await conn.run_sync(Base.metadata.create_all)