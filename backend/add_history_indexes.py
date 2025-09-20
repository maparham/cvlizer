"""
Add database indexes for CV history performance optimization.

This script adds critical indexes for the cv_history table to improve
query performance for common access patterns.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

# Add the src directory to the path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from models.base import Base
from models.cv_history import CVHistory


def add_indexes():
    """Add performance indexes for CV history queries."""
    
    # Database connection
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./cv_lator.db')
    engine = create_engine(DATABASE_URL)
    
    print("Adding performance indexes for CV history...")
    
    # List of indexes to create
    indexes = [
        # Composite index for getting history entries by CV ordered by timestamp
        ("idx_cv_history_cv_timestamp", "cv_history", ["cv_id", "created_at"]),
        
        # Index for filtering by change type (for analytics)
        ("idx_cv_history_change_type", "cv_history", ["change_type"]),
        
        # Index for finding automatic vs manual snapshots
        ("idx_cv_history_is_automatic", "cv_history", ["is_automatic"]),
        
        # Composite index for user's history across all CVs
        ("idx_cv_history_user_timestamp", "cv_history", ["user_id", "created_at"]),
        
        # Index for finding initial versions (undeletable)
        ("idx_cv_history_is_initial", "cv_history", ["is_initial"]),
    ]
    
    with engine.connect() as conn:
        for index_name, table_name, columns in indexes:
            try:
                # Create index
                columns_str = ", ".join(columns)
                sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({columns_str})"
                
                print(f"Creating index: {index_name}")
                conn.execute(text(sql))
                conn.commit()
                print(f"✓ Created index: {index_name}")
                
            except ProgrammingError as e:
                if "already exists" in str(e).lower():
                    print(f"- Index {index_name} already exists, skipping")
                else:
                    print(f"✗ Failed to create index {index_name}: {e}")
            except Exception as e:
                print(f"✗ Error creating index {index_name}: {e}")
    
    print("Index creation completed!")


if __name__ == "__main__":
    add_indexes()
