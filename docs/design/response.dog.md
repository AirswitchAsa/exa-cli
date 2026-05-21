# Behavior: Response

## Condition

- `@User` wants an OpenAI-compatible Exa research response
- `@User` runs `exa response create` or `exa response get`

## Description

The `@User` manages Exa Responses API calls. `exa response create` POSTs to
`/responses` with an input prompt, model, optional instructions, optional
structured output format, and optional streaming. `exa response get <id>`
retrieves `/responses/{id}` and can request a server-sent event stream.
Every subcommand resolves the API key through `#ConfigResolver` and calls
the Exa API through `#ExaClient`.

## Outcome

- `create` prints the output text, or raw JSON with `--json`
- `create --wait` polls the response until a terminal status
- `create --stream` and `get --stream` stream server-sent events to stdout
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/response.ts`
- Mirrors Exa's OpenAI-compatible `/responses` and `/responses/{id}` endpoints
