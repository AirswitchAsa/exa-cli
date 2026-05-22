# Behavior: Team

## Condition

- `@User` wants to manage their Exa team's API keys
- `@User` runs `exa-cli team keys create`, `get`, `list`, `update`, `delete`, or `usage`

## Description

The `@User` manages team API keys under the `exa-cli team keys` command group.
Subcommands create a key, retrieve a key, list keys, update a key's name,
rate limit, and budget in cents, delete a key, and report usage analytics
with date range and grouping query parameters. Every subcommand resolves the
calling API key through `#ConfigResolver` and calls the Exa Team Management
API through `#ExaClient`.

The `team` group is named to mirror Exa's Team Management API and to avoid
colliding with `!ApiKey`, which manages the single local credential rather
than the team's remote keys.

## Outcome

- Each subcommand prints its result as text, or raw JSON with `--json`, via `#OutputWriter`
- `usage` reports cost breakdown and billing data for a key
- On API failure an `&ExaError` is reported on stderr with exit code 1

## Notes

- Implemented in `src/commands/team.ts`
- Maps to the Exa Team Management API at `admin-api.exa.ai/team-management`
- The Team Management API expects a team service key, distinct from a search key
- Uses API field names `budgetCents`, `start_date`, `end_date`, and `group_by`
