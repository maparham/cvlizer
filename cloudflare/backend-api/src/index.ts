/**
 * Cloudflare Worker that forwards all HTTP traffic to a single Container instance
 * running the FastAPI app from ../../backend (uvicorn on port 8000).
 *
 * Deploy from this directory with Docker running. For Apple Silicon, prefer:
 *   export DOCKER_DEFAULT_PLATFORM=linux/amd64
 * before `npm run deploy` so the image matches Cloudflare (linux/amd64).
 *
 * Backend env for the Python process:
 * - Plain text: edit `vars` in wrangler.jsonc, then `npm run deploy` (Wrangler CLI uploads them).
 * - Or `npm run deploy:vars` — same CLI with `--var` per line from repo-root `.env.prod` (skips `VITE_*`).
 * - Secrets: `npx wrangler secret put KEY` (not stored in wrangler.jsonc).
 * All string Worker vars are forwarded into the container (see `envVars`), except bindings.
 */
import { env as workerEnv } from "cloudflare:workers";
import { Container } from "@cloudflare/containers";

/** Keys that are Worker bindings, not FastAPI environment variables. */
const SKIP_ENV_KEYS = new Set<string>(["BACKEND_CONTAINER"]);

/**
 * Copy Worker string config (vars + secrets) into the container OS env for uvicorn.
 */
function envForBackendContainer(env: WorkerEnvWithBindings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(env)) {
    if (SKIP_ENV_KEYS.has(key)) {
      continue;
    }
    const value = env[key];
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

type WorkerEnvWithBindings = Record<string, unknown>;

/** Durable Object + container lifecycle for the Python API image. */
export class BackendContainer extends Container {
  defaultPort = 8000;
  /** Keep API warm briefly; tune per cost vs cold-start tradeoff. */
  sleepAfter = "10m";
  /** FastAPI needs outbound calls (OpenAI, Clerk, JWKS, etc.). */
  enableInternet = true;
  /** Pass Worker `vars` and `wrangler secret` values into the FastAPI process. */
  envVars = envForBackendContainer(workerEnv as WorkerEnvWithBindings);
}

export interface Env {
  BACKEND_CONTAINER: DurableObjectNamespace<BackendContainer>;
}

/**
 * Single named instance so one container (and one SQLite file, if used) backs all traffic.
 * Use multiple instances + getRandom only with a shared remote DB (e.g. Postgres).
 */
const SINGLETON_NAME = "primary";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    void ctx;
    try {
      const container = env.BACKEND_CONTAINER.getByName(SINGLETON_NAME);
      return await container.fetch(request);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({
          error: "backend_unavailable",
          message,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
