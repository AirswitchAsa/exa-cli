# Behavior: Answer

## Condition

- `@User` wants a direct, sourced answer to a question
- `@User` runs `exa answer <question>`

## Description

The `@User` runs `exa answer` with a question. The `#CLI` resolves the API
key through `#ConfigResolver` and uses `#ExaClient` to POST to the Exa
`/answer` endpoint, which returns an LLM-generated answer grounded in Exa
search results, together with the citations it relied on.

## Outcome

- The answer text on stdout, with citations listed by `#OutputWriter`
- Raw JSON response on stdout when `--json` is passed
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Scaffolded; not yet implemented
- Planned flags: `--type`, `--api-key`, `--json`
