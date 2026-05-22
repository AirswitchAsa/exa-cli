import { Command } from "commander";
import { configPath, readUserConfig, writeUserConfig } from "../config.js";
import { printJson, printLine } from "../output.js";
import { parseJson } from "./_shared.js";

interface ConfigOptions {
  json?: boolean;
}

function preferences(): Record<string, unknown> {
  return readUserConfig().preferences ?? {};
}

function parsePreferenceValue(value: string): unknown {
  try {
    return parseJson(value, "value");
  } catch {
    return value;
  }
}

function writePreference(name: string, value: unknown): void {
  const config = readUserConfig();
  writeUserConfig({
    ...config,
    preferences: {
      ...(config.preferences ?? {}),
      [name]: value,
    },
  });
}

function unsetPreference(name: string): boolean {
  const config = readUserConfig();
  if (config.preferences?.[name] === undefined) return false;

  const nextPreferences = { ...config.preferences };
  delete nextPreferences[name];
  writeUserConfig({
    ...config,
    preferences: Object.keys(nextPreferences).length > 0 ? nextPreferences : undefined,
  });
  return true;
}

export const configCommand = new Command("config").description(
  "Manage non-secret Exa CLI preferences.",
);

configCommand
  .command("path")
  .description("Print the user config path.")
  .action(() => {
    printLine(configPath());
  });

configCommand
  .command("list")
  .description("List stored non-secret preferences.")
  .option("--json", "print the raw JSON response")
  .action((options: ConfigOptions) => {
    const prefs = preferences();
    if (options.json === true) {
      printJson(prefs);
      return;
    }

    const entries = Object.entries(prefs);
    if (entries.length === 0) {
      printLine("No preferences set.");
      return;
    }
    for (const [key, value] of entries) {
      printLine(`${key}: ${JSON.stringify(value)}`);
    }
  });

configCommand
  .command("get")
  .description("Get a stored preference.")
  .argument("<name>", "preference name")
  .option("--json", "print the raw JSON response")
  .action((name: string, options: ConfigOptions) => {
    const value = preferences()[name];
    if (value === undefined) throw new Error(`No preference named "${name}".`);
    if (options.json === true) {
      printJson(value);
    } else {
      printLine(typeof value === "string" ? value : JSON.stringify(value));
    }
  });

configCommand
  .command("set")
  .description("Set a non-secret preference.")
  .argument("<name>", "preference name")
  .argument("<value>", "JSON value, or a plain string if not valid JSON")
  .action((name: string, value: string) => {
    if (name === "apiKey") throw new Error("Use `exa-cli api-key set` to store API keys.");
    writePreference(name, parsePreferenceValue(value));
    printLine(`Set ${name} in ${configPath()}.`);
  });

configCommand
  .command("unset")
  .description("Remove a stored preference.")
  .argument("<name>", "preference name")
  .action((name: string) => {
    const removed = unsetPreference(name);
    printLine(removed ? `Unset ${name}.` : `No preference named "${name}".`);
  });
