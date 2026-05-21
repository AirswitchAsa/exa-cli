import { Command } from "commander";
import { printJson, printLine } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
  splitList,
} from "./_shared.js";

interface SimilarOptions extends CommonOptions {
  numResults?: number;
  includeDomains?: string;
  excludeDomains?: string;
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  moderation?: boolean;
  text?: boolean;
  bodyJson?: string;
}

interface SimilarResult {
  title?: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
}

interface SimilarResponse {
  results: SimilarResult[];
}

function printResults(response: SimilarResponse): void {
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
}

export const similarCommand = new Command("similar")
  .description("Find pages similar to a given URL.")
  .argument("<url>", "source URL")
  .option("-n, --num-results <count>", "number of results to return", parseInteger)
  .option("--include-domains <domains>", "comma-separated domains to include")
  .option("--exclude-domains <domains>", "comma-separated domains to exclude")
  .option("--start-crawl-date <date>", "only include links crawled after this ISO date")
  .option("--end-crawl-date <date>", "only include links crawled before this ISO date")
  .option("--start-published-date <date>", "only include links published after this ISO date")
  .option("--end-published-date <date>", "only include links published before this ISO date")
  .option("--moderation", "enable content moderation")
  .option("--text", "include full page text for each result")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (url: string, options: SimilarOptions) => {
    const client = clientFor(options);
    const body: JsonObject = { url };
    addIfDefined(body, "numResults", options.numResults);
    addIfDefined(body, "startCrawlDate", options.startCrawlDate);
    addIfDefined(body, "endCrawlDate", options.endCrawlDate);
    addIfDefined(body, "startPublishedDate", options.startPublishedDate);
    addIfDefined(body, "endPublishedDate", options.endPublishedDate);
    addIfDefined(body, "moderation", options.moderation);
    if (options.includeDomains !== undefined)
      body.includeDomains = splitList(options.includeDomains);
    if (options.excludeDomains !== undefined)
      body.excludeDomains = splitList(options.excludeDomains);
    if (options.text === true) body.contents = { text: true };

    const response = await client.post<SimilarResponse>(
      "/findSimilar",
      mergeBodyJson(body, options.bodyJson),
    );

    if (options.json === true) {
      printJson(response);
    } else {
      printResults(response);
    }
  });
