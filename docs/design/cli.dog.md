# Component: CLI

## Description

The command-line entry point. Built on the `commander` library, it defines
the `exa-cli` program, registers every command group, parses arguments, and
dispatches to the matching behavior. It also owns top-level error handling:
it catches `&ExaError` and other errors, reports them through `#OutputWriter`,
and sets a non-zero exit code.

## State

- program: the root `commander` Command named `exa-cli`
- commands: the registered command groups — search, contents, answer, chat, context, response, agent, monitor, webset, team, api-key, config

## Events

- command_dispatched
- error_caught

## Notes

- Source: `src/cli.ts`
- Each command group lives in its own module under `src/commands/`
- Every registered command group is implemented by a hand-written TypeScript module
