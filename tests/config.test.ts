import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  clearStoredApiKey,
  configPath,
  readUserConfig,
  resolveApiKey,
  resolveApiKeySource,
  setStoredApiKey,
  writeUserConfig,
} from "../src/config.js";

function withIsolatedConfig(run: (dir: string) => void): void {
  const previousConfigDir = process.env.EXA_CONFIG_DIR;
  const previousKey = process.env.EXA_API_KEY;
  const dir = mkdtempSync(join(tmpdir(), "exa-cli-user-config-"));
  process.env.EXA_CONFIG_DIR = dir;

  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (previousConfigDir === undefined) {
      delete process.env.EXA_CONFIG_DIR;
    } else {
      process.env.EXA_CONFIG_DIR = previousConfigDir;
    }
    if (previousKey === undefined) {
      delete process.env.EXA_API_KEY;
    } else {
      process.env.EXA_API_KEY = previousKey;
    }
  }
}

test("resolveApiKey falls back to EXA_API_KEY", () => {
  withIsolatedConfig(() => {
    process.env.EXA_API_KEY = "env-key";
    assert.equal(resolveApiKey(), "env-key");
  });
});

test("resolveApiKey reads EXA_API_KEY from .env in the current directory", () => {
  const previousCwd = process.cwd();
  const previousKey = process.env.EXA_API_KEY;
  const dir = mkdtempSync(join(tmpdir(), "exa-cli-config-"));
  writeFileSync(join(dir, ".env"), "EXA_API_KEY='dotenv-key'\n", "utf8");
  delete process.env.EXA_API_KEY;

  withIsolatedConfig(() => {
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
});

test("resolveApiKey reads stored user config after env and .env", () => {
  const previousCwd = process.cwd();
  delete process.env.EXA_API_KEY;
  const dir = mkdtempSync(join(tmpdir(), "exa-cli-config-"));

  withIsolatedConfig(() => {
    try {
      process.chdir(dir);
      setStoredApiKey("stored-key");
      assert.equal(resolveApiKey(), "stored-key");
      assert.deepEqual(resolveApiKeySource(), {
        key: "stored-key",
        source: "user_config",
        path: configPath(),
      });
      assert.equal(statSync(configPath()).mode & 0o777, 0o600);
    } finally {
      process.chdir(previousCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test("stored config preserves preferences and can clear only the API key", () => {
  withIsolatedConfig(() => {
    writeUserConfig({ apiKey: "stored-key", preferences: { output: "json" } });
    assert.equal(clearStoredApiKey(), true);
    assert.deepEqual(readUserConfig(), { preferences: { output: "json" } });
    assert.equal(clearStoredApiKey(), false);
  });
});

test("stored config file is removed when clearing the only stored field", () => {
  withIsolatedConfig(() => {
    setStoredApiKey("stored-key");
    assert.equal(clearStoredApiKey(), true);
    assert.equal(existsSync(configPath()), false);
  });
});

test("resolveApiKey gives an actionable missing-key error", () => {
  const previousCwd = process.cwd();
  const previousKey = process.env.EXA_API_KEY;
  const dir = mkdtempSync(join(tmpdir(), "exa-cli-config-"));
  delete process.env.EXA_API_KEY;

  withIsolatedConfig(() => {
    try {
      process.chdir(dir);
      assert.throws(() => resolveApiKey(), /exa-cli api-key set.*EXA_API_KEY.*\.env/);
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
});
