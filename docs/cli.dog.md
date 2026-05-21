# Component: CLI

## Description

The command-line entry point. Built on the `commander` library, it defines
the `exa` program, registers every command group, parses arguments, and
dispatches to the matching behavior. It also owns top-level error handling:
it catches `&ExaError` and other errors, reports them through `#OutputWriter`,
and sets a non-zero exit code.

## State

- program: the root `commander` Command named `exa`
- commands: the registered command groups — search, contents, answer, similar, chat, context, response, research, agent, monitor, webset, key

## Events

- command_dispatched
- error_caught

## Notes

- Source: `src/cli.ts`
- Each command group lives in its own module under `src/commands/`
- Every registered command group is implemented by a hand-written TypeScript module
