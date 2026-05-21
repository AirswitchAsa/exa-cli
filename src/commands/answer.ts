import { Command } from "commander";
import { printJson, printLine } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  type JsonObject,
  mergeBodyJson,
  parseJsonObject,
} from "./_shared.js";

interface AnswerOptions extends CommonOptions {
  text?: boolean;
  outputSchema?: string;
  bodyJson?: string;
}

interface AnswerCitation {
  title?: string;
  url?: string;
}

interface AnswerResponse {
  answer?: string | JsonObject;
  citations?: AnswerCitation[];
}

function printAnswer(response: AnswerResponse): void {
  if (typeof response.answer === "string") {
    printLine(response.answer);
  } else if (response.answer !== undefined) {
    printJson(response.answer);
  }

  if (response.citations !== undefined && response.citations.length > 0) {
    printLine();
    response.citations.forEach((citation, index) => {
      printLine(`${index + 1}. ${citation.title ?? citation.url ?? "(untitled)"}`);
      if (citation.url !== undefined) printLine(`   ${citation.url}`);
    });
  }
}

export const answerCommand = new Command("answer")
  .description("Get an LLM answer to a question, informed by Exa search.")
  .argument("<question>", "question to answer")
  .option("--text", "include full text contents in cited search results")
  .option("--output-schema <json>", "JSON schema for structured answer output")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (question: string, options: AnswerOptions) => {
    const client = clientFor(options);
    const body: JsonObject = { query: question };
    addIfDefined(body, "text", options.text);
    if (options.outputSchema !== undefined) {
      body.outputSchema = parseJsonObject(options.outputSchema, "--output-schema");
    }

    const response = await client.post<AnswerResponse>(
      "/answer",
      mergeBodyJson(body, options.bodyJson),
    );

    if (options.json === true) {
      printJson(response);
    } else {
      printAnswer(response);
    }
  });
