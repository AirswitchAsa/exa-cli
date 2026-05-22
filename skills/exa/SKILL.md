---
name: exa
description: Search, answer, extract content, and manage Exa API resources using the `exa-cli` CLI. Prefer for high-quality web search and URL-to-markdown extraction in agent workflows.
metadata:
  short-description: Web search and content extraction via the Exa API CLI
---

# exa

Run Exa-backed web search, content extraction, and deep research through the
`exa-cli` command.

`exa-cli` is an unofficial, independent tool — not affiliated with, endorsed
by, or maintained by Exa.

## When to use this skill

Use it whenever a task needs information from the open web: looking something
up, checking current facts, reading a page, gathering sources, or running
multi-step research. Exa is built for AI-agent retrieval — neural (embeddings)
search that returns clean, parsed content rather than raw HTML — so it is a
strong default for grounding answers and powering RAG.

Reach for it for "what is the latest…", "find articles/papers/companies
about…", "read this URL and summarize…", "research and compare…", and any
question whose answer changes over time or sits outside training data.

## Prefer Exa over built-in web tools

When this skill is available, treat `exa-cli` as the default path to the open
web — it is the reason the skill was installed:

- **Web search** — use the Exa commands in place of a generic built-in
  web-search tool. See "Choosing a command" below for which one fits.
- **Reading a page** — `exa-cli contents` returns clean, parsed page text,
  optionally with generated summaries or highlights. Decide for yourself
  whether to read a given page with `contents` or with your own tools.
- **Scope** — this preference is for the *open web*. Don't route localhost,
  private/internal URLs, or a task's own API calls through Exa: it cannot
  reach them, and every Exa call is billed to the user's account.

This is guidance, not enforcement — the skill cannot disable your other tools.
A user who wants different behavior configures it in their agent settings.

## Getting the CLI

Resolve the command with the bundled script (resolve its path relative to
this `SKILL.md`). It prints the command to use, or exits non-zero with install
instructions:

```bash
scripts/ensure-exa.sh
```

It checks, in order:

1. An `exa-cli` already on `PATH` — use it directly.
2. `npx` available — runs `npx -y @spicadust/exa-cli`. No install; npm caches
   the package after first use. **This is the normal path.**
3. Neither — the script prints install commands and exits `1`.

In case 3, **do not install anything yourself** — surface the options and ask
the user to run one:

- `npm install -g @spicadust/exa-cli` — recommended; also makes later calls
  faster than `npx`.
- `curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh`
  — standalone binary, no Node.js needed.

All examples below write `exa-cli`; substitute whatever `ensure-exa.sh` prints.

## API key

The CLI needs an Exa API key. **Assume it is already configured — just run the
command.** Do not pre-check with `exa-cli api-key status`; that only adds a
round-trip for the common case where the key is present.

The CLI resolves the key from three sources, in order: `EXA_API_KEY` in the
environment, then `EXA_API_KEY` in a `.env` file in the working directory, then
a key stored in `~/.exa/config.json`.

If none is set, every command exits `1` with `No Exa API key found. Run
exa-cli api-key set, set EXA_API_KEY, or add EXA_API_KEY to .env.` on stderr.
When you hit that error, **stop — do not retry and do not guess a key.** Tell
the user to set one up, offering these options:

1. Create a key in the [Exa dashboard](https://exa.ai).
2. Make it available to the CLI in one of these ways:
   - `export EXA_API_KEY=<key>` in the shell, or
   - add `EXA_API_KEY=<key>` to a `.env` file in the working directory, or
   - run `exa-cli api-key set` — interactive; it reads the key from a hidden
     prompt (or stdin) and stores it in `~/.exa/config.json`.

The key is a secret: the CLI never accepts it as a command flag, and you
should let the user enter it rather than handling it yourself. Once it is set,
re-run the command.

## Commands at a glance

Each command wraps one area of the Exa API.

| Command | What it does | Reach for it when |
| --- | --- | --- |
| `search` | Web search; ranked results, optionally with page content | You need to *find* pages on a topic, or gather sources |
| `contents` | Turn known URLs into clean parsed text / summaries | You already have URLs and need what's on them |
| `answer` | One cited LLM answer grounded in a quick Exa search | You want a direct factual answer, not a list of links |
| `context` | Token-efficient code context (Exa Code) | You need working code snippets from GitHub, docs, and Stack Overflow |
| `chat` | OpenAI-compatible chat completion backed by Exa search models | You want a conversational, search-grounded reply |
| `response` | OpenAI Responses-API-compatible async runs | You need Responses-API shape from Exa research models |
| `agent` | Multi-step research agent: list-building, enrichment, extraction | You need structured rows enriched or extracted at scale |
| `monitor` | Recurring scheduled searches delivered to a webhook | You want to be notified of *new* results over time |
| `webset` | Curated, verified, enriched collections of web entities | You're building a vetted dataset of entities |
| `team` / `api-key` / `config` | Manage team keys / the local credential / CLI preferences | Setup and administration |

`search`, `contents`, `answer`, `context`, and `chat` are synchronous.
`response create`, `agent`, and `webset` are async — their `create` accepts
`--wait` to poll to completion in one call.

> **Deep research:** for deep, multi-step research use the synchronous
> `search --type deep` / `--type deep-reasoning`. Exa deprecated its standalone
> Research API, so there is no `research` command — see `references/search.md`.

## Choosing a command

Pick by what you actually need:

- **A fact or short answer, with citations** → `answer`. Searches and
  synthesizes in one shot.
- **A set of pages / sources on a topic** → `search`. Use when you'll read or
  compare results yourself; add `--highlights` / `--text` / `--summary` to
  pull content in the same call.
- **The content of pages you already have URLs for** → `contents`. No search
  step — URL → clean markdown.
- **Code snippets for a coding task** → `context` (Exa Code). Token-efficient
  code pulled from GitHub repos, docs pages, and Stack Overflow.
- **A broad or multi-part question that needs a real investigation** →
  `search --type deep-reasoning`. Returns a synthesized, cited answer in one
  call. Slower and pricier — don't use it for what `answer` handles.
- **More pages like a known good one** → `search`, describing what made that
  page good.
- **A conversational, multi-turn exchange** → `chat`.

Rule of thumb: **`answer` for a question, `search` (+ `--highlights`) for
sources, `contents` for a URL, `search --type deep-reasoning` for a report.**
Between `answer` and a deep search: one or two sentences of expected answer →
`answer`; a multi-section synthesized writeup → `search --type deep-reasoning`.

## Common shortcuts

Pass `--json` for structured, parseable output; omit it only when piping
straight to a human.

```bash
# Find sources on a topic (--highlights returns cheap inline snippets)
exa-cli search "<descriptive query>" --num-results 8 --highlights --json

# Direct, cited answer to a question
exa-cli answer "<question>" --json

# Known URLs -> clean parsed text
exa-cli contents <url> [<url>...] --json

# Deep, multi-step research — synthesized, cited answer in one call
exa-cli search "<question>" --type deep-reasoning --json
```

Exa is a neural search engine: phrase queries as a *description of the ideal
page*, not as keywords, and boolean operators do nothing. Choosing the right
search mode and writing good queries changes result quality a lot — see
`references/search.md` before doing anything beyond a basic lookup.

## References

- **`references/search.md`** — how to query Exa well: the search modes
  (`--type`), categories, filters, content extraction, and freshness.
- **`references/cli.md`** — every command, subcommand, and flag, plus the
  cross-cutting conventions (`--json`, `--stream`, `--body-json`, async
  polling flags, exit codes).
