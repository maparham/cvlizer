#!/usr/bin/env python3
"""
Production server runner with optimized settings for performance.
"""
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    # Production-optimized settings
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # Use multiple workers for better performance
        log_level="warning",  # Reduce logging overhead
        access_log=False,  # Disable access logs for better performance
        loop="uvloop",  # Use uvloop for better async performance
        http="httptools",  # Use httptools for better HTTP parsing
        reload=False,  # Disable reload in production
        server_header=False,  # Remove server header for security
        date_header=False,  # Remove date header for performance
    )
