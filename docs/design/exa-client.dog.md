# Component: ExaClient

## Description

A thin typed wrapper over `fetch` for the Exa REST API. Every command sends
its request through this single component, which sets the base URL, attaches
the API key header, serializes the JSON body, appends scalar and repeated
query parameters, parses JSON responses, and streams server-sent event bodies
when requested. Each request is bounded by a timeout and retried with
exponential backoff on rate-limit (429) and server (5xx) responses and on
network errors; a non-2xx status that is not retried raises `&ExaError`.

## State

- apiKey: the Exa API key sent with every request
- baseUrl: the Exa API base URL, defaulting to https://api.exa.ai
- timeoutMs: the per-request timeout, defaulting to 120000
- maxRetries: retry attempts after the first try, defaulting to 3

## Events

- request_sent
- response_received
- request_retried
- request_failed

## Notes

- Source: `src/client.ts`
- Exposes `post`, `get`, `patch`, `put`, `delete`, `stream`, and `postStream` helpers over generic request methods
- Sends the API key in the `x-api-key` header
- Retries honor a `Retry-After` header when present, otherwise exponential backoff with jitter
- Responses are returned as hand-typed interfaces via `as T`, without runtime schema validation — a deliberate tradeoff for a CLI
