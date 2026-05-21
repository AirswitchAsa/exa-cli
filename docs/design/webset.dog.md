# Behavior: Webset

## Condition

- `@User` wants a curated, enriched collection of web entities
- `@User` runs `exa webset` with one of its subcommands

## Description

The `@User` manages websets, which are curated collections built from Exa
searches with optional enrichment, import, export, webhooks, events, team
metadata, and webset-specific monitors. Subcommands cover create, get, list,
update, delete, cancel, preview, search, items, enrich, import, export,
webhook, events, monitor, and team. Every subcommand resolves the API key
through `#ConfigResolver` and calls the Exa API through `#ExaClient`.

## Outcome

- Each subcommand prints its result as text, or raw JSON with `--json`, via `#OutputWriter`
- `preview` shows how a query decomposes before a webset is created
- webhook, events, monitor, and team subcommands cover the auxiliary Websets API resources
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/webset.ts`
- The largest endpoint group, mapping to the Exa Websets endpoints
