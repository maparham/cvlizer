#!/usr/bin/env python3
"""
Fix duplicate initial entries.

This script ensures only the oldest entry per CV is marked as initial.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from src.models.base import engine

def fix_duplicate_initials():
    """Ensure only the oldest entry per CV is marked as initial."""
    print("Fixing duplicate initial entries...")
    
    try:
        with engine.connect() as conn:
            # First, reset all is_initial to false
            conn.execute(text("UPDATE cv_history SET is_initial = 0"))
            
            # Then mark only the oldest entry per CV as initial
            conn.execute(text("""
                UPDATE cv_history 
                SET is_initial = 1 
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id, 
                               ROW_NUMBER() OVER (PARTITION BY cv_id ORDER BY created_at ASC) as rn
                        FROM cv_history
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
            
            print("✅ Fix completed successfully!")
            print("📊 Results:")
            for row in result:
                print(f"  CV {row[0]}: {row[1]} total entries, {row[2]} initial entries")
                
    except Exception as e:
        print(f"❌ Error during fix: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = fix_duplicate_initials()
    sys.exit(0 if success else 1)
