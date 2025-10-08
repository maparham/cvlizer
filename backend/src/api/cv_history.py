"""
CV History API endpoints.

This module provides REST API endpoints for managing CV version history,
including creating snapshots, retrieving history, and restoring versions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
import json
from datetime import datetime

from src.models import get_db, CVHistory, CV, User
from src.services.cv_diff_service import cv_diff_service
from src.middleware.clerk_auth import get_effective_user, get_current_user
from src.utils.history_validation import ValidatedCreateHistoryRequest, calculate_data_size


router = APIRouter(prefix="/api/cvs", tags=["cv-history"])


# Pydantic models for request/response
class CreateHistoryRequest(BaseModel):
    cv_data: dict = Field(..., description="The CV data snapshot")
    change_type: str = Field(..., description="Type of change that triggered this snapshot")
    description: Optional[str] = Field(None, description="Human-readable description")
    label: Optional[str] = Field(None, description="Optional user-provided label")
    is_automatic: bool = Field(True, description="Whether this was an automatic snapshot")
    is_initial: bool = Field(False, description="Whether this is the initial version (undeletable)")


class HistoryEntryResponse(BaseModel):
    id: str
    timestamp: str
    cvData: dict
    changeType: str
    description: str
    isAutomatic: bool
    isInitial: bool
    label: Optional[str]
    dataSize: int


class HistoryStatsResponse(BaseModel):
    totalEntries: int
    autoSnapshots: int
    manualSnapshots: int
    totalStorageUsed: int
    oldestEntry: Optional[str]
    newestEntry: Optional[str]


class TextDiffData(BaseModel):
    inline_diff: Optional[str] = Field(None, description="Inline diff with character-level highlighting")
    word_diff: List[str] = Field(default_factory=list, description="Word-level diff summary")
    old_text: str = Field(..., description="Original text")
    new_text: str = Field(..., description="Updated text")
    stats: Dict[str, int] = Field(..., description="Change statistics")


class DiffChangeResponse(BaseModel):
    type: str = Field(..., description="Type of change (field_changed, item_added, item_removed, etc.)")
    section: str = Field(..., description="Section where change occurred")
    description: str = Field(..., description="Human-readable description of the change")
    details: List[str] = Field(default_factory=list, description="Detailed change information")
    text_diff: Optional[TextDiffData] = Field(None, description="Detailed text diff for text fields")
    icon: str = Field(..., description="Icon type for UI display")
    color: str = Field(..., description="Color for UI display")


class CVDiffResponse(BaseModel):
    changes: List[DiffChangeResponse] = Field(..., description="List of changes between versions")
    summary: str = Field(..., description="Summary of changes (e.g., '3 Changes')")
    total_changes: int = Field(..., description="Total number of changes")


@router.post("/{cv_id}/history", response_model=HistoryEntryResponse)
async def create_history_entry(
    cv_id: str,
    request: ValidatedCreateHistoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Create a new history entry for a CV."""
    
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Rate limiting: Check for recent history entries to prevent spam
    from datetime import datetime, timedelta
    recent_cutoff = datetime.utcnow() - timedelta(minutes=1)
    recent_entries = db.query(CVHistory).filter(
        and_(
            CVHistory.cv_id == cv_id,
            CVHistory.user_id == current_user.id,
            CVHistory.created_at > recent_cutoff
        )
    ).count()
    
    # Allow max 5 entries per minute (generous for MVP)
    if recent_entries >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many history entries created recently. Please wait a moment."
        )
    
    # Calculate data size using validation utility
    data_size = calculate_data_size(request.cv_data)
    
    # Create history entry
    history_entry = CVHistory(
        cv_id=cv_id,
        user_id=current_user.id,
        cv_data=request.cv_data,
        change_type=request.change_type,
        description=request.description,
        label=request.label,
        is_automatic=request.is_automatic,
        is_initial=request.is_initial,
        data_size=data_size
    )
    
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    
    # Apply retention policy: keep only the most recent 50 versions (excluding initial version)
    if not request.is_initial:  # Don't apply retention when creating initial version
        _apply_retention_policy(db, cv_id)
    
    return HistoryEntryResponse(**history_entry.to_frontend_format())


