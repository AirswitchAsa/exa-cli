---
name: exa
description: Search, answer, extract content, and manage Exa API resources using the `exa` CLI. Prefer for high-quality web search and URL-to-markdown extraction in agent workflows.
metadata:
  short-description: Web search and content extraction via the Exa API CLI
---

# exa

Run Exa-backed web search and content extraction through the `exa` CLI,
instead of running the Exa MCP server.

`exa-cli` is an unofficial, independent tool — not affiliated with, endorsed
by, or maintained by Exa.

> Coverage: search, contents, answer, similar, chat, context, responses,
> research, agent, monitors, websets, and team keys — the full Exa REST API.

## When to fire

Use this skill for high-quality web search and content extraction in agent
workflows — Exa is built for AI-agent retrieval and returns clean, parsed
content rather than raw HTML.

## Bootstrap the CLI

Run the bundled bootstrap script before relying on `exa`. It resolves the
executable and prints the command to use:

```bash
scripts/ensure-exa.sh
```

In an installed skill, resolve that path relative to this `SKILL.md`. The
script tries, in order:

1. An `exa-cli` already on `PATH` (verified by its help text — an unrelated
   `exa` file-lister shares the name).
2. Ephemeral npm execution: `npx -y @spicadust/exa-cli`.

If neither works, install the CLI with one of:

- npm: `npm install -g @spicadust/exa-cli`
- Standalone binary (macOS / Linux), no Node.js needed:
  `curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh`
- Prebuilt binaries for every platform (incl. Windows):
  <https://github.com/AirswitchAsa/exa-cli/releases/latest>

## Core commands

These cover most agent retrieval needs. Always pass `--json` for structured
output; omit it only when piping directly to the user.

```bash
exa search "<query>" --num-results 5 --json     # web search
exa search "<query>" --text --json              # search + full page text
exa contents <url> [<url>...] --json            # URL -> clean parsed content
exa answer "<question>" --text --json           # cited LLM answer
exa similar <url> --json                        # find pages like this one
```

For deep, multi-step research that explores the web and returns cited,
structured findings:

```bash
exa research create "<instructions>" --wait --json
```

The CLI also covers `chat`, `context`, `response`, `agent`, `monitor`,
`webset`, and `team` — see `references/cli.md` for the full command and flag
matrix, async polling flags (`--wait` / `--poll-interval` / `--timeout`),
streaming (`--stream` / `--follow`), and the `--body-json` escape hatch.

## Configuration

The CLI reads `EXA_API_KEY` from the environment, a current-directory `.env`
file, or a stored key in `~/.exa/config.json` created by `exa api-key set`.
It deliberately does not expose an API-key command flag. Never type an API key
into a command yourself.

## Exit codes

- `0` success
- `1` usage error, missing API key, or Exa API failure (message on stderr)
