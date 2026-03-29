#!/usr/bin/env node
/**
 * Deploy the Worker with plain-text Worker `vars` from a dotenv file (uses
 * `wrangler deploy --var KEY:value` repeatedly — not `wrangler secret`).
 *
 * Usage:
 *   node scripts/deploy-with-worker-vars.mjs [path/to/.env]
 *
 * Default env path: repo root `.env.prod` (two levels above this directory).
 * Skips `VITE_*` keys (frontend build-time only).
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

function parseDotEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      continue;
    }
    const eq = t.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = t.slice(0, eq).trim();
    if (!key) {
      continue;
    }
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const defaultEnvPath = join(projectRoot, "..", "..", ".env.prod");
const envPath = process.argv[2] || defaultEnvPath;

if (!existsSync(envPath)) {
  console.error("Env file not found:", envPath);
  process.exit(1);
}

const raw = parseDotEnv(readFileSync(envPath, "utf8"));
const args = ["wrangler", "deploy"];

for (const [key, value] of Object.entries(raw)) {
  if (key.startsWith("VITE_")) {
    continue;
  }
  args.push("--var", `${key}:${value}`);
}

const child = spawn("npx", args, {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
