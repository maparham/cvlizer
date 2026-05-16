"""
001_legacy_achievements

Fold legacy ``achievements`` list fields in ``cvs.parsed_data`` and
``cv_history.cv_data`` into the corresponding ``description`` fields.

Safe to run multiple times: rows are checked for JSON equality before
writing, and the runner ledger prevents re-execution once applied.
"""

from __future__ import annotations

import copy
import json

from sqlalchemy.orm import Session

from src.models.cv import CV
from src.models.cv_history import CVHistory
from src.utils.legacy_achievements_merge import migrate_cv_dict

MIGRATION_ID = "001_legacy_achievements"
DESCRIPTION = "Merge legacy achievements arrays into description fields"


def _json_key(d: dict) -> str:
    return json.dumps(d, sort_keys=True)


def run(session: Session, dry_run: bool = False) -> None:
    cvs_updated = 0
    history_updated = 0

    for cv in session.query(CV).all():
        if not cv.parsed_data or not isinstance(cv.parsed_data, dict):
            continue
        before = _json_key(cv.parsed_data)
        data_copy = copy.deepcopy(cv.parsed_data)
        migrate_cv_dict(data_copy)
        if _json_key(data_copy) != before:
            cvs_updated += 1
            if not dry_run:
                cv.parsed_data = data_copy
                session.add(cv)
                session.flush()
            else:
                print(f"  [dry-run] CV {cv.id}: would update parsed_data")

    for entry in session.query(CVHistory).all():
        if not entry.cv_data or not isinstance(entry.cv_data, dict):
            continue
        before = _json_key(entry.cv_data)
        data_copy = copy.deepcopy(entry.cv_data)
        migrate_cv_dict(data_copy)
        if _json_key(data_copy) != before:
            history_updated += 1
            if not dry_run:
                entry.cv_data = data_copy
                session.add(entry)
                session.flush()
            else:
                print(f"  [dry-run] CVHistory {entry.id}: would update cv_data")

    if not dry_run:
        session.commit()

    print(f"  CVs updated:     {cvs_updated}")
    print(f"  History updated: {history_updated}")
