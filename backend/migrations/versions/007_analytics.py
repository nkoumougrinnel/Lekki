"""Analytics d'usage : table rag_queries + pages.last_viewed_at

Revision ID: 007
Revises: 006
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    # pages.last_viewed_at (ajout si absent)
    if "pages" in tables:
        page_cols = {c["name"] for c in inspector.get_columns("pages")}
        if "last_viewed_at" not in page_cols:
            op.add_column(
                "pages", sa.Column("last_viewed_at", sa.DateTime(), nullable=True)
            )

    # table rag_queries
    if "rag_queries" not in tables:
        op.create_table(
            "rag_queries",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=True),
            sa.Column("workspace_id", sa.String(), nullable=True),
            sa.Column("question", sa.Text(), nullable=False),
            sa.Column("confidence", sa.Float(), nullable=True),
            sa.Column("provider", sa.String(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column(
                "had_results",
                sa.Boolean(),
                server_default=sa.text("0"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(
                ["workspace_id"], ["workspaces.id"], ondelete="SET NULL"
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_rag_queries_user_id"), "rag_queries", ["user_id"], unique=False
        )
        op.create_index(
            op.f("ix_rag_queries_workspace_id"),
            "rag_queries",
            ["workspace_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_rag_queries_created_at"),
            "rag_queries",
            ["created_at"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_rag_queries_created_at"), table_name="rag_queries")
    op.drop_index(op.f("ix_rag_queries_workspace_id"), table_name="rag_queries")
    op.drop_index(op.f("ix_rag_queries_user_id"), table_name="rag_queries")
    op.drop_table("rag_queries")
    with op.batch_alter_table("pages") as batch:
        batch.drop_column("last_viewed_at")
