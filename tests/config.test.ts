import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveApiKey } from "../src/config.js";

test("resolveApiKey falls back to EXA_API_KEY", () => {
  process.env.EXA_API_KEY = "env-key";
  assert.equal(resolveApiKey(), "env-key");
});

test("resolveApiKey reads EXA_API_KEY from .env in the current directory", () => {
  const previousCwd = process.cwd();
  const previousKey = process.env.EXA_API_KEY;
  const dir = mkdtempSync(join(tmpdir(), "exa-cli-config-"));
  writeFileSync(join(dir, ".env"), "EXA_API_KEY='dotenv-key'\n", "utf8");
  delete process.env.EXA_API_KEY;

  try {
    process.chdir(dir);
    assert.equal(resolveApiKey(), "dotenv-key");
  } finally {
    process.chdir(previousCwd);
    rmSync(dir, { recursive: true, force: true });
    if (previousKey === undefined) {
      delete process.env.EXA_API_KEY;
    } else {
      process.env.EXA_API_KEY = previousKey;
    }
  }
});

test("resolveApiKey gives an actionable missing-key error", () => {
  const previousCwd = process.cwd();
  const previousKey = process.env.EXA_API_KEY;
  const dir = mkdtempSync(join(tmpdir(), "exa-cli-config-"));
  delete process.env.EXA_API_KEY;

  try {
    process.chdir(dir);
    assert.throws(() => resolveApiKey(), /Set EXA_API_KEY.*\.env/);
  } finally {
    process.chdir(previousCwd);
    rmSync(dir, { recursive: true, force: true });
    if (previousKey === undefined) {
      delete process.env.EXA_API_KEY;
    } else {
      process.env.EXA_API_KEY = previousKey;
    }
  }
});
