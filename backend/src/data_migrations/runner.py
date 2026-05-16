"""
Data migration runner.

Reads the ledger (applied_data_migrations), skips already-applied migrations,
runs pending ones in registration order, and commits a ledger row after each.

Assumes the ledger table already exists (created by `alembic upgrade head` in
production, or by `create_tables()` in dev since the model is registered in
database.py).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from src.data_migrations.registry import MIGRATIONS
from src.models.applied_data_migration import AppliedDataMigration


def run_pending(session: Session, dry_run: bool = False) -> None:
    applied = {row.id for row in session.query(AppliedDataMigration.id).all()}

    for migration in MIGRATIONS:
        mid = migration.MIGRATION_ID
        if mid in applied:
            print(f"  [skip]  {mid} — already applied")
            continue

        print(f"  [run]   {mid} — {migration.DESCRIPTION}")
        migration.run(session, dry_run=dry_run)

        if not dry_run:
            ledger_row = AppliedDataMigration(
                id=mid,
                applied_at=datetime.now(timezone.utc),
            )
            session.add(ledger_row)
            session.commit()
            print(f"  [done]  {mid} — ledger row written")
        else:
            print(f"  [dry-run] {mid} — ledger row NOT written")
