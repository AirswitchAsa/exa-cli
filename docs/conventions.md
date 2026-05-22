# CLI conventions

Cross-cutting design rules for `exa-cli`. The `.dog.md` specs in
[`design/`](design/) describe individual behaviors and components; this
document records the conventions that apply across all of them.

## Command structure

Commands are noun-first. Single-resource actions are top-level commands
(`exa-cli search`, `exa-cli contents`, `exa-cli answer`). Resources with a
lifecycle are command groups with subcommands (`exa-cli agent create`,
`exa-cli monitor list`, and so on). The grouping mirrors the shape of the Exa
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

The Exa API key is resolved by the `ConfigResolver` component from
`EXA_API_KEY` in the environment, then an `EXA_API_KEY` entry in the current
working directory's `.env` file, then the stored user config key at
`~/.exa/config.json`. The CLI intentionally does not expose an API-key command
flag, avoiding shell history and process-list leaks. `exa-cli api-key set` stores
a reusable key by reading from stdin or a hidden interactive prompt. A missing
key is a usage error with a remediation message — it is not an API error. The
key value is never echoed back to output.

## Asynchronous commands

`agent`, `webset`, and `response` operations run asynchronously
on Exa's side. Their `create` subcommands accept `--wait` to poll until
completion before returning, `--poll-interval` to tune the poll cadence, and
`--timeout` to bound the wait — the command fails with a clear error rather
than hanging if the task never reaches a terminal status. `agent events`
accepts `--follow` to stream events as they arrive. The polling pattern is
defined once and reused across groups.

## Network resilience

Every request flows through the `ExaClient` component, which makes transient
failures the client's problem rather than each command's. Each request is
bounded by a timeout, and rate-limit (`429`) and server (`5xx`) responses —
along with network errors and timeouts — are retried with exponential backoff
and jitter, honoring a `Retry-After` header when the server sends one. Other
`4xx` responses are not retried; they surface immediately as `&ExaError`.
Streaming requests apply the timeout to connecting and receiving headers, then
let the event stream itself run unbounded.

## Exit codes

- `0` — success
- `1` — usage error, missing API key, or an Exa API failure

Errors carry a message on stderr. API failures surface the HTTP status and
response body via the `ExaError` data type.

## Distribution

The CLI ships two ways. The primary channel is an npm package with a single
`exa-cli` binary, targeting Node.js 20 or newer. The secondary channel is a
standalone executable built with `bun build --compile`, which embeds the
runtime so it needs neither Node.js nor an npm install. Tagged `v*` releases
publish the npm package and attach Bun binaries (macOS arm64, Linux x64 and
arm64, Windows x64) as GitHub release assets. See `USER_GUIDE.md` for install
instructions and `.github/workflows/release.yml` for the pipeline.
