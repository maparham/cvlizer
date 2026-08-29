"""
Base database configuration and session management.

This module sets up the SQLAlchemy database engine with environment-aware
connection pooling, session factory, and provides the base class for all
database models.

Connection Pooling:
- PostgreSQL/MySQL: Uses QueuePool with configurable size, overflow, timeout, and recycle
- File-based SQLite: Uses QueuePool (per-thread connections) + WAL mode, so request
  and background-task threads never share a single connection
- In-memory SQLite: Uses StaticPool (a shared connection is required so all threads
  see the same in-memory database)

Pool configuration automatically adjusts based on environment:
- Test: Sized for parallel Playwright workers (20+10 connections)
- Production: Sized for concurrent users (10+10 connections)
- Development: Minimal sizing for single developer (5+5 connections)
"""

import logging
import os
import time
from typing import Any, Dict

from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import config after dotenv is loaded
load_dotenv()
from src.config import DatabaseConfig
from src.utils.sqlite_foreign_keys import (
    register_sqlite_pragma_foreign_keys,
    register_sqlite_wal_mode,
)

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cv_optimizer.db")
DB_TIMING_DEBUG_ENABLED = str(os.getenv("DB_TIMING_DEBUG", "false")).lower() in {
    "1",
    "true",
    "yes",
    "on",
}
DB_SLOW_QUERY_MS = float(os.getenv("DB_SLOW_QUERY_MS", "300"))

# Create engine with appropriate pool configuration based on database type
if DatabaseConfig.is_poolable_database():
    # PostgreSQL/MySQL - use full connection pooling with QueuePool
    pool_size = DatabaseConfig.get_pool_size()
    max_overflow = DatabaseConfig.get_max_overflow()

    engine = create_engine(
        DATABASE_URL,
        pool_size=pool_size,
        max_overflow=max_overflow,
        pool_timeout=DatabaseConfig.POOL_TIMEOUT,
        pool_recycle=DatabaseConfig.POOL_RECYCLE,
        pool_pre_ping=True,
        echo=False,
    )
    logger.info(
        f"Database engine created with connection pool: "
        f"type={DatabaseConfig.get_database_type()}, "
        f"size={pool_size}, "
        f"max_overflow={max_overflow}, "
        f"timeout={DatabaseConfig.POOL_TIMEOUT}s, "
        f"recycle={DatabaseConfig.POOL_RECYCLE}s, "
        f"pre_ping=True"
    )
elif ":memory:" in DATABASE_URL:
    # In-memory SQLite MUST reuse one connection (StaticPool): each new
    # connection would open a separate, empty in-memory database, so a pool of
    # distinct connections cannot see each other's tables/rows.
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    logger.info(
        "Database engine created with StaticPool for in-memory SQLite: "
        f"url={DATABASE_URL} (single shared connection)"
    )
    register_sqlite_pragma_foreign_keys(engine)
