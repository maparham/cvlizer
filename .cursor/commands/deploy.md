### Deploy (frontend + backend)

Brief goal: ship **Cloudflare** (app UI) and **AWS** (API + PDF worker) for this repo.

#### Frontend (Cloudflare / Wrangler)

- **Environment:** Use the same repo-root **`.env.prod`** as AWS (single source of truth for `VITE_*`, Clerk keys, `PUBLIC_FRONTEND_BASE_URL`, etc.). **`vite.config.ts`** loads **`.env.prod`** into `process.env` for **`vite build`** (production mode) and sets **`envDir`** to the **repo root** so **`frontend/.env`** (localhost) is not merged into the Worker bundle.
- **Override env file:** From `frontend/`, optional **`ENV_FILE`** (absolute path or relative to `frontend/`): e.g. `ENV_FILE=/path/to/.env.staging npm run deploy`.
- From repo root: `cd frontend && npm run deploy` (runs `tsc`, `vite build`, then `wrangler deploy` using `dist/wrangler.json` / `wrangler.jsonc`).
- Ensure **`.env.prod`** defines **`VITE_API_BASE_URL`** to your public API origin when the SPA is not served behind nginx `/api` (see comments in `.env.prod`).
- Requires local **Wrangler auth** (`wrangler login` or `CLOUDFLARE_API_TOKEN` as per your setup).
- If the build fails, fix TypeScript/lint errors first, then retry.

#### Backend (AWS EC2 + Docker Compose)

- **Without pushing to Git:** The Actions workflow only ships whatever is on **`master`** in GitHub. To deploy **your local tree** (including uncommitted changes), run the same flow from your laptop — **no Docker registry is required**: the VPS builds images when Compose runs. From repo root:
  - `export DEPLOY_SSH_HOST=<instance-ip-or-dns>`
  - Optional: `export DEPLOY_SSH_USER=ec2-user`, `export DEPLOY_SSH_IDENTITY=~/.ssh/key.pem`, `export DEPLOY_REMOTE_DIR=/home/ec2-user/cv_lator`
  - `./scripts/deploy-backend-ec2.sh`
  This **rsync**s `backend/` and `docker-compose.yml`, then runs `sudo docker compose --env-file .env.prod up -d --build pdf-service backend` (matches [.github/workflows/deploy-backend-aws.yml](.github/workflows/deploy-backend-aws.yml)).
- **Preferred (CI):** Push to **`master`** with changes under **`backend/**`** or **`docker-compose.yml`** (or run **Actions → Deploy backend (AWS) → workflow_dispatch**). Workflow: `.github/workflows/deploy-backend-aws.yml` — SCP `backend/` + `docker-compose.yml` to `/home/ec2-user/cv_lator`, then `sudo docker compose --env-file .env.prod up -d --build pdf-service backend`. Repo secrets: `AWS_SSH_HOST`, `AWS_SSH_USER`, `AWS_SSH_PRIVATE_KEY`. Server must already have `.env.prod` and Docker.
- **Manual (SSH):** SSH to the host, `cd /home/ec2-user/cv_lator` (or your path), ensure `.env.prod` exists, then the same `docker compose` command as above.
- **Same `.env.prod`:** VPS/runtime secrets (`DATABASE_URL`, `OPENAI_*`, etc.) live only on the server copy of `.env.prod`; Cloudflare builds only need the **`VITE_*`** (and similar public) entries from your **local** `.env.prod` when you run `npm run deploy`. Never commit `.env.prod` (it is gitignored).

#### After deploy

- Confirm **Wrangler** printed the worker URL and succeeded.
- Confirm **GitHub Actions** (backend): from the repo root, with [GitHub CLI](https://cli.github.com/) installed and `gh auth login` done:
  - `gh run list --workflow=deploy-backend-aws.yml --branch master -L 5` — recent runs of **Deploy backend (AWS)**.
  - `gh run watch` — stream the latest run on the current branch until it finishes, or `gh run watch <run-id>` for a specific run from the list.
  - `gh run view <run-id> --log-failed` — inspect a failed run’s logs.
- Do **not** start local dev servers unless the user asks; production deploy is separate.
