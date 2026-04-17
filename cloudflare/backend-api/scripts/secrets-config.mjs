/**
 * Env keys that must be set with `wrangler secret put` / `wrangler secret bulk`
 * — never committed in wrangler.jsonc. Forwarded to the container like other Worker bindings.
 * Includes DATABASE_URL (Neon or other Postgres) so it is not passed as plain `vars` or `--var`.
 */
export const WORKER_SECRET_ENV_KEYS = new Set([
  "DATABASE_URL",
  "JWT_SECRET_KEY",
  "CLERK_SECRET_KEY",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  "IMPERSONATION_SECRET_KEY",
  "PDF_SERVICE_AUTH_TOKEN",
]);

/**
 * JWT values that FastAPI rejects when DEV_MODE is false (see backend/main.py).
 */
export const JWT_PLACEHOLDER_VALUES = new Set([
  "your-secret-key-here",
  "your-secret-key-here-change-in-production",
]);

/** Clerk placeholder that backend treats as unset (see backend/main.py, clerk_auth). */
export const CLERK_PLACEHOLDER_VALUE =
  "sk_test_your_secret_key_from_clerk_dashboard";

/**
 * Secrets required for a non-dev container: mirrors backend startup checks.
 * Uses AI_PROVIDER from the dotenv file when present; defaults to `openai` (wrangler.jsonc).
 *
 * @param {Record<string, string>} raw Parsed .env key/value map
 * @returns {string[]}
 */
export function getRequiredSecretKeys(raw) {
  const provider = (raw.AI_PROVIDER || "openai").toLowerCase().trim();
  const keys = ["DATABASE_URL", "JWT_SECRET_KEY", "CLERK_SECRET_KEY"];
  if (provider === "openrouter") {
    keys.push("OPENROUTER_API_KEY");
  } else {
    keys.push("OPENAI_API_KEY");
  }
  const usePdfService = (raw.USE_PDF_SERVICE || "false").toLowerCase().trim() === "true";
  if (usePdfService) {
    keys.push("PDF_SERVICE_AUTH_TOKEN");
  }
  return keys;
}