else:
    # File-based SQLite - give every thread its own pooled connection.
    #
    # The previous StaticPool config shared a SINGLE DBAPI connection across all
    # FastAPI request threads AND every background-task thread. A sqlite3
    # connection is one transaction: a background worker calling db.rollback()
    # on its own SessionLocal() actually rolled back the ONE shared connection,
    # discarding a concurrent request handler's uncommitted writes (and produced
    # the "cannot rollback - no transaction is active" noise get_db() swallows).
    # QueuePool (SQLAlchemy's default for file SQLite) hands each thread its own
    # connection; WAL mode (see below) lets readers and one writer run
    # concurrently instead of serializing on a single connection.
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,
            "timeout": 30,  # Wait up to 30 seconds for database lock
        },
        pool_size=DatabaseConfig.get_pool_size(),
        max_overflow=DatabaseConfig.get_max_overflow(),
        pool_timeout=DatabaseConfig.POOL_TIMEOUT,
        echo=False,
    )
    logger.info(
        f"Database engine created with QueuePool for file-based SQLite: "
        f"url={DATABASE_URL}, size={DatabaseConfig.get_pool_size()}, "
        f"max_overflow={DatabaseConfig.get_max_overflow()}, timeout=30s"
    )
    register_sqlite_pragma_foreign_keys(engine)
    register_sqlite_wal_mode(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

if DB_TIMING_DEBUG_ENABLED and DatabaseConfig.is_poolable_database():
    logger.info("DB timing debug enabled (slow query threshold=%sms)", DB_SLOW_QUERY_MS)

    @event.listens_for(engine, "before_cursor_execute")
    def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.perf_counter()

    @event.listens_for(engine, "after_cursor_execute")
    def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        start = getattr(context, "_query_start_time", None)
        if start is None:
            return
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        compact_sql = " ".join(statement.split())
        preview = compact_sql[:240] + ("..." if len(compact_sql) > 240 else "")
        if elapsed_ms >= DB_SLOW_QUERY_MS:
            logger.warning(
                "Slow SQL query (%.1f ms): %s",
                elapsed_ms,
                preview,
            )
        else:
            logger.debug("SQL query (%.1f ms): %s", elapsed_ms, preview)

    @event.listens_for(engine, "handle_error")
    def _handle_sql_error(exception_context):
        context = exception_context.execution_context
        start = getattr(context, "_query_start_time", None) if context else None
        elapsed_ms = (time.perf_counter() - start) * 1000.0 if start else None
        statement = exception_context.statement or ""
        compact_sql = " ".join(statement.split())
        preview = compact_sql[:240] + ("..." if len(compact_sql) > 240 else "")
        if elapsed_ms is not None:
            logger.error(
                "SQL error after %.1f ms: %s | error=%s",
                elapsed_ms,
                preview,
                exception_context.original_exception,
            )
        else:
            logger.error(
                "SQL error: %s | error=%s",
                preview,
                exception_context.original_exception,
            )


def get_db():
    """
    Database session dependency for FastAPI endpoints.

    Provides a SQLAlchemy session that is automatically closed after use.
    Includes error handling for SQLite connection reset issues under concurrent load.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception as e:
            # SQLite with StaticPool can raise errors during connection reset
            # under high concurrency. These are safe to ignore as they occur
            # during cleanup, not during actual database operations.
            # Common errors:
            # - "cannot rollback - no transaction is active"
            # - SystemError during connection reset
            logger.debug(f"Error during session cleanup (safe to ignore): {e}")
            pass


def get_pool_status() -> Dict[str, Any]:
    """
    Get current connection pool status and statistics.

    Returns comprehensive pool information for monitoring and debugging
    connection pool health. Useful for diagnosing connection exhaustion
    issues and verifying pool configuration.

    For SQLite with StaticPool, returns simplified status as StaticPool
    doesn't provide the same metrics as QueuePool.

    Returns:
        Dictionary containing:
        - database_type: Type of database (sqlite/postgresql/mysql)
        - pool_class: Name of pool class being used
        - size: Configured pool size (QueuePool only)
        - checked_out: Number of connections currently in use
        - overflow: Number of connections in overflow state (QueuePool only)
        - checked_in: Number of available connections in pool (QueuePool only)
        - total_connections: Total connections (checked_out + checked_in)
        - timeout: Pool timeout in seconds
        - recycle: Pool recycle time in seconds
        - note: Additional information for SQLite/StaticPool

    Example:
        >>> status = get_pool_status()
        >>> print(f"Pool has {status['checked_out']} connections in use")
    """
    status = {
        "database_type": DatabaseConfig.get_database_type(),
        "pool_class": engine.pool.__class__.__name__,
    }

    if DatabaseConfig.is_poolable_database():
        # QueuePool provides detailed statistics
        pool = engine.pool
        try:
            checked_out = pool.checkedout()
            # For QueuePool, _pool is a queue.Queue of available connections
            checked_in = len(pool._pool.queue) if hasattr(pool._pool, "queue") else 0

            status.update(
                {
                    "size": pool.size(),
                    "checked_out": checked_out,
                    "overflow": pool.overflow(),
                    "checked_in": checked_in,
                    "total_connections": checked_out + checked_in,
                    "timeout": DatabaseConfig.POOL_TIMEOUT,
                    "recycle": DatabaseConfig.POOL_RECYCLE,
                }
            )
        except Exception as e:
            # Fallback if pool internals change
            status["error"] = f"Could not retrieve detailed pool stats: {str(e)}"
            status["checked_out"] = pool.checkedout()
    else:
        # SQLite: file-based uses QueuePool, in-memory uses StaticPool.
        status[
            "note"
        ] = f"SQLite with {status['pool_class']} - limited pool statistics available"
        try:
            status["checked_out"] = engine.pool.checkedout()
        except Exception:
            status["checked_out"] = "unknown"

    return status
