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
      // maxRetries: 0 isolates error surfacing from retry behavior, which
      // would otherwise retry this 429 and slow the test down.
      const client = new ExaClient({ apiKey: "secret", baseUrl, maxRetries: 0 });
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

test("ExaClient retries a 429 and then succeeds", async () => {
  let attempts = 0;
  await withServer(
    (_request, response) => {
      attempts += 1;
      if (attempts < 3) {
        response.statusCode = 429;
        response.end("rate limited");
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ ok: true }));
    },
    async (baseUrl) => {
      const client = new ExaClient({ apiKey: "secret", baseUrl, retryBaseDelayMs: 0 });
      const result = await client.get("/retry");
      assert.deepEqual(result, { ok: true });
      assert.equal(attempts, 3);
    },
  );
});

test("ExaClient retries 5xx up to maxRetries, then throws", async () => {
  let attempts = 0;
  await withServer(
    (_request, response) => {
      attempts += 1;
      response.statusCode = 503;
      response.end("unavailable");
    },
    async (baseUrl) => {
      const client = new ExaClient({
        apiKey: "secret",
        baseUrl,
        maxRetries: 2,
        retryBaseDelayMs: 0,
      });
      await assert.rejects(
        () => client.get("/down"),
        (error) => error instanceof ExaError && error.status === 503,
      );
      assert.equal(attempts, 3); // one initial attempt plus two retries
    },
  );
});

test("ExaClient does not retry a non-retryable 4xx", async () => {
  let attempts = 0;
  await withServer(
    (_request, response) => {
      attempts += 1;
      response.statusCode = 400;
      response.end(JSON.stringify({ error: "bad request" }));
    },
    async (baseUrl) => {
      const client = new ExaClient({ apiKey: "secret", baseUrl, retryBaseDelayMs: 0 });
      await assert.rejects(
        () => client.get("/bad"),
        (error) => error instanceof ExaError && error.status === 400,
      );
      assert.equal(attempts, 1);
    },
  );
});

test("ExaClient times out a hung request", async () => {
  await withServer(
    () => {
      // Never respond — force the request timeout to fire.
    },
    async (baseUrl) => {
      const client = new ExaClient({
        apiKey: "secret",
        baseUrl,
        timeoutMs: 80,
        maxRetries: 0,
      });
      await assert.rejects(() => client.get("/hang"), /timed out/i);
    },
  );
});
