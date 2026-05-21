# Behavior: Agent

## Condition

- `@User` wants a multi-step research agent run with replayable events
- `@User` runs `exa agent create`, `get`, `list`, `cancel`, `delete`, or `events`

## Description

The `@User` manages asynchronous agent runs. `create` POSTs to `/agent`;
`get` retrieves a run; `list` paginates runs; `cancel` stops a queued or
running run; `delete` removes a stored run; `events` lists or replays the
events emitted during a run. Every subcommand resolves the API key through
`#ConfigResolver` and calls the Exa API through `#ExaClient`.

## Outcome

- Each subcommand prints its result as text, or raw JSON with `--json`
- `events` can stream events as they arrive when `--follow` is set
- Output is written by `#OutputWriter`
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/agent.ts`
- Reuses the polling pattern introduced by `!Research`
