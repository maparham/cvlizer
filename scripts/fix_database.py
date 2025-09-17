#!/usr/bin/env python3
"""
Fix database relationships and test upload
"""

import sys
import os
# Add backend src to path since we're now in scripts directory
sys.path.append('../backend/src')

# Import models in the correct order to avoid circular dependencies
from src.models.base import Base
from src.models.user import User
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.ai_section import AISection

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

def create_database():
    """Create database with proper model loading"""
    
    # Create engine
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cv_optimizer.db")
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create a test user
        from src.services.auth_service import create_user, create_access_token
        
        # Check if user exists
        user = db.query(User).filter(User.email == 'test@example.com').first()
        if not user:
            user = create_user(db, 'test@example.com', 'testpassword123')
        
        # Generate token
        token = create_access_token({'sub': str(user.id), 'email': user.email})
        
        return token
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

if __name__ == "__main__":
    token = create_database()
    if token:
        pass  # Database setup successful
    else:
        pass  # Database setup failed
