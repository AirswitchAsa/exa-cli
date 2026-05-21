import { Command } from "commander";
import { printJson } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  encodePath,
  getString,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
  parseJson,
  parseJsonObject,
  pollUntilTerminal,
  printMaybeJson,
} from "./_shared.js";

const WEBSETS_BASE_URL = "https://api.exa.ai/websets";

interface WebsetCreateOptions extends CommonOptions {
  query?: string;
  count?: number;
  title?: string;
  externalId?: string;
  metadata?: string;
  searchJson?: string;
  importJson?: string[];
  enrichmentJson?: string[];
  excludeJson?: string[];
  wait?: boolean;
  pollInterval?: number;
  bodyJson?: string;
}

interface WebsetUpdateOptions extends CommonOptions {
  title?: string;
  metadata?: string;
  clearMetadata?: boolean;
  bodyJson?: string;
}

interface WebsetListOptions extends CommonOptions {
  cursor?: string;
  limit?: number;
  search?: string;
}

interface WebsetGetOptions extends CommonOptions {
  expand?: string;
}

interface WebsetPreviewOptions extends CommonOptions {
  query?: string;
  count?: number;
  search?: boolean;
  bodyJson?: string;
}

interface SearchOptions extends CommonOptions {
  query?: string;
  count?: number;
  behavior?: string;
  bodyJson?: string;
}

interface PageOptions extends CommonOptions {
  cursor?: string;
  limit?: number;
  sourceId?: string;
}

interface EnrichmentOptions extends CommonOptions {
  description?: string;
  format?: string;
  options?: string;
  metadata?: string;
  clearMetadata?: boolean;
  bodyJson?: string;
}

interface ImportCreateOptions extends CommonOptions {
  size?: number;
  count?: number;
  title?: string;
  format?: string;
  entity?: string;
  csvIdentifier?: number;
  metadata?: string;
  bodyJson?: string;
}

interface ImportUpdateOptions extends CommonOptions {
  title?: string;
  metadata?: string;
  bodyJson?: string;
}

interface ExportOptions extends CommonOptions {
  format?: string;
  bodyJson?: string;
}

function collect(value: string, previous: string[] = []): string[] {
  previous.push(value);
  return previous;
}

function parseJsonArray(values: string[] | undefined, label: string): unknown[] | undefined {
  return values?.map((value) => parseJson(value, label));
}

function websetClient(options: CommonOptions) {
  return clientFor(options, WEBSETS_BASE_URL);
}

function websetBody(options: WebsetCreateOptions): JsonObject {
  const body: JsonObject = {};
  if (
    options.query !== undefined ||
    options.count !== undefined ||
    options.searchJson !== undefined
  ) {
    body.search =
      options.searchJson === undefined
        ? {
            ...(options.query !== undefined ? { query: options.query } : {}),
            ...(options.count !== undefined ? { count: options.count } : {}),
          }
        : {
            ...(options.query !== undefined ? { query: options.query } : {}),
            ...(options.count !== undefined ? { count: options.count } : {}),
            ...parseJsonObject(options.searchJson, "--search-json"),
          };
  }
  addIfDefined(body, "title", options.title);
  addIfDefined(body, "externalId", options.externalId);
  if (options.metadata !== undefined)
    body.metadata = parseJsonObject(options.metadata, "--metadata");
  const imports = parseJsonArray(options.importJson, "--import-json");
  if (imports !== undefined) body.import = imports;
  const enrichments = parseJsonArray(options.enrichmentJson, "--enrichment-json");
  if (enrichments !== undefined) body.enrichments = enrichments;
  const excludes = parseJsonArray(options.excludeJson, "--exclude-json");
  if (excludes !== undefined) body.exclude = excludes;
  return mergeBodyJson(body, options.bodyJson);
}

function updateBody(options: WebsetUpdateOptions): JsonObject {
  const body: JsonObject = {};
  addIfDefined(body, "title", options.title);
  if (options.clearMetadata === true) {
    body.metadata = null;
  } else if (options.metadata !== undefined) {
    body.metadata = parseJsonObject(options.metadata, "--metadata");
  }
  return mergeBodyJson(body, options.bodyJson);
}

