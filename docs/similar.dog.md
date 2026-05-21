# Behavior: Similar

## Condition

- `@User` has a URL and wants pages that resemble it
- `@User` runs `exa similar <url>`

## Description

The `@User` runs `exa similar` with a source URL. The `#CLI` resolves the
API key through `#ConfigResolver` and uses `#ExaClient` to POST to the Exa
`/findSimilar` endpoint, which returns pages related to the source URL.

## Outcome

- A list of related pages on stdout, formatted by `#OutputWriter`
- Each entry is a `&SearchResult`
- Raw JSON response on stdout when `--json` is passed
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Scaffolded; not yet implemented
- Shares result formatting with `!Search`
