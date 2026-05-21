# Behavior: Monitor

## Condition

- `@User` wants recurring Exa searches that run on a schedule
- `@User` runs `exa monitor create`, `get`, `list`, `update`, `delete`, `trigger`, `runs`, or `batch`

## Description

The `@User` manages monitors, which run saved Exa searches on a schedule
and can notify a webhook. Subcommands cover the full lifecycle: create,
retrieve, list, update, delete, trigger an immediate run, and inspect runs.
The `batch` subcommand sends batch actions to `/monitors/batch`.
Every subcommand resolves the API key through `#ConfigResolver` and calls
the Exa API through `#ExaClient`.

## Outcome

- Each subcommand prints its result as text, or raw JSON with `--json`, via `#OutputWriter`
- `trigger` starts a run immediately, regardless of schedule
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/monitor.ts`
- Maps to the Exa `/monitors` endpoints
