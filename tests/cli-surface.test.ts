// Snapshots the whole CLI surface — every command, subcommand, and flag — so an
// accidental flag/command addition, removal, or rename fails loudly and has to
// be acknowledged. It also guards the audit: a deprecated flag (e.g.
// `--start-crawl-date`, `--livecrawl`) reappearing breaks this test.
//
// After an intentional change, regenerate the fixture:
//   node --import tsx -e '
//     const mods = ["search","contents","answer","chat","context","response",
//       "agent","monitor","webset","team","api-key","config"];
//     const out = {};
//     for (const m of mods) {
//       const mod = await import(`./src/commands/${m}.js`);
//       const cmd = Object.values(mod).find((v) => v && v._name !== undefined);
//       const describe = (c) => ({
//         flags: c.options.map((o) => o.long ?? o.short ?? "")
//           .filter((f) => f.length > 0).sort(),
//         subcommands: Object.fromEntries(
//           c.commands.map((ch) => [ch.name(), describe(ch)])),
//       });
//       out[cmd.name()] = describe(cmd);
//     }
//     console.log(JSON.stringify(out, null, 2));
//   ' > tests/fixtures/cli-surface.json

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
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

interface SurfaceNode {
  flags: string[];
  subcommands: Record<string, SurfaceNode>;
}

function describe(command: Command): SurfaceNode {
  return {
    flags: command.options
      .map((option) => option.long ?? option.short ?? "")
      .filter((flag) => flag.length > 0)
      .sort(),
    subcommands: Object.fromEntries(
      command.commands.map((child) => [child.name(), describe(child)]),
    ),
  };
}

const surface: Record<string, SurfaceNode> = {};
for (const command of [
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
]) {
  surface[command.name()] = describe(command);
}

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "cli-surface.json");
const expected = JSON.parse(readFileSync(fixturePath, "utf8")) as Record<string, SurfaceNode>;

test("CLI command tree and flags match the committed surface snapshot", () => {
  assert.deepEqual(surface, expected);
});
