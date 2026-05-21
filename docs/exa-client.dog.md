# Component: ExaClient

## Description

A thin typed wrapper over `fetch` for the Exa REST API. Every command sends
its request through this single component, which sets the base URL, attaches
the API key header, serializes the JSON body, parses the response, and
raises `&ExaError` on a non-2xx status.

## State

- apiKey: the Exa API key sent with every request
- baseUrl: the Exa API base URL, defaulting to https://api.exa.ai

## Events

- request_sent
- response_received
- request_failed

## Notes

- Source: `src/client.ts`
- Exposes `post`, `get`, `put`, and `delete` helpers over a generic `request` method
- Sends the API key in the `x-api-key` header
