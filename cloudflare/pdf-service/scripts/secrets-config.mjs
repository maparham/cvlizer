/**
 * Secrets for the PDF service Worker.
 * Keep auth token out of wrangler.jsonc vars.
 */
export const WORKER_SECRET_ENV_KEYS = new Set([
  "PDF_SERVICE_AUTH_TOKEN",
]);
