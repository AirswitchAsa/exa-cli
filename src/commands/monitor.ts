import { Command } from "commander";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  encodePath,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
  parseJsonObject,
  printMaybeJson,
} from "./_shared.js";

interface MonitorCreateOptions extends CommonOptions {
  name?: string;
  query?: string;
  numResults?: number;
  period?: string;
  webhookUrl?: string;
  webhookEvents?: string;
  outputSchema?: string;
  metadata?: string;
  bodyJson?: string;
}

interface MonitorUpdateOptions extends CommonOptions {
  name?: string;
  status?: string;
  query?: string;
  numResults?: number;
  period?: string;
  clearTrigger?: boolean;
  webhookUrl?: string;
  webhookEvents?: string;
  outputSchema?: string;
  metadata?: string;
  clearMetadata?: boolean;
  bodyJson?: string;
}

interface MonitorListOptions extends CommonOptions {
  status?: string;
  cursor?: string;
  limit?: number;
  name?: string;
  metadata?: string;
}

interface MonitorRunsOptions extends CommonOptions {
  cursor?: string;
  limit?: number;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createBody(options: MonitorCreateOptions): JsonObject {
  const body: JsonObject = {};
  addIfDefined(body, "name", options.name);
  if (options.query !== undefined || options.numResults !== undefined) {
    body.search = {
      ...(options.query !== undefined ? { query: options.query } : {}),
      ...(options.numResults !== undefined ? { numResults: options.numResults } : {}),
    };
  }
  if (options.period !== undefined) {
    body.trigger = { type: "interval", period: options.period };
  }
  if (options.webhookUrl !== undefined || options.webhookEvents !== undefined) {
    body.webhook = {
      ...(options.webhookUrl !== undefined ? { url: options.webhookUrl } : {}),
      ...(options.webhookEvents !== undefined ? { events: splitCsv(options.webhookEvents) } : {}),
    };
  }
  if (options.outputSchema !== undefined) {
    body.outputSchema = parseJsonObject(options.outputSchema, "--output-schema");
  }
  if (options.metadata !== undefined)
    body.metadata = parseJsonObject(options.metadata, "--metadata");
  return mergeBodyJson(body, options.bodyJson);
}

function updateBody(options: MonitorUpdateOptions): JsonObject {
  const body: JsonObject = {};
  addIfDefined(body, "name", options.name);
  addIfDefined(body, "status", options.status);
  if (options.query !== undefined || options.numResults !== undefined) {
    body.search = {
      ...(options.query !== undefined ? { query: options.query } : {}),
      ...(options.numResults !== undefined ? { numResults: options.numResults } : {}),
    };
  }
  if (options.clearTrigger === true) {
    body.trigger = null;
  } else if (options.period !== undefined) {
    body.trigger = { type: "interval", period: options.period };
  }
  if (options.webhookUrl !== undefined || options.webhookEvents !== undefined) {
    body.webhook = {
      ...(options.webhookUrl !== undefined ? { url: options.webhookUrl } : {}),
      ...(options.webhookEvents !== undefined ? { events: splitCsv(options.webhookEvents) } : {}),
    };
  }
  if (options.outputSchema !== undefined) {
    body.outputSchema = parseJsonObject(options.outputSchema, "--output-schema");
  }
  if (options.clearMetadata === true) {
    body.metadata = null;
  } else if (options.metadata !== undefined) {
    body.metadata = parseJsonObject(options.metadata, "--metadata");
  }
  return mergeBodyJson(body, options.bodyJson);
}

export const monitorCommand = new Command("monitor").description(
  "Recurring scheduled Exa searches.",
);

monitorCommand
  .command("create")
  .description("Create a monitor.")
  .option("--name <name>", "monitor display name")
  .option("--query <query>", "search query for each run")
  .option("--num-results <count>", "number of search results per run", parseInteger)
  .option("--period <duration>", "interval duration such as 1h, 6h, 1d, 7d")
  .option("--webhook-url <url>", "HTTPS webhook URL")
  .option("--webhook-events <events>", "comma-separated webhook event names")
  .option("--output-schema <json>", "JSON schema for monitor output")
  .option("--metadata <json>", "metadata object")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: MonitorCreateOptions) => {
    const client = clientFor(options);
    const response = await client.post<unknown>("/monitors", createBody(options));
    printMaybeJson(response, options.json);
  });

