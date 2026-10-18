from typing import AsyncGenerator
import secrets

from sqlalchemy import inspect, text
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
        await connection.run_sync(_migrate_workspace_join_codes)


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


def _migrate_workspace_join_codes(connection) -> None:
    """Add and backfill private workspace invitation codes on existing databases."""
    columns = {column["name"] for column in inspect(connection).get_columns("workspaces")}
    if "join_code" not in columns:
        connection.exec_driver_sql("ALTER TABLE workspaces ADD COLUMN join_code VARCHAR")

    rows = connection.execute(
        text("SELECT id FROM workspaces WHERE join_code IS NULL OR join_code = ''")
    ).fetchall()
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for (workspace_id,) in rows:
        while True:
            code = "".join(secrets.choice(alphabet) for _ in range(8))
            exists = connection.execute(
                text("SELECT 1 FROM workspaces WHERE join_code = :code"),
                {"code": code},
            ).first()
            if not exists:
                connection.execute(
                    text("UPDATE workspaces SET join_code = :code WHERE id = :workspace_id"),
                    {"code": code, "workspace_id": workspace_id},
                )
                break

    connection.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_workspaces_join_code ON workspaces (join_code)"
    ))
