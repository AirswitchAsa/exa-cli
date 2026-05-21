// Live integration tests for the synchronous search-family endpoints:
// search, contents, answer, similar, chat, context.

import assert from "node:assert/strict";
import test from "node:test";
import { exa, exaJson, skip, TEST_TIMEOUT } from "./helpers.js";

interface SearchResponse {
  results: Array<{ url?: string; title?: string; summary?: string }>;
}

test("search returns ranked web results", { skip, timeout: TEST_TIMEOUT }, async () => {
  const response = await exaJson<SearchResponse>(["search", "Exa AI search engine", "-n", "3"]);
  assert.ok(Array.isArray(response.results), "results should be an array");
  assert.ok(response.results.length > 0, "expected at least one result");
  assert.ok(
    response.results.every((result) => typeof result.url === "string"),
    "every result should carry a url",
  );
});

test("search with --summary and --highlights extracts content", {
  skip,
  timeout: TEST_TIMEOUT,
}, async () => {
  const response = await exaJson<SearchResponse>([
    "search",
    "large language models",
    "-n",
    "2",
    "--summary",
    "--highlights",
  ]);
  assert.ok(response.results.length > 0, "expected at least one result");
});

test("contents extracts clean page text for a URL", { skip, timeout: TEST_TIMEOUT }, async () => {
  const response = await exaJson<{ results: Array<{ url?: string; text?: string }> }>([
    "contents",
    "https://exa.ai",
  ]);
  assert.ok(Array.isArray(response.results), "results should be an array");
  assert.ok(response.results.length > 0, "expected contents for the URL");
});

test("answer returns a sourced answer", { skip, timeout: TEST_TIMEOUT }, async () => {
  const response = await exaJson<{ answer?: unknown; citations?: unknown[] }>([
    "answer",
    "What company makes the Exa search API?",
  ]);
  assert.ok(response.answer !== undefined, "expected an answer field");
});

test("answer --stream emits a server-sent event stream", {
  skip,
  timeout: TEST_TIMEOUT,
}, async () => {
  const run = await exa(["answer", "Name one search engine.", "--stream"]);
  assert.equal(run.code, 0, run.stderr);
  assert.ok(run.stdout.length > 0, "expected streamed output on stdout");
});

test("similar finds pages related to a URL", { skip, timeout: TEST_TIMEOUT }, async () => {
  const response = await exaJson<SearchResponse>([
    "similar",
    "https://arxiv.org/abs/2307.06435",
    "-n",
    "3",
  ]);
  assert.ok(Array.isArray(response.results), "results should be an array");
});

test("chat returns an OpenAI-compatible completion", { skip, timeout: TEST_TIMEOUT }, async () => {
  const response = await exaJson<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(["chat", "Reply with the single word: ok"]);
  assert.ok(Array.isArray(response.choices), "expected a choices array");
  assert.ok(response.choices.length > 0, "expected at least one choice");
});

test("context builds an LLM-ready context string", { skip, timeout: TEST_TIMEOUT }, async () => {
  const response = await exaJson<{ response?: string }>(["context", "what is the Exa API"]);
  assert.equal(typeof response.response, "string", "expected a context string");
  assert.ok((response.response ?? "").length > 0, "expected non-empty context");
});
