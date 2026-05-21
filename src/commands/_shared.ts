import { ExaClient } from "../client.js";
import { resolveApiKey } from "../config.js";
import { printJson, printLine } from "../output.js";

export interface CommonOptions {
  apiKey?: string;
  json?: boolean;
}

export type JsonObject = Record<string, unknown>;

export function clientFor(options: CommonOptions, baseUrl?: string): ExaClient {
  return new ExaClient({ apiKey: resolveApiKey(options.apiKey), baseUrl });
}

export function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected an integer, received "${value}".`);
  }
  return parsed;
}

export function parseNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, received "${value}".`);
  }
  return parsed;
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON for ${label}: ${message}`);
  }
}

export function parseJsonObject(value: string, label: string): JsonObject {
  const parsed = parseJson(value, label);
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as JsonObject;
}

export function addIfDefined(body: JsonObject, key: string, value: unknown): void {
  if (value !== undefined) {
    body[key] = value;
  }
}

export function mergeBodyJson(body: JsonObject, bodyJson?: string): JsonObject {
  if (bodyJson === undefined) return body;
  return { ...body, ...parseJsonObject(bodyJson, "--body-json") };
}

export async function readStdinLines(): Promise<string[]> {
  if (process.stdin.isTTY) return [];

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks)
    .toString("utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function compact(value: unknown, maxLength = 140): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") {
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const json = JSON.stringify(value);
  return json.length > maxLength ? `${json.slice(0, maxLength - 3)}...` : json;
}

export function getString(value: unknown, key: string): string | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const entry = (value as JsonObject)[key];
  return typeof entry === "string" ? entry : undefined;
}

export function getArray(value: unknown, key = "data"): unknown[] | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const entry = (value as JsonObject)[key];
  return Array.isArray(entry) ? entry : undefined;
}

export function formatIdStatus(value: unknown, fallbackId = "id"): string {
  const id =
    getString(value, "id") ??
    getString(value, "researchId") ??
    getString(value, "keyId") ??
    getString(value, fallbackId) ??
    "(no id)";
  const status = getString(value, "status");
  const name = getString(value, "name") ?? getString(value, "title");
  return [id, status, name].filter((entry) => entry !== undefined && entry.length > 0).join("  ");
}

export function printList(response: unknown): void {
  const items = getArray(response, "data") ?? getArray(response, "results");
  if (items === undefined) {
    printJson(response);
    return;
  }

  items.forEach((item, index) => {
    printLine(`${index + 1}. ${formatIdStatus(item)}`);
  });

  const nextCursor = getString(response, "nextCursor");
  if (nextCursor !== undefined) {
    printLine();
    printLine(`next cursor: ${nextCursor}`);
  }
}

export function printObject(response: unknown): void {
  if (response === undefined) {
    printLine("ok");
    return;
  }
  if (response === null || typeof response !== "object") {
    printLine(compact(response, 400));
    return;
  }

  const fields = response as JsonObject;
  const keys = [
    "id",
    "researchId",
    "object",
    "status",
    "name",
    "title",
    "createdAt",
    "updatedAt",
    "completedAt",
    "finishedAt",
  ];

  for (const key of keys) {
    if (fields[key] !== undefined) {
      printLine(`${key}: ${compact(fields[key])}`);
    }
  }

  if (fields.output !== undefined) {
    printLine();
    printLine(compact(fields.output, 1200));
  } else if (fields.answer !== undefined) {
    printLine();
    printLine(compact(fields.answer, 1200));
  } else if (fields.data === undefined && fields.results === undefined) {
    const remaining = Object.keys(fields).filter((key) => !keys.includes(key));
    for (const key of remaining.slice(0, 8)) {
      printLine(`${key}: ${compact(fields[key])}`);
    }
  }
}

export function printMaybeJson(response: unknown, json: boolean | undefined, list = false): void {
  if (json === true) {
    printJson(response);
  } else if (list) {
    printList(response);
  } else {
    printObject(response);
  }
}

export function isTerminalStatus(status: string | undefined): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "canceled" ||
    status === "cancelled" ||
    status === "idle"
  );
}

export async function pollUntilTerminal<T>(
  initial: T,
  getStatus: (value: T) => string | undefined,
  getNext: () => Promise<T>,
  intervalMs: number,
): Promise<T> {
  let current = initial;
  while (!isTerminalStatus(getStatus(current))) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    current = await getNext();
  }
  return current;
}

export function encodePath(value: string): string {
  return encodeURIComponent(value);
}

export async function printStream(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    process.stdout.write(decoder.decode(value, { stream: true }));
  }
  process.stdout.write(decoder.decode());
}
