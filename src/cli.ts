#!/usr/bin/env node
import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import { ExaError } from "./client.js";
import { agentCommand } from "./commands/agent.js";
import { answerCommand } from "./commands/answer.js";
import { apiKeyCommand } from "./commands/api-key.js";
import { chatCommand } from "./commands/chat.js";
import { configCommand } from "./commands/config.js";
import { contentsCommand } from "./commands/contents.js";
import { contextCommand } from "./commands/context.js";
import { monitorCommand } from "./commands/monitor.js";
import { responseCommand } from "./commands/response.js";
import { searchCommand } from "./commands/search.js";
import { teamCommand } from "./commands/team.js";
import { websetCommand } from "./commands/webset.js";
import { printError } from "./output.js";

const program = new Command();

program
  .name("exa-cli")
  .description(
    "Unofficial command-line interface for the Exa API. " +
      "An independent project, not affiliated with or endorsed by Exa.",
  )
  // Single source of truth for the version — package.json, imported directly.
  .version(pkg.version);

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
  program.addCommand(command);
}

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof ExaError) {
    printError(`Exa API ${error.status}: ${JSON.stringify(error.body)}`);
  } else {
    printError(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
}