@router.get("/{cv_id}/history", response_model=List[HistoryEntryResponse])
async def get_cv_history(
    cv_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get history entries for a CV."""
    
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get history entries
    history_entries = db.query(CVHistory).filter(
        CVHistory.cv_id == cv_id
    ).order_by(desc(CVHistory.created_at)).offset(offset).limit(limit).all()
    
    return [HistoryEntryResponse(**entry.to_frontend_format()) for entry in history_entries]


@router.get("/{cv_id}/history/{entry_id}", response_model=HistoryEntryResponse)
async def get_history_entry(
    cv_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get a specific history entry."""
    
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get history entry
    history_entry = db.query(CVHistory).filter(
        and_(CVHistory.id == entry_id, CVHistory.cv_id == cv_id)
    ).first()
    
    if not history_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    return HistoryEntryResponse(**history_entry.to_frontend_format())


@router.delete("/{cv_id}/history/{entry_id}")
async def delete_history_entry(
    cv_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Delete a specific history entry."""
    
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get and delete history entry
    history_entry = db.query(CVHistory).filter(
        and_(CVHistory.id == entry_id, CVHistory.cv_id == cv_id)
    ).first()
    
    if not history_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    # Protect initial versions from deletion
    if history_entry.is_initial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete initial version"
        )
    
    db.delete(history_entry)
    db.commit()
    
    return {"message": "History entry deleted successfully"}


@router.delete("/{cv_id}/history")
async def clear_cv_history(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Clear all history entries for a CV."""
    
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Delete all non-initial history entries for this CV
    deleted_count = db.query(CVHistory).filter(
        and_(CVHistory.cv_id == cv_id, CVHistory.is_initial == False)
    ).delete()
    db.commit()
    
    return {"message": f"Cleared {deleted_count} history entries (preserved initial version)"}


@router.get("/{cv_id}/history-stats", response_model=HistoryStatsResponse)
async def get_history_stats(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get statistics about CV history."""
    
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get history entries for stats
    history_entries = db.query(CVHistory).filter(CVHistory.cv_id == cv_id).all()
    
    if not history_entries:
        return HistoryStatsResponse(
            totalEntries=0,
            autoSnapshots=0,
            manualSnapshots=0,
            totalStorageUsed=0,
            oldestEntry=None,
            newestEntry=None
        )
    
    # Calculate stats
    auto_snapshots = sum(1 for entry in history_entries if entry.is_automatic)
    manual_snapshots = len(history_entries) - auto_snapshots
    total_storage = sum(entry.data_size for entry in history_entries)
    
    # Sort by timestamp for oldest/newest
    sorted_entries = sorted(history_entries, key=lambda x: x.created_at)
    oldest_entry = sorted_entries[0].created_at.isoformat()
    newest_entry = sorted_entries[-1].created_at.isoformat()
    
    return HistoryStatsResponse(
        totalEntries=len(history_entries),
        autoSnapshots=auto_snapshots,
        manualSnapshots=manual_snapshots,
        totalStorageUsed=total_storage,
        oldestEntry=oldest_entry,
        newestEntry=newest_entry
    )


@router.post("/{cv_id}/restore/{entry_id}")
async def restore_cv_version(
    cv_id: str,
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Restore CV to a previous version."""
    
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get history entry to restore
    history_entry = db.query(CVHistory).filter(
        and_(CVHistory.id == entry_id, CVHistory.cv_id == cv_id)
    ).first()
    
    if not history_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    # Restore the CV data
    cv.parsed_data = history_entry.cv_data
    cv.updated_at = datetime.utcnow()
    
    # Create restore snapshot
    restore_size = len(json.dumps(history_entry.cv_data).encode('utf-8'))
    restore_entry = CVHistory(
        cv_id=cv_id,
        user_id=current_user.id,
        cv_data=history_entry.cv_data,
        change_type="restore_point",
        description=f"Restored to version from {history_entry.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
        label=None,
        is_automatic=False,
        is_initial=False,
        data_size=restore_size
    )
    db.add(restore_entry)
    
    db.commit()
    db.refresh(cv)
    
    # Apply retention policy after creating restore entry
    _apply_retention_policy(db, cv_id)
    
    return {
        "message": "CV restored successfully",
        "cv": cv.to_response_dict()
    }


@router.get("/{cv_id}/history/{entry_id}/diff", response_model=CVDiffResponse)
async def get_version_diff(
    cv_id: str,
    entry_id: str,
    compare_to: Optional[str] = None,  # If not provided, compare to original version or previous version
    force_previous: bool = False,  # If true, always compare to previous version (ignore original)
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """
    Get semantic diff between two CV versions.
    
    Args:
        cv_id: CV identifier
        entry_id: History entry to compare
        compare_to: Optional entry ID to compare against (defaults to original version, or previous version if no original exists)
    """
    # Verify CV ownership
    cv = db.query(CV).filter(
        and_(CV.id == cv_id, CV.user_id == current_user.id)
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get the target history entry
    target_entry = db.query(CVHistory).filter(
        and_(
            CVHistory.cv_id == cv_id,
            CVHistory.id == entry_id,
            CVHistory.user_id == current_user.id
        )
    ).first()
    
    if not target_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found"
        )
    
    # Get the comparison entry (original version by default)
    if compare_to:
        compare_entry = db.query(CVHistory).filter(
            and_(
                CVHistory.cv_id == cv_id,
                CVHistory.id == compare_to,
                CVHistory.user_id == current_user.id
            )
        ).first()
        
        if not compare_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Comparison history entry not found"
            )
    else:
        # If force_previous is True, always compare to previous version
        if force_previous:
            # Get all entries for this CV ordered by creation time
            all_entries = db.query(CVHistory).filter(
                and_(CVHistory.cv_id == cv_id, CVHistory.user_id == current_user.id)
            ).order_by(CVHistory.created_at.asc()).all()
            
            # Find the target entry in the list
            target_index = None
            for i, entry in enumerate(all_entries):
                if entry.id == entry_id:
                    target_index = i
                    break
            
            if target_index is None or target_index == 0:
                # Target entry not found or it's the first entry
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No previous version available for comparison"
                )
            
            # Use the previous entry for comparison
            compare_entry = all_entries[target_index - 1]
        else:
            # Try to compare to original version (is_initial=True) first
            compare_entry = db.query(CVHistory).filter(
                and_(
                    CVHistory.cv_id == cv_id,
                    CVHistory.is_initial == True,
                    CVHistory.user_id == current_user.id
                )
            ).first()
            
            # If no original version exists (CV created empty), compare to previous version
            if not compare_entry:
                # Get all entries for this CV ordered by creation time
                all_entries = db.query(CVHistory).filter(
                    and_(CVHistory.cv_id == cv_id, CVHistory.user_id == current_user.id)
                ).order_by(CVHistory.created_at.asc()).all()
                
                # Find the target entry in the list
                target_index = None
                for i, entry in enumerate(all_entries):
                    if entry.id == entry_id:
                        target_index = i
                        break
                
                if target_index is None or target_index == 0:
                    # Target entry not found or it's the first entry
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No previous version available for comparison"
                    )
                
                # Use the previous entry for comparison
                compare_entry = all_entries[target_index - 1]
    
    # Compute the diff using the backend service
    diff_result = cv_diff_service.compute_diff(
        compare_entry.cv_data,  # old data
        target_entry.cv_data    # new data
    )
    
    # Convert to response format
    changes = []
    for change in diff_result['changes']:
        text_diff_data = None
        if change.get('text_diff'):
            text_diff_data = TextDiffData(
                inline_diff=change['text_diff'].get('inline_diff'),
                word_diff=change['text_diff'].get('word_diff', []),
                old_text=change['text_diff']['old_text'],
                new_text=change['text_diff']['new_text'],
                stats=change['text_diff']['stats']
            )
        
        changes.append(DiffChangeResponse(
            type=change['type'],
            section=change['section'],
            description=change['description'],
            details=change.get('details', []),
            text_diff=text_diff_data,
            icon=change['icon'],
            color=change['color']
        ))
    
    return CVDiffResponse(
        changes=changes,
        summary=diff_result['summary'],
        total_changes=diff_result['total_changes']
    )


def _apply_retention_policy(db: Session, cv_id: str) -> int:
    """
    Apply retention policy to keep only the most recent 50 versions.
    The initial version is always preserved and doesn't count toward the limit.
    
    Args:
        db: Database session
        cv_id: CV identifier
        
    Returns:
        Number of entries deleted
    """
    # Get all non-initial history entries ordered by creation time (newest first)
    all_entries = db.query(CVHistory).filter(
        and_(CVHistory.cv_id == cv_id, CVHistory.is_initial == False)
    ).order_by(desc(CVHistory.created_at)).all()
    
    # If we have 50 or fewer entries, no cleanup needed
    if len(all_entries) <= 50:
        return 0
    
    # Keep the most recent 50, delete the rest
    entries_to_delete = all_entries[50:]
    deleted_count = 0
    
    for entry in entries_to_delete:
        db.delete(entry)
        deleted_count += 1
    
    db.commit()
    return deleted_count
