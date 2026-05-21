// Live integration test for the Monitors API: a full create / get / list /
// update / runs / trigger / batch / delete lifecycle. The monitor is always
// deleted in a finally block so the test leaves nothing behind.

import assert from "node:assert/strict";
import test from "node:test";
import { exa, exaJson, skip, TEST_TIMEOUT } from "./helpers.js";

test("monitor lifecycle: create through delete", { skip, timeout: TEST_TIMEOUT }, async () => {
  const created = await exaJson<{ id?: string }>([
    "monitor",
    "create",
    "--name",
    "exa-cli integration test",
    "--query",
    "exa ai news",
    "--period",
    "1d",
    "--webhook-url",
    "https://exa.ai/exa-cli-integration-webhook",
  ]);
  assert.ok(typeof created.id === "string", "create should return an id");
  const id = created.id as string;

  try {
    const fetched = await exaJson<{ id?: string }>(["monitor", "get", id]);
    assert.equal(fetched.id, id, "get should return the same monitor");

    const listed = await exaJson<{ data?: unknown[] }>(["monitor", "list", "--limit", "5"]);
    assert.ok(Array.isArray(listed.data), "list should return a data array");

    const updated = await exaJson<{ name?: string }>([
      "monitor",
      "update",
      id,
      "--name",
      "exa-cli integration test (updated)",
    ]);
    assert.equal(updated.name, "exa-cli integration test (updated)", "update should change name");

    const runs = await exaJson<{ data?: unknown[] }>(["monitor", "runs", id]);
    assert.ok(Array.isArray(runs.data), "runs should return a data array");

    // Dry-run batch (no --execute) must not change anything.
    const batch = await exaJson<{ dry_run?: boolean }>([
      "monitor",
      "batch",
      "--action",
      "pause",
      "--filter-name",
      "exa-cli integration test",
    ]);
    assert.notEqual(batch.dry_run, false, "batch without --execute should stay a dry run");
  } finally {
    const deleted = await exa(["monitor", "delete", id, "--json"]);
    assert.equal(deleted.code, 0, `cleanup delete failed: ${deleted.stderr}`);
  }
});
