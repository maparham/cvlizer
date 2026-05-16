"""create_applied_data_migrations

Revision ID: 0001
Revises:
Create Date: 2026-05-16

Adds the ledger table that tracks which data migrations have been applied.

Deployment notes
----------------
* **New / empty databases**: run ``alembic upgrade head`` normally — the table
  will be created before ``python scripts/run_data_migrations.py`` is called.
* **Existing brownfield databases** (already have all app tables from
  create_tables(), but no alembic_version row):
    - This revision *only* adds ``applied_data_migrations``.  It does NOT touch
      any pre-existing tables, so running ``alembic upgrade head`` is safe.
    - Alternatively, if you prefer not to run any DDL via Alembic at all on a
      specific instance, create the table manually and then stamp:
          alembic stamp 0001
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "applied_data_migrations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("applied_data_migrations")
