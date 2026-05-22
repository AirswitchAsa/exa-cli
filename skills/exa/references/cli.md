# exa-cli command reference

Full command and flag matrix for `exa-cli`. The CLI mirrors the Exa REST API;
single-resource actions are top-level commands, resources with a lifecycle are
command groups with subcommands.

For prose, examples, and links to the matching Exa docs, see the
[user guide](https://github.com/AirswitchAsa/exa-cli/blob/master/docs/USER_GUIDE.md).

## Conventions

- `--json` — every non-streaming command accepts it for the raw API response.
  Without it the command prints a human-readable rendering. Agents should
  almost always pass `--json`.
- `--stream` / `--follow` — commands backed by server-sent-event endpoints
  stream the event feed to stdout.
- `--body-json '<json>'` — escape hatch on every request-shaping command; the
  JSON object is merged into the request body, reaching Exa fields the CLI has
  no dedicated flag for.
- Async commands (`agent`, `webset`, `response create`) accept `--wait` to
  poll to completion, `--poll-interval <ms>`, and `--timeout <ms>`.
- stdout carries result content and JSON; stderr carries progress and errors.
- Exit code `0` on success; `1` for usage error, missing API key, or API
  failure (status + body printed to stderr).

## search

`exa-cli search "<query>" [flags]` — `POST /search`. Web search, optionally with
content extraction.

- `--num-results <n>` — default 10, max 100.
- `--type <t>` — `instant`, `fast`, `auto` (default), `deep-lite`, `deep`,
  `deep-reasoning`. See `search.md` for how to choose a mode.
- `--category <c>` — `company`, `research paper`, `news`, `personal site`,
  `financial report`, `people`.
- `--include-domains <list>` / `--exclude-domains <list>` — comma-separated.
- `--start-published-date` / `--end-published-date` — ISO 8601.
- `--additional-queries <list>` — extra angled queries for the `deep` types.
- `--user-location <country>`, `--moderation`, `--compliance <mode>`.
- Content: `--text`, `--highlights`, `--highlights-query <q>`, `--summary`,
  `--summary-query <q>`.
- Synthesized output: `--output-schema <json>`, `--system-prompt <s>`,
  `--stream`.

## contents

`exa-cli contents [<url>...] [flags]` — `POST /contents`. Clean parsed page
content. URLs come from arguments, or newline-delimited from stdin when none
are given.

- `--max-characters <n>`, `--include-html-tags`, `--verbosity <level>`.
- `--include-sections <list>` / `--exclude-sections <list>`.
- `--highlights`, `--highlights-query <q>`, `--summary`, `--summary-query <q>`,
  `--summary-schema <json>`.
- Freshness: `--max-age-hours <n>` — `-1` always cache, `0` fetch fresh.
- `--livecrawl-timeout <ms>`, `--subpages <n>`, `--subpage-target <list>`.
- Extras: `--links`, `--image-links`, `--rich-image-links`, `--rich-links`,
  `--code-blocks`.
- `--compliance <mode>` — enterprise compliance mode (e.g. `hipaa`).

## answer

`exa-cli answer "<question>" [flags]` — `POST /answer`. Cited LLM answer grounded
in a one-shot Exa search.

- `--text` — include full source text.
- `--stream` — server-sent event stream.
- `--output-schema <json>` — structured answer object.

## chat

`exa-cli chat "<prompt>" [flags]` — `POST /chat/completions`. OpenAI
Chat-Completions-compatible, synchronous.

- `--model <m>` — `exa`, `exa-research`, `exa-research-pro`.
- `--system <s>`, `--message <m>` (repeatable) — build the message list.
- `--messages-json <json>` — pass a full message array instead.
- `--text`, `--stream`.

## context

`exa-cli context "<query>" [flags]` — `POST /context`. Token-efficient **code**
context (Exa Code): searches GitHub repos, docs pages, and Stack Overflow for
code snippets a coding agent can use directly. Not a general web search — for
that use `search` or `answer`.

- `--tokens <50-100000>` — fixed budget. Omit to send `tokensNum: "dynamic"`
  and let Exa size it.

## response

`exa-cli response create "<input>" [flags]` / `exa-cli response get <id> [flags]` —
`POST /responses`, `GET /responses/{id}`. OpenAI Responses-API-compatible,
async, research models only.

- `create`: `--model <m>` (default `exa-research`, or `exa-research-pro`),
  `--instructions <s>`, `--output-schema <json>`, `--stream`, `--wait`,
  `--poll-interval <ms>`, `--timeout <ms>`. Schema modifiers:
  `--schema-name <s>`, `--schema-description <s>`, `--strict`.
- `get`: `--stream` for live SSE updates.

## agent

`exa-cli agent create|get|list|cancel|delete|events` — `POST /agent/runs` (plus
get/list/cancel/delete/events). Multi-step research agent: list-building,
enrichment, structured extraction. Sends the `Exa-Beta` header automatically.

- `create`: `--input <json>` (rows to process), `--system-prompt <s>`,
  `--effort <low|medium|high|xhigh|auto>`, `--previous-run-id <id>`,
  `--metadata <json>`, `--output-schema <json>`, `--wait`.
- `events <id>`: `--follow` (live SSE).
- `list`: `--limit <n>`.

## monitor

`exa-cli monitor create|get|list|update|delete|trigger|runs|batch` —
`POST /monitors` (plus get/list/update/delete/trigger/runs/batch). Recurring
scheduled searches that deliver deduplicated results to a webhook.

- `create`: `--name <s>`, `--query <s>`, `--period <1h|6h|1d|7d|...>`,
  `--webhook-url <url>` — query and webhook URL are both required. Also
  `--num-results <n>`, `--webhook-events <list>`, `--output-schema <json>`,
  `--metadata <json>`.
- `update`: same shaping flags, plus `--status`, `--clear-trigger`, and
  `--clear-metadata`.
- `list`: `--status <active|paused|...>`, `--name`, `--metadata`.
- `batch`: bulk pause/unpause/delete. `--action <pause|unpause|delete>`,
  `--filter-name`, `--filter-status`, `--filter-metadata`, `--limit <n>`.
  Stays a **dry run** until `--execute` is passed.

## webset

`exa-cli webset ...` — `POST /websets/v0/*` (base `api.exa.ai/websets`).
Curated, verified, enriched collections of web entities. The largest group.

- Top level: `create`, `get`, `list`, `update`, `delete`, `cancel`,
  `preview`.
- `create`: `--query <s>`, `--count <n>`, `--wait`, `--search-json`,
  `--enrichment-json`, `--import-json`.
- `get`: `--expand <items|...>`.
- Nested groups: `search`, `items`, `enrich`, `import`, `webhook`, `events`,
  `monitor`, `export`, plus `team`.
- Examples: `exa-cli webset items list <id>`,
  `exa-cli webset enrich create <id> --description "..." --format text`,
  `exa-cli webset search create <id> --query "..." --behavior append`,
  `exa-cli webset webhook create --url <url> --events webset.idle`.

## team

`exa-cli team keys create|get|list|update|delete|usage` —
`admin-api.exa.ai/team-management/api-keys`. Manages your Exa team's *remote*
API keys. Requires a **team service key** with admin access, not an ordinary
search key.

- `create`: `--name <s>`, `--rate-limit <n>`, `--budget-cents <n>`.
- `usage <id>`: `--start-date <iso>`, `--end-date <iso>`.

## api-key

`exa-cli api-key set|status|unset` — manages the *local* credential the CLI
authenticates with (stored in `~/.exa/config.json`).

- `set` — reads stdin, or a hidden prompt on a TTY. Never accepts the key as a
  flag.
- `status` — shows the active key source without printing the key.
- `unset` — removes the stored key.

## config

`exa-cli config set|list|path|unset` — non-secret CLI preferences in
`~/.exa/config.json`. API keys are rejected here (use `api-key set`).

- `exa-cli config set output json` — default output format.
