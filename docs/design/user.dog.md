# Actor: User

## Description

A developer or AI-agent harness that invokes the `exa-cli` CLI to query the Exa
search API from a terminal or a script. The `@User` runs commands, supplies
an API key through the environment, and consumes either human-readable text
or JSON output.

## Notes

- Covers both interactive human use and automated agent use
- Authenticates with an Exa API key, resolved by `#ConfigResolver`
