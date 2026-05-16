#!/usr/bin/env bash
#
# Deploy local backend artifacts + Compose config + env to EC2 (same flow as Actions,
# plus copying your laptop's env file so remote .env.prod matches this machine).
#
# Usage:
#   ./scripts/deploy-backend-ec2.sh                  # backend + compose + .env (+ --build)
#   ./scripts/deploy-backend-ec2.sh --env-only       # rsync env only → recreate containers (no image rebuild)
#
# Optional:
#   DEPLOY_SSH_HOST (default ssh.rahkar.pro — Bash OpenSSH shortcut: ssh ssh.rahkar.pro)
#   DEPLOY_SSH_USER (default ec2-user)
#   DEPLOY_SSH_IDENTITY (~/.pem path for ssh / rsync)
#   DEPLOY_REMOTE_DIR (default /home/ec2-user/cv_lator)
#   DEPLOY_ENV_FILE (absolute path or repo-relative; default repo-root .env.prod)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENV_ONLY=false
if [[ "${1:-}" == "--env-only" ]]; then
  ENV_ONLY=true
  shift || true
fi

DEPLOY_SSH_HOST="${DEPLOY_SSH_HOST:-ssh.rahkar.pro}"
DEPLOY_SSH_USER="${DEPLOY_SSH_USER:-ec2-user}"
DEPLOY_REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/home/ec2-user/cv_lator}"

# Local env file synced to REMOTE/.env.prod (Compose env_file expects that name).
if [[ -n "${DEPLOY_ENV_FILE:-}" ]]; then
  if [[ "${DEPLOY_ENV_FILE}" == /* ]]; then
    LOCAL_ENV="${DEPLOY_ENV_FILE}"
  else
    LOCAL_ENV="${REPO_ROOT}/${DEPLOY_ENV_FILE}"
  fi
else
  LOCAL_ENV="${REPO_ROOT}/.env.prod"
fi

if [[ ! -f "$LOCAL_ENV" ]]; then
  echo "error: local env file not found: ${LOCAL_ENV}" >&2
  exit 1
fi

REMOTE="${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}"

_ssh=(ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${DEPLOY_SSH_IDENTITY:-}" ]]; then
  _ssh+=(-i "${DEPLOY_SSH_IDENTITY/#\~/$HOME}")
fi

RSYNC_SHELL="$(printf '%q ' "${_ssh[@]}")"

if [[ "$ENV_ONLY" == true ]]; then
  echo "Deploying ONLY .env to ${REMOTE}:${DEPLOY_REMOTE_DIR}"
else
  echo "Deploying backend to ${REMOTE}:${DEPLOY_REMOTE_DIR}"
fi
echo "  local env → remote .env.prod: ${LOCAL_ENV}"

if [[ "$ENV_ONLY" != true ]]; then
  rsync -az --delete -e "$RSYNC_SHELL" "${REPO_ROOT}/backend/" "${REMOTE}:${DEPLOY_REMOTE_DIR}/backend/"
  rsync -az -e "$RSYNC_SHELL" "${REPO_ROOT}/docker-compose.yml" "${REMOTE}:${DEPLOY_REMOTE_DIR}/docker-compose.yml"
fi
rsync -az -e "$RSYNC_SHELL" "${LOCAL_ENV}" "${REMOTE}:${DEPLOY_REMOTE_DIR}/.env.prod"

if [[ "$ENV_ONLY" == true ]]; then
  REMOTE_TAIL="chmod 600 .env.prod && sudo docker compose --env-file .env.prod up -d --force-recreate pdf-service backend"
else
  REMOTE_TAIL="chmod 600 .env.prod && sudo docker compose --env-file .env.prod up -d --build pdf-service backend"
fi

"${_ssh[@]}" "${REMOTE}" "cd $(printf '%q' "${DEPLOY_REMOTE_DIR}") && ${REMOTE_TAIL}"
