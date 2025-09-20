#!/usr/bin/env python3
"""
Database table creation script.

This script creates all database tables including the new cv_history table.
Run this after adding new models to ensure the database schema is up to date.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.base import engine, Base
from src.models import User, CV, CVHistory, JobDescription, AISection

def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        
        # Print table information
        inspector = engine.dialect.get_table_names(engine.connect())
        print(f"📊 Total tables: {len(inspector)}")
        for table in sorted(inspector):
            print(f"  - {table}")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1)
