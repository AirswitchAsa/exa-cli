# Behavior: Research

## Condition

- `@User` wants an in-depth, multi-source research report for a query
- `@User` runs `exa research create`, `get`, or `list`

## Description

The `@User` manages asynchronous research tasks. `exa research create`
POSTs to `/research` and returns a task id. `exa research get <id>` polls
`/research/{id}` for status and results. `exa research list` retrieves a
paginated task history. Every subcommand resolves the API key through
`#ConfigResolver` and calls the Exa API through `#ExaClient`.

Because research tasks run asynchronously, `create` accepts `--wait` to
poll until the task completes before returning.

## Outcome

- `create` prints the new task id, or the final result when `--wait` is set
- `get` prints task status and, when finished, the structured result
- `list` prints a paginated list of prior tasks
- JSON output with `--json`; otherwise human-readable text via `#OutputWriter`
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/research.ts`
- `--wait` establishes the polling pattern reused by `!Agent`
