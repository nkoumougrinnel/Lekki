from typing import AsyncGenerator

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_migrate_drive_file_columns)


def _migrate_drive_file_columns(connection) -> None:
    """Apply additive metadata migrations to existing SQLite/PostgreSQL databases."""
    existing_columns = {column["name"] for column in inspect(connection).get_columns("drive_files")}
    migrations = {
        "structured_text": "ALTER TABLE drive_files ADD COLUMN structured_text TEXT",
        "thumbnail_path": "ALTER TABLE drive_files ADD COLUMN thumbnail_path VARCHAR",
        "page_count": "ALTER TABLE drive_files ADD COLUMN page_count INTEGER",
        "slide_count": "ALTER TABLE drive_files ADD COLUMN slide_count INTEGER",
        "content_unit": "ALTER TABLE drive_files ADD COLUMN content_unit VARCHAR",
        "detected_chapters": "ALTER TABLE drive_files ADD COLUMN detected_chapters TEXT",
    }
    for column, statement in migrations.items():
        if column not in existing_columns:
            connection.exec_driver_sql(statement)