monitorCommand
  .command("get")
  .description("Retrieve a monitor by ID.")
  .argument("<id>", "monitor ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options);
    const response = await client.get<unknown>(`/monitors/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

monitorCommand
  .command("list")
  .description("List monitors.")
  .option("--status <status>", "filter by status: active, paused, disabled")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of monitors to return", parseInteger)
  .option("--name <name>", "filter by name")
  .option("--metadata <json>", "metadata filters encoded as JSON")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: MonitorListOptions) => {
    const client = clientFor(options);
    let metadata: JsonObject | undefined;
    if (options.metadata !== undefined) {
      metadata = {};
      for (const [key, value] of Object.entries(parseJsonObject(options.metadata, "--metadata"))) {
        metadata[`metadata[${key}]`] = String(value);
      }
    }
    const response = await client.get<unknown>("/monitors", {
      query: {
        status: options.status,
        cursor: options.cursor,
        limit: options.limit,
        name: options.name,
        ...metadata,
      },
    });
    printMaybeJson(response, options.json, true);
  });

monitorCommand
  .command("update")
  .description("Update a monitor.")
  .argument("<id>", "monitor ID")
  .option("--name <name>", "monitor display name")
  .option("--status <status>", "status: active or paused")
  .option("--query <query>", "search query for each run")
  .option("--num-results <count>", "number of search results per run", parseInteger)
  .option("--period <duration>", "interval duration such as 1h, 6h, 1d, 7d")
  .option("--clear-trigger", "remove the schedule")
  .option("--webhook-url <url>", "HTTPS webhook URL")
  .option("--webhook-events <events>", "comma-separated webhook event names")
  .option("--output-schema <json>", "JSON schema for monitor output")
  .option("--metadata <json>", "metadata object")
  .option("--clear-metadata", "remove metadata")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: MonitorUpdateOptions) => {
    const client = clientFor(options);
    const response = await client.patch<unknown>(
      `/monitors/${encodePath(id)}`,
      updateBody(options),
    );
    printMaybeJson(response, options.json);
  });

monitorCommand
  .command("delete")
  .description("Delete a monitor.")
  .argument("<id>", "monitor ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options);
    const response = await client.delete<unknown>(`/monitors/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

monitorCommand
  .command("trigger")
  .description("Trigger a monitor run immediately.")
  .argument("<id>", "monitor ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options);
    const response = await client.post<unknown>(`/monitors/${encodePath(id)}/trigger`);
    printMaybeJson(response, options.json);
  });

monitorCommand
  .command("runs")
  .description("List monitor runs, or retrieve a run when run ID is provided.")
  .argument("<id>", "monitor ID")
  .argument("[runId]", "run ID")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of runs to return", parseInteger)
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, runId: string | undefined, options: MonitorRunsOptions) => {
    const client = clientFor(options);
    const path =
      runId === undefined
        ? `/monitors/${encodePath(id)}/runs`
        : `/monitors/${encodePath(id)}/runs/${encodePath(runId)}`;
    const response = await client.get<unknown>(path, {
      query: runId === undefined ? { cursor: options.cursor, limit: options.limit } : undefined,
    });
    printMaybeJson(response, options.json, runId === undefined);
  });

monitorCommand
  .command("batch")
  .description("Perform a batch action on monitors.")
  .requiredOption("--body-json <json>", "batch request JSON body")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: CommonOptions & { bodyJson: string }) => {
    const client = clientFor(options);
    const response = await client.post<unknown>(
      "/monitors/batch",
      parseJsonObject(options.bodyJson, "--body-json"),
    );
    printMaybeJson(response, options.json);
  });
