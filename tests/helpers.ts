import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import type { Command } from "commander";

export interface FetchCall {
  url: URL;
  init: RequestInit;
  body: unknown;
}

export interface HttpsCall {
  url: URL;
  method: string;
  body: unknown;
}

/**
 * Replace `https.request` for the duration of `run`. The CLI uses node:https
 * (not fetch) for the one Exa endpoint that requires a body on a GET request.
 */
export async function withMockHttps(
  responseBody: unknown,
  status: number,
  run: (calls: HttpsCall[]) => Promise<void>,
): Promise<void> {
  const original = https.request;
  const calls: HttpsCall[] = [];

  const mock = (
    url: string | URL,
    options: { method?: string },
    callback: (res: IncomingMessage) => void,
  ) => {
    const call: HttpsCall = {
      url: new URL(String(url)),
      method: options.method ?? "GET",
      body: undefined,
    };
    calls.push(call);
    let rawBody = "";
    const request = {
      on(): typeof request {
        return request;
      },
      write(chunk: string | Buffer): boolean {
        rawBody += chunk.toString();
        return true;
      },
      end(): void {
        call.body = rawBody.length > 0 ? JSON.parse(rawBody) : undefined;
        const response = Readable.from([Buffer.from(JSON.stringify(responseBody))]) as Readable & {
          statusCode?: number;
        };
        response.statusCode = status;
        process.nextTick(() => callback(response as unknown as IncomingMessage));
      },
    };
    return request;
  };

  https.request = mock as unknown as typeof https.request;
  try {
    await run(calls);
  } finally {
    https.request = original;
  }
}

export async function withMockFetch(
  handler: (call: FetchCall, index: number) => unknown = () => ({ ok: true }),
  run: (calls: FetchCall[]) => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  const calls: FetchCall[] = [];

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const requestInit = init ?? {};
    const body = typeof requestInit.body === "string" ? JSON.parse(requestInit.body) : undefined;
    const call = { url: new URL(String(input)), init: requestInit, body };
    calls.push(call);
    const responseBody = handler(call, calls.length - 1);
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

export async function runCommand(command: Command, args: string[]): Promise<string> {
  const previousKey = process.env.EXA_API_KEY;
  process.env.EXA_API_KEY = "test-key";

  let stdout = "";

  command.exitOverride();
  command.configureOutput({
    writeOut: (text) => {
      stdout += text;
    },
    writeErr: () => {},
  });

  try {
    await command.parseAsync(["node", "test", ...args], { from: "node" });
  } finally {
    if (previousKey === undefined) {
      delete process.env.EXA_API_KEY;
    } else {
      process.env.EXA_API_KEY = previousKey;
    }
  }

  return stdout;
}

export function assertHeader(call: FetchCall, name: string, value: string): void {
  const headers = call.init.headers as Record<string, string>;
  assert.equal(headers[name], value);
}
