/**
 * Cloudflare Worker that forwards all HTTP traffic to a single Container instance
 * running the FastAPI app from ../../backend (uvicorn on port 8000).
 *
 * Deploy from this directory with Docker running. For Apple Silicon, prefer:
 *   export DOCKER_DEFAULT_PLATFORM=linux/amd64
 * before `npm run deploy` so the image matches Cloudflare (linux/amd64).
 */
import { Container } from "@cloudflare/containers";

/** Durable Object + container lifecycle for the Python API image. */
export class BackendContainer extends Container {
  defaultPort = 8000;
  /** Keep API warm briefly; tune per cost vs cold-start tradeoff. */
  sleepAfter = "10m";
  /** FastAPI needs outbound calls (OpenAI, Clerk, JWKS, etc.). */
  enableInternet = true;
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
