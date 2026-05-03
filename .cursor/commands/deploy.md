### Deploy (frontend + backend)

Brief goal: ship **Cloudflare** (app UI) and **AWS** (API + PDF worker) for this repo.

#### Frontend (Cloudflare / Wrangler)

- From repo root: `cd frontend && npm run deploy` (runs `tsc`, `vite build`, then `wrangler deploy` using `dist/wrangler.json` / `wrangler.jsonc`).
- Requires local **Wrangler auth** (`wrangler login` or `CLOUDFLARE_API_TOKEN` as per your setup).
- If the build fails, fix TypeScript/lint errors first, then retry.

#### Backend (AWS EC2 + Docker Compose)

- **Preferred (CI):** Push to **`master`** with changes under **`backend/**`** or **`docker-compose.yml`** (or run **Actions → Deploy backend (AWS) → workflow_dispatch**). Workflow: `.github/workflows/deploy-backend-aws.yml` — SCP `backend/` + `docker-compose.yml` to `/home/ec2-user/cv_lator`, then `sudo docker compose --env-file .env.prod up -d --build pdf-service backend`. Repo secrets: `AWS_SSH_HOST`, `AWS_SSH_USER`, `AWS_SSH_PRIVATE_KEY`. Server must already have `.env.prod` and Docker.
- **Manual (SSH):** SSH to the host, `cd /home/ec2-user/cv_lator` (or your path), ensure `.env.prod` exists, then the same `docker compose` command as above.

#### After deploy

- Confirm **Wrangler** printed the worker URL and succeeded.
- Confirm **GitHub Actions** (backend): from the repo root, with [GitHub CLI](https://cli.github.com/) installed and `gh auth login` done:
  - `gh run list --workflow=deploy-backend-aws.yml --branch master -L 5` — recent runs of **Deploy backend (AWS)**.
  - `gh run watch` — stream the latest run on the current branch until it finishes, or `gh run watch <run-id>` for a specific run from the list.
  - `gh run view <run-id> --log-failed` — inspect a failed run’s logs.
- Do **not** start local dev servers unless the user asks; production deploy is separate.
