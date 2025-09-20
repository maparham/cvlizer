#!/usr/bin/env python3
"""
Database migration script for cv_history table.

This script safely adds the is_initial column to existing cv_history table
and updates existing entries appropriately.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from src.models.base import engine

def migrate_cv_history_table():
    """Add is_initial column to cv_history table if it doesn't exist."""
    print("Migrating cv_history table...")
    
    try:
        with engine.connect() as conn:
            # Check if the column already exists
            result = conn.execute(text("""
                SELECT COUNT(*) as count 
                FROM pragma_table_info('cv_history') 
                WHERE name = 'is_initial'
            """))
            
            column_exists = result.fetchone()[0] > 0
            
            if column_exists:
                print("✅ is_initial column already exists")
                return True
            
            print("Adding is_initial column...")
            
            # Add the column with default value
            conn.execute(text("""
                ALTER TABLE cv_history 
                ADD COLUMN is_initial BOOLEAN NOT NULL DEFAULT 0
            """))
            
            # Update existing entries - mark initial_load entries as initial
            result = conn.execute(text("""
                UPDATE cv_history 
                SET is_initial = 1 
                WHERE change_type = 'initial_load'
            """))
            
            # If no initial_load entries exist, mark the oldest entry for each CV as initial
            conn.execute(text("""
                UPDATE cv_history 
                SET is_initial = 1 
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id, 
                               ROW_NUMBER() OVER (PARTITION BY cv_id ORDER BY created_at ASC) as rn
                        FROM cv_history 
                        WHERE is_initial = 0
                    ) ranked 
                    WHERE rn = 1
                )
            """))
            
            conn.commit()
            
            # Check results
            result = conn.execute(text("""
                SELECT cv_id, COUNT(*) as total, SUM(is_initial) as initial_count
                FROM cv_history 
                GROUP BY cv_id
            """))
            
            print("✅ Migration completed successfully!")
            print("📊 Migration results:")
            for row in result:
                print(f"  CV {row[0]}: {row[1]} total entries, {row[2]} initial entries")
                
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = migrate_cv_history_table()
    sys.exit(0 if success else 1)
