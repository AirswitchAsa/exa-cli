# exa-cli

A command-line interface for the [Exa](https://exa.ai) API — the search
engine built for AI.

> **Unofficial project.** `exa-cli` is an independent, community-built tool.
> It is not affiliated with, endorsed by, or maintained by Exa. "Exa" is a
> trademark of its respective owner; this project only consumes the public
> Exa API.

Exa has a broad, well-designed REST API but no official CLI. `exa-cli` covers
that surface from the terminal, so every Exa capability — search, content
extraction, answers, research, agents, monitors, and Websets — is available to
shell scripts and agent harnesses without the MCP server.

The project is written TypeScript, one command module per API area, mapped
directly onto Exa's published [API reference](https://exa.ai/docs/reference).

## Install

```bash
npm install -g @spicadust/exa-cli
```

No npm? Install a standalone binary — no Node.js runtime required (macOS / Linux):

```bash
curl -fsSL https://raw.githubusercontent.com/AirswitchAsa/exa-cli/master/scripts/install.sh | sh
```

Windows binaries and every other platform are on the
[releases page](https://github.com/AirswitchAsa/exa-cli/releases/latest). Or
build from source (Node.js 20+):

```bash
npm install && npm run build && npm link
```

See the [user guide](docs/USER_GUIDE.md#distribution) for all distribution
channels.

## Quick start

```bash
export EXA_API_KEY=...   # get a key at https://exa.ai, or run `exa api-key set`

exa search "embeddings-based retrieval" --num-results 5
exa answer "What changed in Exa's API recently?" --text
exa contents https://exa.ai --summary
exa research create "Compare Exa Websets and Monitors" --wait
```

Add `--json` to any command for the raw API response; omit it for
human-readable text. `exa --help` lists every command.

## Documentation

- **[User guide](docs/USER_GUIDE.md)** — install, authentication, and the full
  command reference with examples and links to the matching Exa docs.
- **[Design reference](docs/index.dog.md)** — the behavioral specification.
  The `.dog.md` files are [DOG](https://github.com/AirswitchAsa/dog) specs:
  the source of truth for actors, behaviors, components, and data.
- **[Conventions](docs/conventions.md)** — cross-cutting CLI design rules.
- **[Claude Code skill](skills/exa/)** — wraps the CLI for agent workflows.

## Commands

`search` · `contents` · `answer` · `similar` · `chat` · `context` ·
`response` · `research` · `agent` · `monitor` · `webset` · `team` ·
`api-key` · `config` — covering the full Exa REST API. See the
[user guide](docs/USER_GUIDE.md#command-reference) for details.

## Development

```bash
npm run dev -- search "query"   # run from source with tsx
npm run build                   # type-check and emit dist/
npm test                        # unit suite (mock fetch, no key needed)
npm run test:integration        # live API suite (needs a key, costs money)
npm run typecheck
npm run lint
```

## License

MIT
