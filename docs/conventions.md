# CLI conventions

Cross-cutting design rules for `exa-cli`. The `.dog.md` specs in this
directory describe individual behaviors and components; this document
records the conventions that apply across all of them.

## Command structure

Commands are noun-first. Single-resource actions are top-level commands
(`exa search`, `exa contents`, `exa answer`, `exa similar`). Resources with
a lifecycle are command groups with subcommands (`exa research create`,
`exa monitor list`, and so on). The grouping mirrors the shape of the Exa
REST API so the CLI surface is predictable from the API reference.

## Output

- Result content and JSON are written to **stdout**; diagnostics, progress,
  and errors are written to **stderr**. This keeps commands pipeable.
- Every non-streaming command accepts `--json` for the raw API response. Without it, the
  command prints a human-readable rendering.
- Commands backed by server-sent event endpoints accept `--stream` or
  `--follow` and write the event stream directly to stdout.
- All output goes through the `OutputWriter` component so the stdout/stderr
  split is enforced in one place.

## Authentication

The Exa API key is resolved by the `ConfigResolver` component: an explicit
`--api-key` flag wins, then `EXA_API_KEY` from the environment, then an
`EXA_API_KEY` entry in the current working directory's `.env` file. A missing
key is a usage error with a remediation message — it is not an API error. The
key value is never echoed back to output.

## Asynchronous commands

`research`, `agent`, and `webset` operations run asynchronously on Exa's
side. Their `create` subcommands accept `--wait` to poll until completion
before returning. `agent events` accepts `--follow` to stream events as
they arrive. The polling pattern is defined once and reused across groups.

## Exit codes

- `0` — success
- `1` — usage error, missing API key, or an Exa API failure

Errors carry a message on stderr. API failures surface the HTTP status and
response body via the `ExaError` data type.

## Distribution

The CLI ships as an npm package with a single `exa` binary, targeting
Node.js 20 or newer. A Bun single-binary build may be added later; it is
not a launch requirement.
