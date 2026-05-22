import { Command } from "commander";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  encodePath,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
  printMaybeJson,
} from "./_shared.js";

const TEAM_BASE_URL = "https://admin-api.exa.ai/team-management";

interface KeyCreateOptions extends CommonOptions {
  name?: string;
  rateLimit?: number;
  budgetCents?: number;
  bodyJson?: string;
}

interface KeyUpdateOptions extends CommonOptions {
  name?: string;
  rateLimit?: number;
  budgetCents?: number;
  clearBudget?: boolean;
  bodyJson?: string;
}

interface KeyUsageOptions extends CommonOptions {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
}

function bodyFrom(options: KeyCreateOptions | KeyUpdateOptions): JsonObject {
  const body: JsonObject = {};
  addIfDefined(body, "name", options.name);
  addIfDefined(body, "rateLimit", options.rateLimit);
  if ("clearBudget" in options && options.clearBudget === true) {
    body.budgetCents = null;
  } else {
    addIfDefined(body, "budgetCents", options.budgetCents);
  }
  return mergeBodyJson(body, options.bodyJson);
}

export const teamCommand = new Command("team").description(
  "Manage your Exa team. Requires a team service key (see `exa-cli team keys`).",
);

const keysCommand = teamCommand
  .command("keys")
  .description("Create and manage the Exa API keys belonging to your team.");

keysCommand
  .command("create")
  .description("Create a new team API key.")
  .option("--name <name>", "API key name")
  .option("--rate-limit <limit>", "request rate limit, in requests per second", parseInteger)
  .option("--budget-cents <cents>", "spending budget for the key, in cents", parseInteger)
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (options: KeyCreateOptions) => {
    const client = clientFor(TEAM_BASE_URL);
    const response = await client.post<unknown>("/api-keys", bodyFrom(options));
    printMaybeJson(response, options.json);
  });

keysCommand
  .command("get")
  .description("Retrieve a team API key by ID.")
  .argument("<id>", "API key ID")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(TEAM_BASE_URL);
    const response = await client.get<unknown>(`/api-keys/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

keysCommand
  .command("list")
  .description("List the team's API keys.")
  .option("--json", "print the raw JSON response")
  .action(async (options: CommonOptions) => {
    const client = clientFor(TEAM_BASE_URL);
    const response = await client.get<unknown>("/api-keys");
    printMaybeJson(response, options.json, true);
  });

keysCommand
  .command("update")
  .description("Update a team API key's name, rate limit, or budget.")
  .argument("<id>", "API key ID")
  .option("--name <name>", "API key name")
  .option("--rate-limit <limit>", "request rate limit, in requests per second", parseInteger)
  .option("--budget-cents <cents>", "spending budget for the key, in cents", parseInteger)
  .option("--clear-budget", "remove the spending budget")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: KeyUpdateOptions) => {
    const client = clientFor(TEAM_BASE_URL);
    const response = await client.put<unknown>(`/api-keys/${encodePath(id)}`, bodyFrom(options));
    printMaybeJson(response, options.json);
  });

keysCommand
  .command("delete")
  .description("Delete a team API key.")
  .argument("<id>", "API key ID")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(TEAM_BASE_URL);
    const response = await client.delete<unknown>(`/api-keys/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

keysCommand
  .command("usage")
  .description("Retrieve usage and billing analytics for a team API key.")
  .argument("<id>", "API key ID")
  .option("--start-date <date>", "usage start date, ISO 8601 (defaults to 30 days ago)")
  .option("--end-date <date>", "usage end date, ISO 8601 (defaults to now)")
  .option("--group-by <unit>", "usage granularity: hour, day, month")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: KeyUsageOptions) => {
    const client = clientFor(TEAM_BASE_URL);
    const response = await client.get<unknown>(`/api-keys/${encodePath(id)}/usage`, {
      query: {
        start_date: options.startDate,
        end_date: options.endDate,
        group_by: options.groupBy,
      },
    });
    printMaybeJson(response, options.json);
  });
