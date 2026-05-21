const DEFAULT_BASE_URL = "https://api.exa.ai";

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
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.#baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.#apiKey,
        "user-agent": "exa-cli",
      },
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

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
