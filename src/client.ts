import type { IncomingMessage } from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

const DEFAULT_BASE_URL = "https://api.exa.ai";

type QueryScalar = boolean | number | string;
type QueryValue = QueryScalar | QueryScalar[] | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
}

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
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

export class ExaClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;

  constructor(options: ClientOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
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

  async #buildError(response: Response): Promise<ExaError> {
    return this.#errorFrom(response.status, await response.text());
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

    const response = await fetch(this.#url(path, options.query), {
      method,
      headers: this.#headers(options.headers, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.#buildError(response);
    }

    const raw = await response.text();
    if (raw.length === 0) return undefined as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }

  async requestStream(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(this.#url(path, options.query), {
      method,
      headers: this.#headers(options.headers, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.#buildError(response);
    }

    if (response.body === null) {
      throw new Error("Exa API returned an empty stream.");
    }

    return response.body;
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
        },
        resolve,
      );
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

  async #getWithBody<T>(path: string, body: unknown, options: RequestOptions): Promise<T> {
    const response = await this.#openGetWithBody(path, body, options);
    const raw = await this.#collect(response);
    const status = response.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      throw this.#errorFrom(status, raw);
    }
    if (raw.length === 0) return undefined as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }

  async streamWithBody(
    path: string,
    body: unknown,
    options: RequestOptions = {},
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.#openGetWithBody(path, body, options);
    const status = response.statusCode ?? 0;
    if (status < 200 || status >= 300) {
      throw this.#errorFrom(status, await this.#collect(response));
    }
    return Readable.toWeb(response) as ReadableStream<Uint8Array>;
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
