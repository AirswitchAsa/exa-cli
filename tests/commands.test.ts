import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { Command } from "commander";
import { agentCommand } from "../src/commands/agent.js";
import { answerCommand } from "../src/commands/answer.js";
import { apiKeyCommand } from "../src/commands/api-key.js";
import { chatCommand } from "../src/commands/chat.js";
import { configCommand } from "../src/commands/config.js";
import { contentsCommand } from "../src/commands/contents.js";
import { contextCommand } from "../src/commands/context.js";
import { monitorCommand } from "../src/commands/monitor.js";
import { responseCommand } from "../src/commands/response.js";
import { searchCommand } from "../src/commands/search.js";
import { teamCommand } from "../src/commands/team.js";
import { websetCommand } from "../src/commands/webset.js";
import { configPath, readUserConfig } from "../src/config.js";
import { assertHeader, runCommand, withMockFetch, withMockHttps } from "./helpers.js";

function allCommands(command: Command): Command[] {
  return [command, ...command.commands.flatMap((child) => allCommands(child))];
}

async function withTempConfig(run: () => Promise<void>): Promise<void> {
  const previousConfigDir = process.env.EXA_CONFIG_DIR;
  const dir = mkdtempSync(join(tmpdir(), "exa-cli-command-config-"));
  process.env.EXA_CONFIG_DIR = dir;

  try {
    await run();
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (previousConfigDir === undefined) {
      delete process.env.EXA_CONFIG_DIR;
    } else {
      process.env.EXA_CONFIG_DIR = previousConfigDir;
    }
  }
}

test("commands do not expose API keys as flags", () => {
  const commands = [
    searchCommand,
    contentsCommand,
    answerCommand,
    chatCommand,
    contextCommand,
    responseCommand,
    agentCommand,
    monitorCommand,
    websetCommand,
    teamCommand,
    apiKeyCommand,
    configCommand,
  ].flatMap((command) => allCommands(command));

  for (const command of commands) {
    assert.equal(
      command.options.some((option) => option.long === "--api-key"),
      false,
    );
  }
});

test("config command stores non-secret preferences in user config", async () => {
  await withTempConfig(async () => {
    await runCommand(configCommand, ["set", "output", "json"]);
    assert.deepEqual(readUserConfig().preferences, { output: "json" });

    await runCommand(configCommand, ["set", "limit", "5"]);
    assert.deepEqual(readUserConfig().preferences, { output: "json", limit: 5 });

    await runCommand(configCommand, ["unset", "output"]);
    assert.deepEqual(readUserConfig().preferences, { limit: 5 });
    assert.match(configPath(), /config\.json$/);
  });
});

test("api-key status does not require or print the API key", async () => {
  await withTempConfig(async () => {
    await runCommand(apiKeyCommand, ["status"]);
  });
});

test("search maps rich filters to /search", async () => {
  await withMockFetch(
    () => ({ results: [] }),
    async (calls) => {
      await runCommand(searchCommand, [
        "exa funding",
        "--num-results",
        "3",
        "--type",
        "deep",
        "--additional-queries",
        "exa revenue,exa team",
        "--include-domains",
        "exa.ai,docs.exa.ai",
        "--start-published-date",
        "2025-01-01T00:00:00Z",
        "--text",
        "--summary",
        "--body-json",
        '{"userLocation":"US"}',
        "--json",
      ]);

      assert.equal(calls[0]?.url.pathname, "/search");
      assert.equal(calls[0]?.init.method, "POST");
      assert.deepEqual(calls[0]?.body, {
        query: "exa funding",
        numResults: 3,
        type: "deep",
        additionalQueries: ["exa revenue", "exa team"],
        includeDomains: ["exa.ai", "docs.exa.ai"],
        startPublishedDate: "2025-01-01T00:00:00Z",
        contents: { text: true, summary: true },
        userLocation: "US",
      });
    },
  );
});

test("contents maps URL arguments and extraction options", async () => {
  await withMockFetch(
    () => ({ results: [] }),
    async (calls) => {
      await runCommand(contentsCommand, [
        "https://example.com",
        "--max-characters",
        "500",
        "--summary-query",
        "main point",
        "--links",
        "2",
        "--json",
      ]);

      assert.equal(calls[0]?.url.pathname, "/contents");
      assert.deepEqual(calls[0]?.body, {
        urls: ["https://example.com"],
        text: { maxCharacters: 500 },
        summary: { query: "main point" },
        extras: { links: 2 },
      });
    },
  );
});

