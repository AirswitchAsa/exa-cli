# Searching Exa well

A practical guide to getting high-quality results from `exa-cli search` — and,
by extension, `answer` and `chat`, which also run an Exa web search under the
hood. (`context` is a different engine — Exa Code — so this advice does not
apply to it.) `references/cli.md` is the exhaustive flag list; this file is
about *how to use* search well.

## How Exa search works

Exa is a **neural search engine**. It embeds your query and web pages into the
same vector space and returns the pages whose embeddings sit closest to the
query. Modern Exa also blends in keyword matching — the `auto` mode picks the
right mix per query — but the neural core drives two rules that shape every
query you write:

1. **You are describing a target page, not typing keywords.** The best query
   reads like a sentence that would appear in, or accurately describe, the
   ideal result.
2. **There is no boolean logic and no exact-match syntax.** `AND`, `OR`,
   `NOT`, and `"quotes"` are treated as ordinary words. Restriction happens
   through *flags*, not query syntax.

## Search modes — `--type`

The `--type` flag picks the search mode. The modes trade latency for depth.
Confirmed values, fastest to deepest:

| `--type` | How it works | Typical latency | Use it for |
| --- | --- | --- | --- |
| `instant` | Lowest-latency neural search, tuned for real-time use | ~250 ms | Real-time apps — chat, voice, autocomplete, live UI |
| `fast` | Lower-latency search models; small quality trade-off | ~450 ms | Latency-sensitive lookups, chatbots |
| `auto` *(default)* | Intelligently blends neural + keyword per query; works with **all** filters | ~1 s | **Almost everything — start here** |
| `deep-lite` | Lightweight multi-step synthesis | ~4 s | A synthesized answer when full `deep` is overkill |
| `deep` | Agentic: searches, reads, searches again, then synthesizes a cited answer | ~4–15 s | Complex, multi-angle questions needing a synthesized answer |
| `deep-reasoning` | `deep` plus an extra reasoning pass | ~12–40 s | The hardest research questions |

Guidance:

- **Default to `auto`.** It is the recommended mode, it picks the right
  strategy itself, and — unlike some modes — it works with every filter. Only
  move off it for a specific reason.
- **`fast` / `instant`** when latency matters more than recall. `instant` is
  the most aggressive trade-off; reach for it only in genuinely real-time
  contexts.
- **`deep` / `deep-reasoning`** when one query must *reason over* results, not
  just retrieve them. These return a synthesized, cited answer and support
  `--output-schema`. They are slow — don't use them for ordinary lookups.
- **`neural` and `keyword` no longer exist** as `--type` values. Older
  third-party docs may still mention them; use `auto` instead.

### Deep research

The `deep` and `deep-reasoning` types *are* Exa's deep-research mechanism:
agentic, synchronous, one call returns a synthesized, cited answer — no task
ID, no polling. Exa deprecated its separate async Research API (`/research/v1`)
in favor of `search` with `type: deep-reasoning`, so `exa-cli` has no
`research` command.

For a deep, investigative question, run
`exa-cli search "<question>" --type deep-reasoning --json`.

## Writing the query

### Describe the page, not the fact

Ask: "What would the perfect result's title or first paragraph say?" Write
that.

| Goal | Weak (keyword) query | Strong (descriptive) query |
| --- | --- | --- |
| Learn a technique | `vector database sharding` | `engineering blog post explaining how to shard a vector database for scale` |
| Find a person | `Jane Doe Acme` | `personal site or bio page of Jane Doe, an engineer at Acme` |
| Find recent news | `OpenAI funding` | `news article about OpenAI's latest funding round, published in 2026` |
| Find a paper | `RAG hallucination` | `research paper measuring hallucination rates in retrieval-augmented generation` |

### Use full natural-language phrases

Write grammatical phrases, not search-engine shorthand. Very short queries
(1–2 words) under-specify the target region of embedding space and return
scattered results.

### Don't reach for operators

`AND` / `OR` / `NOT`, `"exact phrase"` quoting, and `site:` / `-term` style
operators **do nothing** — they are read as plain words. To restrict results,
use flags: `--include-domains`, `--exclude-domains`, `--category`, and the
date filters.

### Encode time in the query

Date *filters* are precise but blunt. Also state the timeframe in the query
itself — "published in March 2026", "released last quarter". Compute exact
dates before searching rather than writing "recent".

### Run several angled queries

