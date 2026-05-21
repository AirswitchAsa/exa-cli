import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { ExaClient, ExaError } from "../src/client.js";

async function withServer(
  handler: Parameters<typeof createServer>[0],
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("ExaClient serializes JSON, auth headers, and repeated query parameters", async () => {
  await withServer(
    async (request, response) => {
      assert.equal(request.method, "POST");
      assert.equal(request.url, "/things?types=a&types=b&limit=2");
      assert.equal(request.headers["x-api-key"], "secret");
      assert.equal(request.headers["content-type"], "application/json");

      let raw = "";
      for await (const chunk of request) raw += chunk;
      assert.deepEqual(JSON.parse(raw), { hello: "world" });

      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ ok: true }));
    },
    async (baseUrl) => {
      const client = new ExaClient({ apiKey: "secret", baseUrl });
      const result = await client.post(
        "/things",
        { hello: "world" },
        {
          query: { types: ["a", "b"], limit: 2 },
        },
      );
      assert.deepEqual(result, { ok: true });
    },
  );
});

test("ExaClient raises ExaError with parsed error body", async () => {
  await withServer(
    (_request, response) => {
      response.statusCode = 429;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: "rate limited" }));
    },
    async (baseUrl) => {
      const client = new ExaClient({ apiKey: "secret", baseUrl });
      await assert.rejects(
        () => client.get("/limited"),
        (error) =>
          error instanceof ExaError &&
          error.status === 429 &&
          JSON.stringify(error.body) === '{"error":"rate limited"}',
      );
    },
  );
});

test("ExaClient supports streaming POST responses", async () => {
  await withServer(
    async (request, response) => {
      assert.equal(request.method, "POST");
      assert.equal(request.headers.accept, "text/event-stream");
      response.setHeader("content-type", "text/event-stream");
      response.end("data: hello\n\n");
    },
    async (baseUrl) => {
      const client = new ExaClient({ apiKey: "secret", baseUrl });
      const stream = await client.postStream(
        "/stream",
        { stream: true },
        {
          headers: { Accept: "text/event-stream" },
        },
      );
      const text = await new Response(stream).text();
      assert.equal(text, "data: hello\n\n");
    },
  );
});
