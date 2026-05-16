"""
Run pending data migrations against the configured database.

Deploy order:
  1. alembic upgrade head           (creates schema / ledger table)
  2. python scripts/run_data_migrations.py   (applies pending data migrations)

Usage (run from the backend/ directory):

    # Recommended: dry-run first
    DATABASE_URL=sqlite:///./cv_optimizer.db python scripts/run_data_migrations.py --dry-run

    # Apply
    DATABASE_URL=sqlite:///./cv_optimizer.db python scripts/run_data_migrations.py

Existing DBs that have never had Alembic applied:
  - If the applied_data_migrations table was created by create_tables() (dev), run
    this script directly.
  - For production DBs that pre-date Alembic, run `alembic upgrade head` first;
    the first revision only adds the ledger table (no existing tables are touched).
"""

import argparse
import sys
from pathlib import Path

# Allow running from the backend/ directory without installing the package.
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from src.models.base import SessionLocal  # noqa: E402
from src.data_migrations.runner import run_pending  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Run pending data migrations")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change without writing anything",
    )
    args = parser.parse_args()

    session = SessionLocal()
    try:
        print("Running data migrations" + (" (dry-run)" if args.dry_run else "") + "...")
        run_pending(session, dry_run=args.dry_run)
        print("Done.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