One query samples one region of embedding space. For anything broader than a
single named lookup, run **2–3 queries from different angles** and merge
results. Vary the *angle*, not just the words — swapping synonyms lands in
nearly the same place; changing the framing ("criticism of X" → "limitations
of X in production") does not.

## Categories — `--category`

A category narrows results to one kind of entity and noticeably improves
precision when the target clearly is that kind:

`company` · `people` · `news` · `research paper` · `financial report` ·
`personal site`

```bash
exa-cli search "AI infrastructure startups founded in 2024" --category company --json
exa-cli search "senior compiler engineers who blog" --category "personal site" --json
```

Use a category whenever you can name the entity type; skip it for
mixed-intent or exploratory queries.

**Constraint:** `company` and `people` searches support only limited filters —
they reject `--start-published-date`, `--end-published-date`, and
`--exclude-domains`. If you need those filters, drop the category.

## Filters

- `--include-domains a.com,b.com` — only these domains.
- `--exclude-domains x.com` — never these domains.
- `--start-published-date` / `--end-published-date` — when the page was
  published (ISO 8601, e.g. `2025-01-01`).
- `--user-location <country-code>` — bias toward a locale.

Pair date filters with a date phrase in the query for best results.

## How many results — `--num-results`

Default 10, max 100. More is not better — it adds noise and tokens.

| Situation | `--num-results` |
| --- | --- |
| One specific named entity | 5 |
| A precise, filtered lookup | 10 |
| Broad discovery / "find everything" | 15–25 |

Never push toward 50+. If 15 isn't enough coverage, run another query from a
different angle instead of inflating one.

## Pulling content with the results

`search` can return page content inline, so you often don't need a separate
`contents` call. Pick the lightest option that answers the question:

- `--highlights` — the most relevant snippets per result. Roughly an order of
  magnitude fewer tokens than full text. **Best default for agents** doing
  fact-finding or multi-step work. Steer with `--highlights-query "<focus>"`.
- `--summary` — a generated summary per result. Steer with
  `--summary-query "<focus>"`. (To shape a summary with a JSON schema, use
  `contents --summary-schema`; `search` has no schema flag.)
- `--text` — full parsed page text. Use only when you genuinely need deep
  reading of the whole page.

```bash
exa-cli search "post-training techniques for small LLMs" --highlights \
  --highlights-query "distillation" --num-results 8 --json
```

For pages you *already* have URLs for, use `contents`, not a search.

## Freshness — `--max-age-hours`

(A `contents` flag — `search` itself has no freshness control. Use `contents`
when freshness matters.)

- Omit it — Exa serves cached content, crawling fresh only as a fallback.
  Good default for stable reference material.
- `--max-age-hours 0` — always fetch fresh; slowest, most current.
- `--max-age-hours 24` — accept cache up to a day old.
- `--max-age-hours -1` — always use cache; fastest.

Use a fresh setting for fast-moving topics (prices, breaking news, status
pages); accept cache for stable reference material. `maxAgeHours` is Exa's
current freshness control — the older `livecrawl` parameter is deprecated and
`exa-cli` does not expose it.

## Structured output

The `deep` search modes and `answer` accept `--output-schema '<json-schema>'`,
which returns a synthesized object instead of raw results. On `search`,
`--system-prompt` steers that synthesis; `answer` has no system-prompt flag.
Note it adds roughly 2s of synthesis latency on top of the search type's own
latency.

```bash
exa-cli search "who is the current CEO of OpenAI" --type deep \
  --output-schema '{"type":"object","properties":{"name":{"type":"string"}}}' --json
```

## A reliable agent workflow

1. **Decide the command.** A question → `answer`. Sources to read/compare →
   `search`. A URL you already have → `contents`. A deep investigative
   question → `search --type deep-reasoning`.
2. **Write a descriptive query.** For anything broad, draft 2–3 angled
   variants.
3. **Search with inline content.** Add `--highlights` (cheap); escalate to
   `--text` only if highlights are too thin. Size `--num-results` to the task.
4. **Validate.** Read titles and highlights; discard results that don't
   actually match. Exa ranks by similarity, which is not the same as correct.
5. **Go deep on the keepers.** `contents <url> --text` (or `--summary`) on the
   handful worth fully reading.
6. **Deduplicate by URL** across multiple queries before using the results.

## Picking between search-family commands

| You want… | Command | Why |
| --- | --- | --- |
| A direct, cited answer | `answer` | Searches + synthesizes in one call |
| Ranked sources to read yourself | `search` | Full control over results and content |
| A synthesized answer to a hard, multi-step question | `search --type deep-reasoning` | Agentic deep research, synchronous, one call |
| Code snippets for a coding task | `context` | Exa Code — token-efficient code from GitHub, docs, and Stack Overflow |
| Content of URLs you already have | `contents` | No search step; URL → clean text |

When unsure between `answer` and a `deep` search: one or two sentences of
expected answer → `answer`; a multi-section synthesized writeup →
`search --type deep` / `deep-reasoning`.
