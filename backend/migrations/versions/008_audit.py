"""Audit de connaissance : table page_flags + pages.flag_count

Revision ID: 008
Revises: 007
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "pages" in tables:
        page_cols = {c["name"] for c in inspector.get_columns("pages")}
        if "flag_count" not in page_cols:
            op.add_column(
                "pages",
                sa.Column(
                    "flag_count",
                    sa.Integer(),
                    server_default=sa.text("0"),
                    nullable=False,
                ),
            )

    if "page_flags" not in tables:
        op.create_table(
            "page_flags",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("page_id", sa.String(), nullable=False),
            sa.Column("flag_type", sa.String(), nullable=False),
            sa.Column("flagged_by", sa.String(), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["flagged_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_page_flags_page_id"), "page_flags", ["page_id"], unique=False
        )
        op.create_index(
            op.f("ix_page_flags_flagged_by"), "page_flags", ["flagged_by"], unique=False
        )
        op.create_index(
            op.f("ix_page_flags_created_at"), "page_flags", ["created_at"], unique=False
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_page_flags_created_at"), table_name="page_flags")
    op.drop_index(op.f("ix_page_flags_flagged_by"), table_name="page_flags")
    op.drop_index(op.f("ix_page_flags_page_id"), table_name="page_flags")
    op.drop_table("page_flags")
    with op.batch_alter_table("pages") as batch:
        batch.drop_column("flag_count")
