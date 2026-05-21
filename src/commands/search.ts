import { Command } from "commander";
import { printJson, printLine } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
  parseJsonObject,
  printStream,
  splitList,
} from "./_shared.js";

interface SearchOptions extends CommonOptions {
  numResults?: number;
  type?: string;
  category?: string;
  additionalQueries?: string;
  includeDomains?: string;
  excludeDomains?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  userLocation?: string;
  compliance?: string;
  moderation?: boolean;
  text?: boolean;
  highlights?: boolean;
  summary?: boolean;
  outputSchema?: string;
  systemPrompt?: string;
  stream?: boolean;
  bodyJson?: string;
}

interface SearchResult {
  title?: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
}

interface SearchResponse {
  results: SearchResult[];
}

export const searchCommand = new Command("search")
  .description("Search the web and extract contents from the results.")
  .argument("<query>", "search query")
  .option("-n, --num-results <count>", "number of results to return", parseInteger)
  .option(
    "-t, --type <type>",
    "search type: neural, auto, fast, deep-lite, deep, deep-reasoning, instant",
  )
  .option("-c, --category <category>", "result category filter")
  .option("--additional-queries <queries>", "comma-separated additional deep-search queries")
  .option("--include-domains <domains>", "comma-separated domains to include")
  .option("--exclude-domains <domains>", "comma-separated domains to exclude")
  .option("--start-crawl-date <date>", "only include links crawled after this ISO date")
  .option("--end-crawl-date <date>", "only include links crawled before this ISO date")
  .option("--start-published-date <date>", "only include links published after this ISO date")
  .option("--end-published-date <date>", "only include links published before this ISO date")
  .option("--user-location <country>", "two-letter ISO country code for localization")
  .option("--compliance <mode>", "enterprise compliance mode, such as hipaa")
  .option("--moderation", "enable content moderation")
  .option("--text", "include full page text for each result")
  .option("--highlights", "include highlights for each result")
  .option("--summary", "include summaries for each result")
  .option("--output-schema <json>", "JSON schema for synthesized output")
  .option("--system-prompt <prompt>", "instructions for synthesized output or search planning")
  .option("--stream", "stream OpenAI-compatible chunks when supported by the search type")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (query: string, options: SearchOptions) => {
    const client = clientFor();

    const body: JsonObject = { query };
    addIfDefined(body, "numResults", options.numResults);
    addIfDefined(body, "type", options.type);
    addIfDefined(body, "category", options.category);
    addIfDefined(body, "startCrawlDate", options.startCrawlDate);
    addIfDefined(body, "endCrawlDate", options.endCrawlDate);
    addIfDefined(body, "startPublishedDate", options.startPublishedDate);
    addIfDefined(body, "endPublishedDate", options.endPublishedDate);
    addIfDefined(body, "userLocation", options.userLocation);
    addIfDefined(body, "compliance", options.compliance);
    addIfDefined(body, "moderation", options.moderation);
    addIfDefined(body, "systemPrompt", options.systemPrompt);
    addIfDefined(body, "stream", options.stream);
    if (options.additionalQueries !== undefined) {
      body.additionalQueries = splitList(options.additionalQueries);
    }
    if (options.includeDomains !== undefined) {
      body.includeDomains = splitList(options.includeDomains);
    }
    if (options.excludeDomains !== undefined) {
      body.excludeDomains = splitList(options.excludeDomains);
    }
    if (options.text === true || options.highlights === true || options.summary === true) {
      body.contents = {
        ...(options.text === true ? { text: true } : {}),
        ...(options.highlights === true ? { highlights: true } : {}),
        ...(options.summary === true ? { summary: true } : {}),
      };
    }
    if (options.outputSchema !== undefined) {
      body.outputSchema = parseJsonObject(options.outputSchema, "--output-schema");
    }

    const request = mergeBodyJson(body, options.bodyJson);

    if (options.stream === true) {
      const stream = await client.postStream("/search", request, {
        headers: { Accept: "text/event-stream" },
      });
      await printStream(stream);
      return;
    }

    const response = await client.post<SearchResponse>("/search", request);

    if (options.json === true) {
      printJson(response);
      return;
    }

    response.results.forEach((result, index) => {
      printLine(`${index + 1}. ${result.title ?? "(untitled)"}`);
      printLine(`   ${result.url}`);
      if (result.publishedDate !== undefined) printLine(`   ${result.publishedDate}`);
      if (result.summary !== undefined) {
        printLine();
        printLine(`   summary: ${result.summary.replace(/\s+/g, " ").trim()}`);
      }
      if (result.highlights !== undefined && result.highlights.length > 0) {
        printLine();
        for (const highlight of result.highlights) {
          printLine(`   - ${highlight.replace(/\s+/g, " ").trim()}`);
        }
      }
      if (result.text !== undefined) {
        printLine();
        printLine(`   ${result.text.slice(0, 600).replace(/\s+/g, " ").trim()}`);
      }
      printLine();
    });
  });
