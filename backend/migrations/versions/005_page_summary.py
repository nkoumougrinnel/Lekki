"""Résumé automatique des pages : colonnes summary / summary_at

Revision ID: 005
Revises: 004
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(inspector, table: str, column: str) -> bool:
    return column in {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not _has_column(inspector, "pages", "summary"):
        op.add_column("pages", sa.Column("summary", sa.Text(), nullable=True))
    if not _has_column(inspector, "pages", "summary_at"):
        op.add_column("pages", sa.Column("summary_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("pages", "summary_at")
    op.drop_column("pages", "summary")
