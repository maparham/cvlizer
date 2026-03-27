"""
Schemas for public sharing endpoints.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


ShareViewMode = Literal["shell"]


class CVShareUpdateRequest(BaseModel):
    view_mode: ShareViewMode = "shell"


class ShareResponse(BaseModel):
    public_url: str
    token: Optional[str]
    is_shared: bool
    created_at: Optional[str]
    view_mode: Optional[ShareViewMode] = None


class ShareViewRecord(BaseModel):
    viewer_ip: Optional[str]
    user_agent: Optional[str]
    referer: Optional[str]
    viewed_at: Optional[str]


class ShareAnalytics(BaseModel):
    total_views: int
    unique_ips: int
    recent_views: List[ShareViewRecord]


class PublicCVResponse(BaseModel):
    id: str
    original_filename: str
    parsed_data: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str
    view_mode: ShareViewMode = "shell"
    resource_type: Literal["cv"] = "cv"


class PublicJobDescriptionResponse(BaseModel):
    id: str
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    content: str
    source_url: Optional[str] = None
    requirements: Optional[Any] = None
    created_at: str
    updated_at: str
    resource_type: Literal["job_description"] = "job_description"
