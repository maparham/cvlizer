"""
Pydantic models for admin API endpoints.

This module contains shared data models used across admin endpoints
for user management, statistics, and system diagnostics.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class UserSummary(BaseModel):
    id: str
    clerk_id: Optional[str]
    email: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    cv_count: int
    ai_sections_count: int
    is_clerk_user: bool

    class Config:
        from_attributes = True


class SystemStats(BaseModel):
    total_users: int
    active_users: int
    clerk_users: int
    legacy_users: int
    total_cvs: int
    total_ai_sections: int
    total_job_descriptions: int
    users_last_7_days: int
    users_last_30_days: int
    cvs_last_7_days: int
    cvs_last_30_days: int


class UserDetail(BaseModel):
    id: str
    clerk_id: Optional[str]
    email: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    cvs: List[dict]
    ai_sections: List[dict]
    ai_sections_count: int
    job_descriptions_count: int

    class Config:
        from_attributes = True


class DashboardData(BaseModel):
    stats: SystemStats
    recent_users: List[UserSummary]
    top_users_by_cvs: List[UserSummary]


class JobDescriptionCleanupStats(BaseModel):
    """Statistics about stuck job descriptions"""

    total_parsing: int
    active_parsing: int
    stuck_parsing: int
    stuck_job_descriptions: List[dict]


class JobDescriptionCleanupResult(BaseModel):
    """Result of cleanup operation"""

    found_count: int
    fixed_count: int
    message: str
