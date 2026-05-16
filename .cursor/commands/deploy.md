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

- **Without pushing to Git:** The Actions workflow only ships whatever is on **`master`** in GitHub. To deploy **your local tree** (including uncommitted changes) **and your laptop’s env file**, use the same Compose flow **from repo root** — **no Docker registry is required**: the VPS builds images when Compose runs:
  - Host defaults to **`ssh.rahkar.pro`** (same hostname as **`ssh ssh.rahkar.pro`**); override via **`DEPLOY_SSH_HOST`** when needed.
  - Optional: `export DEPLOY_SSH_USER=ec2-user`, `export DEPLOY_SSH_IDENTITY=~/.ssh/key.pem`, `export DEPLOY_REMOTE_DIR=/home/ec2-user/cv_lator`
  - Optional **env source:** `export DEPLOY_ENV_FILE=<path>` (absolute path, or repo-relative from repo root — default **`./.env.prod`**)
  - `./scripts/deploy-backend-ec2.sh`
  This **rsync**s **`backend/`**, **`docker-compose.yml`**, and that **local env file → `./.env.prod` on the server**, runs **`chmod 600 .env.prod`**, then **`sudo docker compose --env-file .env.prod up -d --build pdf-service backend`** (matches [.github/workflows/deploy-backend-aws.yml](.github/workflows/deploy-backend-aws.yml) logic, plus overwriting remote env from laptop).
- **AWS: env file only (.env.prod):** To push **`DEPLOY_ENV_FILE`** / **`./.env.prod`** alone (no **`backend/`** rsync, no image **`--build`**), **`cd`** repo root → same **`DEPLOY_*`** exports as above → `./scripts/deploy-backend-ec2.sh --env-only`. On the VPS the script runs Compose with **`--force-recreate`** so **`pdf-service`**/**`backend`** pick up the updated **`env_file`**. (`OPENAI_*` / `DATABASE_URL`, etc.—not frontend.)
- **Preferred (CI):** Push to **`master`** with changes under **`backend/**`** or **`docker-compose.yml`** (or run **Actions → Deploy backend (AWS) → workflow_dispatch**). Workflow: [.github/workflows/deploy-backend-aws.yml](.github/workflows/deploy-backend-aws.yml) — SCP `backend/` + `docker-compose.yml` to `/home/ec2-user/cv_lator`, then `sudo docker compose --env-file .env.prod up -d --build pdf-service backend`. Repo secrets: `AWS_SSH_HOST`, `AWS_SSH_USER`, `AWS_SSH_PRIVATE_KEY`. **CI does not ship `.env.prod`**; Compose uses whichever file already exists there (run the laptop script first if EC2 env should mirror this machine).
- **Manual (SSH):** SCP/rsync `.env.prod` from your laptop or edit on the box, **`cd`** to the project dir on the host, then the same **`docker compose --env-file .env.prod ...`** as above — or reuse **`deploy-backend-ec2.sh`** instead.
- **Same `.env.prod`:** **Frontend**: build-time **`VITE_*`** etc. come from **this repo’s** **`.env.prod`** (see frontend section above). **Backend laptop deploy**: **`./scripts/deploy-backend-ec2.sh`** overwrites the VPS **`.env.prod`** each full run from **`DEPLOY_ENV_FILE`** / default **`./.env.prod`**; **`--env-only`** does the env push + **`--force-recreate`** without code sync. **CI backend**: remote **`.env.prod`** unchanged by the workflow unless you synced it beforehand. Never commit `.env.prod` (it is gitignored).

#### After deploy

- Confirm **Wrangler** printed the worker URL and succeeded.
- Confirm **GitHub Actions** (backend): from the repo root, with [GitHub CLI](https://cli.github.com/) installed and `gh auth login` done:
  - `gh run list --workflow=deploy-backend-aws.yml --branch master -L 5` — recent runs of **Deploy backend (AWS)**.
  - `gh run watch` — stream the latest run on the current branch until it finishes, or `gh run watch <run-id>` for a specific run from the list.
  - `gh run view <run-id> --log-failed` — inspect a failed run’s logs.
- Do **not** start local dev servers unless the user asks; production deploy is separate.
