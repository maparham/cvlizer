/**
 * Env keys that must be set with `wrangler secret put` / `wrangler secret bulk`
 * — never committed in wrangler.jsonc. Forwarded to the container like other Worker bindings.
 */
export const WORKER_SECRET_ENV_KEYS = new Set([
  "JWT_SECRET_KEY",
  "CLERK_SECRET_KEY",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "IMPERSONATION_SECRET_KEY",
]);
