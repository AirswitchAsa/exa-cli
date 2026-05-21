# Behavior: Config

## Condition

- `@User` wants to inspect or edit non-secret CLI preferences
- `@User` runs `exa config path`, `list`, `get`, `set`, or `unset`

## Description

The `@User` manages non-secret preferences in the CLI user config at
`~/.exa/config.json`. The `path` subcommand prints the config path. `list`
prints all stored preferences. `get`, `set`, and `unset` operate on one
preference by name. Values passed to `set` are parsed as JSON when possible,
falling back to plain strings.

## Outcome

- Preferences are stored under the `preferences` object in the user config
- Secret fields such as the API key are rejected and must go through `!ApiKey`
- JSON output is available for list/get operations where useful
- On usage failure an error is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/config.ts`
- Current preferences are storage-only; command-specific defaults can opt in later
