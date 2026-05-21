---
name: exa
description: Search, answer, extract content, and manage Exa API resources using the `exa` CLI. Prefer for high-quality web search and URL-to-markdown extraction in agent workflows.
metadata:
  short-description: Web search and content extraction via the Exa API CLI
---

# exa

Run Exa-backed web search and content extraction through the `exa` CLI,
instead of running the Exa MCP server.

> Status: the hand-written CLI covers Exa search, contents, answer, similar,
> chat, context, responses, research, agent, monitors, websets, and team keys.

## When to fire

Use this skill for high-quality web search and content extraction in agent
workflows — Exa is built for AI-agent retrieval and returns clean, parsed
content rather than raw HTML.

## Commands

```bash
exa search "<query>" --num-results 5 --json
exa search "<query>" --text --json
exa answer "<question>" --json
exa contents <url> --json
exa similar <url> --json
exa research create "<instructions>" --wait --json
```

Pass `--json` to consume structured output; omit it for human-readable text.

## Configuration

The CLI reads `EXA_API_KEY` from the environment or a current-directory `.env`
file. It deliberately does not expose an API-key command flag. Never type an
API key into a command yourself.

## Exit codes

- `0` success
- `1` usage error, missing API key, or Exa API failure (message on stderr)
