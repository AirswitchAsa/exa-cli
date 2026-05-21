# exa-cli user guide

The complete command reference for `exa-cli`. For a project overview and a
quick start, see the [README](../README.md).

> **Unofficial project.** `exa-cli` is an independent, community-built tool. It
> is not affiliated with, endorsed by, or maintained by Exa. It only consumes
> the public Exa API.

## Contents

- [Install](#install)
- [Authentication](#authentication)
- [Output and conventions](#output-and-conventions)
- [Command reference](#command-reference)
  - [search](#exa-search) · [contents](#exa-contents) · [answer](#exa-answer) · [similar](#exa-similar)
  - [chat](#exa-chat) · [context](#exa-context) · [response](#exa-response)
  - [research](#exa-research) · [agent](#exa-agent)
  - [monitor](#exa-monitor) · [webset](#exa-webset)
  - [team](#exa-team) · [api-key](#exa-api-key) · [config](#exa-config)
- [Endpoint map](#endpoint-map)

---

## Install

```bash
npm install -g @spicadust/exa-cli
```

No npm? Install a standalone binary — no Node.js runtime required (macOS /
Linux):

```bash
curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh
```

Or build from source (Node.js 20 or newer):

```bash
git clone https://github.com/AirswitchAsa/exa-cli
cd exa-cli
npm install
npm run build
npm link                        # puts `exa` on your PATH
```

See [Distribution](#distribution) below for Windows binaries and the full set
of channels.

---

## Authentication

Every command needs an Exa API key. Create one in the
[Exa dashboard](https://exa.ai). The CLI resolves the key from three sources,
in order:

1. `EXA_API_KEY` in the environment
2. `EXA_API_KEY` in a `.env` file in the current directory
3. A key stored in `~/.exa/config.json` via `exa api-key set`

```bash
export EXA_API_KEY=...        # option 1: environment
exa api-key set               # option 3: store locally (reads stdin or a hidden prompt)
exa api-key status            # show which source is active
```

The CLI **never** accepts an API key as a command-line flag — that would leak
the secret into shell history and process listings. Stored keys are written to
a `0600` file inside a `0700` directory, and the key value is never echoed
back. See the [Authentication convention](conventions.md#authentication).

> The [`team`](#exa-team) commands talk to Exa's Team Management API, which
> expects a **team service key** rather than an ordinary search key.

---

## Output and conventions

These rules hold across every command — they are specified once in
[`conventions.md`](conventions.md) and enforced in one place.

- **stdout vs stderr** — result content and JSON go to stdout; progress,
  diagnostics, and errors go to stderr, so commands stay pipeable.
- **`--json`** — every non-streaming command accepts `--json` for the raw API
  response. Without it, the command prints a human-readable rendering.
- **`--stream` / `--follow`** — commands backed by server-sent event endpoints
  stream the event feed straight to stdout.
- **`--body-json '<json>'`** — an escape hatch on every request-shaping
  command. The JSON object is merged into the request body, so new or uncommon
  Exa fields are reachable before the CLI grows a dedicated flag.
- **Exit codes** — `0` on success; `1` for a usage error, a missing API key,
  or an Exa API failure. API failures print the HTTP status and response body.
- **Async commands** — `research`, `agent`, `webset`, and `response create`
  accept `--wait` to poll to completion, `--poll-interval <ms>` to tune the
  cadence, and `--timeout <ms>` to bound the wait.

---

## Command reference

The CLI surface mirrors the shape of the Exa REST API. Single-resource actions
are top-level commands; resources with a lifecycle are command groups with
subcommands.

### `exa search`

Search the web and optionally extract result contents.
Endpoint: `POST /search` — [docs](https://exa.ai/docs/reference/search).

```bash
exa search "embeddings-based retrieval" --num-results 5
exa search "AI infra funding" --type deep --category "news" --text
exa search "who is the CEO of OpenAI" --type deep \
  --output-schema '{"type":"object","properties":{"leader":{"type":"string"}}}'
```

Key flags: `--num-results` (default 10, max 100), `--type`
(`auto`, `neural`, `fast`, `instant`, `deep-lite`, `deep`, `deep-reasoning`),
`--category` (`company`, `research paper`, `news`, `personal site`,
`financial report`, `people`), `--include-domains` / `--exclude-domains`,
the crawl/published date filters, `--user-location`, `--moderation`,
`--text` / `--highlights` / `--highlights-query` / `--summary` /
`--summary-query` for per-result content, and `--output-schema` /
`--system-prompt` / `--stream` for synthesized output.

### `exa contents`

Fetch clean, parsed page contents for one or more URLs.
Endpoint: `POST /contents` — [docs](https://exa.ai/docs/reference/get-contents).

```bash
exa contents https://exa.ai https://arxiv.org/abs/2307.06435
exa contents https://exa.ai --summary --highlights-query "pricing"
cat urls.txt | exa contents --max-characters 2000
```

URLs come from arguments, or — when none are given — newline-delimited from
stdin. Flags cover the full extraction surface: `--max-characters`,
`--include-html-tags`, `--verbosity`, `--include-sections` /
`--exclude-sections`, `--highlights` / `--summary` (with `*-query` and
`--summary-schema`), `--livecrawl` / `--max-age-hours` for freshness control,
`--subpages` / `--subpage-target`, and `--links` / `--image-links`.

### `exa answer`

Ask a question and get an LLM answer with citations, grounded in a one-shot
Exa search.
Endpoint: `POST /answer` — [docs](https://exa.ai/docs/reference/answer).

```bash
exa answer "What is the latest valuation of SpaceX?" --text
exa answer "Summarize Exa's launches this year" --stream
exa answer "List Exa's search types" \
  --output-schema '{"type":"object","properties":{"types":{"type":"array","items":{"type":"string"}}}}'
```

Use `--text` to include full source text, `--stream` for a server-sent stream,
and `--output-schema` for a structured answer object.

### `exa similar`

Find pages similar to a given URL.
Endpoint: `POST /findSimilar`.

```bash
exa similar https://arxiv.org/abs/2307.06435 --num-results 10 --text
```

Supports the same domain and date filters as `search`, plus `--text` /
`--highlights` / `--summary`. Note that Exa marks `/findSimilar` as deprecated
in favor of `search`.

### `exa chat`

Run an OpenAI-compatible chat completion backed by Exa's search models.
Endpoint: `POST /chat/completions` —
[docs](https://exa.ai/docs/reference/chat-completions).

```bash
exa chat "What changed in Exa's API this year?" --model exa-pro
exa chat "Summarize this thread" --system "Be concise" --message "earlier turn"
exa chat "..." --messages-json '[{"role":"user","content":"hi"}]' --stream
```

Models: `exa`, `exa-pro`, `exa-research`, `exa-research-pro`. Build the message
list from `--system` + repeated `--message` + the prompt argument, or pass a
full array with `--messages-json`.

### `exa context`

Build an LLM-ready context string from a web search — formatted for dropping
straight into a prompt.
Endpoint: `POST /context` — [docs](https://exa.ai/docs/reference/context).

```bash
exa context "how to stream server-sent events in Node"
exa context "exa websets overview" --tokens 8000
```

With no `--tokens`, the CLI sends `tokensNum: "dynamic"` and lets Exa size the
context. Pass `--tokens <50-100000>` for a fixed budget.

### `exa response`

Create and retrieve OpenAI Responses-compatible runs backed by Exa research
models.
Endpoints: `POST /responses`, `GET /responses/{id}` —
[docs](https://exa.ai/docs/reference/openai-responses-api-with-exa).

```bash
exa response create "Research the agent-evaluation tooling landscape" --wait
exa response get resp_abc123
exa response get resp_abc123 --stream
```

`create` defaults to `exa-research` (`--model exa-research-pro` for deeper
runs) and accepts `--instructions`, `--output-schema`, `--stream`, and the
async `--wait` / `--poll-interval` / `--timeout` flags.

### `exa research`

Asynchronous deep-research tasks that explore the web, gather sources, and
return structured, cited findings.
Endpoints: `POST /research/v1`, `GET /research/v1/{id}`, `GET /research/v1` —
[docs](https://exa.ai/docs/reference/research/overview).

```bash
exa research create "Compare Exa Websets and Monitors" --wait
exa research create "..." --model exa-research-pro \
  --output-schema '{"type":"object","properties":{"summary":{"type":"string"}}}'
exa research get  r_abc123 --events
exa research get  r_abc123 --follow      # live SSE updates
exa research list --limit 20
```

Models: `exa-research-fast`, `exa-research`, `exa-research-pro`. `create`
returns a task ID immediately, or the finished result with `--wait`.

### `exa agent`

Multi-step research agent runs — list-building, enrichment, structured
extraction, and follow-up questions over prior runs.
Endpoints: `POST /agent/runs` (plus `get`, `list`, `cancel`, `delete`,
`events`) — [docs](https://exa.ai/docs/reference/agent-api/overview).

```bash
exa agent create "Find five recent AI infra Series A rounds" --wait
exa agent create "Enrich these companies" --input '{"data":[{"company":"Exa"}]}' \
  --output-schema '{"type":"object","properties":{"people":{"type":"array"}}}'
exa agent events agent_run_abc123 --follow
exa agent list --limit 10
```

`create` supports `--system-prompt`, `--effort`
(`low`/`medium`/`high`/`xhigh`/`auto`), `--previous-run-id` to continue a
finished run, and `--metadata`. The CLI sends the required `Exa-Beta` header
automatically.

### `exa monitor`

Recurring Exa searches that run on a schedule and deliver new, deduplicated
results to a webhook.
Endpoints: `POST /monitors` (plus `get`, `list`, `update`, `delete`,
`trigger`, `runs`, `batch`) —
[docs](https://exa.ai/docs/reference/monitors-api-guide).

```bash
exa monitor create --name "AI funding" --query "AI infrastructure funding" \
  --period 1d --webhook-url https://example.com/hook
exa monitor list --status active
exa monitor trigger mon_abc123
exa monitor runs mon_abc123
exa monitor batch --action pause --filter-status active            # dry run
exa monitor batch --action pause --filter-status active --execute   # apply
```

The Exa API requires both a search query and a webhook URL on create.
`batch` is a bulk delete/pause/unpause that stays a **dry run** until you pass
`--execute`.

### `exa webset`

Websets — curated, verified, enriched collections of web entities. The
largest command group; it covers websets and every subresource.
Base: `POST /websets/v0/...` —
[docs](https://exa.ai/docs/websets/api/overview).

```bash
exa webset create --query "Climate tech startups in Europe" --count 25 --wait
exa webset get      ws_abc123 --expand items
exa webset items list ws_abc123
exa webset enrich create ws_abc123 --description "Find the CEO" --format text
exa webset search create ws_abc123 --query "more like these" --behavior append
exa webset webhook create --url https://example.com/hook --events webset.idle
exa webset monitor create --webset-id ws_abc123 --cron "0 9 * * 1"
exa webset team
```

Subcommands: `create`, `get`, `list`, `update`, `delete`, `cancel`,
`preview`, and the nested groups `search`, `items`, `enrich`, `import`,
`webhook`, `events`, `monitor`, `export`, plus `team`. Deeply nested
structures (criteria, scope, entity, enrichment options) are reachable as JSON
through `--search-json`, `--enrichment-json`, `--import-json`, and
`--body-json`.

### `exa team`

Manage your Exa team's API keys through the Team Management API.
Base: `https://admin-api.exa.ai/team-management/api-keys` —
[docs](https://exa.ai/docs/reference/team-management/create-api-key).

```bash
exa team keys list
exa team keys create --name "ci" --rate-limit 50 --budget-cents 50000
exa team keys usage  key_abc123 --start-date 2026-01-01T00:00:00Z
exa team keys delete key_abc123
```

These commands require a **team service key** with admin access, not an
ordinary search key. `exa team keys` manages your team's *remote* keys;
`exa api-key` (below) manages the *local* credential the CLI authenticates
with — different things, hence different command names.

### `exa api-key`

Manage the local Exa credential stored by the CLI.

```bash
exa api-key set       # store a key (reads stdin, or a hidden prompt on a TTY)
exa api-key status    # show the active key source, without printing the key
exa api-key unset     # remove the stored key
```

### `exa config`

Manage non-secret CLI preferences in `~/.exa/config.json`.

```bash
exa config set output json
exa config list
exa config path
exa config unset output
```

API keys are rejected here — `exa config set apiKey ...` points you at
`exa api-key set` instead.

---

## Endpoint map

How each command group maps onto the Exa API. Every path is reachable; the
table is the parity claim made concrete.

| Command group | HTTP                                  | Path / base                                |
| ------------- | ------------------------------------- | ------------------------------------------ |
| `search`      | POST                                  | `/search`                                  |
| `contents`    | POST                                  | `/contents`                                |
| `answer`      | POST                                  | `/answer`                                  |
| `similar`     | POST                                  | `/findSimilar`                             |
| `chat`        | POST                                  | `/chat/completions`                        |
| `context`     | POST                                  | `/context`                                 |
| `response`    | POST / GET                            | `/responses`, `/responses/{id}`            |
| `research`    | POST / GET                            | `/research/v1`                             |
| `agent`       | POST / GET / DELETE                   | `/agent/runs`                              |
| `monitor`     | POST / GET / PATCH / DELETE           | `/monitors`                                |
| `webset`      | POST / GET / PATCH / DELETE           | `/websets/v0/*`                            |
| `team keys`   | POST / GET / PUT / DELETE             | `admin-api.exa.ai/team-management/api-keys`|
| `api-key`     | —                                     | local `~/.exa/config.json`                 |
| `config`      | —                                     | local `~/.exa/config.json`                 |

Base URL is `https://api.exa.ai` unless noted. Authentication is the
`x-api-key` header on every request.

---

## Distribution

`exa-cli` ships three ways.

### npm (Node.js)

The primary channel. Published as the scoped `@spicadust/exa-cli` package with
a single `exa` binary, targeting Node.js 20+.

```bash
npm install -g @spicadust/exa-cli
npx @spicadust/exa-cli search "hello"   # or run without installing
```

### Standalone binary (Bun)

`bun build --compile` bundles the CLI and the Bun runtime into a single
executable that needs neither Node.js nor npm. The install script downloads the
right binary for your platform from the GitHub release:

```bash
curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh
```

Binaries are published for macOS (arm64, x64), Linux (x64, arm64), and Windows
(x64) on every tagged release — pick one manually from the
[releases page](https://github.com/AirswitchAsa/exa-cli/releases/latest) if you
prefer, or on Windows where the install script does not run.

To build a binary yourself:

```bash
npm run build:bun                 # dist-bin/exa for the current platform
npm run build:bun:all             # cross-compile every platform
```

### Release automation

A tagged `v*` push runs [`.github/workflows/release.yml`](../.github/workflows/release.yml),
which publishes the npm package and attaches a natively built, smoke-tested
binary per platform to the GitHub release.

The npm publish uses **npm Trusted Publishing** — OIDC, no long-lived token.
The workflow mints a short-lived credential that npm verifies against the
trusted publisher configured for the package, and provenance attestations are
generated automatically. Because a trusted publisher cannot be configured
until a package already exists, the very first publish is done manually
(`npm login` then `npm publish`); every release after that goes through CI.

Distribution is gated in layers: a tag push or manual dispatch already
requires repository write access, an `authorize` job hard-fails for any actor
other than the repository owner, and the publish job runs in a `release`
GitHub Environment that can require a manual approval.
