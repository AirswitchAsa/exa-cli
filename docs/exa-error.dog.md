# Data: ExaError

## Description

The error raised by `#ExaClient` when the Exa API returns a non-2xx
response. The `#CLI` catches it, reports it on stderr, and exits non-zero.

## Fields

- status: the HTTP status code returned by the Exa API
- body: the parsed response body, or the raw text if it was not JSON
- message: a human-readable summary that includes the status code

## Notes

- Defined as an `Error` subclass in `src/client.ts`
- Distinct from a usage error such as a missing API key, handled by `#ConfigResolver`
