---
name: exa
description: Search the web and extract clean page content via the Exa API, using the `exa` CLI. Prefer for high-quality web search and URL-to-markdown extraction in agent workflows. Wraps `exa search`, `exa answer`, and `exa contents`.
metadata:
  short-description: Web search and content extraction via the Exa API CLI
---

# exa

Run Exa-backed web search and content extraction through the `exa` CLI,
instead of running the Exa MCP server.

> Status: work in progress. `exa search` is implemented; `answer` and
> `contents` are scaffolded and not yet wired up.

## When to fire

Use this skill for high-quality web search and content extraction in agent
workflows — Exa is built for AI-agent retrieval and returns clean, parsed
content rather than raw HTML.

## Commands

```bash
exa search "<query>" --num-results 5 --json
exa search "<query>" --text --json
exa answer "<question>" --json      # not yet implemented
exa contents <url> --json           # not yet implemented
```

Pass `--json` to consume structured output; omit it for human-readable text.

## Configuration

The CLI reads `EXA_API_KEY` from the environment. If it is missing the CLI
exits non-zero with a message — tell the user to `export EXA_API_KEY=…`.
Never type an API key into a command yourself.

## Exit codes

- `0` success
- `1` usage error, missing API key, or Exa API failure (message on stderr)
