import { ExaClient } from "../client.js";
import { resolveApiKey } from "../config.js";
import { printJson, printLine } from "../output.js";

export interface CommonOptions {
  json?: boolean;
}

export type JsonObject = Record<string, unknown>;

export function clientFor(baseUrl?: string): ExaClient {
  return new ExaClient({ apiKey: resolveApiKey(), baseUrl });
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

export function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Expected "true" or "false", received "${value}".`);
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
  if (process.stdin.isTTY === true) return [];

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
    getString(value, "keyId") ??
    getString(value, fallbackId) ??
    "(no id)";
  const status = getString(value, "status");
  const name = getString(value, "name") ?? getString(value, "title");
  return [id, status, name].filter((entry) => entry !== undefined && entry.length > 0).join("  ");
}

export function printList(response: unknown): void {
  const items =
    getArray(response, "data") ?? getArray(response, "results") ?? getArray(response, "apiKeys");
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

export const DEFAULT_POLL_TIMEOUT_MS = 600_000;

export async function pollUntilTerminal<T>(
  initial: T,
  getStatus: (value: T) => string | undefined,
  getNext: () => Promise<T>,
  intervalMs: number,
  timeoutMs: number = DEFAULT_POLL_TIMEOUT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let current = initial;
  while (!isTerminalStatus(getStatus(current))) {
    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for a terminal status; ` +
          "the task may still be running on Exa's side.",
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    current = await getNext();
  }
  return current;
}

export function encodePath(value: string): string {
  return encodeURIComponent(value);
}

/**
 * Pull a human-readable text delta out of a parsed SSE event, covering the
 * envelope shapes Exa's streaming endpoints use:
 *  - OpenAI chat-completion chunks: `choices[0].delta.content` (or `.text`)
 *  - OpenAI Responses-API events: `{ type: "*.delta", delta: "..." }`
 * Returns undefined for events with no text payload (e.g. research/agent
 * progress events), so the caller can render those differently.
 */
export function extractDeltaText(event: unknown): string | undefined {
  if (event === null || typeof event !== "object") return undefined;
  const record = event as JsonObject;

  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0 && typeof choices[0] === "object") {
    const choice = choices[0] as JsonObject;
    const delta = choice.delta;
    if (delta !== null && typeof delta === "object") {
      const content = (delta as JsonObject).content;
      if (typeof content === "string") return content;
    }
    if (typeof choice.text === "string") return choice.text;
  }

  if (typeof record.type === "string" && record.type.endsWith(".delta")) {
    if (typeof record.delta === "string") return record.delta;
  }

  return undefined;
}

/**
 * Render a server-sent event stream. Rather than dumping raw bytes, this parses
 * the SSE envelope: text deltas stream out as flowing text, while structured
 * events (no text payload) print one compact JSON object per line. Non-JSON
 * `data:` payloads pass through verbatim.
 */
export async function printStream(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let wroteText = false;

  const handleEvent = (block: string): void => {
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue; // SSE comment
      if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
    }
    if (dataLines.length === 0) return;

    const data = dataLines.join("\n");
    if (data === "[DONE]") return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      process.stdout.write(`${data}\n`);
      return;
    }

    const text = extractDeltaText(parsed);
    if (text !== undefined) {
      process.stdout.write(text);
      wroteText = true;
    } else {
      process.stdout.write(`${JSON.stringify(parsed)}\n`);
    }
  };

  const drain = (): void => {
    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      handleEvent(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf("\n\n");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    drain();
  }
  buffer += decoder.decode().replace(/\r\n/g, "\n");
  drain();
  if (buffer.trim().length > 0) handleEvent(buffer);

  // Text deltas are written without trailing newlines; end the line cleanly.
  if (wroteText) process.stdout.write("\n");
}
