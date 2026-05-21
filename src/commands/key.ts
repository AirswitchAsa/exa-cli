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

export const keyCommand = new Command("key").description("Team API key management.");

keyCommand
  .command("create")
  .description("Create an API key.")
  .option("--name <name>", "API key name")
  .option("--rate-limit <limit>", "request rate limit", parseInteger)
  .option("--budget-cents <cents>", "spending budget for the key, in cents", parseInteger)
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa service key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: KeyCreateOptions) => {
    const client = clientFor(options, TEAM_BASE_URL);
    const response = await client.post<unknown>("/api-keys", bodyFrom(options));
    printMaybeJson(response, options.json);
  });

keyCommand
  .command("get")
  .description("Retrieve an API key by ID.")
  .argument("<id>", "API key ID")
  .option("--api-key <key>", "Exa service key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options, TEAM_BASE_URL);
    const response = await client.get<unknown>(`/api-keys/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

keyCommand
  .command("list")
  .description("List API keys.")
  .option("--api-key <key>", "Exa service key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: CommonOptions) => {
    const client = clientFor(options, TEAM_BASE_URL);
    const response = await client.get<unknown>("/api-keys");
    printMaybeJson(response, options.json, true);
  });

keyCommand
  .command("update")
  .description("Update an API key.")
  .argument("<id>", "API key ID")
  .option("--name <name>", "API key name")
  .option("--rate-limit <limit>", "request rate limit", parseInteger)
  .option("--budget-cents <cents>", "spending budget for the key, in cents", parseInteger)
  .option("--clear-budget", "remove the spending budget")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa service key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: KeyUpdateOptions) => {
    const client = clientFor(options, TEAM_BASE_URL);
    const response = await client.put<unknown>(`/api-keys/${encodePath(id)}`, bodyFrom(options));
    printMaybeJson(response, options.json);
  });

keyCommand
  .command("delete")
  .description("Delete an API key.")
  .argument("<id>", "API key ID")
  .option("--api-key <key>", "Exa service key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options, TEAM_BASE_URL);
    const response = await client.delete<unknown>(`/api-keys/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

keyCommand
  .command("usage")
  .description("Retrieve usage analytics for an API key.")
  .argument("<id>", "API key ID")
  .option("--start-date <date>", "usage start date")
  .option("--end-date <date>", "usage end date")
  .option("--group-by <unit>", "usage granularity: hour, day, month")
  .option("--api-key <key>", "Exa service key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: KeyUsageOptions) => {
    const client = clientFor(options, TEAM_BASE_URL);
    const response = await client.get<unknown>(`/api-keys/${encodePath(id)}/usage`, {
      query: {
        start_date: options.startDate,
        end_date: options.endDate,
        group_by: options.groupBy,
      },
    });
    printMaybeJson(response, options.json);
  });
