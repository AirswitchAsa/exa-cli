# exa-cli

A command-line interface for the [Exa](https://exa.ai) search API.

Exa is a search engine built for AI agents. It has a well-designed REST API
but no official CLI. This project covers that surface from the terminal, so
the same capabilities are available to shell scripts and agent harnesses
without running an MCP server.

## Status

Implemented end to end with hand-written TypeScript commands for the Exa REST
API surface, plus unit tests for the client, credential resolution, and command
request mappings. See [Commands](#commands) for the covered surface.

## Install

```bash
npm install
npm run build
npm link   # optional: puts `exa` on your PATH
```

Requires Node.js 20 or newer.

## Authentication

The CLI resolves credentials in this order: `--api-key`, `EXA_API_KEY` from
the environment, then `EXA_API_KEY` in a current-directory `.env` file.

```bash
export EXA_API_KEY=...   # get a key at https://exa.ai
```

## Usage

```bash
exa search "embeddings-based retrieval" --num-results 5
exa search "exa api" --text --json
exa answer "What changed in Exa's API recently?" --json
exa research create "Compare Exa Websets and Monitors" --wait --json
```

## Commands

Target coverage is the full Exa REST API:

| Group      | Commands                                                        |
| ---------- | --------------------------------------------------------------- |
| `search`   | search the web and extract result contents                      |
| `contents` | fetch clean page contents for URLs                              |
| `answer`   | get an LLM answer informed by Exa search                        |
| `similar`  | find pages similar to a URL                                     |
| `chat`     | OpenAI-compatible chat completions                              |
| `context`  | LLM-ready context generation                                    |
| `response` | `create` · `get`                                                |
| `research` | `create` · `get` · `list`                                       |
| `agent`    | `create` · `get` · `list` · `cancel` · `delete` · `events`      |
| `monitor`  | `create` · `get` · `list` · `update` · `delete` · `trigger` · `runs` · `batch` |
| `webset`   | `create` · `get` · `list` · `update` · `delete` · `cancel` · `preview` · `search` · `items` · `enrich` · `export` · `import` · `webhook` · `events` · `monitor` · `team` |
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
npm run test
npm run typecheck
npm run lint
```

## License

MIT
