// Contract tests: every request body a command builds is checked against Exa's
// published OpenAPI spec. A body key that the spec does not define, or that the
// spec marks `deprecated`, fails the suite. This is the layer that catches API
// drift — the class of bug behind the removed `research` type and crawl-date
// filters — without waiting for a user to hit it.
//
// The fixture `fixtures/exa-spec.yaml` is Exa's published spec. Refresh it with:
//   curl -fsSL https://exa.ai/docs/exa-spec.yaml -o tests/fixtures/exa-spec.yaml
//
// `chat`, `context`, and `response` hit endpoints that are documented but not
// part of this REST spec, so they are intentionally not covered here.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { agentCommand } from "../src/commands/agent.js";
import { answerCommand } from "../src/commands/answer.js";
import { contentsCommand } from "../src/commands/contents.js";
import { monitorCommand } from "../src/commands/monitor.js";
import { searchCommand } from "../src/commands/search.js";
import { websetCommand } from "../src/commands/webset.js";
import { runCommand, withMockFetch } from "./helpers.js";

type Json = Record<string, unknown>;

const specPath = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "exa-spec.yaml");
const spec = parse(readFileSync(specPath, "utf8")) as Json;

function asJson(value: unknown): Json {
  assert.ok(value !== null && typeof value === "object", "expected an object spec node");
  return value as Json;
}

