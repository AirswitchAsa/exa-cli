import assert from "node:assert/strict";
import test from "node:test";
import { extractDeltaText, printStream } from "../src/commands/_shared.js";

/** Build a ReadableStream that emits the given strings as discrete chunks. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
      } else {
        controller.close();
      }
    },
  });
}

/** Capture everything written to process.stdout while `run` executes. */
async function captureStdout(run: () => Promise<void>): Promise<string> {
  const original = process.stdout.write;
  let captured = "";
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof process.stdout.write;
  try {
    await run();
  } finally {
    process.stdout.write = original;
  }
  return captured;
}

test("extractDeltaText reads OpenAI chat and Responses envelopes", () => {
  assert.equal(extractDeltaText({ choices: [{ delta: { content: "Hello" } }] }), "Hello");
  assert.equal(extractDeltaText({ choices: [{ text: "raw" }] }), "raw");
  assert.equal(extractDeltaText({ type: "response.output_text.delta", delta: " world" }), " world");
  assert.equal(extractDeltaText({ type: "response.completed" }), undefined);
  assert.equal(extractDeltaText({ status: "running" }), undefined);
});

test("printStream concatenates text deltas and drops the [DONE] sentinel", async () => {
  const output = await captureStdout(() =>
    printStream(
      streamOf([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
        "data: [DONE]\n\n",
      ]),
    ),
  );
  assert.equal(output, "Hello\n");
});

test("printStream reassembles an event split across chunk boundaries", async () => {
  const output = await captureStdout(() =>
    printStream(
      streamOf(['data: {"choices":[{"delta":{"content":"Hel', 'lo"}}]}\n\ndata: [DONE]\n\n']),
    ),
  );
  assert.equal(output, "Hello\n");
});

test("printStream prints structured events one JSON object per line", async () => {
  const output = await captureStdout(() =>
    printStream(streamOf(['data: {"status":"running"}\n\ndata: {"status":"completed"}\n\n'])),
  );
  assert.equal(output, '{"status":"running"}\n{"status":"completed"}\n');
});
