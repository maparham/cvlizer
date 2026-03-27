"""
Shared SlowAPI limiter instance for public share routes (decorators must share one Limiter).
"""

from src.utils.rate_limit import create_combined_limiter

limiter = create_combined_limiter()
