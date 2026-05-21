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
} from "./_shared.js";

interface ResearchCreateOptions extends CommonOptions {
  model?: string;
  outputSchema?: string;
  wait?: boolean;
  pollInterval?: number;
  timeout?: number;
  bodyJson?: string;
}

interface ResearchGetOptions extends CommonOptions {
  events?: boolean;
}

interface ResearchListOptions extends CommonOptions {
  cursor?: string;
  limit?: number;
}

interface ResearchTask extends JsonObject {
  researchId?: string;
  status?: string;
  instructions?: string;
  output?: { content?: string; parsed?: unknown };
  error?: string;
}

const RESEARCH_PATH = "/research/v1";

function printResearch(task: ResearchTask): void {
  printLine(`researchId: ${task.researchId ?? "(unknown)"}`);
  if (task.status !== undefined) printLine(`status: ${task.status}`);
  if (task.instructions !== undefined) printLine(`instructions: ${task.instructions}`);
  if (task.output?.content !== undefined) {
    printLine();
    printLine(task.output.content);
  }
  if (task.output?.parsed !== undefined) {
    printLine();
    printJson(task.output.parsed);
  }
  if (task.error !== undefined) {
    printLine();
    printLine(`error: ${task.error}`);
  }
}

export const researchCommand = new Command("research").description(
  "Asynchronous deep-research tasks.",
);

researchCommand
  .command("create")
  .description("Create a research task.")
  .argument("<instructions>", "research instructions")
  .option("--model <model>", "research model: exa-research-fast, exa-research, exa-research-pro")
  .option("--output-schema <json>", "JSON schema for structured research output")
  .option("--wait", "poll until the task reaches a terminal status")
  .option("--poll-interval <ms>", "poll interval for --wait", parseInteger, 2000)
  .option("--timeout <ms>", "maximum milliseconds to wait for --wait", parseInteger, 600000)
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (instructions: string, options: ResearchCreateOptions) => {
    const client = clientFor();
    const body: JsonObject = { instructions };
    addIfDefined(body, "model", options.model);
    if (options.outputSchema !== undefined) {
      body.outputSchema = parseJsonObject(options.outputSchema, "--output-schema");
    }

    let task = await client.post<ResearchTask>(
      RESEARCH_PATH,
      mergeBodyJson(body, options.bodyJson),
    );
    if (options.wait === true) {
      const id = getString(task, "researchId");
      if (id === undefined) throw new Error("Research create response did not include researchId.");
      task = await pollUntilTerminal(
        task,
        (value) => getString(value, "status"),
        () =>
          client.get<ResearchTask>(`${RESEARCH_PATH}/${encodePath(id)}`, {
            query: { events: true },
          }),
        options.pollInterval ?? 2000,
        options.timeout ?? 600000,
      );
    }

    if (options.json === true) {
      printJson(task);
    } else {
      printResearch(task);
    }
  });

researchCommand
  .command("get")
  .description("Retrieve a research task by ID.")
  .argument("<id>", "research task ID")
  .option("--events", "include the detailed event log")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: ResearchGetOptions) => {
    const client = clientFor();
    const task = await client.get<ResearchTask>(`${RESEARCH_PATH}/${encodePath(id)}`, {
      query: { events: options.events },
    });

    if (options.json === true) {
      printJson(task);
    } else {
      printResearch(task);
    }
  });

researchCommand
  .command("list")
  .description("List research tasks.")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of tasks to return, 1-50", parseInteger)
  .option("--json", "print the raw JSON response")
  .action(async (options: ResearchListOptions) => {
    const client = clientFor();
    const response = await client.get<unknown>(RESEARCH_PATH, {
      query: { cursor: options.cursor, limit: options.limit },
    });
    printMaybeJson(response, options.json, true);
  });
