# Behavior: Keys

## Condition

- `@User` wants to manage the Exa API keys belonging to their team
- `@User` runs `exa key create`, `get`, `list`, `update`, `delete`, or `usage`

## Description

The `@User` manages team API keys. Subcommands create a key, retrieve a
key, list keys, update a key's name and rate limit, delete a key, and
report usage analytics. Every subcommand resolves the calling API key
through `#ConfigResolver` and calls the Exa API through `#ExaClient`.

## Outcome

- Each subcommand prints its result as text, or raw JSON with `--json`, via `#OutputWriter`
- `usage` reports request counts and billing data for a key
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/key.ts`
- Maps to the Exa Team Management API key endpoints
