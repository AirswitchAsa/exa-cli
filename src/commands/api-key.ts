import { Command } from "commander";
import { clearStoredApiKey, configPath, resolveApiKeySource, setStoredApiKey } from "../config.js";
import { printLine } from "../output.js";

function sourceLabel(source: string): string {
  if (source === "environment") return "EXA_API_KEY environment variable";
  if (source === "dotenv") return "current-directory .env";
  if (source === "user_config") return "stored user config";
  return "not configured";
}

async function readPipedSecret(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    let value = "";

    function cleanup(): void {
      stdin.off("data", onData);
      stdin.setRawMode?.(wasRaw);
      stdin.pause();
    }

    function onData(chunk: Buffer | string): void {
      const text = chunk.toString("utf8");
      for (const char of text) {
        if (char === "\u0003") {
          cleanup();
          process.stderr.write("\n");
          reject(new Error("Cancelled."));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          process.stderr.write("\n");
          resolve(value.trim());
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    }

    process.stderr.write(prompt);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
  });
}

async function readApiKey(): Promise<string> {
  if (process.stdin.isTTY === true) return promptHidden("Paste Exa API key: ");
  return readPipedSecret();
}

export const apiKeyCommand = new Command("api-key").description("Manage the stored Exa API key.");

apiKeyCommand
  .command("set")
  .description("Store an Exa API key in the user config.")
  .action(async () => {
    const apiKey = await readApiKey();
    if (apiKey.length === 0) throw new Error("API key cannot be empty.");
    setStoredApiKey(apiKey);
    printLine(`Saved Exa API key to ${configPath()}.`);
  });

apiKeyCommand
  .command("status")
  .description("Show where the active Exa API key is coming from.")
  .action(() => {
    const resolution = resolveApiKeySource();
    printLine(`status: ${resolution.source === "missing" ? "missing" : "configured"}`);
    printLine(`source: ${sourceLabel(resolution.source)}`);
    if (resolution.path !== undefined) printLine(`path: ${resolution.path}`);
    if (resolution.source !== "user_config") {
      printLine(`user config: ${configPath()}`);
    }
  });

apiKeyCommand
  .command("unset")
  .description("Remove the stored API key from the user config.")
  .action(() => {
    const removed = clearStoredApiKey();
    printLine(
      removed ? `Removed stored API key from ${configPath()}.` : "No stored API key found.",
    );
  });
