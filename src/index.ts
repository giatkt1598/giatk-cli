#!/usr/bin/env node
import type { BaseCommand } from "@/commands/base/index.js";
import { appSettings, loadCommands, parseArgs, renderCommandHelp, renderHelp } from "@/infrastructures/index.js";
import chalk from "chalk";
import _ from "lodash";
import { dirname, join } from "path";
import "reflect-metadata";
import { fileURLToPath } from "url";
import { displayCliVersion } from "./infrastructures/get-cli-version.js";
import { CliService } from "./services/cli.service.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

function findOptionCommand(commands: Map<string, new () => BaseCommand>, options: Record<string, string | boolean>) {
  for (const commandName of commands.keys()) {
    if (!commandName.startsWith("--")) continue;
    const key = _.camelCase(commandName.slice(2));
    if (options[key] === true) {
      return commandName;
    }
  }
  return undefined;
}

let newVersionAlert: string | undefined;
let checkForUpdateTimer: NodeJS.Timeout | undefined;
async function main() {
  const args = parseArgs();
  checkForUpdateTimer = setTimeout(async () => {
    appSettings.CheckForUpdate &&
      !args.options.upgrade &&
      (await new CliService().checkForUpdate().then((result) => {
        if (result.hasUpdate) {
          newVersionAlert = `A new CLI version ${result.latestVersion} is available. Run "giatk --upgrade" to update.`;
        }
      }));
  });

  checkForUpdateTimer.unref();

  const commands = await loadCommands(join(__dirname, "commands"));

  const optionCommandName = findOptionCommand(commands, args.options);

  if (!args.command && (args.options.version === true || args.options.v === true)) {
    displayCliVersion();
    return;
  }

  if (args.options.help === true) {
    if (!args.command) {
      if (optionCommandName) {
        const optionCmd = commands.get(optionCommandName);
        if (optionCmd) {
          renderCommandHelp(optionCommandName, optionCmd);
          return;
        }
      }
      renderHelp(commands);
      return;
    }

    const helpCommand = commands.get(args.command);
    if (helpCommand) {
      renderCommandHelp(args.command, helpCommand);
      return;
    }

    renderHelp(commands);
    return;
  } else if (args.options.upgrade === true) {
    await new CliService().upgradeCli();
    return;
  } else if (args.options.config === true) {
    await new CliService().openFileConfig();
    return;
  }

  const Cmd = commands.get(args.command!);
  if (Cmd) {
    await new Cmd().executeAsync();
    return;
  }

  if (!args.command && optionCommandName) {
    const optionCmd = commands.get(optionCommandName);
    if (optionCmd) {
      await new optionCmd().executeAsync();
      return;
    }
  }

  renderHelp(commands);
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(() => {
    newVersionAlert && console.log(chalk.yellow(`\n${newVersionAlert}\n`));
  });
