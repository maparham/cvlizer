"""
Admin AI Usage API endpoints for tracking OpenAI token consumption and costs.

This module provides administrative endpoints for monitoring AI usage,
including token consumption, costs, and performance analytics.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import and_, desc
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import require_admin_allow_impersonating
from src.models.ai_usage_log import AIUsageLog
from src.models.base import get_db
from src.models.user import User
from src.services.ai_usage_service import (
    delete_all_usage_logs,
    get_usage_by_operation,
    get_usage_by_user,
    get_usage_logs,
    get_usage_stats,
    get_usage_timeline,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/ai-usage", tags=["admin-ai-usage"])


# Response Models
class SystemAIStats(BaseModel):
    total_tokens: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_cost: float
    total_operations: int
    successful_operations: int
    failed_operations: int
    average_tokens_per_operation: float
    average_prompt_tokens_per_operation: float
    average_completion_tokens_per_operation: float
    average_cost_per_operation: float
    most_expensive_operation_type: Optional[str]
    date_range: dict


class UserAIUsage(BaseModel):
    user_id: str
    email: str
    total_tokens: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_cost: float
    operation_count: int
    most_used_operation: Optional[str]


class OperationAIUsage(BaseModel):
    operation_type: str
    total_tokens: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_cost: float
    operation_count: int
    average_tokens_per_operation: float
    average_prompt_tokens_per_operation: float
    average_completion_tokens_per_operation: float


class TimelineData(BaseModel):
    date: Optional[str]
    total_tokens: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_cost: float
    operation_count: int


class AIUsageLogDetail(BaseModel):
    model_config = {"protected_namespaces": ()}

    id: str
    user_id: str
    user_email: str
    cv_id: Optional[str]
    operation_type: str
    model_used: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    generation_time: int
    success: bool
    error_message: Optional[str]
    timestamp: Optional[str]
    created_at: Optional[str]


class PaginatedAIUsageLogs(BaseModel):
    logs: List[AIUsageLogDetail]
    total: int
    limit: int
    offset: int


@router.get("/stats", response_model=SystemAIStats)
async def get_ai_usage_stats(
    start_date: Optional[str] = Query(
        None, description="Start date for filtering (YYYY-MM-DD format)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date for filtering (YYYY-MM-DD format)"
    ),
    user_id: Optional[str] = Query(None, description="Filter by specific user ID"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_allow_impersonating),
):
    """
    Get comprehensive AI usage statistics.

    Returns aggregate statistics including total tokens, costs, operation counts,
    and performance metrics for the specified date range.
    """
    try:
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day for inclusive filtering
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Validate date range
        if start_dt and end_dt and start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date",
            )

        stats = get_usage_stats(
            db=db, start_date=start_dt, end_date=end_dt, user_id=user_id
        )

        return SystemAIStats(**stats)

    except Exception as e:
        logger.error(f"Error getting AI usage stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving AI usage statistics",
        )


@router.get("/by-user", response_model=List[UserAIUsage])
async def get_ai_usage_by_user(
    start_date: Optional[str] = Query(
        None, description="Start date for filtering (YYYY-MM-DD format)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date for filtering (YYYY-MM-DD format)"
    ),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_allow_impersonating),
):
    """
    Get AI usage statistics grouped by user.

    Returns a list of users with their token consumption, costs, and operation counts,
    sorted by total tokens consumed (descending).
    """
    try:
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day for inclusive filtering
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Validate date range
        if start_dt and end_dt and start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date",
            )

        users = get_usage_by_user(
            db=db, start_date=start_dt, end_date=end_dt, limit=limit, offset=offset
        )

        return [UserAIUsage(**user) for user in users]

    except Exception as e:
        logger.error(f"Error getting AI usage by user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving AI usage by user",
        )


@router.get("/by-operation", response_model=List[OperationAIUsage])
async def get_ai_usage_by_operation(
    start_date: Optional[str] = Query(
        None, description="Start date for filtering (YYYY-MM-DD format)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date for filtering (YYYY-MM-DD format)"
    ),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_allow_impersonating),
):
    """
    Get AI usage statistics grouped by operation type.

    Returns a breakdown of token consumption and costs by operation type,
    sorted by total tokens consumed (descending).
    """
    try:
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day for inclusive filtering
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Validate date range
        if start_dt and end_dt and start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date",
            )

        operations = get_usage_by_operation(db=db, start_date=start_dt, end_date=end_dt)

        return [OperationAIUsage(**op) for op in operations]

    except Exception as e:
        logger.error(f"Error getting AI usage by operation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving AI usage by operation",
        )


@router.get("/timeline", response_model=List[TimelineData])
async def get_ai_usage_timeline(
    start_date: Optional[str] = Query(
        None, description="Start date for filtering (YYYY-MM-DD format)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date for filtering (YYYY-MM-DD format)"
    ),
    granularity: str = Query(
        "day", pattern="^(day|week|month|hour)$", description="Timeline granularity"
    ),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_allow_impersonating),
):
    """
    Get AI usage data for timeline charts.

    Returns time-series data for creating charts showing token consumption
    and costs over time with the specified granularity.
    """
    try:
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day for inclusive filtering
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Validate date range
        if start_dt and end_dt and start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date",
            )

        timeline = get_usage_timeline(
            db=db, start_date=start_dt, end_date=end_dt, granularity=granularity
        )

        return [TimelineData(**data) for data in timeline]

    except Exception as e:
        logger.error(f"Error getting AI usage timeline: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving AI usage timeline",
        )


@router.get("/logs", response_model=PaginatedAIUsageLogs)
async def get_ai_usage_logs(
    start_date: Optional[str] = Query(
        None, description="Start date for filtering (YYYY-MM-DD format)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date for filtering (YYYY-MM-DD format)"
    ),
    user_id: Optional[str] = Query(None, description="Filter by specific user ID"),
    operation_type: Optional[str] = Query(None, description="Filter by operation type"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_allow_impersonating),
):
    """
    Get detailed AI usage logs with filtering and pagination.

    Returns a paginated list of individual AI usage log entries with
    comprehensive filtering options for detailed analysis.
    """
    try:
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day for inclusive filtering
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Validate date range
        if start_dt and end_dt and start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date",
            )

        logs, total_count = get_usage_logs(
            db=db,
            start_date=start_dt,
            end_date=end_dt,
            user_id=user_id,
            operation_type=operation_type,
            success=success,
            limit=limit,
            offset=offset,
        )

        return PaginatedAIUsageLogs(
            logs=[AIUsageLogDetail(**log) for log in logs],
            total=total_count,
            limit=limit,
            offset=offset,
        )

    except Exception as e:
        logger.error(f"Error getting AI usage logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving AI usage logs",
        )


@router.delete("/logs/all")
async def delete_all_ai_usage_logs(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_allow_impersonating),
):
    """
    Delete all AI usage logs from the system.

    This is a destructive operation that permanently removes all AI usage
    log entries. Use with extreme caution.
    """
    try:
        deleted_count = delete_all_usage_logs(db)

        logger.info(
            f"Admin {admin_user.email} deleted all AI usage logs ({deleted_count} records)"
        )

        return {
            "message": f"Successfully deleted {deleted_count} AI usage log entries",
            "deleted_count": deleted_count,
        }

    except Exception as e:
        logger.error(f"Error deleting all AI usage logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting AI usage logs",
        )


@router.get("/logs/export")
async def export_all_ai_usage_logs(
    start_date: Optional[str] = Query(
        None, description="Start date for filtering (YYYY-MM-DD format)"
    ),
    end_date: Optional[str] = Query(
        None, description="End date for filtering (YYYY-MM-DD format)"
    ),
    user_id: Optional[str] = Query(None, description="Filter by specific user ID"),
    operation_type: Optional[str] = Query(None, description="Filter by operation type"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_allow_impersonating),
):
    """
    Export all AI usage logs as CSV.

    This endpoint fetches ALL matching records and returns them as a CSV file for download.
    Uses efficient database queries to handle large datasets.
    """
    try:
        # Parse date strings to datetime objects
        start_dt = None
        end_dt = None

        if start_date:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Set to end of day for inclusive filtering
            end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Validate date range
        if start_dt and end_dt and start_dt > end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date",
            )

        # Build query for all matching records
        query = db.query(AIUsageLog, User.email).join(User, AIUsageLog.user_id == User.id)

        # Apply filters
        if start_dt and end_dt:
            query = query.filter(
                and_(AIUsageLog.timestamp >= start_dt, AIUsageLog.timestamp <= end_dt)
            )
        elif start_dt:
            query = query.filter(AIUsageLog.timestamp >= start_dt)
        elif end_dt:
            query = query.filter(AIUsageLog.timestamp <= end_dt)

        if user_id:
            query = query.filter(AIUsageLog.user_id == user_id)
        if operation_type:
            query = query.filter(AIUsageLog.operation_type == operation_type)
        if success is not None:
            query = query.filter(AIUsageLog.success == success)

        # Get all results in one query (no pagination)
        results = query.order_by(desc(AIUsageLog.timestamp)).all()

        # Create CSV content
        import csv
        import io

        def sanitize_csv_field(value) -> str:
            """Sanitize field to prevent CSV injection attacks."""
            if value is None:
                return ""

            str_value = str(value)
            # Escape double quotes first
            str_value = str_value.replace('"', '""')
            # Prefix with single quote if starts with formula-like characters
            if str_value and str_value[0] in ("=", "+", "-", "@", "\t", "\r", "\n"):
                return "'" + str_value
            return str_value

        output = io.StringIO()
        writer = csv.writer(output)

        # Write headers
        headers = [
            "Timestamp",
            "User Email",
            "User ID",
            "Operation Type",
            "Model Used",
            "Prompt Tokens",
            "Completion Tokens",
            "Total Tokens",
            "Estimated Cost",
            "Generation Time (ms)",
            "Success",
            "Error Message",
            "CV ID",
        ]
        writer.writerow(headers)

        # Write data rows
        for usage_log, user_email in results:
            writer.writerow(
                [
                    sanitize_csv_field(
                        usage_log.timestamp.isoformat() if usage_log.timestamp else ""
                    ),
                    sanitize_csv_field(user_email),
                    sanitize_csv_field(usage_log.user_id),
                    sanitize_csv_field(usage_log.operation_type),
                    sanitize_csv_field(usage_log.model_used),
                    usage_log.prompt_tokens or 0,
                    usage_log.completion_tokens or 0,
                    usage_log.total_tokens or 0,
                    usage_log.estimated_cost or 0.0,
                    usage_log.generation_time or 0,
                    usage_log.success,
                    sanitize_csv_field(usage_log.error_message),
                    sanitize_csv_field(usage_log.cv_id),
                ]
            )

        # Get CSV content
        csv_content = output.getvalue()
        output.close()

        # Create response
        from fastapi.responses import Response

        # Generate filename
        date_str = datetime.now().strftime("%Y-%m-%d")
        filename = f"ai_usage_logs_export_{date_str}.csv"

        logger.info(f"Admin {admin_user.email} exported {len(results)} AI usage logs")

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except Exception as e:
        logger.error(f"Error exporting AI usage logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error exporting AI usage logs",
        )
