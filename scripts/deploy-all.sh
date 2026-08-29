#!/usr/bin/env bash
#
# Deploy frontend (Cloudflare) + backend (EC2) in one go.
#
# Frontend runs first: a TypeScript/build failure aborts the whole deploy
# before anything touches the VPS.
#
# Usage:
#   ./scripts/deploy-all.sh                # frontend deploy, then full backend deploy
#   ./scripts/deploy-all.sh --env-only     # frontend deploy, then backend env-only push
#   ./scripts/deploy-all.sh --backend-only # skip frontend, backend only
#   ./scripts/deploy-all.sh --frontend-only
#
# Backend env vars (DEPLOY_SSH_HOST, DEPLOY_SSH_USER, DEPLOY_SSH_IDENTITY,
# DEPLOY_REMOTE_DIR, DEPLOY_ENV_FILE) pass through to deploy-backend-ec2.sh.
# Frontend honors ENV_FILE the same way npm run deploy does.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DO_FRONTEND=true
DO_BACKEND=true
BACKEND_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --frontend-only) DO_BACKEND=false ;;
    --backend-only) DO_FRONTEND=false ;;
    --env-only) BACKEND_ARGS+=(--env-only) ;;
    *)
      echo "error: unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ "$DO_FRONTEND" == false && "$DO_BACKEND" == false ]]; then
  echo "error: --frontend-only and --backend-only are mutually exclusive" >&2
  exit 1
fi

if [[ "$DO_FRONTEND" == true ]]; then
  echo "==> Deploying frontend (Cloudflare)"
  (cd "$REPO_ROOT/frontend" && npm run deploy)
  echo "==> Frontend deploy done"
fi

if [[ "$DO_BACKEND" == true ]]; then
  echo "==> Deploying backend (EC2)"
  "$REPO_ROOT/scripts/deploy-backend-ec2.sh" ${BACKEND_ARGS[@]+"${BACKEND_ARGS[@]}"}
  echo "==> Backend deploy done"
fi

echo "==> All requested deploys finished"
