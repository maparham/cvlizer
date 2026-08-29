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


def register_sqlite_wal_mode(engine: Engine) -> None:
    """
    For file-based SQLite engines, enable WAL journal mode on each connect.

    WAL (Write-Ahead Logging) lets multiple concurrent readers proceed while a
    single writer commits, which is what makes a multi-connection QueuePool
    usable for SQLite: request threads and background-task threads each hold
    their own connection instead of sharing one. ``busy_timeout`` makes a thread
    wait for the writer lock instead of failing immediately with
    "database is locked".

    Do NOT call this for in-memory databases (``:memory:``): WAL is a persistent
    file-level property and is meaningless/invalid without a backing file.

    No-op for non-SQLite dialects (safe to call unconditionally on those).
    """
    if engine.dialect.name != "sqlite":
        return

    @event.listens_for(engine, "connect")
    def _sqlite_set_wal(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()
