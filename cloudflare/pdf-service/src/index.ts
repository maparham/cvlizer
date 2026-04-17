/**
 * Cloudflare Worker that forwards all traffic to a dedicated PDF container.
 * The container runs FastAPI at port 8001 (src.api.pdf_service_app:app).
 */
import { env as workerEnv } from "cloudflare:workers";
import { Container } from "@cloudflare/containers";

const SKIP_ENV_KEYS = new Set<string>(["PDF_SERVICE_CONTAINER"]);

type WorkerEnvWithBindings = Record<string, unknown>;

function envForPdfContainer(env: WorkerEnvWithBindings): Record<string, string> {
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

export class PDFServiceContainer extends Container {
  defaultPort = 8001;
  sleepAfter = "2m";
  enableInternet = true;
  envVars = envForPdfContainer(workerEnv as WorkerEnvWithBindings);
}

export interface Env {
  PDF_SERVICE_CONTAINER: DurableObjectNamespace<PDFServiceContainer>;
}

const SINGLETON_NAME = "primary";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    void ctx;
    try {
      const container = env.PDF_SERVICE_CONTAINER.getByName(SINGLETON_NAME);
      return await container.fetch(request);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({
          error: "pdf_service_unavailable",
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
