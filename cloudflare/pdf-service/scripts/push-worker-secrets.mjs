#!/usr/bin/env node
/**
 * Upload PDF service secrets from dotenv file using `wrangler secret bulk`.
 *
 * Usage:
 *   node scripts/push-worker-secrets.mjs [path/to/.env]
 *
 * Default: repo root `.env.prod`
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { WORKER_SECRET_ENV_KEYS } from "./secrets-config.mjs";

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
const lines = [];
for (const key of WORKER_SECRET_ENV_KEYS) {
  const value = raw[key];
  if (value === undefined || value === "") {
    console.warn(`Skipping ${key} (missing or empty in ${envPath})`);
    continue;
  }
  lines.push(`${key}=${value}`);
}

if (lines.length === 0) {
  console.error("No secret keys to upload. Check .env.prod and scripts/secrets-config.mjs.");
  process.exit(1);
}

const tmpFile = join(
  tmpdir(),
  `wrangler-secrets-${Date.now()}-${Math.random().toString(36).slice(2)}.env`,
);
writeFileSync(tmpFile, lines.join("\n") + "\n", "utf8");

const child = spawn("npx", ["wrangler", "secret", "bulk", tmpFile], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  try {
    unlinkSync(tmpFile);
  } catch {
    /* ignore */
  }
  process.exit(code ?? 1);
});
