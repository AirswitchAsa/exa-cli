// Live integration tests for the Websets API and its subresources. A single
// webset is created with the smallest possible search (count 1) and reused;
// every test cleans up the resources it creates.
//
// The Websets API is gated behind a paid plan. The suite probes access once
// and skips itself (rather than failing) when the configured account cannot
// reach it.

import assert from "node:assert/strict";
import test from "node:test";
import { exa, exaJson, skip, TEST_TIMEOUT } from "./helpers.js";

interface Created {
  id?: string;
}

// Probe Websets access once. If `webset list` fails, skip the whole file with
// the API's own explanation (typically: the plan does not include Websets).
const probe = skip ? null : await exa(["webset", "list", "--json"]);
const websetSkip: string | false =
  skip !== false
    ? skip
    : probe && probe.code !== 0
      ? `Websets API unavailable for this account: ${probe.stderr.trim() || "access denied"}`
      : false;

async function createWebset(): Promise<string> {
  const webset = await exaJson<Created>([
    "webset",
    "create",
    "--query",
    "AI search startups",
    "--count",
    "1",
  ]);
  assert.ok(typeof webset.id === "string", "webset create should return an id");
  return webset.id as string;
}

test("webset core lifecycle and subresources", {
  skip: websetSkip,
  timeout: TEST_TIMEOUT,
}, async () => {
  const websetId = await createWebset();

  try {
    const fetched = await exaJson<Created>(["webset", "get", websetId]);
    assert.equal(fetched.id, websetId, "get should return the same webset");

    const listed = await exaJson<{ data?: unknown[] }>(["webset", "list", "--limit", "5"]);
    assert.ok(Array.isArray(listed.data), "list should return a data array");

    const updated = await exaJson<{ metadata?: Record<string, string> }>([
      "webset",
      "update",
      websetId,
      "--metadata",
      '{"source":"exa-cli-integration"}',
    ]);
    assert.equal(updated.metadata?.source, "exa-cli-integration", "update should set metadata");

    const preview = await exaJson(["webset", "preview", "--query", "fintech companies"]);
    assert.ok(preview !== null && typeof preview === "object", "preview should return an object");

    // Searches within the webset.
    const search = await exaJson<Created>([
      "webset",
      "search",
      "create",
      websetId,
      "--query",
      "AI infrastructure startups",
      "--count",
      "1",
    ]);
    assert.ok(typeof search.id === "string", "search create should return an id");
    const searchResult = await exaJson<Created>([
      "webset",
      "search",
      "get",
      websetId,
      search.id as string,
    ]);
    assert.equal(searchResult.id, search.id, "search get should return the same search");

    // Items (likely empty on a freshly created webset).
    const items = await exaJson<{ data?: unknown[] }>(["webset", "items", "list", websetId]);
    assert.ok(Array.isArray(items.data), "items list should return a data array");

    // Enrichments.
    const enrichment = await exaJson<Created>([
      "webset",
      "enrich",
      "create",
      websetId,
      "--description",
      "Find the company homepage URL",
      "--format",
      "text",
    ]);
    assert.ok(typeof enrichment.id === "string", "enrich create should return an id");
    const enrichmentFetched = await exaJson<Created>([
      "webset",
      "enrich",
      "get",
      websetId,
      enrichment.id as string,
    ]);
    assert.equal(enrichmentFetched.id, enrichment.id, "enrich get should return the same field");
    const enrichDeleted = await exa([
      "webset",
      "enrich",
      "delete",
      websetId,
      enrichment.id as string,
    ]);
    assert.equal(enrichDeleted.code, 0, enrichDeleted.stderr);

    // Cancel any running operations before deletion.
    await exa(["webset", "cancel", websetId]);
  } finally {
    const deleted = await exa(["webset", "delete", websetId, "--json"]);
    assert.equal(deleted.code, 0, `cleanup delete failed: ${deleted.stderr}`);
  }
});

test("webset webhooks lifecycle", { skip: websetSkip, timeout: TEST_TIMEOUT }, async () => {
  const created = await exaJson<Created>([
    "webset",
    "webhook",
    "create",
    "--url",
    "https://exa.ai/exa-cli-integration-webhook",
    "--events",
    "webset.idle",
  ]);
  assert.ok(typeof created.id === "string", "webhook create should return an id");
  const id = created.id as string;

  try {
    const fetched = await exaJson<Created>(["webset", "webhook", "get", id]);
    assert.equal(fetched.id, id, "webhook get should return the same webhook");

    const listed = await exaJson<{ data?: unknown[] }>([
      "webset",
      "webhook",
      "list",
      "--limit",
      "5",
    ]);
    assert.ok(Array.isArray(listed.data), "webhook list should return a data array");

    const updated = await exa([
      "webset",
      "webhook",
      "update",
      id,
      "--metadata",
      '{"team":"x"}',
      "--json",
    ]);
    assert.equal(updated.code, 0, updated.stderr);

    const attempts = await exaJson<{ data?: unknown[] }>(["webset", "webhook", "attempts", id]);
    assert.ok(Array.isArray(attempts.data), "webhook attempts should return a data array");
  } finally {
    const deleted = await exa(["webset", "webhook", "delete", id, "--json"]);
    assert.equal(deleted.code, 0, `cleanup delete failed: ${deleted.stderr}`);
  }
});

