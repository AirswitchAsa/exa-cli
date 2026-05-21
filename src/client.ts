const DEFAULT_BASE_URL = "https://api.exa.ai";

type QueryValue = boolean | number | string | undefined | null;

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
        if (value !== undefined && value !== null) {
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

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await fetch(this.#url(path, options.query), {
      method,
      headers: this.#headers(options.headers, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const raw = await response.text();
    let payload: unknown;
    try {
      payload = raw.length > 0 ? JSON.parse(raw) : undefined;
    } catch {
      payload = raw;
    }

    if (!response.ok) {
      throw new ExaError(response.status, payload);
    }
    return payload as T;
  }

  async stream(path: string, options: RequestOptions = {}): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(this.#url(path, options.query), {
      method: "GET",
      headers: this.#headers(options.headers),
    });

    if (!response.ok) {
      const raw = await response.text();
      let payload: unknown;
      try {
        payload = raw.length > 0 ? JSON.parse(raw) : undefined;
      } catch {
        payload = raw;
      }
      throw new ExaError(response.status, payload);
    }

    if (response.body === null) {
      throw new Error("Exa API returned an empty stream.");
    }

    return response.body;
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
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