test("answer covers its synchronous endpoint", async () => {
  await withMockFetch(
    () => ({ answer: "yes", citations: [] }),
    async (calls) => {
      await runCommand(answerCommand, [
        "What is Exa?",
        "--text",
        "--output-schema",
        '{"type":"object"}',
        "--json",
      ]);

      assert.equal(calls[0]?.url.pathname, "/answer");
      assert.deepEqual(calls[0]?.body, {
        query: "What is Exa?",
        text: true,
        outputSchema: { type: "object" },
      });
    },
  );
});

test("agent commands include beta header and event replay parameters", async () => {
  await withMockFetch(
    () => ({ id: "a_1", status: "completed", data: [] }),
    async (calls) => {
      await runCommand(agentCommand, [
        "create",
        "find leads",
        "--input",
        '{"items":[]}',
        "--metadata",
        '{"source":"test"}',
        "--json",
      ]);
      await runCommand(agentCommand, ["events", "a_1", "--last-event-id", "evt_1", "--json"]);

      assert.equal(calls[0]?.url.pathname, "/agent/runs");
      assertHeader(calls[0], "Exa-Beta", "agent-2026-05-07");
      assert.deepEqual(calls[0]?.body, {
        query: "find leads",
        input: { items: [] },
        metadata: { source: "test" },
      });
      assert.equal(calls[1]?.url.pathname, "/agent/runs/a_1/events");
      assertHeader(calls[1], "Last-Event-ID", "evt_1");
    },
  );
});

test("monitor commands map CRUD, metadata filters, runs, and batch", async () => {
  await withMockFetch(
    () => ({ id: "m_1", data: [] }),
    async (calls) => {
      await runCommand(monitorCommand, [
        "create",
        "--name",
        "daily",
        "--query",
        "exa news",
        "--period",
        "1d",
        "--json",
      ]);
      await runCommand(monitorCommand, ["list", "--metadata", '{"team":"growth"}', "--json"]);
      await runCommand(monitorCommand, ["runs", "m_1", "run_1", "--json"]);
      await runCommand(monitorCommand, ["batch", "--body-json", '{"action":"pause"}', "--json"]);

      assert.equal(calls[0]?.url.pathname, "/monitors");
      assert.deepEqual(calls[0]?.body, {
        name: "daily",
        search: { query: "exa news" },
        trigger: { type: "interval", period: "1d" },
      });
      assert.equal(calls[1]?.url.searchParams.get("metadata[team]"), "growth");
      assert.equal(calls[2]?.url.pathname, "/monitors/m_1/runs/run_1");
      assert.equal(calls[3]?.url.pathname, "/monitors/batch");
    },
  );
});

test("team keys commands use Team Management paths and canonical fields", async () => {
  await withMockFetch(
    () => ({ apiKey: { id: "k_1" } }),
    async (calls) => {
      await runCommand(teamCommand, [
        "keys",
        "create",
        "--name",
        "ci",
        "--budget-cents",
        "5000",
        "--json",
      ]);
      await runCommand(teamCommand, [
        "keys",
        "usage",
        "k_1",
        "--start-date",
        "2026-01-01T00:00:00Z",
        "--group-by",
        "day",
        "--json",
      ]);

      assert.equal(calls[0]?.url.hostname, "admin-api.exa.ai");
      assert.equal(calls[0]?.url.pathname, "/team-management/api-keys");
      assert.deepEqual(calls[0]?.body, { name: "ci", budgetCents: 5000 });
      assert.equal(calls[1]?.url.pathname, "/team-management/api-keys/k_1/usage");
      assert.equal(calls[1]?.url.searchParams.get("start_date"), "2026-01-01T00:00:00Z");
      assert.equal(calls[1]?.url.searchParams.get("group_by"), "day");
    },
  );
});

test("context defaults to dynamic token sizing", async () => {
  await withMockFetch(
    () => ({ response: "ctx" }),
    async (calls) => {
      await runCommand(contextCommand, ["exa api", "--json"]);

      assert.equal(calls[0]?.url.pathname, "/context");
      assert.deepEqual(calls[0]?.body, { query: "exa api", tokensNum: "dynamic" });
    },
  );
});

test("monitor batch filters and stays a dry run unless --execute is passed", async () => {
  await withMockFetch(
    () => ({ action: "pause", affected: 0, ids: [], dry_run: true, has_more: false }),
    async (calls) => {
      await runCommand(monitorCommand, [
        "batch",
        "--action",
        "pause",
        "--filter-status",
        "active",
        "--json",
      ]);

      assert.equal(calls[0]?.url.pathname, "/monitors/batch");
      assert.deepEqual(calls[0]?.body, {
        action: "pause",
        filter: { status: "active" },
      });
    },
  );
});

