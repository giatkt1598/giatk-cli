import { readdir, readFile } from "fs/promises";
import { basename, join, relative } from "path";
import { pathToFileURL } from "url";
import { BaseCommand, COMMAND_META, type CommandMetadata } from "../commands/base/index.js";

export type CommandCtor = new () => BaseCommand;

export interface CommandModuleRef {
  fileName: string;
  inferredName: string;
  modulePath: string;
}

export interface CommandManifestEntry extends CommandModuleRef {
  name: string;
  shortcut: string | undefined;
  description: string;
  example: string | undefined;
}

type ParsedCommandMetadata = {
  name: string;
  options?: {
    description?: string;
    example?: string;
    shortcut?: string;
  };
};

function isCommandFile(fileName: string) {
  return fileName.endsWith(".command.ts") || fileName.endsWith(".command.js");
}

function inferCommandName(fileName: string) {
  return basename(fileName).replace(/\.command\.(ts|js)$/u, "");
}

function getCommandMetadata(command: CommandCtor) {
  return (command as any)[COMMAND_META] as string | CommandMetadata | undefined;
}

function getCommandName(command: CommandCtor) {
  const metadata = getCommandMetadata(command);
  return typeof metadata === "string" ? metadata : metadata?.name;
}

function getCommandShortcut(command: CommandCtor) {
  const metadata = getCommandMetadata(command);
  return typeof metadata === "string" ? undefined : metadata?.options?.shortcut?.trim();
}

function registerCommand(commands: Map<string, CommandCtor>, key: string, command: CommandCtor) {
  const existing = commands.get(key);
  if (existing && existing !== command) {
    throw new Error(`Duplicate command registration for "${key}".`);
  }

  commands.set(key, command);
}

function registerCommandWithAliases(commands: Map<string, CommandCtor>, command: CommandCtor) {
  const commandName = getCommandName(command);
  if (!commandName) {
    return;
  }

  registerCommand(commands, commandName, command);

  const shortcut = getCommandShortcut(command);
  if (!shortcut || shortcut === commandName) {
    return;
  }

  registerCommand(commands, shortcut, command);
}

function registerManifestEntry(entries: Map<string, CommandManifestEntry>, entry: CommandManifestEntry, key: string) {
  const existing = entries.get(key);
  if (existing && existing.modulePath !== entry.modulePath) {
    throw new Error(`Duplicate command registration for "${key}".`);
  }

  entries.set(key, entry);
}

async function importCommandModule(modulePath: string) {
  return import(pathToFileURL(modulePath).href);
}

function extractCommands(mod: Record<string, unknown>) {
  return Object.values(mod).filter((exported): exported is CommandCtor => {
    if (typeof exported !== "function") {
      return false;
    }

    return !!getCommandMetadata(exported as CommandCtor);
  });
}

function getCommandDecoratorMetadata(content: string) {
  const tsMatch = content.match(/@Command\(\s*(["'`])(?<name>.*?)\1\s*(?:,\s*(?<options>\{[\s\S]*?\}))?\s*\)/u);
  if (tsMatch?.groups?.name) {
    return {
      name: tsMatch.groups.name,
      options: parseCommandOptions(tsMatch.groups.options),
    } satisfies ParsedCommandMetadata;
  }

  const tail = content.slice(-20_000);
  const jsMatches = [...tail.matchAll(/(?<callee>[A-Za-z_$][\w$]*)\(\s*(["'`])(?<name>(?:\\.|(?!\2)[\s\S])*?)\2\s*(?:,\s*(?<options>\{[\s\S]*?\}))?\s*\)/gu)];
  for (let index = jsMatches.length - 1; index >= 0; index--) {
    const match = jsMatches[index];
    if (!match) {
      continue;
    }

    const name = match.groups?.name;
    if (!name) {
      continue;
    }

    const optionsSource = match.groups?.options;
    const options = parseCommandOptions(optionsSource);
    if (!optionsSource && !tail.includes("__command_meta__")) {
      continue;
    }

    if (!optionsSource || /description\s*:|shortcut\s*:|example\s*:/u.test(optionsSource)) {
      return {
        name: unescapeQuotedString(name),
        options,
      } satisfies ParsedCommandMetadata;
    }
  }

  return undefined;
}

function parseCommandOptions(optionsSource: string | undefined) {
  if (!optionsSource) {
    return undefined;
  }

  return {
    description: parseStringProperty(optionsSource, "description"),
    example: parseStringProperty(optionsSource, "example"),
    shortcut: parseStringProperty(optionsSource, "shortcut"),
  };
}

function parseStringProperty(source: string, key: string) {
  const match = source.match(new RegExp(`${key}\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`, "u"));
  if (!match) {
    return undefined;
  }

  const rawValue = match[2];
  if (rawValue === undefined) {
    return undefined;
  }

  return unescapeQuotedString(rawValue);
}

function unescapeQuotedString(value: string) {
  return value
    .replace(/\\(["'`\\])/gu, "$1")
    .replace(/\\n/gu, "\n")
    .replace(/\\r/gu, "\r")
    .replace(/\\t/gu, "\t");
}

export async function scanCommandModules(dir: string) {
  const modules: CommandModuleRef[] = [];

  async function visit(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const modulePath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "base") {
          continue;
        }
        await visit(modulePath);
        continue;
      }

      if (!entry.isFile() || !isCommandFile(entry.name)) {
        continue;
      }

      const fileName = relative(dir, modulePath);
      modules.push({
        fileName,
        inferredName: inferCommandName(entry.name),
        modulePath,
      });
    }
  }

  await visit(dir);
  return modules.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

export async function scanCommandManifest(dir: string) {
  const modules = await scanCommandModules(dir);
  const entriesByKey = new Map<string, CommandManifestEntry>();

  for (const moduleRef of modules) {
    const content = await readFile(moduleRef.modulePath, "utf-8");
    const metadata = getCommandDecoratorMetadata(content);
    const name = metadata?.name ?? moduleRef.inferredName;
    const shortcut = metadata?.options?.shortcut?.trim();

    const entry: CommandManifestEntry = {
      ...moduleRef,
      name,
      shortcut,
      description: metadata?.options?.description ?? "",
      example: metadata?.options?.example,
    };

    registerManifestEntry(entriesByKey, entry, entry.name);
    if (shortcut && shortcut !== entry.name) {
      registerManifestEntry(entriesByKey, entry, shortcut);
    }
  }

  return entriesByKey;
}

export async function loadCommands(dir: string) {
  const modules = await scanCommandModules(dir);
  const commands = new Map<string, CommandCtor>();

  for (const moduleRef of modules) {
    const mod = await importCommandModule(moduleRef.modulePath);

    for (const command of extractCommands(mod)) {
      registerCommandWithAliases(commands, command);
    }
  }

  return commands;
}

export async function loadCommandByName(dir: string, commandName: string) {
  const manifest = await scanCommandManifest(dir);
  const manifestEntry = manifest.get(commandName);

  if (manifestEntry) {
    const mod = await importCommandModule(manifestEntry.modulePath);
    const commands = extractCommands(mod);
    const exactMatch = commands.find((command) => {
      const name = getCommandName(command);
      const shortcut = getCommandShortcut(command);
      return name === commandName || shortcut === commandName || name === manifestEntry.name;
    });

    if (exactMatch) {
      return exactMatch;
    }

    if (commands.length === 1) {
      return commands[0];
    }
  }

  const commands = await loadCommands(dir);
  return commands.get(commandName);
}
