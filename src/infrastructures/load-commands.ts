import { readdir } from "fs/promises";
import { join } from "path";
import { pathToFileURL } from "url";
import { BaseCommand, COMMAND_META, type CommandMetadata } from "../commands/base/index.js";

export async function loadCommands(dir: string) {
  const files = await readdir(dir);

  const commands = new Map<string, new () => BaseCommand>();

  const registerCommand = (key: string, command: new () => BaseCommand) => {
    const existing = commands.get(key);
    if (existing && existing !== command) {
      throw new Error(`Duplicate command registration for "${key}".`);
    }

    commands.set(key, command);
  };

  for (const file of files) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

    const modulePath = join(dir, file);
    const mod = await import(pathToFileURL(modulePath).href);

    for (const exported of Object.values(mod)) {
      if (typeof exported !== "function") continue;

      const metadata = (exported as any)[COMMAND_META] as string | CommandMetadata | undefined;
      const commandName = typeof metadata === "string" ? metadata : metadata?.name;
      if (!commandName) continue;

      const command = exported as new () => BaseCommand;
      registerCommand(commandName, command);

      const shortcut = typeof metadata === "string" ? undefined : metadata?.options?.shortcut?.trim();
      if (!shortcut || shortcut === commandName) {
        continue;
      }

      registerCommand(shortcut, command);
    }
  }

  return commands;
}