function enrichmentBody(options: EnrichmentOptions): JsonObject {
  const body: JsonObject = {};
  addIfDefined(body, "description", options.description);
  addIfDefined(body, "format", options.format);
  if (options.options !== undefined) {
    body.options = options.options.split(",").map((label) => ({ label: label.trim() }));
  }
  if (options.clearMetadata === true) {
    body.metadata = null;
  } else if (options.metadata !== undefined) {
    body.metadata = parseJsonObject(options.metadata, "--metadata");
  }
  return mergeBodyJson(body, options.bodyJson);
}

export const websetCommand = new Command("webset").description(
  "Websets: curated, enriched collections.",
);

websetCommand
  .command("create")
  .description("Create a webset.")
  .option("--query <query>", "initial search query")
  .option("--count <count>", "number of items to find", parseInteger)
  .option("--title <title>", "webset title")
  .option("--external-id <id>", "external identifier")
  .option("--metadata <json>", "metadata object")
  .option("--search-json <json>", "full search object")
  .option("--import-json <json>", "import source object; repeatable", collect)
  .option("--enrichment-json <json>", "enrichment object; repeatable", collect)
  .option("--exclude-json <json>", "global exclusion source object; repeatable", collect)
  .option("--wait", "poll until the webset reaches idle")
  .option("--poll-interval <ms>", "poll interval for --wait", parseInteger, 2000)
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: WebsetCreateOptions) => {
    const client = websetClient(options);
    let response = await client.post<JsonObject>("/v0/websets", websetBody(options));
    if (options.wait === true) {
      const id = getString(response, "id");
      if (id === undefined) throw new Error("Webset create response did not include id.");
      response = await pollUntilTerminal(
        response,
        (value) => getString(value, "status"),
        () => client.get<JsonObject>(`/v0/websets/${encodePath(id)}`),
        options.pollInterval ?? 2000,
      );
    }
    printMaybeJson(response, options.json);
  });

websetCommand
  .command("get")
  .description("Retrieve a webset by ID.")
  .argument("<id>", "webset ID or external ID")
  .option("--expand <values>", "comma-separated resources to expand, such as items")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: WebsetGetOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>(`/v0/websets/${encodePath(id)}`, {
      query: { expand: options.expand },
    });
    printMaybeJson(response, options.json);
  });

websetCommand
  .command("list")
  .description("List websets.")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of websets to return", parseInteger)
  .option("--search <term>", "filter by ID, external ID, or title")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: WebsetListOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>("/v0/websets", {
      query: { cursor: options.cursor, limit: options.limit, search: options.search },
    });
    printMaybeJson(response, options.json, true);
  });

websetCommand
  .command("update")
  .description("Update a webset.")
  .argument("<id>", "webset ID or external ID")
  .option("--title <title>", "webset title")
  .option("--metadata <json>", "metadata object")
  .option("--clear-metadata", "remove metadata")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: WebsetUpdateOptions) => {
    const client = websetClient(options);
    const response = await client.post<unknown>(
      `/v0/websets/${encodePath(id)}`,
      updateBody(options),
    );
    printMaybeJson(response, options.json);
  });

websetCommand
  .command("delete")
  .description("Delete a webset.")
  .argument("<id>", "webset ID or external ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.delete<unknown>(`/v0/websets/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

websetCommand
  .command("cancel")
  .description("Cancel running webset operations.")
  .argument("<id>", "webset ID or external ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.post<unknown>(`/v0/websets/${encodePath(id)}/cancel`);
    printMaybeJson(response, options.json);
  });

websetCommand
  .command("preview")
  .description("Preview search decomposition.")
  .option("--query <query>", "search query to preview")
  .option("--count <count>", "number of preview items when --search is set", parseInteger)
  .option("--search", "include preview items")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: WebsetPreviewOptions) => {
    const client = websetClient(options);
    const body = mergeBodyJson(
      {
        search: {
          ...(options.query !== undefined ? { query: options.query } : {}),
          ...(options.count !== undefined ? { count: options.count } : {}),
        },
      },
      options.bodyJson,
    );
    const response = await client.post<unknown>("/v0/websets/preview", body, {
      query: { search: options.search },
    });
    printMaybeJson(response, options.json);
  });

