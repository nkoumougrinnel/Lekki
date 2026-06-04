"""Workspaces : tables workspaces / workspace_members + colonnes workspace_id

Revision ID: 003
Revises: 002
Create Date: 2026-06-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(inspector, table: str, column: str) -> bool:
    return column in {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    # --- Table workspaces ---------------------------------------------------
    if "workspaces" not in tables:
        op.create_table(
            "workspaces",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("owner_id", sa.String(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_workspaces_name"), "workspaces", ["name"], unique=False)
        op.create_index(
            op.f("ix_workspaces_owner_id"), "workspaces", ["owner_id"], unique=False
        )

    # --- Table workspace_members -------------------------------------------
    if "workspace_members" not in tables:
        op.create_table(
            "workspace_members",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("workspace_id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False),
            sa.Column(
                "joined_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(
                ["workspace_id"], ["workspaces.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "workspace_id", "user_id", name="uq_workspace_member"
            ),
        )
        op.create_index(
            op.f("ix_workspace_members_workspace_id"),
            "workspace_members",
            ["workspace_id"],
            unique=False,
        )
        op.create_index(
            op.f("ix_workspace_members_user_id"),
            "workspace_members",
            ["user_id"],
            unique=False,
        )

    # --- Colonnes workspace_id (nullable, rétrocompatibles) -----------------
    if not _has_column(inspector, "pages", "workspace_id"):
        op.add_column("pages", sa.Column("workspace_id", sa.String(), nullable=True))
        op.create_index(
            op.f("ix_pages_workspace_id"), "pages", ["workspace_id"], unique=False
        )

    if not _has_column(inspector, "chunks", "workspace_id"):
        op.add_column("chunks", sa.Column("workspace_id", sa.String(), nullable=True))
        op.create_index(
            op.f("ix_chunks_workspace_id"), "chunks", ["workspace_id"], unique=False
        )

    if not _has_column(inspector, "chats", "workspace_id"):
        op.add_column("chats", sa.Column("workspace_id", sa.String(), nullable=True))
        op.create_index(
            op.f("ix_chats_workspace_id"), "chats", ["workspace_id"], unique=False
        )


def downgrade() -> None:
    op.drop_index(op.f("ix_chats_workspace_id"), table_name="chats")
    op.drop_column("chats", "workspace_id")

    op.drop_index(op.f("ix_chunks_workspace_id"), table_name="chunks")
    op.drop_column("chunks", "workspace_id")

    op.drop_index(op.f("ix_pages_workspace_id"), table_name="pages")
    op.drop_column("pages", "workspace_id")

    op.drop_index(op.f("ix_workspace_members_user_id"), table_name="workspace_members")
    op.drop_index(
        op.f("ix_workspace_members_workspace_id"), table_name="workspace_members"
    )
    op.drop_table("workspace_members")

    op.drop_index(op.f("ix_workspaces_owner_id"), table_name="workspaces")
    op.drop_index(op.f("ix_workspaces_name"), table_name="workspaces")
    op.drop_table("workspaces")
