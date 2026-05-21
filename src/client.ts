import type { IncomingMessage } from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

const DEFAULT_BASE_URL = "https://api.exa.ai";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 8_000;

type QueryScalar = boolean | number | string;
type QueryValue = QueryScalar | QueryScalar[] | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
}

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default 120s. */
  timeoutMs?: number;
  /** Retry attempts after the first try, on 429/5xx and network errors. Default 3. */
  maxRetries?: number;
  /** Base delay for exponential backoff. Default 500ms. */
  retryBaseDelayMs?: number;
}

export class ExaError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Exa API responded with ${status}`);
    this.name = "ExaError";
    this.status = status;
    this.body = body;
  }
}

/** The result of a single HTTP attempt: a usable value, or a retryable failure. */
type Attempt<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; raw: string; retryAfter: string | null };

export class ExaClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #retryBaseDelayMs: number;

  constructor(options: ClientOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
  }

  #url(path: string, query?: Record<string, QueryValue>): URL {
    const url = new URL(`${this.#baseUrl}${path}`);
    if (query !== undefined) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const entry of value) {
            url.searchParams.append(key, String(entry));
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url;
  }

  #headers(headers?: Record<string, string>, hasBody = false): Record<string, string> {
    return {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      "x-api-key": this.#apiKey,
      "user-agent": "exa-cli",
      ...headers,
    };
  }

  #errorFrom(status: number, raw: string): ExaError {
    let payload: unknown;
    try {
      payload = raw.length > 0 ? JSON.parse(raw) : undefined;
    } catch {
      payload = raw;
    }
    return new ExaError(status, payload);
  }

  // Parse a response body into the caller's declared type.
  //
  // Deliberate tradeoff: responses are typed by hand-written interfaces and
  // returned via `as T` with no runtime schema validation (no zod). For a CLI
  // this is the right call — the consumer is a human reading rendered output or
  // piping `--json` downstream, not typed application code, so a schema
  // mismatch surfaces as visibly wrong output rather than silent corruption.
  // It also keeps the dependency surface at a single runtime dependency. The
  // cost — drift between these interfaces and Exa's API — is accepted and
  // contained to the typed layer.
  #parse<T>(raw: string): T {
    if (raw.length === 0) return undefined as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }

  #shouldRetry(status: number): boolean {
    return status === 429 || status >= 500;
  }

  #sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Backoff delay for `attempt` (0-indexed). Honors a `Retry-After` header
  // (seconds or HTTP date) when present, else exponential backoff with jitter.
  #retryDelayMs(attempt: number, retryAfter: string | null): number {
    if (retryAfter !== null) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
      const at = Date.parse(retryAfter);
      if (!Number.isNaN(at)) return Math.max(0, at - Date.now());
    }
    const exponential = Math.min(this.#retryBaseDelayMs * 2 ** attempt, MAX_RETRY_DELAY_MS);
    return exponential + Math.random() * (this.#retryBaseDelayMs / 2);
  }

  #networkError(error: unknown): Error {
    if (error instanceof ExaError) return error;
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        /timed out/i.test(error.message));
    if (isTimeout) {
      return new Error(`Request to Exa timed out after ${this.#timeoutMs}ms.`);
    }
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Could not reach Exa: ${message}`);
  }

  // Run one HTTP attempt repeatedly: retry on 429/5xx and on network errors
  // (including timeouts) up to `#maxRetries`, with backoff between tries.
  async #withRetry<T>(run: () => Promise<Attempt<T>>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.#maxRetries; attempt += 1) {
      let outcome: Attempt<T>;
      try {
        outcome = await run();
      } catch (error) {
        lastError = error;
        if (attempt < this.#maxRetries) {
          await this.#sleep(this.#retryDelayMs(attempt, null));
          continue;
        }
        throw this.#networkError(error);
      }
      if (outcome.ok) return outcome.value;
      if (this.#shouldRetry(outcome.status) && attempt < this.#maxRetries) {
        await this.#sleep(this.#retryDelayMs(attempt, outcome.retryAfter));
        continue;
      }
      throw this.#errorFrom(outcome.status, outcome.raw);
    }
    // Unreachable: the loop returns or throws on the final attempt.
    throw this.#networkError(lastError);
  }

  // One fetch attempt under an abort timeout, with the body fully read so the
  // whole exchange is bounded by `#timeoutMs`.
  async #attemptJson(
    url: URL,
    init: RequestInit,
  ): Promise<{ status: number; raw: string; retryAfter: string | null }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const raw = await response.text();
      return { status: response.status, raw, retryAfter: response.headers.get("retry-after") };
    } finally {
      clearTimeout(timer);
    }
  }

  // One fetch attempt for a streaming endpoint. The timeout covers connecting
  // and receiving headers; the body stream itself is left untimed.
  async #attemptStream(url: URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    // The Fetch standard forbids a body on GET requests; Exa's
    // `GET /responses/{id}` requires one, so that case takes the node:https path.
    if (method === "GET" && body !== undefined) {
      return this.#getWithBody<T>(path, body, options);
    }

    const url = this.#url(path, options.query);
    const init: RequestInit = {
      method,
      headers: this.#headers(options.headers, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    return this.#withRetry<T>(async () => {
      const { status, raw, retryAfter } = await this.#attemptJson(url, init);
      if (status >= 200 && status < 300) {
        return { ok: true, value: this.#parse<T>(raw) };
      }
      return { ok: false, status, raw, retryAfter };
    });
  }

  async requestStream(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ReadableStream<Uint8Array>> {
    const url = this.#url(path, options.query);
    const init: RequestInit = {
      method,
      headers: this.#headers(options.headers, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    };

    return this.#withRetry<ReadableStream<Uint8Array>>(async () => {
      const response = await this.#attemptStream(url, init);
      if (response.ok) {
        if (response.body === null) {
          throw new Error("Exa API returned an empty stream.");
        }
        return { ok: true, value: response.body };
      }
      return {
        ok: false,
        status: response.status,
        raw: await response.text(),
        retryAfter: response.headers.get("retry-after"),
      };
    });
  }

  stream(path: string, options: RequestOptions = {}): Promise<ReadableStream<Uint8Array>> {
    return this.requestStream("GET", path, undefined, options);
  }

  // Issue a GET request that carries a JSON body. Used only for Exa endpoints
  // that require a request body on GET, which the Fetch API cannot express.
  #openGetWithBody(path: string, body: unknown, options: RequestOptions): Promise<IncomingMessage> {
    const url = this.#url(path, options.query);
    const payload = Buffer.from(JSON.stringify(body));
    return new Promise<IncomingMessage>((resolve, reject) => {
      const request = https.request(
        url,
        {
          method: "GET",
          headers: {
            ...this.#headers(options.headers, true),
            "content-length": String(payload.length),
          },
          timeout: this.#timeoutMs,
        },
        resolve,
      );
      request.on("timeout", () => {
        request.destroy(new Error(`Request to Exa timed out after ${this.#timeoutMs}ms.`));
      });
      request.on("error", reject);
      request.write(payload);
      request.end();
    });
  }

  #collect(stream: IncomingMessage): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      stream.on("error", reject);
    });
  }

  #retryAfterOf(headers: IncomingMessage["headers"]): string | null {
    const value = headers["retry-after"];
    return typeof value === "string" ? value : null;
  }

  async #getWithBody<T>(path: string, body: unknown, options: RequestOptions): Promise<T> {
    return this.#withRetry<T>(async () => {
      const response = await this.#openGetWithBody(path, body, options);
      const raw = await this.#collect(response);
      const status = response.statusCode ?? 0;
      if (status >= 200 && status < 300) {
        return { ok: true, value: this.#parse<T>(raw) };
      }
      return { ok: false, status, raw, retryAfter: this.#retryAfterOf(response.headers) };
    });
  }

  async streamWithBody(
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<ReadableStream<Uint8Array>> {
    return this.#withRetry<ReadableStream<Uint8Array>>(async () => {
      const response = await this.#openGetWithBody(path, body, options);
      const status = response.statusCode ?? 0;
      if (status >= 200 && status < 300) {
        return { ok: true, value: Readable.toWeb(response) as ReadableStream<Uint8Array> };
      }
      return {
        ok: false,
        status,
        raw: await this.#collect(response),
        retryAfter: this.#retryAfterOf(response.headers),
      };
    });
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  postStream(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    return this.requestStream("POST", path, body, options);
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}