const searchCommand = websetCommand
  .command("search")
  .description("Manage searches within a webset.");

searchCommand
  .command("create")
  .description("Create a search within a webset.")
  .argument("<webset>", "webset ID")
  .option("--query <query>", "search query")
  .option("--count <count>", "number of items to find", parseInteger)
  .option("--behavior <behavior>", "behavior: override or append")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, options: SearchOptions) => {
    const client = websetClient(options);
    const body = mergeBodyJson(
      {
        ...(options.query !== undefined ? { query: options.query } : {}),
        ...(options.count !== undefined ? { count: options.count } : {}),
        ...(options.behavior !== undefined ? { behavior: options.behavior } : {}),
      },
      options.bodyJson,
    );
    const response = await client.post<unknown>(`/v0/websets/${encodePath(webset)}/searches`, body);
    printMaybeJson(response, options.json);
  });

searchCommand
  .command("get")
  .description("Retrieve a webset search.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "search ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>(
      `/v0/websets/${encodePath(webset)}/searches/${encodePath(id)}`,
    );
    printMaybeJson(response, options.json);
  });

searchCommand
  .command("cancel")
  .description("Cancel a running webset search.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "search ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.post<unknown>(
      `/v0/websets/${encodePath(webset)}/searches/${encodePath(id)}/cancel`,
    );
    printMaybeJson(response, options.json);
  });

const itemsCommand = websetCommand
  .command("items")
  .description("List, get, and delete webset items.");

itemsCommand
  .command("list")
  .description("List webset items.")
  .argument("<webset>", "webset ID")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of items to return", parseInteger)
  .option("--source-id <id>", "source ID filter")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, options: PageOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>(`/v0/websets/${encodePath(webset)}/items`, {
      query: { cursor: options.cursor, limit: options.limit, sourceId: options.sourceId },
    });
    printMaybeJson(response, options.json, true);
  });

itemsCommand
  .command("get")
  .description("Retrieve a webset item.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "item ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>(
      `/v0/websets/${encodePath(webset)}/items/${encodePath(id)}`,
    );
    printMaybeJson(response, options.json);
  });

itemsCommand
  .command("delete")
  .description("Delete a webset item.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "item ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.delete<unknown>(
      `/v0/websets/${encodePath(webset)}/items/${encodePath(id)}`,
    );
    printMaybeJson(response, options.json);
  });

const enrichCommand = websetCommand.command("enrich").description("Manage webset enrichments.");

enrichCommand
  .command("create")
  .description("Create an enrichment field.")
  .argument("<webset>", "webset ID")
  .option("--description <description>", "enrichment task description")
  .option("--format <format>", "format: text, date, number, options, email, phone, url")
  .option("--options <labels>", "comma-separated labels for options format")
  .option("--metadata <json>", "metadata object")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, options: EnrichmentOptions) => {
    const client = websetClient(options);
    const response = await client.post<unknown>(
      `/v0/websets/${encodePath(webset)}/enrichments`,
      enrichmentBody(options),
    );
    printMaybeJson(response, options.json);
  });

enrichCommand
  .command("get")
  .description("Retrieve an enrichment.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "enrichment ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>(
      `/v0/websets/${encodePath(webset)}/enrichments/${encodePath(id)}`,
    );
    printMaybeJson(response, options.json);
  });

enrichCommand
  .command("update")
  .description("Update an enrichment.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "enrichment ID")
  .option("--description <description>", "enrichment task description")
  .option("--format <format>", "format: text, date, number, options, email, phone, url")
  .option("--options <labels>", "comma-separated labels for options format")
  .option("--metadata <json>", "metadata object")
  .option("--clear-metadata", "remove metadata")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: EnrichmentOptions) => {
    const client = websetClient(options);
    const response = await client.patch<unknown>(
      `/v0/websets/${encodePath(webset)}/enrichments/${encodePath(id)}`,
      enrichmentBody(options),
    );
    printMaybeJson(response, options.json);
  });

