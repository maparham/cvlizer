"""
AI Usage Service for tracking OpenAI token consumption and costs.

This module provides comprehensive tracking and analytics for OpenAI API usage,
including token counting, cost calculation, and usage statistics for admin monitoring.
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from ..models.ai_usage_log import AIUsageLog
from ..models.user import User
from ..config import AIUsageConfig

logger = logging.getLogger(__name__)


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """
    Calculate the estimated cost for OpenAI API usage.

    Args:
        model: The model used (e.g., "gpt-4o-mini")
        prompt_tokens: Number of input tokens
        completion_tokens: Number of output tokens

    Returns:
        Estimated cost in USD
    """
    # Get pricing from config
    pricing = AIUsageConfig.MODEL_PRICING.get(model)

    if not pricing:
        # Use default pricing for unknown models
        pricing = {
            "input_price_per_1m": AIUsageConfig.DEFAULT_INPUT_PRICE_PER_1M,
            "output_price_per_1m": AIUsageConfig.DEFAULT_OUTPUT_PRICE_PER_1M
        }

    input_cost = (prompt_tokens / 1_000_000) * pricing["input_price_per_1m"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output_price_per_1m"]

    return round(input_cost + output_cost, 6)


def log_ai_usage(
    db: Session,
    user_id: str,
    operation_type: str,
    model_used: str,
    prompt_tokens: int,
    completion_tokens: int,
    generation_time: int,
    success: bool = True,
    error_message: Optional[str] = None,
    cv_id: Optional[str] = None
) -> Optional[AIUsageLog]:
    """
    Log AI usage to the database.

    Args:
        db: Database session
        user_id: ID of the user making the request
        operation_type: Type of operation (parse_cv, generate_section, etc.)
        model_used: OpenAI model used
        prompt_tokens: Number of input tokens
        completion_tokens: Number of output tokens
        generation_time: Time taken in milliseconds
        success: Whether the operation was successful
        error_message: Error message if operation failed
        cv_id: Optional CV ID if operation was CV-related

    Returns:
        Created AIUsageLog instance, or None if logging failed
    """
    try:
        total_tokens = prompt_tokens + completion_tokens
        estimated_cost = calculate_cost(model_used, prompt_tokens, completion_tokens)

        usage_log = AIUsageLog(
            user_id=user_id,
            cv_id=cv_id,
            operation_type=operation_type,
            model_used=model_used,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost=estimated_cost,
            generation_time=generation_time,
            success=success,
            error_message=error_message
        )

        db.add(usage_log)
        db.commit()
        db.refresh(usage_log)

        logger.info(f"Logged AI usage: {operation_type} - {total_tokens} tokens - ${estimated_cost:.6f}")
        return usage_log

    except Exception as e:
        logger.error(f"Failed to log AI usage: {str(e)}")
        db.rollback()
        # Don't raise - logging failures shouldn't break AI operations
        return None


def get_usage_stats(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get aggregate AI usage statistics.
    
    Args:
        db: Database session
        start_date: Start date for filtering (default: 30 days ago)
        end_date: End date for filtering (default: now)
        user_id: Optional user ID to filter by specific user
        
    Returns:
        Dictionary with usage statistics
    """
    try:
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Build query
        query = db.query(AIUsageLog)
        
        # Apply filters
        query = query.filter(
            and_(
                AIUsageLog.timestamp >= start_date,
                AIUsageLog.timestamp <= end_date
            )
        )
        
        if user_id:
            query = query.filter(AIUsageLog.user_id == user_id)
        
        # Get aggregate statistics
        stats = query.with_entities(
            func.sum(AIUsageLog.total_tokens).label('total_tokens'),
            func.sum(AIUsageLog.prompt_tokens).label('total_prompt_tokens'),
            func.sum(AIUsageLog.completion_tokens).label('total_completion_tokens'),
            func.sum(AIUsageLog.estimated_cost).label('total_cost'),
            func.count(AIUsageLog.id).label('total_operations'),
            func.avg(AIUsageLog.total_tokens).label('avg_tokens_per_operation'),
            func.avg(AIUsageLog.prompt_tokens).label('avg_prompt_tokens_per_operation'),
            func.avg(AIUsageLog.completion_tokens).label('avg_completion_tokens_per_operation'),
            func.avg(AIUsageLog.estimated_cost).label('avg_cost_per_operation')
        ).first()
        
        # Get success/failure counts separately
        successful_operations = query.filter(AIUsageLog.success == True).count()
        failed_operations = query.filter(AIUsageLog.success == False).count()
        
        # Get most expensive operation type
        operation_costs = query.with_entities(
            AIUsageLog.operation_type,
            func.sum(AIUsageLog.estimated_cost).label('total_cost')
        ).group_by(AIUsageLog.operation_type).order_by(desc('total_cost')).first()
        
        most_expensive_operation = operation_costs.operation_type if operation_costs else None
        
        return {
            "total_tokens": int(stats.total_tokens or 0),
            "total_prompt_tokens": int(stats.total_prompt_tokens or 0),
            "total_completion_tokens": int(stats.total_completion_tokens or 0),
            "total_cost": float(stats.total_cost or 0.0),
            "total_operations": int(stats.total_operations or 0),
            "successful_operations": successful_operations,
            "failed_operations": failed_operations,
            "average_tokens_per_operation": float(stats.avg_tokens_per_operation or 0.0),
            "average_prompt_tokens_per_operation": float(stats.avg_prompt_tokens_per_operation or 0.0),
            "average_completion_tokens_per_operation": float(stats.avg_completion_tokens_per_operation or 0.0),
            "average_cost_per_operation": float(stats.avg_cost_per_operation or 0.0),
            "most_expensive_operation_type": most_expensive_operation,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get usage stats: {str(e)}")
        raise


def get_usage_by_user(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get AI usage statistics grouped by user.
    
    Args:
        db: Database session
        start_date: Start date for filtering
        end_date: End date for filtering
        limit: Maximum number of results
        offset: Number of results to skip
        
    Returns:
        List of user usage statistics
    """
    try:
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Query with user information
        results = db.query(
            AIUsageLog.user_id,
            User.email,
            func.sum(AIUsageLog.total_tokens).label('total_tokens'),
            func.sum(AIUsageLog.prompt_tokens).label('total_prompt_tokens'),
            func.sum(AIUsageLog.completion_tokens).label('total_completion_tokens'),
            func.sum(AIUsageLog.estimated_cost).label('total_cost'),
            func.count(AIUsageLog.id).label('operation_count'),
            func.max(AIUsageLog.operation_type).label('most_used_operation')
        ).join(
            User, AIUsageLog.user_id == User.id
        ).filter(
            and_(
                AIUsageLog.timestamp >= start_date,
                AIUsageLog.timestamp <= end_date
            )
        ).group_by(
            AIUsageLog.user_id, User.email
        ).order_by(
            desc('total_tokens')
        ).offset(offset).limit(limit).all()
        
        return [
            {
                "user_id": result.user_id,
                "email": result.email,
                "total_tokens": int(result.total_tokens or 0),
                "total_prompt_tokens": int(result.total_prompt_tokens or 0),
                "total_completion_tokens": int(result.total_completion_tokens or 0),
                "total_cost": float(result.total_cost or 0.0),
                "operation_count": int(result.operation_count or 0),
                "most_used_operation": result.most_used_operation
            }
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"Failed to get usage by user: {str(e)}")
        raise


def get_usage_by_operation(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Get AI usage statistics grouped by operation type.
    
    Args:
        db: Database session
        start_date: Start date for filtering
        end_date: End date for filtering
        
    Returns:
        List of operation usage statistics
    """
    try:
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        results = db.query(
            AIUsageLog.operation_type,
            func.sum(AIUsageLog.total_tokens).label('total_tokens'),
            func.sum(AIUsageLog.prompt_tokens).label('total_prompt_tokens'),
            func.sum(AIUsageLog.completion_tokens).label('total_completion_tokens'),
            func.sum(AIUsageLog.estimated_cost).label('total_cost'),
            func.count(AIUsageLog.id).label('operation_count'),
            func.avg(AIUsageLog.total_tokens).label('avg_tokens_per_operation'),
            func.avg(AIUsageLog.prompt_tokens).label('avg_prompt_tokens_per_operation'),
            func.avg(AIUsageLog.completion_tokens).label('avg_completion_tokens_per_operation')
        ).filter(
            and_(
                AIUsageLog.timestamp >= start_date,
                AIUsageLog.timestamp <= end_date
            )
        ).group_by(
            AIUsageLog.operation_type
        ).order_by(
            desc('total_tokens')
        ).all()
        
        return [
            {
                "operation_type": result.operation_type,
                "total_tokens": int(result.total_tokens or 0),
                "total_prompt_tokens": int(result.total_prompt_tokens or 0),
                "total_completion_tokens": int(result.total_completion_tokens or 0),
                "total_cost": float(result.total_cost or 0.0),
                "operation_count": int(result.operation_count or 0),
                "average_tokens_per_operation": float(result.avg_tokens_per_operation or 0.0),
                "average_prompt_tokens_per_operation": float(result.avg_prompt_tokens_per_operation or 0.0),
                "average_completion_tokens_per_operation": float(result.avg_completion_tokens_per_operation or 0.0)
            }
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"Failed to get usage by operation: {str(e)}")
        raise


def get_usage_timeline(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    granularity: str = "day"
) -> List[Dict[str, Any]]:
    """
    Get AI usage data for timeline charts.
    
    Args:
        db: Database session
        start_date: Start date for filtering
        end_date: End date for filtering
        granularity: day, week, or month
        
    Returns:
        List of timeline data points
    """
    try:
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Determine date truncation based on granularity (SQLite compatible)
        if granularity == "week":
            # SQLite: Get start of week (Monday)
            date_trunc = func.date(AIUsageLog.timestamp, 'weekday 1', '-6 days')
        elif granularity == "month":
            # SQLite: Get start of month
            date_trunc = func.date(AIUsageLog.timestamp, 'start of month')
        elif granularity == "hour":
            # SQLite: Get date and hour (YYYY-MM-DD HH:00:00 format)
            date_trunc = func.strftime('%Y-%m-%d %H:00:00', AIUsageLog.timestamp)
        else:  # day
            # SQLite: Get date only
            date_trunc = func.date(AIUsageLog.timestamp)
        
        results = db.query(
            date_trunc.label('period'),
            func.sum(AIUsageLog.total_tokens).label('total_tokens'),
            func.sum(AIUsageLog.prompt_tokens).label('total_prompt_tokens'),
            func.sum(AIUsageLog.completion_tokens).label('total_completion_tokens'),
            func.sum(AIUsageLog.estimated_cost).label('total_cost'),
            func.count(AIUsageLog.id).label('operation_count')
        ).filter(
            and_(
                AIUsageLog.timestamp >= start_date,
                AIUsageLog.timestamp <= end_date
            )
        ).group_by(
            date_trunc
        ).order_by(
            'period'
        ).all()
        
        return [
            {
                "date": result.period if result.period else None,
                "total_tokens": int(result.total_tokens or 0),
                "total_prompt_tokens": int(result.total_prompt_tokens or 0),
                "total_completion_tokens": int(result.total_completion_tokens or 0),
                "total_cost": float(result.total_cost or 0.0),
                "operation_count": int(result.operation_count or 0)
            }
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"Failed to get usage timeline: {str(e)}")
        raise


def get_usage_logs(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[str] = None,
    operation_type: Optional[str] = None,
    success: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Get detailed AI usage logs with filtering and pagination.
    
    Args:
        db: Database session
        start_date: Start date for filtering
        end_date: End date for filtering
        user_id: Filter by user ID
        operation_type: Filter by operation type
        success: Filter by success status
        limit: Maximum number of results
        offset: Number of results to skip
        
    Returns:
        Tuple of (logs list, total count)
    """
    try:
        # Default to last 30 days if no dates provided
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Build base query
        query = db.query(AIUsageLog, User.email).join(
            User, AIUsageLog.user_id == User.id
        ).filter(
            and_(
                AIUsageLog.timestamp >= start_date,
                AIUsageLog.timestamp <= end_date
            )
        )
        
        # Apply additional filters
        if user_id:
            query = query.filter(AIUsageLog.user_id == user_id)
        if operation_type:
            query = query.filter(AIUsageLog.operation_type == operation_type)
        if success is not None:
            query = query.filter(AIUsageLog.success == success)
        
        # Get total count
        total_count = query.count()
        
        # Get paginated results
        results = query.order_by(
            desc(AIUsageLog.timestamp)
        ).offset(offset).limit(limit).all()
        
        logs = []
        for usage_log, user_email in results:
            log_dict = usage_log.to_dict()
            log_dict["user_email"] = user_email
            logs.append(log_dict)
        
        return logs, total_count
        
    except Exception as e:
        logger.error(f"Failed to get usage logs: {str(e)}")
        raise


def delete_all_usage_logs(db: Session) -> int:
    """
    Delete all AI usage logs from the database.
    
    Args:
        db: Database session
        
    Returns:
        Number of deleted records
    """
    try:
        # Get count before deletion for logging
        total_count = db.query(AIUsageLog).count()
        
        if total_count == 0:
            logger.info("No AI usage logs to delete")
            return 0
        
        # Use bulk delete for better performance
        # SQLAlchemy's delete() method is more efficient than individual deletes
        deleted_count = db.query(AIUsageLog).delete(synchronize_session=False)
        db.commit()
        
        logger.info(f"Deleted {deleted_count} AI usage log entries")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Failed to delete all usage logs: {str(e)}")
        db.rollback()
        raise