test("webset events list and get", { skip: websetSkip, timeout: TEST_TIMEOUT }, async () => {
  const listed = await exaJson<{ data?: Array<{ id?: string }> }>([
    "webset",
    "events",
    "list",
    "--limit",
    "5",
  ]);
  assert.ok(Array.isArray(listed.data), "events list should return a data array");

  const first = listed.data?.[0]?.id;
  if (typeof first === "string") {
    const event = await exaJson<Created>(["webset", "events", "get", first]);
    assert.equal(event.id, first, "events get should return the same event");
  }
});

test("webset monitors lifecycle", { skip: websetSkip, timeout: TEST_TIMEOUT }, async () => {
  const websetId = await createWebset();

  try {
    const monitor = await exaJson<Created>([
      "webset",
      "monitor",
      "create",
      "--webset-id",
      websetId,
      "--cron",
      "0 9 * * *",
      "--behavior",
      '{"type":"search","config":{"count":1}}',
    ]);
    assert.ok(typeof monitor.id === "string", "webset monitor create should return an id");
    const id = monitor.id as string;

    const fetched = await exaJson<Created>(["webset", "monitor", "get", id]);
    assert.equal(fetched.id, id, "webset monitor get should return the same monitor");

    const listed = await exaJson<{ data?: unknown[] }>([
      "webset",
      "monitor",
      "list",
      "--limit",
      "5",
    ]);
    assert.ok(Array.isArray(listed.data), "webset monitor list should return a data array");

    const updated = await exa([
      "webset",
      "monitor",
      "update",
      id,
      "--metadata",
      '{"source":"exa-cli-integration"}',
      "--json",
    ]);
    assert.equal(updated.code, 0, updated.stderr);

    const deleted = await exa(["webset", "monitor", "delete", id, "--json"]);
    assert.equal(deleted.code, 0, deleted.stderr);
  } finally {
    await exa(["webset", "delete", websetId]);
  }
});

test("webset imports lifecycle", { skip: websetSkip, timeout: TEST_TIMEOUT }, async () => {
  const created = await exaJson<Created>([
    "webset",
    "import",
    "create",
    "--size",
    "1024",
    "--count",
    "1",
    "--format",
    "csv",
    "--title",
    "exa-cli integration import",
    "--entity",
    '{"type":"company"}',
  ]);
  assert.ok(typeof created.id === "string", "import create should return an id");
  const id = created.id as string;

  try {
    const fetched = await exaJson<Created>(["webset", "import", "get", id]);
    assert.equal(fetched.id, id, "import get should return the same import");

    const listed = await exaJson<{ data?: unknown[] }>([
      "webset",
      "import",
      "list",
      "--limit",
      "5",
    ]);
    assert.ok(Array.isArray(listed.data), "import list should return a data array");

    const updated = await exa([
      "webset",
      "import",
      "update",
      id,
      "--title",
      "exa-cli integration import (updated)",
      "--json",
    ]);
    assert.equal(updated.code, 0, updated.stderr);
  } finally {
    const deleted = await exa(["webset", "import", "delete", id, "--json"]);
    assert.equal(deleted.code, 0, `cleanup delete failed: ${deleted.stderr}`);
  }
});

test("webset team returns the authenticated team", {
  skip: websetSkip,
  timeout: TEST_TIMEOUT,
}, async () => {
  const team = await exaJson(["webset", "team"]);
  assert.ok(team !== null && typeof team === "object", "team should return an object");
});

test("webset export schedule and get", { skip: websetSkip, timeout: TEST_TIMEOUT }, async () => {
  const websetId = await createWebset();

  try {
    const exportRun = await exaJson<Created>([
      "webset",
      "export",
      "create",
      websetId,
      "--format",
      "csv",
    ]);
    assert.ok(typeof exportRun.id === "string", "export create should return an id");

    const fetched = await exaJson<Created>([
      "webset",
      "export",
      "get",
      websetId,
      exportRun.id as string,
    ]);
    assert.equal(fetched.id, exportRun.id, "export get should return the same export");
  } finally {
    await exa(["webset", "delete", websetId]);
  }
});
