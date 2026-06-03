import os
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = BACKEND_ROOT / "data" / "wiki.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DB_PATH.as_posix()}")
SYNC_DATABASE_URL = os.getenv("SYNC_DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

MVP_TABLES = frozenset({"users", "pages", "chunks", "chats", "messages"})

os.makedirs(BACKEND_ROOT / "data", exist_ok=True)

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


def _alembic_config():
    from alembic.config import Config

    cfg = Config(str(BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    cfg.set_main_option("sqlalchemy.url", SYNC_DATABASE_URL)
    return cfg


def _stamp_head_if_legacy_db() -> bool:
    """Tables créées par create_all sans alembic_version → marquer head."""
    from alembic import command

    sync_engine = create_engine(SYNC_DATABASE_URL)
    inspector = inspect(sync_engine)
    tables = set(inspector.get_table_names())
    sync_engine.dispose()

    if not MVP_TABLES.issubset(tables):
        return False
    if "alembic_version" in tables:
        return False

    command.stamp(_alembic_config(), "head")
    return True


def run_migrations() -> None:
    """Applique les migrations Alembic (sync, SQLite)."""
    from alembic import command

    if _stamp_head_if_legacy_db():
        return

    cfg = _alembic_config()
    try:
        command.upgrade(cfg, "head")
    except OperationalError as exc:
        if "already exists" in str(exc).lower():
            command.stamp(cfg, "head")
            return
        raise


async def init_db() -> None:
    run_migrations()
