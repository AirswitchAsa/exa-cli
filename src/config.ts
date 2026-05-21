import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const CONFIG_DIR_ENV = "EXA_CONFIG_DIR";

export interface ExaConfig {
  apiKey?: string;
  preferences?: Record<string, unknown>;
  [key: string]: unknown;
}

export type ApiKeySource = "environment" | "dotenv" | "user_config" | "missing";

export interface ApiKeyResolution {
  key?: string;
  source: ApiKeySource;
  path?: string;
}

function parseDotenvLine(line: string): [string, string] | undefined {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) return undefined;

  const equals = trimmed.indexOf("=");
  if (equals === -1) return undefined;

  const key = trimmed.slice(0, equals).trim();
  let value = trimmed.slice(equals + 1).trim();
  if (key.length === 0) return undefined;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function readDotenvValue(name: string): string | undefined {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return undefined;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const entry = parseDotenvLine(line);
    if (entry?.[0] === name) return entry[1];
  }

  return undefined;
}

export function configDirectory(): string {
  return process.env[CONFIG_DIR_ENV] ?? join(homedir(), ".exa");
}

export function configPath(): string {
  return join(configDirectory(), "config.json");
}

function parseConfig(raw: string, path: string): ExaConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse ${path}: ${message}`);
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${path} must contain a JSON object.`);
  }

  return parsed as ExaConfig;
}

export function readUserConfig(): ExaConfig {
  const path = configPath();
  if (!existsSync(path)) return {};
  return parseConfig(readFileSync(path, "utf8"), path);
}

export function writeUserConfig(config: ExaConfig): void {
  const directory = configDirectory();
  const path = configPath();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function setStoredApiKey(apiKey: string): void {
  const config = readUserConfig();
  writeUserConfig({ ...config, apiKey });
}

export function clearStoredApiKey(): boolean {
  const config = readUserConfig();
  if (config.apiKey === undefined) return false;

  const next: ExaConfig = { ...config };
  delete next.apiKey;

  if (next.preferences !== undefined && Object.keys(next.preferences).length === 0) {
    delete next.preferences;
  }

  if (Object.keys(next).length === 0) {
    if (existsSync(configPath())) unlinkSync(configPath());
  } else {
    writeUserConfig(next);
  }

  return true;
}

export function resolveApiKeySource(): ApiKeyResolution {
  if (process.env.EXA_API_KEY !== undefined && process.env.EXA_API_KEY.length > 0) {
    return { key: process.env.EXA_API_KEY, source: "environment" };
  }

  const dotenvPath = resolve(process.cwd(), ".env");
  const dotenvKey = readDotenvValue("EXA_API_KEY");
  if (dotenvKey !== undefined && dotenvKey.length > 0) {
    return { key: dotenvKey, source: "dotenv", path: dotenvPath };
  }

  const path = configPath();
  const storedKey = readUserConfig().apiKey;
  if (storedKey !== undefined && storedKey.length > 0) {
    return { key: storedKey, source: "user_config", path };
  }

  return { source: "missing" };
}

export function resolveApiKey(): string {
  const resolution = resolveApiKeySource();
  if (resolution.key === undefined) {
    throw new Error(
      "No Exa API key found. Run `exa api-key set`, set EXA_API_KEY, or add EXA_API_KEY to .env.",
    );
  }
  return resolution.key;
}
