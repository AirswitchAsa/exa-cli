# Behavior: Context

## Condition

- `@User` wants LLM-ready context for a search query
- `@User` runs `exa context <query>`

## Description

The `@User` runs `exa context` with a query and a target token count. The
`#CLI` resolves the API key through `#ConfigResolver` and uses `#ExaClient`
to POST to the Exa `/context` endpoint. The command supports a numeric
`--tokens` target, `--dynamic` token selection, `--body-json`, and `--json`.

## Outcome

- The returned context string is printed on stdout by default
- Raw JSON response is printed on stdout when `--json` is passed
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/context.ts`
- Defaults to a 4096-token target when neither `--tokens` nor `--dynamic` is passed
