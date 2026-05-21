# Behavior: Chat

## Condition

- `@User` wants an OpenAI-compatible chat completion backed by Exa
- `@User` runs `exa chat <prompt>`

## Description

The `@User` runs `exa chat` with a prompt and optional chat controls. The
`#CLI` resolves the API key through `#ConfigResolver` and uses `#ExaClient`
to POST to the Exa `/chat/completions` endpoint. The command supports simple
prompt input, optional system and additional user messages, raw
`--messages-json`, model selection, text inclusion, explicit query,
structured output schema, streaming, `--body-json`, and `--json`.

## Outcome

- The assistant message is printed on stdout by default, with citations when present
- Raw JSON response is printed on stdout when `--json` is passed
- Server-sent events are streamed to stdout when `--stream` is passed
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/chat.ts`
- Mirrors Exa's OpenAI-compatible `/chat/completions` endpoint
