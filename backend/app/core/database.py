from typing import AsyncGenerator

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
        if connection.dialect.name == "sqlite":
            await _migrate_sqlite_columns(connection)


async def _migrate_sqlite_columns(connection) -> None:
    """Apply small additive migrations for existing SQLite volumes."""
    result = await connection.exec_driver_sql("PRAGMA table_info(drive_files)")
    existing_columns = {row[1] for row in result.fetchall()}
    migrations = {
        "structured_text": "ALTER TABLE drive_files ADD COLUMN structured_text TEXT",
        "thumbnail_path": "ALTER TABLE drive_files ADD COLUMN thumbnail_path VARCHAR",
    }
    for column, statement in migrations.items():
        if column not in existing_columns:
            await connection.exec_driver_sql(statement)
