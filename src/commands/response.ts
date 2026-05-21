import { Command } from "commander";
import { printJson, printLine } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  encodePath,
  getString,
  type JsonObject,
  mergeBodyJson,
  parseInteger,
  parseJsonObject,
  pollUntilTerminal,
  printMaybeJson,
  printStream,
} from "./_shared.js";

interface ResponseCreateOptions extends CommonOptions {
  model?: string;
  instructions?: string;
  outputSchema?: string;
  schemaName?: string;
  schemaDescription?: string;
  strict?: boolean;
  stream?: boolean;
  wait?: boolean;
  pollInterval?: number;
  bodyJson?: string;
}

interface ResponseGetOptions extends CommonOptions {
  stream?: boolean;
}

interface OpenAIResponse extends JsonObject {
  id?: string;
  status?: string;
  output_text?: string;
}

function textFormat(options: ResponseCreateOptions): JsonObject | undefined {
  if (options.outputSchema === undefined) return undefined;
  return {
    text: {
      format: {
        type: "json_schema",
        schema: parseJsonObject(options.outputSchema, "--output-schema"),
        ...(options.schemaName !== undefined ? { name: options.schemaName } : {}),
        ...(options.schemaDescription !== undefined
          ? { description: options.schemaDescription }
          : {}),
        ...(options.strict !== undefined ? { strict: options.strict } : {}),
      },
    },
  };
}

function printResponse(response: OpenAIResponse): void {
  if (response.output_text !== undefined) {
    printLine(response.output_text);
    return;
  }
  printMaybeJson(response, false);
}

export const responseCommand = new Command("response").description(
  "Create and retrieve OpenAI-compatible Exa research responses.",
);

responseCommand
  .command("create")
  .description("Create a response.")
  .argument("<input>", "input prompt")
  .option("--model <model>", "model: exa-research or exa-research-pro", "exa-research")
  .option("--instructions <instructions>", "additional instructions")
  .option("--output-schema <json>", "JSON schema for structured output")
  .option("--schema-name <name>", "structured output schema name")
  .option("--schema-description <description>", "structured output schema description")
  .option("--strict", "enable strict schema adherence")
  .option("--stream", "stream server-sent response events")
  .option("--wait", "poll until the response reaches a terminal status")
  .option("--poll-interval <ms>", "poll interval for --wait", parseInteger, 2000)
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (input: string, options: ResponseCreateOptions) => {
    const client = clientFor(options);
    const body: JsonObject = { input, model: options.model ?? "exa-research" };
    addIfDefined(body, "instructions", options.instructions);
    addIfDefined(body, "stream", options.stream);
    Object.assign(body, textFormat(options));

    const request = mergeBodyJson(body, options.bodyJson);
    if (options.stream === true) {
      const stream = await client.postStream("/responses", request, {
        headers: { Accept: "text/event-stream" },
      });
      await printStream(stream);
      return;
    }

    let response = await client.post<OpenAIResponse>("/responses", request);
    if (options.wait === true) {
      const id = getString(response, "id");
      if (id === undefined) throw new Error("Response create response did not include id.");
      response = await pollUntilTerminal(
        response,
        (value) => getString(value, "status"),
        () => client.get<OpenAIResponse>(`/responses/${encodePath(id)}`),
        options.pollInterval ?? 2000,
      );
    }

    if (options.json === true) {
      printJson(response);
    } else {
      printResponse(response);
    }
  });

responseCommand
  .command("get")
  .description("Retrieve a response by ID.")
  .argument("<id>", "response ID")
  .option("--stream", "stream response events when supported")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: ResponseGetOptions) => {
    const client = clientFor(options);
    const path = `/responses/${encodePath(id)}`;
    if (options.stream === true) {
      const stream = await client.stream(path, {
        headers: { Accept: "text/event-stream" },
        query: { stream: true },
      });
      await printStream(stream);
      return;
    }

    const response = await client.get<OpenAIResponse>(path);
    if (options.json === true) {
      printJson(response);
    } else {
      printResponse(response);
    }
  });
