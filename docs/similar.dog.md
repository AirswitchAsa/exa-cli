# Behavior: Similar

## Condition

- `@User` has a URL and wants pages that resemble it
- `@User` runs `exa similar <url>`

## Description

The `@User` runs `exa similar` with a source URL. The `#CLI` resolves the
API key through `#ConfigResolver` and uses `#ExaClient` to POST to the Exa
`/findSimilar` endpoint, which returns pages related to the source URL.
Domain filters, crawl and published date filters, moderation, content text,
and `--body-json` are available for request shaping.

## Outcome

- A list of related pages on stdout, formatted by `#OutputWriter`
- Each entry is a `&SearchResult`
- Raw JSON response on stdout when `--json` is passed
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/similar.ts`
- Shares result formatting with `!Search`
