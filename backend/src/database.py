"""
Database configuration and initialization module.

This module handles database connection setup, table creation,
and imports all models to ensure proper relationship definitions.
"""
import os
import sys
from dotenv import load_dotenv

# Ensure src is importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Reuse the shared engine/Base from models.base; import models to register metadata
from models.base import Base, engine  # type: ignore
from models.user import User  # noqa: F401
from models.cv import CV  # noqa: F401
from models.job_description import JobDescription  # noqa: F401
from models.ai_section import AISection  # noqa: F401

load_dotenv()

def create_tables():
    """Create all database tables using the shared engine."""
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    create_tables()
