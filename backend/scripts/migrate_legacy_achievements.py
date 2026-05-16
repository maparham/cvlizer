"""
DEPRECATED — use scripts/run_data_migrations.py instead.

The achievements migration logic now lives in
src/data_migrations/m001_legacy_achievements.py and is executed by the
unified data-migrations runner which tracks applied migrations via a ledger
table (applied_data_migrations).

To run all pending data migrations:

    DATABASE_URL=sqlite:///./cv_optimizer.db python scripts/run_data_migrations.py --dry-run
    DATABASE_URL=sqlite:///./cv_optimizer.db python scripts/run_data_migrations.py
"""

import subprocess
import sys
from pathlib import Path

if __name__ == "__main__":
    print(
        "WARNING: migrate_legacy_achievements.py is deprecated.\n"
        "Delegating to run_data_migrations.py ...\n"
    )
    script = Path(__file__).parent / "run_data_migrations.py"
    sys.exit(subprocess.call([sys.executable, str(script)] + sys.argv[1:]))
