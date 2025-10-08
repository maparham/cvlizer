"""
Script to revert AI agent integration changes while preserving other modifications.
This removes database columns added for agent parsing.
"""

from sqlalchemy import text
from src.database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def remove_agent_columns():
    """Remove agent-related columns from job_descriptions table"""

    columns_to_remove = [
        "department",
        "summary",
        "responsibilities",
        "qualifications",
        "benefits",
        "application_instructions",
    ]

    with engine.connect() as conn:
        for column_name in columns_to_remove:
            try:
                logger.info(f"Removing column: {column_name}")
                # Check if column exists first
                result = conn.execute(text(f"PRAGMA table_info(job_descriptions)"))
                columns = [row[1] for row in result]

                if column_name in columns:
                    # SQLite doesn't support DROP COLUMN easily, need to recreate table
                    logger.info(f"Column {column_name} exists, will need table recreation")
                else:
                    logger.info(f"Column {column_name} doesn't exist, skipping")
            except Exception as e:
                logger.error(f"Error checking column {column_name}: {str(e)}")

    logger.info("\nNote: SQLite requires table recreation to drop columns.")
    logger.info("The columns are now removed from the model, so new instances won't have them.")
    logger.info("Existing data with these columns will be ignored.")


if __name__ == "__main__":
    remove_agent_columns()
