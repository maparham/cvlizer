"""add_cvs_show_ai_attribution

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-29

Adds ``cvs.show_ai_attribution``: the per-CV opt-out for the rahkar.pro credit
line appended to exports that render the AI-generated section.

The column is nullable with no server default on purpose. Existing rows stay
NULL and ``resolve_show_ai_attribution`` reads NULL as enabled, so no backfill
is needed and the migration stays cheap on large tables.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Brownfield databases created by create_tables() after this model change
    # already carry the column; adding it twice must not break deploys.
    bind = op.get_bind()
    existing = {col["name"] for col in sa.inspect(bind).get_columns("cvs")}
    if "show_ai_attribution" not in existing:
        op.add_column(
            "cvs", sa.Column("show_ai_attribution", sa.Boolean(), nullable=True)
        )


def downgrade() -> None:
    bind = op.get_bind()
    existing = {col["name"] for col in sa.inspect(bind).get_columns("cvs")}
    if "show_ai_attribution" in existing:
        op.drop_column("cvs", "show_ai_attribution")
