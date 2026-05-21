# exa CLI reference

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
- Async commands (`research`, `agent`, `webset`, `response create`) accept
  `--wait` to poll to completion, `--poll-interval <ms>`, and `--timeout <ms>`.
- stdout carries result content and JSON; stderr carries progress and errors.
- Exit code `0` on success; `1` for usage error, missing API key, or API
  failure (status + body printed to stderr).

## search

`exa search "<query>" [flags]` — `POST /search`. Web search, optionally with
content extraction.

- `--num-results <n>` — default 10, max 100.
- `--type <t>` — `auto`, `neural`, `fast`, `instant`, `deep-lite`, `deep`,
  `deep-reasoning`.
- `--category <c>` — `company`, `research paper`, `news`, `personal site`,
  `financial report`, `people`.
- `--include-domains <list>` / `--exclude-domains <list>` — comma-separated.
- `--start-crawl-date` / `--end-crawl-date` / `--start-published-date` /
  `--end-published-date` — ISO 8601.
- `--user-location <country>`, `--moderation`.
- Content: `--text`, `--highlights`, `--highlights-query <q>`, `--summary`,
  `--summary-query <q>`.
- Synthesized output: `--output-schema <json>`, `--system-prompt <s>`,
  `--stream`.

## contents

`exa contents [<url>...] [flags]` — `POST /contents`. Clean parsed page
content. URLs come from arguments, or newline-delimited from stdin when none
are given.

- `--max-characters <n>`, `--include-html-tags`, `--verbosity <level>`.
- `--include-sections <list>` / `--exclude-sections <list>`.
- `--highlights`, `--highlights-query <q>`, `--summary`, `--summary-query <q>`,
  `--summary-schema <json>`.
- Freshness: `--livecrawl <mode>`, `--max-age-hours <n>`.
- `--subpages <n>`, `--subpage-target <list>`.
- `--links`, `--image-links`.

## answer

`exa answer "<question>" [flags]` — `POST /answer`. Cited LLM answer grounded
in a one-shot Exa search.

- `--text` — include full source text.
- `--stream` — server-sent event stream.
- `--output-schema <json>` — structured answer object.

## similar

`exa similar <url> [flags]` — `POST /findSimilar`. Pages similar to a URL.
Exa marks this endpoint deprecated in favor of `search`.

- Same domain and date filters as `search`.
- `--num-results <n>`, `--text`, `--highlights`, `--summary`.

## chat

`exa chat "<prompt>" [flags]` — `POST /chat/completions`. OpenAI
Chat-Completions-compatible, synchronous.

- `--model <m>` — `exa`, `exa-pro`, `exa-research`, `exa-research-pro`.
- `--system <s>`, `--message <m>` (repeatable) — build the message list.
- `--messages-json <json>` — pass a full message array instead.
- `--stream`.

## context

`exa context "<query>" [flags]` — `POST /context`. LLM-ready context string
from a web search.

- `--tokens <50-100000>` — fixed budget. Omit to send `tokensNum: "dynamic"`
  and let Exa size it.

## response

`exa response create "<input>" [flags]` / `exa response get <id> [flags]` —
`POST /responses`, `GET /responses/{id}`. OpenAI Responses-API-compatible,
async, research models only.

- `create`: `--model <m>` (default `exa-research`, or `exa-research-pro`),
  `--instructions <s>`, `--output-schema <json>`, `--stream`, `--wait`,
  `--poll-interval <ms>`, `--timeout <ms>`.
- `get`: `--stream` for live SSE updates.

## research

`exa research create|get|list` — `POST /research/v1`, `GET /research/v1/{id}`,
`GET /research/v1`. Async deep research with structured, cited findings.

- `create`: `--model <m>` (`exa-research-fast`, `exa-research`,
  `exa-research-pro`), `--output-schema <json>`, `--wait`, `--poll-interval`,
  `--timeout`.
- `get <id>`: `--events`, `--follow` (live SSE).
- `list`: `--limit <n>`.

## agent

`exa agent create|get|list|cancel|delete|events` — `POST /agent/runs` (plus
get/list/cancel/delete/events). Multi-step research agent: list-building,
enrichment, structured extraction. Sends the `Exa-Beta` header automatically.

- `create`: `--input <json>` (rows to process), `--system-prompt <s>`,
  `--effort <low|medium|high|xhigh|auto>`, `--previous-run-id <id>`,
  `--metadata <json>`, `--output-schema <json>`, `--wait`.
- `events <id>`: `--follow` (live SSE).
- `list`: `--limit <n>`.

## monitor

`exa monitor create|get|list|update|delete|trigger|runs|batch` —
`POST /monitors` (plus get/list/update/delete/trigger/runs/batch). Recurring
scheduled searches that deliver deduplicated results to a webhook.

- `create`: `--name <s>`, `--query <s>`, `--period <1d|1w|...>`,
  `--webhook-url <url>` — query and webhook URL are both required.
- `list`: `--status <active|paused|...>`.
- `batch`: bulk pause/unpause/delete. `--action <pause|unpause|delete>`,
  `--filter-name`, `--filter-status`, `--filter-metadata`, `--limit <n>`.
  Stays a **dry run** until `--execute` is passed.

## webset

`exa webset ...` — `POST /websets/v0/*`. Curated, verified, enriched
collections of web entities. The largest group.

- Top level: `create`, `get`, `list`, `update`, `delete`, `cancel`,
  `preview`.
- `create`: `--query <s>`, `--count <n>`, `--wait`, `--search-json`,
  `--enrichment-json`, `--import-json`.
- `get`: `--expand <items|...>`.
- Nested groups: `search`, `items`, `enrich`, `import`, `webhook`, `events`,
  `monitor`, `export`, plus `team`.
- Examples: `exa webset items list <id>`,
  `exa webset enrich create <id> --description "..." --format text`,
  `exa webset search create <id> --query "..." --behavior append`,
  `exa webset webhook create --url <url> --events webset.idle`.

## team

`exa team keys create|get|list|update|delete|usage` —
`admin-api.exa.ai/team-management/api-keys`. Manages your Exa team's *remote*
API keys. Requires a **team service key** with admin access, not an ordinary
search key.

- `create`: `--name <s>`, `--rate-limit <n>`, `--budget-cents <n>`.
- `usage <id>`: `--start-date <iso>`, `--end-date <iso>`.

## api-key

`exa api-key set|status|unset` — manages the *local* credential the CLI
authenticates with (stored in `~/.exa/config.json`).

- `set` — reads stdin, or a hidden prompt on a TTY. Never accepts the key as a
  flag.
- `status` — shows the active key source without printing the key.
- `unset` — removes the stored key.

## config

`exa config set|list|path|unset` — non-secret CLI preferences in
`~/.exa/config.json`. API keys are rejected here (use `api-key set`).

- `exa config set output json` — default output format.
