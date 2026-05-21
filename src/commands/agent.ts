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

const AGENT_BETA = "agent-2026-05-07";
const AGENT_HEADERS = { "Exa-Beta": AGENT_BETA };

interface AgentCreateOptions extends CommonOptions {
  systemPrompt?: string;
  input?: string;
  outputSchema?: string;
  effort?: string;
  previousRunId?: string;
  metadata?: string;
  wait?: boolean;
  pollInterval?: number;
  bodyJson?: string;
}

interface AgentListOptions extends CommonOptions {
  cursor?: string;
  limit?: number;
}

interface AgentEventOptions extends CommonOptions {
  cursor?: string;
  limit?: number;
  lastEventId?: string;
  follow?: boolean;
}

interface AgentRun extends JsonObject {
  id?: string;
  status?: string;
  output?: { text?: string; structured?: unknown };
  stopReason?: string | null;
}

function printRun(run: AgentRun): void {
  printLine(`id: ${run.id ?? "(unknown)"}`);
  if (run.status !== undefined) printLine(`status: ${run.status}`);
  if (run.stopReason !== undefined && run.stopReason !== null) {
    printLine(`stopReason: ${run.stopReason}`);
  }
  if (run.output?.text !== undefined) {
    printLine();
    printLine(run.output.text);
  }
  if (run.output?.structured !== undefined && run.output.structured !== null) {
    printLine();
    printJson(run.output.structured);
  }
}

export const agentCommand = new Command("agent").description("Multi-step research agent runs.");

agentCommand
  .command("create")
  .description("Create an agent run.")
  .argument("<query>", "natural-language run instructions")
  .option("--system-prompt <prompt>", "additional behavior guidance")
  .option("--input <json>", "records to process and/or exclude")
  .option("--output-schema <json>", "JSON schema for structured output")
  .option("--effort <effort>", "effort: low, medium, high, xhigh, auto")
  .option("--previous-run-id <id>", "completed run ID to continue from")
  .option("--metadata <json>", "metadata object to store with the run")
  .option("--wait", "poll until the run reaches a terminal status")
  .option("--poll-interval <ms>", "poll interval for --wait", parseInteger, 2000)
  .option("--body-json <json>", "merge raw JSON request fields")
  .option("--json", "print the raw JSON response")
  .action(async (query: string, options: AgentCreateOptions) => {
    const client = clientFor(options);
    const body: JsonObject = { query };
    addIfDefined(body, "systemPrompt", options.systemPrompt);
    addIfDefined(body, "effort", options.effort);
    addIfDefined(body, "previousRunId", options.previousRunId);
    if (options.input !== undefined) body.input = parseJsonObject(options.input, "--input");
    if (options.outputSchema !== undefined) {
      body.outputSchema = parseJsonObject(options.outputSchema, "--output-schema");
    }
    if (options.metadata !== undefined)
      body.metadata = parseJsonObject(options.metadata, "--metadata");

    let run = await client.post<AgentRun>("/agent/runs", mergeBodyJson(body, options.bodyJson), {
      headers: AGENT_HEADERS,
    });

    if (options.wait === true) {
      const id = getString(run, "id");
      if (id === undefined) throw new Error("Agent create response did not include id.");
      run = await pollUntilTerminal(
        run,
        (value) => getString(value, "status"),
        () => client.get<AgentRun>(`/agent/runs/${encodePath(id)}`, { headers: AGENT_HEADERS }),
        options.pollInterval ?? 2000,
      );
    }

    if (options.json === true) {
      printJson(run);
    } else {
      printRun(run);
    }
  });

agentCommand
  .command("get")
  .description("Retrieve an agent run by ID.")
  .argument("<id>", "agent run ID")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options);
    const run = await client.get<AgentRun>(`/agent/runs/${encodePath(id)}`, {
      headers: AGENT_HEADERS,
    });
    if (options.json === true) {
      printJson(run);
    } else {
      printRun(run);
    }
  });

agentCommand
  .command("list")
  .description("List agent runs.")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of runs to return", parseInteger)
  .option("--json", "print the raw JSON response")
  .action(async (options: AgentListOptions) => {
    const client = clientFor(options);
    const response = await client.get<unknown>("/agent/runs", {
      headers: AGENT_HEADERS,
      query: { cursor: options.cursor, limit: options.limit },
    });
    printMaybeJson(response, options.json, true);
  });

agentCommand
  .command("cancel")
  .description("Cancel a queued or running agent run.")
  .argument("<id>", "agent run ID")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options);
    const response = await client.post<unknown>(`/agent/runs/${encodePath(id)}/cancel`, undefined, {
      headers: AGENT_HEADERS,
    });
    printMaybeJson(response, options.json);
  });

agentCommand
  .command("delete")
  .description("Delete a stored agent run.")
  .argument("<id>", "agent run ID")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: CommonOptions) => {
    const client = clientFor(options);
    const response = await client.delete<unknown>(`/agent/runs/${encodePath(id)}`, {
      headers: AGENT_HEADERS,
    });
    printMaybeJson(response, options.json);
  });

agentCommand
  .command("events")
  .description("List or replay agent run events.")
  .argument("<id>", "agent run ID")
  .option("--cursor <cursor>", "pagination cursor")
  .option("--limit <count>", "number of events to return", parseInteger)
  .option("--last-event-id <id>", "return only streamed events after this event ID")
  .option("--follow", "stream events as server-sent events")
  .option("--json", "print the raw JSON response")
  .action(async (id: string, options: AgentEventOptions) => {
    const client = clientFor(options);
    const path = `/agent/runs/${encodePath(id)}/events`;
    const headers = {
      ...AGENT_HEADERS,
      ...(options.lastEventId !== undefined ? { "Last-Event-ID": options.lastEventId } : {}),
    };

    if (options.follow === true) {
      const stream = await client.stream(path, {
        headers: { ...headers, Accept: "text/event-stream" },
        query: { cursor: options.cursor, limit: options.limit },
      });
      await printStream(stream);
      return;
    }

    const response = await client.get<unknown>(path, {
      headers,
      query: { cursor: options.cursor, limit: options.limit },
    });
    printMaybeJson(response, options.json, true);
  });
