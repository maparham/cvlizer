"""
Logging Setup Utility

Configures Python's logging to output to both console and file.
Uses configuration from src/config.py LoggingConfig.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

from src.config import LoggingConfig


def setup_logging(log_dir: str = "logs") -> None:
    """
    Configure application logging to output to both console and file.

    Args:
        log_dir: Directory to store log files (default: "logs")
    """
    # Create logs directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)

    # Get log file path
    log_file = log_path / LoggingConfig.LOG_FILE

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(LoggingConfig.LOG_LEVEL)

    # Clear existing handlers to avoid duplicates
    root_logger.handlers.clear()

    # Create formatters
    formatter = logging.Formatter(LoggingConfig.LOG_FORMAT)

    # Console handler - always enabled
    console_handler = logging.StreamHandler()
    console_handler.setLevel(LoggingConfig.LOG_LEVEL)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler - enabled based on config or always in production
    if (
        LoggingConfig.LOG_FILE_ENABLED
        or os.getenv("ENVIRONMENT", "development") == "production"
    ):
        # Use RotatingFileHandler to prevent log files from growing too large
        # Max file size: 10MB, keep 5 backup files
        file_handler = RotatingFileHandler(
            log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"  # 10 MB
        )
        file_handler.setLevel(LoggingConfig.LOG_LEVEL)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)

        logging.info(f"Logging to file: {log_file}")

    # Configure uvicorn loggers to use the same handlers
    for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access"]:
        logger = logging.getLogger(logger_name)
        logger.handlers.clear()
        logger.addHandler(console_handler)
        if (
            LoggingConfig.LOG_FILE_ENABLED
            or os.getenv("ENVIRONMENT", "development") == "production"
        ):
            logger.addHandler(file_handler)
        logger.propagate = False

    # Reduce verbosity of specific loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)  # Only log HTTP errors
    logging.getLogger("urllib3.connectionpool").setLevel(
        logging.INFO
    )  # Silence connection pool debug
    logging.getLogger("httpcore").setLevel(logging.WARNING)  # Silence HTTP debug logs
    logging.getLogger("httpx").setLevel(logging.WARNING)  # Silence HTTP debug logs
    logging.getLogger("openai").setLevel(logging.WARNING)  # Silence OpenAI debug logs
    logging.getLogger("openai._base_client").setLevel(
        logging.WARNING
    )  # Silence OpenAI client debug logs
    logging.getLogger("httpcore.http11").setLevel(
        logging.WARNING
    )  # Silence HTTP/1.1 debug logs
    logging.getLogger("selenium").setLevel(logging.WARNING)  # Silence Selenium debug logs
    logging.getLogger("selenium.webdriver").setLevel(
        logging.WARNING
    )  # Silence Selenium webdriver debug logs
    logging.getLogger("selenium.webdriver.remote.remote_connection").setLevel(
        logging.WARNING
    )  # Silence Selenium connection logs
    logging.getLogger("multipart").setLevel(logging.INFO)  # Silence multipart debug logs

    logging.info(f"Logging configured - Level: {LoggingConfig.LOG_LEVEL}")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Logger instance
    """
    return logging.getLogger(name)
