# Behavior: Contents

## Condition

- `@User` has one or more URLs and wants their clean, parsed contents
- `@User` runs `exa contents <url...>`

## Description

The `@User` runs `exa contents` with one or more URLs. The `#CLI` resolves
the API key through `#ConfigResolver` and uses `#ExaClient` to POST to the
Exa `/contents` endpoint, which returns parsed page text, summaries, and
metadata. URLs may also be supplied on stdin so the command composes with
shell pipelines.

## Outcome

- Clean page content on stdout, as text by default or JSON with `--json`
- Content goes to stdout and diagnostics to stderr, written by `#OutputWriter`
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Scaffolded; not yet implemented
- Planned flags: `--max-characters`, `--livecrawl`, `--api-key`, `--json`
