# Component: ExaClient

## Description

A thin typed wrapper over `fetch` for the Exa REST API. Every command sends
its request through this single component, which sets the base URL, attaches
the API key header, serializes the JSON body, appends scalar and repeated
query parameters, parses JSON responses, streams server-sent event bodies
when requested, and raises `&ExaError` on a non-2xx status.

## State

- apiKey: the Exa API key sent with every request
- baseUrl: the Exa API base URL, defaulting to https://api.exa.ai

## Events

- request_sent
- response_received
- request_failed

## Notes

- Source: `src/client.ts`
- Exposes `post`, `get`, `patch`, `put`, `delete`, `stream`, and `postStream` helpers over generic request methods
- Sends the API key in the `x-api-key` header