enrichCommand
  .command("delete")
  .description("Delete an enrichment.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "enrichment ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.delete<unknown>(
      `/v0/websets/${encodePath(webset)}/enrichments/${encodePath(id)}`,
    );
    printMaybeJson(response, options.json);
  });

enrichCommand
  .command("cancel")
  .description("Cancel a running enrichment.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "enrichment ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.post<unknown>(
      `/v0/websets/${encodePath(webset)}/enrichments/${encodePath(id)}/cancel`,
    );
    printMaybeJson(response, options.json);
  });

const importCommand = websetCommand.command("import").description("Manage Websets imports.");

importCommand
  .command("create")
  .description("Create an import for data upload.")
  .option("--size <bytes>", "file size in bytes", parseInteger)
  .option("--count <count>", "number of records", parseInteger)
  .option("--title <title>", "import title")
  .option("--format <format>", "import format, usually csv")
  .option("--entity <json>", "entity object")
  .option("--csv-identifier <index>", "CSV identifier column index", parseInteger)
  .option("--metadata <json>", "metadata object")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: ImportCreateOptions) => {
    const client = websetClient(options);
    const body: JsonObject = {};
    addIfDefined(body, "size", options.size);
    addIfDefined(body, "count", options.count);
    addIfDefined(body, "title", options.title);
    addIfDefined(body, "format", options.format);
    if (options.entity !== undefined) body.entity = parseJsonObject(options.entity, "--entity");
    if (options.csvIdentifier !== undefined) body.csv = { identifier: options.csvIdentifier };
    if (options.metadata !== undefined)
      body.metadata = parseJsonObject(options.metadata, "--metadata");
    const response = await client.post<unknown>(
      "/v0/imports",
      mergeBodyJson(body, options.bodyJson),
    );
    printMaybeJson(response, options.json);
  });

importCommand
  .command("list")
  .description("List imports.")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of imports to return", parseInteger)
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (options: PageOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>("/v0/imports", {
      query: { cursor: options.cursor, limit: options.limit },
    });
    printMaybeJson(response, options.json, true);
  });

importCommand
  .command("get")
  .description("Retrieve an import.")
  .argument("<id>", "import ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>(`/v0/imports/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

importCommand
  .command("update")
  .description("Update an import.")
  .argument("<id>", "import ID")
  .option("--title <title>", "import title")
  .option("--metadata <json>", "metadata object")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: ImportUpdateOptions) => {
    const client = websetClient(options);
    const body: JsonObject = {};
    addIfDefined(body, "title", options.title);
    if (options.metadata !== undefined)
      body.metadata = parseJsonObject(options.metadata, "--metadata");
    const response = await client.patch<unknown>(
      `/v0/imports/${encodePath(id)}`,
      mergeBodyJson(body, options.bodyJson),
    );
    printMaybeJson(response, options.json);
  });

importCommand
  .command("delete")
  .description("Delete an import.")
  .argument("<id>", "import ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.delete<unknown>(`/v0/imports/${encodePath(id)}`);
    printMaybeJson(response, options.json);
  });

const exportCommand = websetCommand.command("export").description("Schedule and retrieve exports.");

exportCommand
  .command("create")
  .alias("schedule")
  .description("Schedule a webset export.")
  .argument("<webset>", "webset ID")
  .option("--format <format>", "export format")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, options: ExportOptions) => {
    const client = websetClient(options);
    const body = mergeBodyJson(
      { ...(options.format !== undefined ? { format: options.format } : {}) },
      options.bodyJson,
    );
    const response = await client.post<unknown>(`/v0/websets/${encodePath(webset)}/exports`, body);
    printMaybeJson(response, options.json);
  });

exportCommand
  .command("get")
  .description("Retrieve a webset export.")
  .argument("<webset>", "webset ID")
  .argument("<id>", "export ID")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (webset: string, id: string, options: CommonOptions) => {
    const client = websetClient(options);
    const response = await client.get<unknown>(
      `/v0/websets/${encodePath(webset)}/exports/${encodePath(id)}`,
    );
    if (options.json === true) {
      printJson(response);
    } else {
      printMaybeJson(response, false);
    }
  });
