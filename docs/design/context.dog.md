# Behavior: Context

## Condition

- `@User` wants token-efficient code context (Exa Code) for a query
- `@User` runs `exa-cli context <query>`

## Description

The `@User` runs `exa-cli context` with a query describing the code or library
they need and an optional target token count. The `#CLI` resolves the API key
through `#ConfigResolver` and uses `#ExaClient` to POST to the Exa `/context`
endpoint (Exa Code), which searches GitHub repos, docs pages, and Stack
Overflow for relevant code snippets. The command supports a numeric `--tokens`
target, `--body-json`, and `--json`.

## Outcome

- The returned code context string is printed on stdout by default
- Raw JSON response is printed on stdout when `--json` is passed
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/context.ts`
- Sends `tokensNum: "dynamic"` when `--tokens` is omitted, letting Exa size the response
