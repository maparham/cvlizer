"""
Ordered registry of all data migrations.

Each entry is a module with:
  MIGRATION_ID  str   — unique stable key stored in the ledger
  DESCRIPTION   str   — human-readable label
  run(session, dry_run=False) -> None  — idempotent migration logic
"""

from __future__ import annotations

from src.data_migrations import m001_legacy_achievements

MIGRATIONS = [
    m001_legacy_achievements,
]
