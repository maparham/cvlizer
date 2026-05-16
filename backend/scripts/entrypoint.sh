#!/bin/sh
# Deploy entrypoint: run schema + data migrations, then start the API server.
# Step 1 and 2 run exactly once per container start (before any worker forks).
set -e

echo "==> Step 1: alembic upgrade head"
alembic upgrade head

echo "==> Step 2: data migrations"
python scripts/run_data_migrations.py

echo "==> Starting API server"
exec uvicorn main:app --host 0.0.0.0 --port 8000
