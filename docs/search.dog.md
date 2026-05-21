# Behavior: Search

## Condition

- `@User` wants to find web pages for a query and optionally extract their contents
- `@User` runs `exa search <query>` with an Exa API key available

## Description

The `@User` runs `exa search` with a query string and optional flags. The
`#CLI` parses the arguments, resolves the API key through `#ConfigResolver`,
and uses `#ExaClient` to POST to the Exa `/search` endpoint. Supported flags:
`--num-results`, `--type` (auto, fast, deep, instant), `--category`,
`--include-domains`, `--exclude-domains`, `--text`, `--api-key`, and `--json`.

Comma-separated domain lists are split into arrays. `--text` requests full
page text by sending a `contents` object in the request body.

## Outcome

- Human-readable list of results on stdout by default, written by `#OutputWriter`
- Raw JSON response on stdout when `--json` is passed
- Each result is a `&SearchResult` with title, URL, published date, and optional text
- On API failure an `&ExaError` is raised and reported on stderr with exit code 1

## Notes

- The only command group implemented end to end in the current scaffold
- `--type fast` and `--type deep` trade latency against depth