test("chat, context, and response cover OpenAI-compatible endpoints", async () => {
  await withMockFetch(
    (call) =>
      call.url.pathname === "/chat/completions"
        ? { choices: [{ message: { content: "hi" } }] }
        : { id: "resp_1", status: "completed", output_text: "done", response: "ctx" },
    async (calls) => {
      await runCommand(chatCommand, ["hello", "--system", "be brief", "--json"]);
      await runCommand(contextCommand, ["exa api", "--tokens", "1000", "--json"]);
      await runCommand(responseCommand, ["create", "research this", "--json"]);

      assert.equal(calls[0]?.url.pathname, "/chat/completions");
      assert.deepEqual(calls[0]?.body, {
        messages: [
          { role: "system", content: "be brief" },
          { role: "user", content: "hello" },
        ],
      });
      assert.equal(calls[1]?.url.pathname, "/context");
      assert.deepEqual(calls[1]?.body, { query: "exa api", tokensNum: 1000 });
      assert.equal(calls[2]?.url.pathname, "/responses");
      assert.deepEqual(calls[2]?.body, { input: "research this", model: "exa-research" });
    },
  );
});

test("response get issues a GET to /responses/{id} with a JSON body", async () => {
  // Exa's `GET /responses/{id}` requires a request body, so the CLI uses
  // node:https instead of fetch for this call.
  await withMockHttps({ id: "resp_1", output_text: "done" }, 200, async (calls) => {
    await runCommand(responseCommand, ["get", "resp_1", "--json"]);

    assert.equal(calls[0]?.url.pathname, "/responses/resp_1");
    assert.equal(calls[0]?.method, "GET");
    assert.deepEqual(calls[0]?.body, {});
  });
});

test("webset commands cover websets, subresources, webhooks, events, monitors, and team", async () => {
  await withMockFetch(
    () => ({ id: "w_1", status: "idle", data: [] }),
    async (calls) => {
      await runCommand(websetCommand, [
        "create",
        "--query",
        "ai companies",
        "--count",
        "5",
        "--json",
      ]);
      await runCommand(websetCommand, ["search", "create", "w_1", "--query", "new", "--json"]);
      await runCommand(websetCommand, ["items", "list", "w_1", "--source-id", "src_1", "--json"]);
      await runCommand(websetCommand, [
        "enrich",
        "create",
        "w_1",
        "--description",
        "find CEO",
        "--format",
        "text",
        "--json",
      ]);
      await runCommand(websetCommand, ["import", "list", "--json"]);
      await runCommand(websetCommand, ["export", "create", "w_1", "--format", "csv", "--json"]);
      await runCommand(websetCommand, [
        "webhook",
        "create",
        "--url",
        "https://example.com/hook",
        "--events",
        "webset.idle,webset.deleted",
        "--json",
      ]);
      await runCommand(websetCommand, [
        "events",
        "list",
        "--types",
        "webset.idle,monitor.created",
        "--json",
      ]);
      await runCommand(websetCommand, [
        "monitor",
        "create",
        "--webset-id",
        "w_1",
        "--cron",
        "0 9 * * 1",
        "--behavior",
        '{"type":"search"}',
        "--json",
      ]);
      await runCommand(websetCommand, ["team", "--json"]);

      assert.equal(calls[0]?.url.pathname, "/websets/v0/websets");
      assert.deepEqual(calls[0]?.body, { search: { query: "ai companies", count: 5 } });
      assert.equal(calls[1]?.url.pathname, "/websets/v0/websets/w_1/searches");
      assert.equal(calls[2]?.url.pathname, "/websets/v0/websets/w_1/items");
      assert.equal(calls[2]?.url.searchParams.get("sourceId"), "src_1");
      assert.equal(calls[3]?.url.pathname, "/websets/v0/websets/w_1/enrichments");
      assert.equal(calls[4]?.url.pathname, "/websets/v0/imports");
      assert.equal(calls[5]?.url.pathname, "/websets/v0/websets/w_1/exports");
      assert.deepEqual(calls[5]?.body, { format: "csv" });
      assert.equal(calls[6]?.url.pathname, "/websets/v0/webhooks");
      assert.deepEqual(calls[6]?.body, {
        url: "https://example.com/hook",
        events: ["webset.idle", "webset.deleted"],
      });
      assert.deepEqual(calls[7]?.url.searchParams.getAll("types"), [
        "webset.idle",
        "monitor.created",
      ]);
      assert.equal(calls[8]?.url.pathname, "/websets/v0/monitors");
      assert.deepEqual(calls[8]?.body, {
        websetId: "w_1",
        cadence: { cron: "0 9 * * 1" },
        behavior: { type: "search" },
      });
      assert.equal(calls[9]?.url.pathname, "/websets/v0/teams/me");
    },
  );
});
