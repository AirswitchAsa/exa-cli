import { Command } from "commander";
import { printJson, printLine } from "../output.js";
import {
  type CommonOptions,
  clientFor,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
} from "./_shared.js";

interface ContextOptions extends CommonOptions {
  tokens?: number;
  dynamic?: boolean;
  bodyJson?: string;
}

interface ContextResponse {
  response?: string;
}

export const contextCommand = new Command("context")
  .description("Create LLM-ready context for a query.")
  .argument("<query>", "query to search for")
  .option("--tokens <count>", "target token count, 50-100000", parseInteger)
  .option("--dynamic", "let Exa choose the context token count dynamically")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (query: string, options: ContextOptions) => {
    const client = clientFor(options);
    const body: JsonObject = {
      query,
      tokensNum: options.dynamic === true ? "dynamic" : (options.tokens ?? 4096),
    };
    const response = await client.post<ContextResponse>(
      "/context",
      mergeBodyJson(body, options.bodyJson),
    );

    if (options.json === true) {
      printJson(response);
    } else {
      printLine(response.response ?? "");
    }
  });
