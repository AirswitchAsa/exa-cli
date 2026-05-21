// Live integration tests for the asynchronous task endpoints:
// research, agent, response. These create real, billable runs, so each test
// uses the cheapest model and the smallest possible instruction, and the agent
// test cancels and deletes its run to avoid leaving work running.

import assert from "node:assert/strict";
import test from "node:test";
import { exa, exaJson, skip, TEST_TIMEOUT } from "./helpers.js";

test("research create / get / list", { skip, timeout: TEST_TIMEOUT }, async () => {
  const created = await exaJson<{ researchId?: string }>([
    "research",
    "create",
    "State that two plus two equals four.",
    "--model",
    "exa-research-fast",
  ]);
  assert.ok(typeof created.researchId === "string", "create should return a researchId");
  const id = created.researchId as string;

  const fetched = await exaJson<{ researchId?: string }>(["research", "get", id]);
  assert.equal(fetched.researchId, id, "get should return the same task");

  const listed = await exaJson<{ data?: unknown[] }>(["research", "list", "--limit", "3"]);
  assert.ok(Array.isArray(listed.data), "list should return a data array");
});

test("response create / get", { skip, timeout: TEST_TIMEOUT }, async () => {
  const created = await exaJson<{ id?: string }>([
    "response",
    "create",
    "Reply briefly: what is the Exa API?",
  ]);
  assert.ok(typeof created.id === "string", "create should return an id");
  const id = created.id as string;

  const fetched = await exaJson<{ id?: string }>(["response", "get", id]);
  assert.equal(fetched.id, id, "get should return the same response");
});

test("agent create / get / list / events / cancel / delete", {
  skip,
  timeout: TEST_TIMEOUT,
}, async () => {
  const created = await exaJson<{ id?: string }>([
    "agent",
    "create",
    "Reply with the capital of France.",
  ]);
  assert.ok(typeof created.id === "string", "create should return an id");
  const id = created.id as string;

  const fetched = await exaJson<{ id?: string }>(["agent", "get", id]);
  assert.equal(fetched.id, id, "get should return the same run");

  const listed = await exaJson<{ data?: unknown[] }>(["agent", "list", "--limit", "3"]);
  assert.ok(Array.isArray(listed.data), "list should return a data array");

  const events = await exaJson<{ data?: unknown[] }>(["agent", "events", id]);
  assert.ok(Array.isArray(events.data), "events should return a data array");

  // Cancel to stop billing, then delete to clean up.
  await exa(["agent", "cancel", id]);
  const deleted = await exa(["agent", "delete", id, "--json"]);
  assert.equal(deleted.code, 0, deleted.stderr);
});
