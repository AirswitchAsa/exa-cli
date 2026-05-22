import { Command } from "commander";
import { printJson, printLine } from "../output.js";
import {
  addIfDefined,
  type CommonOptions,
  clientFor,
  type JsonObject,
  mergeBodyJson,
  parseJson,
  printStream,
} from "./_shared.js";

interface ChatOptions extends CommonOptions {
  model?: string;
  system?: string;
  message?: string[];
  messagesJson?: string;
  text?: boolean;
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
  .description("Run an OpenAI-compatible chat completion backed by Exa search models.")
  .argument("<prompt>", "user prompt")
  .option("--model <model>", "model: exa, exa-research, exa-research-pro")
  .option("--system <prompt>", "system message")
  .option("--message <message>", "additional user message; repeatable", collect)
  .option("--messages-json <json>", "full OpenAI-compatible messages array")
  .option("--text", "include full text in answer-model search results")
  .option("--stream", "stream server-sent chat completion chunks")
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (prompt: string, options: ChatOptions) => {
    const client = clientFor();
    const body: JsonObject = { messages: messagesFrom(prompt, options) };
    addIfDefined(body, "model", options.model);
    addIfDefined(body, "text", options.text);
    addIfDefined(body, "stream", options.stream);

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
