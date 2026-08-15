#!/usr/bin/env node
import type { BaseCommand } from "@/commands/base/index.js";
import { appSettings, loadCommandByName, loadCommands, parseArgs, renderCommandGroupHelp, renderCommandHelp, renderHelp, scanCommandManifest, type CommandManifestEntry } from "@/infrastructures/index.js";
import chalk from "chalk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import _ from "lodash";
import { dirname, join } from "path";
import "reflect-metadata";
import { fileURLToPath } from "url";
import { CliService } from "./services/cli.service.js";
dayjs.extend(relativeTime);

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

function findOptionCommandInManifest(commands: Map<string, CommandManifestEntry>, options: Record<string, string | boolean>) {
  for (const commandName of commands.keys()) {
    if (!commandName.startsWith("--")) continue;
    const key = _.camelCase(commandName.slice(2));
    if (options[key] === true) {
      return commandName;
    }
  }
  return undefined;
}

function getUniqueManifestEntries(commands: Map<string, CommandManifestEntry>) {
  return [...new Map([...commands.values()].map((command) => [command.modulePath, command] as const)).values()];
}

function getCommandGroupEntries(commands: Map<string, CommandManifestEntry>, groupName: string) {
  const prefix = `${groupName} `;
  return getUniqueManifestEntries(commands).filter((command) => command.name.startsWith(prefix));
}

let newVersionAlert: string | undefined;
let checkForUpdateTimer: NodeJS.Timeout | undefined;
async function main() {
  const args = parseArgs();
  checkForUpdateTimer = setTimeout(() => {
    appSettings.CheckForUpdate &&
      !args.options.upgrade &&
      new CliService().checkForUpdate().then((result) => {
        if (result.hasUpdate) {
          newVersionAlert = `A new CLI version ${result.latestVersion} is available. Run "giatk --upgrade" to update.`;
        }
      });
  });

  checkForUpdateTimer.unref();

  const commandsDir = join(__dirname, "commands");

  let commands: Map<string, new () => BaseCommand> | undefined;
  let manifest: Map<string, CommandManifestEntry> | undefined;
  const ensureCommandsLoaded = async () => {
    if (!commands) {
      commands = await loadCommands(commandsDir);
    }

    return commands;
  };
  const ensureManifestLoaded = async () => {
    if (!manifest) {
      manifest = await scanCommandManifest(commandsDir);
    }

    return manifest;
  };

  if (!args.command && (args.options.version === true || args.options.v === true)) {
    await new CliService().showVersion();
    return;
  }

  if (args.options.help === true) {
    const loadedManifest = await ensureManifestLoaded();
    const optionCommandName = findOptionCommandInManifest(loadedManifest, args.options);

    if (!args.command) {
      if (optionCommandName) {
        const optionCmd = await loadCommandByName(commandsDir, optionCommandName);
        if (optionCmd) {
          renderCommandHelp(optionCommandName, optionCmd);
          return;
        }
      }
      renderHelp(getUniqueManifestEntries(loadedManifest));
      return;
    }

    const helpCommand = await loadCommandByName(commandsDir, args.command);
    if (helpCommand) {
      renderCommandHelp(args.command, helpCommand);
      return;
    }

    const groupCommands = getCommandGroupEntries(loadedManifest, args.command);
    if (groupCommands.length > 0) {
      renderCommandGroupHelp(args.command, groupCommands);
      return;
    }

    renderHelp(getUniqueManifestEntries(loadedManifest));
    return;
  } else if (args.options.upgrade === true) {
    await new CliService().upgradeCli();
    return;
  } else if (args.options.config === true) {
    await new CliService().openFileConfig();
    return;
  }

  const Cmd = args.command ? await loadCommandByName(commandsDir, args.command) : undefined;
  if (Cmd) {
    await new Cmd().executeAsync();
    return;
  }

  if (args.command) {
    const loadedManifest = await ensureManifestLoaded();
    const groupCommands = getCommandGroupEntries(loadedManifest, args.command);
    if (groupCommands.length > 0) {
      renderCommandGroupHelp(args.command, groupCommands);
      return;
    }
  }

  if (!args.command) {
    const loadedCommands = await ensureCommandsLoaded();
    const optionCommandName = findOptionCommand(loadedCommands, args.options);
    const optionCmd = optionCommandName ? loadedCommands.get(optionCommandName) : undefined;
    if (optionCmd) {
      await new optionCmd().executeAsync();
      return;
    }
  }

  const loadedManifest = await ensureManifestLoaded();
  renderHelp(getUniqueManifestEntries(loadedManifest));
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
