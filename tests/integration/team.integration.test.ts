// Live integration test for the Team Management API. These endpoints require
// a team service key; when the configured key lacks that access the test
// skips itself rather than failing, since most search keys cannot reach them.

import assert from "node:assert/strict";
import test from "node:test";
import { exa, exaJson, skip, TEST_TIMEOUT } from "./helpers.js";

interface KeyEnvelope {
  apiKey?: { id?: string };
}

test("team keys lifecycle", { skip, timeout: TEST_TIMEOUT }, async (t) => {
  // Probe access first — a plain search key cannot reach Team Management.
  const probe = await exa(["team", "keys", "list", "--json"]);
  if (probe.code !== 0) {
    t.skip("configured key lacks Team Management access (needs a team service key)");
    return;
  }

  const created = await exaJson<KeyEnvelope>([
    "team",
    "keys",
    "create",
    "--name",
    "exa-cli integration test",
  ]);
  const id = created.apiKey?.id;
  assert.ok(typeof id === "string", "create should return an api key id");

  try {
    const fetched = await exaJson<KeyEnvelope>(["team", "keys", "get", id as string]);
    assert.equal(fetched.apiKey?.id, id, "get should return the same key");

    const updated = await exa([
      "team",
      "keys",
      "update",
      id as string,
      "--name",
      "exa-cli integration test (updated)",
      "--json",
    ]);
    assert.equal(updated.code, 0, updated.stderr);

    const usage = await exa(["team", "keys", "usage", id as string, "--json"]);
    assert.equal(usage.code, 0, usage.stderr);
  } finally {
    const deleted = await exa(["team", "keys", "delete", id as string, "--json"]);
    assert.equal(deleted.code, 0, `cleanup delete failed: ${deleted.stderr}`);
  }
});
