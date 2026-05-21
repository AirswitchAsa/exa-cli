import { Command } from "commander";
import { printJson, printLine } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  type JsonObject,
  mergeBodyJson,
  parseJson,
  parseJsonObject,
  printStream,
} from "./_shared.js";

interface ChatOptions extends CommonOptions {
  model?: string;
  system?: string;
  message?: string[];
  messagesJson?: string;
  query?: string;
  text?: boolean;
  outputSchema?: string;
  userLocation?: string;
  behavior?: string;
  stream?: boolean;
  bodyJson?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
      citations?: Array<{ title?: string; url?: string }>;
    };
  }>;
}

function collect(value: string, previous: string[] = []): string[] {
  previous.push(value);
  return previous;
}

function messagesFrom(prompt: string, options: ChatOptions): unknown[] {
  if (options.messagesJson !== undefined) {
    const parsed = parseJson(options.messagesJson, "--messages-json");
    if (!Array.isArray(parsed)) throw new Error("--messages-json must be a JSON array.");
    return parsed;
  }

  const messages: JsonObject[] = [];
  if (options.system !== undefined) {
    messages.push({ role: "system", content: options.system });
  }
  for (const message of options.message ?? []) {
    messages.push({ role: "user", content: message });
  }
  messages.push({ role: "user", content: prompt });
  return messages;
}

function printChat(response: ChatCompletionResponse): void {
  const message = response.choices?.[0]?.message;
  if (message?.content !== undefined) printLine(message.content);

  if (message?.citations !== undefined && message.citations.length > 0) {
    printLine();
    message.citations.forEach((citation, index) => {
      printLine(`${index + 1}. ${citation.title ?? citation.url ?? "(untitled)"}`);
      if (citation.url !== undefined) printLine(`   ${citation.url}`);
    });
  }
}

export const chatCommand = new Command("chat")
  .description("Create an OpenAI-compatible Exa chat completion.")
  .argument("<prompt>", "user prompt")
  .option("--model <model>", "model: exa, exa-pro, exa-research, exa-research-pro")
  .option("--system <prompt>", "system message")
  .option("--message <message>", "additional user message; repeatable", collect)
  .option("--messages-json <json>", "full OpenAI-compatible messages array")
  .option("--query <query>", "explicit search query")
  .option("--text", "include full text in answer-model search results")
  .option("--output-schema <json>", "JSON schema for structured output")
  .option("--user-location <country>", "optional user location context")
  .option("--behavior <json>", "behavior controls JSON object")
  .option("--stream", "stream server-sent chat completion chunks")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--api-key <key>", "Exa API key (overrides EXA_API_KEY)")
  .option("--json", "print the raw JSON response")
  .action(async (prompt: string, options: ChatOptions) => {
    const client = clientFor(options);
    const body: JsonObject = { messages: messagesFrom(prompt, options) };
    addIfDefined(body, "model", options.model);
    addIfDefined(body, "query", options.query);
    addIfDefined(body, "text", options.text);
    addIfDefined(body, "userLocation", options.userLocation);
    addIfDefined(body, "stream", options.stream);
    if (options.outputSchema !== undefined) {
      body.outputSchema = parseJsonObject(options.outputSchema, "--output-schema");
    }
    if (options.behavior !== undefined) {
      body.behaviour = parseJsonObject(options.behavior, "--behavior");
    }

    const request = mergeBodyJson(body, options.bodyJson);
    if (options.stream === true) {
      const stream = await client.postStream("/chat/completions", request, {
        headers: { Accept: "text/event-stream" },
      });
      await printStream(stream);
      return;
    }

    const response = await client.post<ChatCompletionResponse>("/chat/completions", request);
    if (options.json === true) {
      printJson(response);
    } else {
      printChat(response);
    }
  });
