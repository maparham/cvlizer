"""
SQLite foreign key enforcement.

SQLite ignores FOREIGN KEY constraints unless ``PRAGMA foreign_keys=ON`` is
set for each connection. Bulk ``DELETE FROM cvs`` relies on DB-level
``ON DELETE CASCADE`` / ``SET NULL``; this pragma makes tests and local SQLite
match Postgres behavior.
"""

from sqlalchemy import event
from sqlalchemy.engine import Engine


def register_sqlite_pragma_foreign_keys(engine: Engine) -> None:
    """
    For SQLite engines only, run ``PRAGMA foreign_keys=ON`` on each connect.

    No-op registration for non-SQLite dialects (safe to call unconditionally).
    """
    if engine.dialect.name != "sqlite":
        return

    @event.listens_for(engine, "connect")
    def _sqlite_set_foreign_keys(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
