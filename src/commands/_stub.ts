import { Command } from "commander";

// Placeholder commands keep the full `exa --help` tree visible while each
// endpoint group is filled in. Replace these with real implementations.

function notImplemented(path: string): void {
  process.stderr.write(`exa ${path}: not implemented yet\n`);
  process.exitCode = 1;
}

export function stubCommand(name: string, description: string): Command {
  return new Command(name).description(description).action(() => {
    notImplemented(name);
  });
}

export function stubGroup(
  name: string,
  description: string,
  subcommands: ReadonlyArray<readonly [string, string]>,
): Command {
  const group = new Command(name).description(description);
  for (const [subName, subDescription] of subcommands) {
    group
      .command(subName)
      .description(subDescription)
      .action(() => {
        notImplemented(`${name} ${subName}`);
      });
  }
  return group;
}
