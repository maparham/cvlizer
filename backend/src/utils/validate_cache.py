"""
In-memory cache for CV validate endpoint to reduce load during rapid edits.

Key: (cv_id, user_id, data_hash). TTL: 5 seconds.
Called every 500ms during edits; cache avoids redundant validation for same data.
Uses a lock for thread safety under multi-worker or multi-threaded usage.
"""

import hashlib
import json
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

# (result_errors, timestamp)
_CACHE: Dict[Tuple[str, str, str], Tuple[List[str], float]] = {}
_CACHE_LOCK = threading.Lock()
_TTL_SECONDS = 5.0


def _data_hash(data: Dict[str, Any]) -> Optional[str]:
    """Stable hash for cache key; sorts keys for consistency.
    Returns None when data cannot be hashed (avoids collisions on empty string)."""
    try:
        canonical = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()[:16]
    except (TypeError, ValueError):
        return None


def get_cached(cv_id: str, user_id: str, data: Dict[str, Any]) -> Optional[List[str]]:
    """Return cached validation errors if valid and fresh."""
    data_hash = _data_hash(data)
    if data_hash is None:
        return None  # Skip cache when data cannot be hashed
    key = (cv_id, user_id, data_hash)
    with _CACHE_LOCK:
        entry = _CACHE.get(key)
        if not entry:
            return None
        errors, ts = entry
        if time.time() - ts > _TTL_SECONDS:
            del _CACHE[key]
            return None
        return errors


def set_cached(cv_id: str, user_id: str, data: Dict[str, Any], errors: List[str]) -> None:
    """Store validation result in cache."""
    data_hash = _data_hash(data)
    if data_hash is None:
        return  # Skip cache when data cannot be hashed
    key = (cv_id, user_id, data_hash)
    with _CACHE_LOCK:
        _CACHE[key] = (errors, time.time())
