"""
Base database configuration and session management.

This module sets up the SQLAlchemy database engine with environment-aware
connection pooling, session factory, and provides the base class for all
database models.

Connection Pooling:
- PostgreSQL/MySQL: Uses QueuePool with configurable size, overflow, timeout, and recycle
- SQLite: Uses StaticPool for better concurrency in tests and development

Pool configuration automatically adjusts based on environment:
- Test: Sized for parallel Playwright workers (20+10 connections)
- Production: Sized for concurrent users (10+10 connections)
- Development: Minimal sizing for single developer (5+5 connections)
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from typing import Dict, Any
import os
import logging
from dotenv import load_dotenv

# Import config after dotenv is loaded
load_dotenv()
from src.config import DatabaseConfig

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cv_optimizer.db")

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
        echo=False
    )
    logger.info(
        f"Database engine created with connection pool: "
        f"type={DatabaseConfig.get_database_type()}, "
        f"size={pool_size}, "
        f"max_overflow={max_overflow}, "
        f"timeout={DatabaseConfig.POOL_TIMEOUT}s, "
        f"recycle={DatabaseConfig.POOL_RECYCLE}s"
    )
else:
    # SQLite - use NullPool to create a new connection per request
    # This prevents connection sharing and deadlocks in concurrent scenarios
    # Each request gets its own connection which is closed after use
    from sqlalchemy.pool import NullPool
    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False,
            "timeout": 30  # Wait up to 30 seconds for database lock
        },
        poolclass=NullPool,  # No connection pooling - fresh connection per request
        echo=False
    )
    logger.info(
        f"Database engine created with NullPool for SQLite: "
        f"url={DATABASE_URL}, timeout=30s (fresh connection per request)"
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

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
            checked_in = len(pool._pool.queue) if hasattr(pool._pool, 'queue') else 0
            
            status.update({
                "size": pool.size(),
                "checked_out": checked_out,
                "overflow": pool.overflow(),
                "checked_in": checked_in,
                "total_connections": checked_out + checked_in,
                "timeout": DatabaseConfig.POOL_TIMEOUT,
                "recycle": DatabaseConfig.POOL_RECYCLE,
            })
        except Exception as e:
            # Fallback if pool internals change
            status["error"] = f"Could not retrieve detailed pool stats: {str(e)}"
            status["checked_out"] = pool.checkedout()
    else:
        # StaticPool has limited statistics
        status["note"] = "SQLite with StaticPool - limited pool statistics available"
        try:
            status["checked_out"] = engine.pool.checkedout()
        except Exception:
            status["checked_out"] = "unknown"
    
    return status
