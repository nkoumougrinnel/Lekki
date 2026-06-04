"""Pages liées : table page_relations (voisins sémantiques)

Revision ID: 006
Revises: 005
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "page_relations" in set(inspector.get_table_names()):
        return

    op.create_table(
        "page_relations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("page_id", sa.String(), nullable=False),
        sa.Column("related_id", sa.String(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column(
            "computed_at",
            sa.DateTime(),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["related_id"], ["pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("page_id", "related_id", name="uq_page_relation"),
    )
    op.create_index(
        op.f("ix_page_relations_page_id"), "page_relations", ["page_id"], unique=False
    )
    op.create_index(
        op.f("ix_page_relations_related_id"),
        "page_relations",
        ["related_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_page_relations_related_id"), table_name="page_relations")
    op.drop_index(op.f("ix_page_relations_page_id"), table_name="page_relations")
    op.drop_table("page_relations")