function resolveRef(ref: string): Json {
  let node: unknown = spec;
  for (const part of ref.replace(/^#\//, "").split("/")) {
    node = asJson(node)[part];
  }
  return asJson(node);
}

// Follow a chain of `$ref`s to the underlying schema node.
function deref(schema: Json): Json {
  let current = schema;
  const seen = new Set<string>();
  while (typeof current.$ref === "string" && !seen.has(current.$ref)) {
    seen.add(current.$ref);
    current = resolveRef(current.$ref);
  }
  return current;
}

// Flatten anyOf/oneOf/allOf into the concrete (non-null) schema branches.
function variants(schema: Json): Json[] {
  const resolved = deref(schema);
  for (const key of ["anyOf", "oneOf", "allOf"] as const) {
    const branches = resolved[key];
    if (Array.isArray(branches)) {
      return branches
        .flatMap((branch) => variants(asJson(branch)))
        .filter((v) => v.type !== "null");
    }
  }
  return resolved.type === "null" ? [] : [resolved];
}

// The merged `properties` map across every object branch, or undefined when the
// schema declares no properties (free-form object — anything is allowed).
function objectProperties(schema: Json): Json | undefined {
  const merged: Json = {};
  let found = false;
  for (const variant of variants(schema)) {
    const props = variant.properties;
    if (props !== null && typeof props === "object") {
      found = true;
      Object.assign(merged, props);
    }
  }
  return found ? merged : undefined;
}

function isDeprecated(schema: Json): boolean {
  const resolved = deref(schema);
  if (resolved.deprecated === true) return true;
  const branches = variants(resolved);
  return branches.length > 0 && branches.every((branch) => branch.deprecated === true);
}

// outputSchema/metadata/input/behavior carry caller-defined JSON, not Exa
// parameters — validate that the key itself is allowed, but don't descend.
const FREEFORM_KEYS = new Set(["outputSchema", "metadata", "input", "behavior", "schema"]);

function checkObject(body: Json, schema: Json, label: string, problems: string[]): void {
  const properties = objectProperties(schema);
  if (properties === undefined) return;
  for (const [key, value] of Object.entries(body)) {
    const propertySchema = properties[key];
    if (propertySchema === undefined || typeof propertySchema !== "object") {
      problems.push(`${label}.${key} is not a parameter the Exa API defines`);
      continue;
    }
    if (isDeprecated(propertySchema as Json)) {
      problems.push(`${label}.${key} is marked deprecated in the Exa API`);
      continue;
    }
    if (
      !FREEFORM_KEYS.has(key) &&
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      checkObject(value as Json, propertySchema as Json, `${label}.${key}`, problems);
    }
  }
}

function requestSchema(path: string): Json {
  const pathItem = asJson(asJson(spec.paths)[path]);
  const operation = asJson(pathItem.post);
  const content = asJson(asJson(operation.requestBody).content);
  const media = asJson(Object.values(content)[0]);
  return deref(asJson(media.schema));
}

function enumValues(schema: Json, propertyName: string): unknown[] {
  const property = objectProperties(schema)?.[propertyName];
  assert.ok(property, `the spec schema has no property "${propertyName}"`);
  for (const variant of variants(property as Json)) {
    if (Array.isArray(variant.enum)) return variant.enum;
  }
  throw new Error(`property "${propertyName}" declares no enum`);
}

interface ContractCase {
  name: string;
  path: string;
  run: () => Promise<unknown>;
}

const cases: ContractCase[] = [
  {
    name: "search",
    path: "/search",
    run: () =>
      runCommand(searchCommand, [
        "renewable energy storage breakthroughs",
        "--num-results",
        "5",
        "--type",
        "auto",
        "--category",
        "news",
        "--include-domains",
        "exa.ai",
        "--exclude-domains",
        "spam.example",
        "--start-published-date",
        "2025-01-01",
        "--end-published-date",
        "2025-12-31",
        "--additional-queries",
        "grid storage,battery costs",
        "--user-location",
        "US",
        "--compliance",
        "hipaa",
        "--moderation",
        "--text",
        "--highlights",
        "--highlights-query",
        "cost",
        "--summary",
        "--summary-query",
        "key finding",
        "--system-prompt",
        "be precise",
        "--output-schema",
        '{"type":"object"}',
        "--json",
      ]),
  },
  {
    name: "contents",
    path: "/contents",
    run: () =>
      runCommand(contentsCommand, [
        "https://example.com",
        "--max-characters",
        "500",
        "--include-html-tags",
        "--verbosity",
        "standard",
        "--include-sections",
        "body",
        "--exclude-sections",
        "nav",
        "--highlights",
        "--highlights-query",
        "topic",
        "--summary",
        "--summary-query",
        "gist",
        "--summary-schema",
        '{"type":"object"}',
        "--livecrawl-timeout",
        "8000",
        "--max-age-hours",
        "24",
        "--subpages",
        "2",
        "--subpage-target",
        "docs",
        "--links",
        "3",
        "--image-links",
        "3",
        "--rich-image-links",
        "3",
        "--rich-links",
        "3",
        "--code-blocks",
        "3",
        "--compliance",
        "hipaa",
        "--json",
      ]),
  },
  {
    name: "answer",
    path: "/answer",
    run: () =>
      runCommand(answerCommand, [
        "What is Exa?",
        "--text",
        "--output-schema",
        '{"type":"object"}',
        "--json",
      ]),
  },
  {
    name: "monitor create",
    path: "/monitors",
    run: () =>
      runCommand(monitorCommand, [
        "create",
        "--name",
        "daily digest",
        "--query",
        "ai policy news",
        "--num-results",
        "10",
        "--period",
        "1d",
        "--webhook-url",
        "https://example.com/hook",
        "--webhook-events",
        "monitor.run.completed",
        "--output-schema",
        '{"type":"object"}',
        "--metadata",
        '{"team":"research"}',
        "--json",
      ]),
  },
  {
    name: "agent create",
    path: "/agent/runs",
    run: () =>
      runCommand(agentCommand, [
        "create",
        "find AI infrastructure companies",
        "--system-prompt",
        "be thorough",
        "--input",
        '{"items":[]}',
        "--effort",
        "high",
        "--previous-run-id",
        "run_1",
        "--output-schema",
        '{"type":"object"}',
        "--metadata",
        '{"k":"v"}',
        "--json",
      ]),
  },
  {
    name: "webset create",
    path: "/v0/websets",
    run: () =>
      runCommand(websetCommand, [
        "create",
        "--query",
        "climate tech startups in Europe",
        "--count",
        "10",
        "--metadata",
        '{"k":"v"}',
        "--json",
      ]),
  },
];

for (const contractCase of cases) {
  test(`contract: \`${contractCase.name}\` sends only parameters the Exa API defines`, async () => {
    await withMockFetch(
      () => ({ results: [], data: [], id: "id_1", status: "completed" }),
      async (calls) => {
        await contractCase.run();
        const body = calls[0]?.body;
        assert.ok(body && typeof body === "object", "expected a captured JSON request body");
        const problems: string[] = [];
        checkObject(body as Json, requestSchema(contractCase.path), contractCase.name, problems);
        assert.deepEqual(problems, [], `\n  ${problems.join("\n  ")}\n`);
      },
    );
  });
}

test("contract: search `type` and `category` enums match the Exa OpenAPI spec", () => {
  const schema = requestSchema("/search");
  assert.deepEqual([...enumValues(schema, "type")].sort(), [
    "auto",
    "deep",
    "deep-lite",
    "deep-reasoning",
    "fast",
    "instant",
  ]);
  assert.deepEqual([...enumValues(schema, "category")].sort(), [
    "company",
    "financial report",
    "news",
    "people",
    "personal site",
    "research paper",
  ]);
});

test("contract: every REST endpoint the CLI calls still exists in the spec", () => {
  const paths = asJson(spec.paths);
  for (const path of [
    "/search",
    "/contents",
    "/answer",
    "/monitors",
    "/agent/runs",
    "/v0/websets",
  ]) {
    assert.ok(paths[path], `the Exa OpenAPI spec no longer defines ${path}`);
  }
});
