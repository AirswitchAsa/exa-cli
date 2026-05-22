// Shared helpers for the live integration suite.
//
// These tests spawn the built `dist/cli.js` binary and call the real Exa API.
// They are opt-in: run them with `npm run test:integration`. Every test is
// skipped automatically when no Exa API key can be resolved, so the suite is
// safe to run anywhere — it simply does nothing without a key.

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliPath = join(root, "dist", "cli.js");

function resolveApiKey(): string | undefined {
  const fromEnv = process.env.EXA_API_KEY?.trim();
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv;

  const envFile = join(root, ".env");
  if (!existsSync(envFile)) return undefined;
  const match = readFileSync(envFile, "utf8").match(/^\s*EXA_API_KEY\s*=\s*(.+?)\s*$/m);
  return match?.[1]?.replace(/^["']|["']$/g, "");
}

/** The resolved Exa API key, or undefined when none is available. */
export const apiKey = resolveApiKey();

/**
 * `skip` value for `node:test`. A string reason when no key is configured,
 * `false` otherwise — pass it as `test(name, { skip }, fn)`.
 */
export const skip: string | false = apiKey
  ? false
  : "no Exa API key (set EXA_API_KEY or a .env file) — skipping live tests";

export interface ExaRun {
  stdout: string;
  stderr: string;
  code: number;
}

async function runOnce(args: string[]): Promise<ExaRun> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, ...args], {
      cwd: root,
      env: { ...process.env, EXA_API_KEY: apiKey },
      maxBuffer: 32 * 1024 * 1024,
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      code: typeof failure.code === "number" ? failure.code : 1,
    };
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run the built `exa` CLI with the given arguments. Never throws. Retries a few
 * times when Exa returns HTTP 429, since the suite can brush the rate limit.
 */
export async function exa(args: string[]): Promise<ExaRun> {
  if (!existsSync(cliPath)) {
    throw new Error(`Build the CLI first: ${cliPath} is missing (run \`npm run build\`).`);
  }
  let run = await runOnce(args);
  for (
    let attempt = 0;
    attempt < 4 && run.code !== 0 && /\b429\b|rate limit/i.test(run.stderr);
    attempt++
  ) {
    await sleep(3000);
    run = await runOnce(args);
  }
  return run;
}

/** Run the CLI with `--json` and return the parsed response. Throws on failure. */
export async function exaJson<T = unknown>(args: string[]): Promise<T> {
  const run = await exa([...args, "--json"]);
  if (run.code !== 0) {
    throw new Error(`\`exa ${args.join(" ")}\` exited ${run.code}: ${run.stderr.trim()}`);
  }
  try {
    return JSON.parse(run.stdout) as T;
  } catch {
    throw new Error(`\`exa ${args.join(" ")}\` did not print JSON: ${run.stdout.slice(0, 200)}`);
  }
}

/** A generous per-test timeout — live calls to answer/agent endpoints are slow. */
export const TEST_TIMEOUT = 180_000;
