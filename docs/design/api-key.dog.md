# Behavior: ApiKey

## Condition

- `@User` wants to store or inspect the local Exa API key used by the CLI
- `@User` runs `exa api-key set`, `status`, or `unset`

## Description

The `@User` manages the local API key stored in the CLI user config. `set`
reads the key from stdin when piped, or prompts for it interactively without
echoing it. `status` reports whether an API key is configured and which
source is active. `unset` removes only the stored user-config key. The command
does not accept an API key as an argument or option.

## Outcome

- Stored API keys are written to `~/.exa/config.json` with restrictive file permissions
- The API key value is never printed
- Environment and `.env` keys remain higher priority than the stored user-config key
- On usage failure an error is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/api-key.ts`
- This is local CLI configuration, not an Exa account login/session
