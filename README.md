# exa-cli

A command-line interface for the [Exa](https://exa.ai) search API.

Exa is a search engine built for AI agents. It has a well-designed REST API
but no official CLI. This project covers that surface from the terminal, so
the same capabilities are available to shell scripts and agent harnesses
without running an MCP server.

## Status

Work in progress. `exa search` is implemented end to end; the remaining
command groups are scaffolded and registered (visible in `exa --help`) but
not yet implemented. See [Commands](#commands) for the full intended surface.

## Install

```bash
npm install
npm run build
npm link   # optional: puts `exa` on your PATH
```

Requires Node.js 20 or newer.

## Authentication

The CLI reads `EXA_API_KEY` from the environment, or accepts `--api-key`.

```bash
export EXA_API_KEY=...   # get a key at https://exa.ai
```

## Usage

```bash
exa search "embeddings-based retrieval" --num-results 5
exa search "exa api" --text --json
```

## Commands

Target coverage is the full Exa REST API:

| Group      | Commands                                                        |
| ---------- | --------------------------------------------------------------- |
| `search`   | search the web and extract result contents                      |
| `contents` | fetch clean page contents for URLs                              |
| `answer`   | get an LLM answer informed by Exa search                        |
| `similar`  | find pages similar to a URL                                     |
| `research` | `create` · `get` · `list`                                       |
| `agent`    | `create` · `get` · `list` · `cancel` · `delete` · `events`      |
| `monitor`  | `create` · `get` · `list` · `update` · `delete` · `trigger` · `runs` |
| `webset`   | `create` · `get` · `list` · `update` · `delete` · `cancel` · `preview` · `search` · `items` · `enrich` · `export` · `import` |
| `key`      | `create` · `get` · `list` · `update` · `delete` · `usage`       |

## Design reference

[`docs/`](docs/) holds the behavioral and design specification. The
`.dog.md` files are [DOG](https://github.com/AirswitchAsa/dog) specs — the
source of truth for actors, behaviors, components, and data. Start from
[`docs/index.dog.md`](docs/index.dog.md), and see
[`docs/conventions.md`](docs/conventions.md) for cross-cutting CLI rules.

## Development

```bash
npm run dev -- search "query"   # run from source with tsx
npm run typecheck
npm run lint
```

## License

MIT
