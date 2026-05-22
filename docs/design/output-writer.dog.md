# Component: OutputWriter

## Description

Centralizes how the CLI writes to the terminal. Result content and JSON go
to stdout so they can be piped; diagnostics and errors go to stderr. This
separation lets the `@User` compose `exa-cli` commands in shell pipelines.

## State

- stdout: the stream for result content and JSON
- stderr: the stream for diagnostics and errors

## Events

- json_written
- text_written
- error_written

## Notes

- Source: `src/output.ts`; streaming render in `src/commands/_shared.ts`
- `printJson` pretty-prints with two-space indentation
- Streamed server-sent events are parsed, not dumped raw: text deltas render as flowing text, structured events as one JSON object per line
- Keeping content on stdout and noise on stderr is a deliberate design rule
