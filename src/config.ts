import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

export function resolveApiKey(): string {
  const key = process.env.EXA_API_KEY ?? readDotenvValue("EXA_API_KEY");
  if (key === undefined || key.length === 0) {
    throw new Error("No Exa API key found. Set EXA_API_KEY or add EXA_API_KEY to .env.");
  }
  return key;
}
