# Behavior: Search

## Condition

- `@User` wants to find web pages for a query and optionally extract their contents
- `@User` runs `exa search <query>` with an Exa API key available

## Description

The `@User` runs `exa search` with a query string and optional flags. The
`#CLI` parses the arguments, resolves the API key through `#ConfigResolver`,
and uses `#ExaClient` to POST to the Exa `/search` endpoint. Supported flags
cover the main request surface: `--num-results`, `--type`, `--category`,
`--additional-queries`, domain include/exclude filters, crawl and published
date filters, `--user-location`, `--compliance`, `--moderation`, content
requests (`--text`, `--highlights`, `--highlights-query`, `--summary`,
`--summary-query`), synthesized output controls (`--output-schema`,
`--system-prompt`), `--stream`, `--body-json`, and `--json`.

Comma-separated list flags are split into arrays. Content flags send a
`contents` object in the request body. `--body-json` remains available for
new or uncommon request fields without waiting for a CLI release.

## Outcome

- Human-readable list of results on stdout by default, written by `#OutputWriter`
- Raw JSON response on stdout when `--json` is passed
- Server-sent event chunks on stdout when `--stream` is passed
- Each result is a `&SearchResult` with title, URL, published date, and optional text
- On API failure an `&ExaError` is raised and reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/search.ts`
- `--type fast`, `--type deep`, and the deep-search variants trade latency against depth
