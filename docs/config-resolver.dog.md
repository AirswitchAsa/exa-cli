# Component: ConfigResolver

## Description

Resolves the Exa API key for a command. It reads the `EXA_API_KEY`
environment variable, then an `EXA_API_KEY` entry in a `.env` file in the
current working directory. If no key is present it raises an error telling
the `@User` how to supply a key.

## State

- environment: the `EXA_API_KEY` environment variable
- dotenv: optional current-directory `.env` values

## Events

- key_resolved
- key_missing

## Notes

- Source: `src/config.ts`
- A missing key is a usage error, distinct from an `&ExaError`
- Never echoes the key value back to output
- Does not expose an API-key command flag, avoiding shell history and process-list leaks
- `.env` is read directly without introducing a runtime dependency
