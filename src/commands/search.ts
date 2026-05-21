import { Command } from "commander";
import { ExaClient } from "../client.js";
import { resolveApiKey } from "../config.js";
import { printJson, printLine } from "../output.js";

interface SearchOptions {
  numResults?: number;
  type?: string;
  category?: string;
  includeDomains?: string;
  excludeDomains?: string;
  text?: boolean;
  apiKey?: string;
  json?: boolean;
}

interface SearchResult {
  title?: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
}

interface SearchResponse {
  results: SearchResult[];
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export const searchCommand = new Command("search")
  .description("Search the web and extract contents from the results.")
  .argument("<query>", "search query")
  .option("-n, --num-results <count>", "number of results to return", (v) => Number.parseInt(v, 10))
  .option("-t, --type <type>", "search type: auto, fast, deep, instant")
  .option("-c, --category <category>", "result category filter")
  .option("--include-domains <domains>", "comma-separated domains to include")
  .option("--exclude-domains <domains>", "comma-separated domains to exclude")
  .option("--text", "include full page text for each result")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (query: string, options: SearchOptions) => {
    const client = new ExaClient({ apiKey: resolveApiKey(options.apiKey) });

    const body: Record<string, unknown> = { query };
    if (options.numResults !== undefined) body.numResults = options.numResults;
    if (options.type !== undefined) body.type = options.type;
    if (options.category !== undefined) body.category = options.category;
    if (options.includeDomains !== undefined) {
      body.includeDomains = splitList(options.includeDomains);
    }
    if (options.excludeDomains !== undefined) {
      body.excludeDomains = splitList(options.excludeDomains);
    }
    if (options.text === true) body.contents = { text: true };

    const response = await client.post<SearchResponse>("/search", body);

    if (options.json === true) {
      printJson(response);
      return;
    }

    response.results.forEach((result, index) => {
      printLine(`${index + 1}. ${result.title ?? "(untitled)"}`);
      printLine(`   ${result.url}`);
      if (result.publishedDate !== undefined) printLine(`   ${result.publishedDate}`);
      if (result.text !== undefined) {
        printLine();
        printLine(`   ${result.text.slice(0, 600).replace(/\s+/g, " ").trim()}`);
      }
      printLine();
    });
  });
