import { Command } from "commander";
import { printLine } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
  parseJsonObject,
  printMaybeJson,
  readStdinLines,
  splitList,
} from "./_shared.js";

interface ContentsOptions extends CommonOptions {
  maxCharacters?: number;
  includeHtmlTags?: boolean;
  verbosity?: string;
  includeSections?: string;
  excludeSections?: string;
  highlights?: boolean;
  highlightsQuery?: string;
  summary?: boolean;
  summaryQuery?: string;
  summarySchema?: string;
  livecrawl?: string;
  livecrawlTimeout?: number;
  maxAgeHours?: number;
  subpages?: number;
  subpageTarget?: string;
  links?: number;
  imageLinks?: number;
  compliance?: string;
  bodyJson?: string;
}

interface ContentsResult {
  url?: string;
  id?: string;
  title?: string;
  text?: string;
  summary?: string | JsonObject;
  status?: string;
}

interface ContentsResponse {
  results?: ContentsResult[];
}

function contentOptions(options: ContentsOptions): JsonObject {
  const body: JsonObject = {};

  const textOptions: JsonObject = {};
  addIfDefined(textOptions, "maxCharacters", options.maxCharacters);
  addIfDefined(textOptions, "includeHtmlTags", options.includeHtmlTags);
  addIfDefined(textOptions, "verbosity", options.verbosity);
  if (options.includeSections !== undefined) {
    textOptions.includeSections = splitList(options.includeSections);
  }
  if (options.excludeSections !== undefined) {
    textOptions.excludeSections = splitList(options.excludeSections);
  }
  body.text = Object.keys(textOptions).length > 0 ? textOptions : true;

  if (options.highlights === true || options.highlightsQuery !== undefined) {
    body.highlights =
      options.highlightsQuery === undefined ? true : { query: options.highlightsQuery };
  }

  if (
    options.summary === true ||
    options.summaryQuery !== undefined ||
    options.summarySchema !== undefined
  ) {
    const summary: JsonObject = {};
    addIfDefined(summary, "query", options.summaryQuery);
    if (options.summarySchema !== undefined) {
      summary.schema = parseJsonObject(options.summarySchema, "--summary-schema");
    }
    body.summary = summary;
  }

  addIfDefined(body, "livecrawl", options.livecrawl);
  addIfDefined(body, "livecrawlTimeout", options.livecrawlTimeout);
  addIfDefined(body, "maxAgeHours", options.maxAgeHours);
  addIfDefined(body, "subpages", options.subpages);
  if (options.subpageTarget !== undefined) {
    body.subpageTarget = options.subpageTarget.includes(",")
      ? splitList(options.subpageTarget)
      : options.subpageTarget;
  }
  if (options.links !== undefined || options.imageLinks !== undefined) {
    body.extras = {
      ...(options.links !== undefined ? { links: options.links } : {}),
      ...(options.imageLinks !== undefined ? { imageLinks: options.imageLinks } : {}),
    };
  }
  addIfDefined(body, "compliance", options.compliance);

  return body;
}

function printContents(response: ContentsResponse): void {
  for (const [index, result] of (response.results ?? []).entries()) {
    if (index > 0) printLine();
    printLine(`${index + 1}. ${result.title ?? result.url ?? result.id ?? "(untitled)"}`);
    if (result.url !== undefined) printLine(`   ${result.url}`);
    if (result.status !== undefined) printLine(`   status: ${result.status}`);
    if (result.summary !== undefined) {
      printLine();
      printLine(
        `   summary: ${
          typeof result.summary === "string" ? result.summary : JSON.stringify(result.summary)
        }`,
      );
    }
    if (result.text !== undefined) {
      printLine();
      printLine(result.text);
    }
  }
}

export const contentsCommand = new Command("contents")
  .description("Fetch clean page contents for one or more URLs.")
  .argument("[urls...]", "URLs to fetch; newline-delimited URLs may also be read from stdin")
  .option("--max-characters <count>", "maximum returned text characters", parseInteger)
  .option("--include-html-tags", "include HTML tags in extracted text")
  .option("--verbosity <level>", "text verbosity: compact, standard, full")
  .option("--include-sections <sections>", "comma-separated semantic sections to include")
  .option("--exclude-sections <sections>", "comma-separated semantic sections to exclude")
  .option("--highlights", "include highlights")
  .option("--highlights-query <query>", "query to guide highlight selection")
  .option("--summary", "include a summary")
  .option("--summary-query <query>", "query to guide summary generation")
  .option("--summary-schema <json>", "JSON schema for structured summary output")
  .option("--livecrawl <mode>", "livecrawl mode: never, fallback, preferred, always")
  .option("--livecrawl-timeout <ms>", "livecrawl timeout in milliseconds", parseInteger)
  .option("--max-age-hours <hours>", "maximum cache age before livecrawling", parseInteger)
  .option("--subpages <count>", "number of subpages to crawl", parseInteger)
  .option("--subpage-target <target>", "subpage target string or comma-separated targets")
  .option("--links <count>", "number of links to return per page", parseInteger)
  .option("--image-links <count>", "number of image links to return per page", parseInteger)
  .option("--compliance <mode>", "enterprise compliance mode, such as hipaa")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (urls: string[], options: ContentsOptions) => {
    const stdinUrls = await readStdinLines();
    const allUrls = [...urls, ...stdinUrls];
    if (allUrls.length === 0) {
      throw new Error("Provide at least one URL argument or newline-delimited URLs on stdin.");
    }

    const client = clientFor(options);
    const body = mergeBodyJson({ urls: allUrls, ...contentOptions(options) }, options.bodyJson);
    const response = await client.post<ContentsResponse>("/contents", body);

    if (options.json === true) {
      printMaybeJson(response, true);
    } else {
      printContents(response);
    }
  });
