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
  bodyJson?: string;
}

interface ContextResponse {
  response?: string;
}

export const contextCommand = new Command("context")
  .description("Retrieve token-efficient code context (Exa Code) for a query.")
  .argument("<query>", "query describing the code, library, or API you need")
  .option(
    "--tokens <count>",
    "target token count, 50-100000; omit to let Exa size the response dynamically",
    parseInteger,
  )
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (query: string, options: ContextOptions) => {
    const client = clientFor();
    const body: JsonObject = {
      query,
      tokensNum: options.tokens ?? "dynamic",
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
