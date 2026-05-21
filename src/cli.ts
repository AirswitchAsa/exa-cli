#!/usr/bin/env node
import { Command } from "commander";
import { ExaError } from "./client.js";
import { agentCommand } from "./commands/agent.js";
import { answerCommand } from "./commands/answer.js";
import { contentsCommand } from "./commands/contents.js";
import { keyCommand } from "./commands/key.js";
import { monitorCommand } from "./commands/monitor.js";
import { researchCommand } from "./commands/research.js";
import { searchCommand } from "./commands/search.js";
import { similarCommand } from "./commands/similar.js";
import { websetCommand } from "./commands/webset.js";
import { printError } from "./output.js";

const program = new Command();

program.name("exa").description("Command-line interface for the Exa search API.").version("0.0.1");

for (const command of [
  searchCommand,
  contentsCommand,
  answerCommand,
  similarCommand,
  researchCommand,
  agentCommand,
  monitorCommand,
  websetCommand,
  keyCommand,
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
