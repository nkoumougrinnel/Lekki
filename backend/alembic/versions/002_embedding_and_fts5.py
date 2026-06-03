"""Colonne embedding sur chunks + table virtuelle FTS5 pages_fts

Revision ID: 002
Revises: 001
Create Date: 2026-06-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    chunk_cols = {c["name"] for c in inspector.get_columns("chunks")}
    if "embedding" not in chunk_cols:
        op.add_column("chunks", sa.Column("embedding", sa.LargeBinary(), nullable=True))

    tables = set(inspector.get_table_names())
    if "pages_fts" not in tables:
        op.execute(
            """
            CREATE VIRTUAL TABLE pages_fts USING fts5(
                title,
                content,
                page_id UNINDEXED
            )
            """
        )
        op.execute(
            """
            INSERT INTO pages_fts (page_id, title, content)
            SELECT id, title, content FROM pages
            """
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS pages_fts")
    op.drop_column("chunks", "embedding")
