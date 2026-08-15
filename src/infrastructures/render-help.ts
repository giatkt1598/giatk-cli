import { COMMAND_ARGS_TYPE_META, COMMAND_META, type BaseCommand, type CommandMetadata } from "@/commands/base/index.js";
import { appConsts } from "@/constants/constants.js";
import type { CommandManifestEntry } from "@/infrastructures/load-commands.js";
import { getArgumentDescriptions, getArgumentShortcuts } from "@/decorators/index.js";
import { getMetadataStorage } from "class-validator";
import Table from "cli-table3";

const { CLI } = appConsts;
type HelpCommandItem = {
  name: string;
  shortcut: string | undefined;
  description: string;
};

function createBorderlessTable(colWidths: number[]) {
  return new Table({
    colWidths,
    wordWrap: true,
    chars: {
      top: "",
      "top-mid": "",
      "top-left": "",
      "top-right": "",
      bottom: "",
      "bottom-mid": "",
      "bottom-left": "",
      "bottom-right": "",
      left: "",
      "left-mid": "",
      mid: "",
      "mid-mid": "",
      right: "",
      "right-mid": "",
      middle: " ",
    },
    style: { head: ["cyan"], border: [], compact: true },
  });
}

export function renderHelp(commands: Iterable<CommandManifestEntry>) {
  const termWidth = process.stdout.columns ?? 100;
  const cmdColWidth = 18;
  const descColWidth = Math.max(40, termWidth - cmdColWidth - 6);

  const items = [
    ...new Map<string, HelpCommandItem | null>(
      [...commands].map((command) => {
        return [
          command.name,
          {
            name: command.name,
            shortcut: command.shortcut,
            description: command.description,
          },
        ] as const;
      }),
    ).values(),
  ]
    .filter((item): item is HelpCommandItem => item !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const commandTable = createBorderlessTable([cmdColWidth, descColWidth]);
  items.forEach((item) => {
    const label = item.shortcut ? `${item.name}, ${item.shortcut}` : item.name;
    commandTable.push([label, item.description]);
  });

  const optionTable = createBorderlessTable([cmdColWidth, descColWidth]);
  optionTable.push(["--help", `Show help`]);
  optionTable.push(["--version, -v", `Print version information and quit`]);
  optionTable.push(["--upgrade", `Upgrade CLI to the latest version`]);
  optionTable.push(["--config", `Open CLI configuration file`]);

  console.log(CLI.DISPLAY_NAME);
  console.log("");
  console.log("Usage:");
  console.log(`  ${CLI.BIN_NAME} [command] [options]`);
  console.log("");
  console.log("Commands:");
  console.log(commandTable.toString());
  console.log("");
  console.log("Options:");
  console.log(optionTable.toString());
  console.log("");
  console.log(`Use "${CLI.BIN_NAME} [command] --help" for more information about a command.`);
}

export function renderCommandGroupHelp(groupName: string, commands: Iterable<CommandManifestEntry>) {
  const termWidth = process.stdout.columns ?? 100;
  const cmdColWidth = 24;
  const descColWidth = Math.max(40, termWidth - cmdColWidth - 6);
  const prefix = `${groupName} `;
  const items = [...commands]
    .filter((command) => command.name.startsWith(prefix))
    .sort((a, b) => a.name.localeCompare(b.name));
  const commandTable = createBorderlessTable([cmdColWidth, descColWidth]);

  items.forEach((item) => {
    const label = item.shortcut ? `${item.name}, ${item.shortcut}` : item.name;
    commandTable.push([label, item.description]);
  });

  console.log(CLI.DISPLAY_NAME);
  console.log("");
  console.log("Usage:");
  console.log(`  ${CLI.BIN_NAME} ${groupName} [subcommand] [options]`);
  console.log("");
  console.log("Subcommands:");
  console.log(commandTable.toString());
  console.log("");
  console.log(`Use "${CLI.BIN_NAME} ${groupName} [subcommand] --help" for more information about a subcommand.`);
}

export function renderCommandHelp(commandName: string, commandCtor: new () => BaseCommand) {
  const termWidth = process.stdout.columns ?? 100;
  const metadata = (commandCtor as any)[COMMAND_META] as string | CommandMetadata | undefined;
  const canonicalCommandName = typeof metadata === "string" ? commandName : (metadata?.name ?? commandName);
  const options = typeof metadata === "string" ? undefined : metadata?.options;
  const description = options?.description ?? "";
  const examples = options?.example ? [options.example] : [];
  const shortcut = options?.shortcut?.trim();

  const argsType = (commandCtor as any)[COMMAND_ARGS_TYPE_META] as Function | undefined;
  const argumentDescriptions = argsType ? getArgumentDescriptions(argsType) : {};
  const argumentShortcuts = argsType ? getArgumentShortcuts(argsType) : {};
  const defaultValues: Record<string, unknown> = {};
  if (argsType) {
    try {
      Object.assign(defaultValues, new (argsType as new () => object)());
    } catch {
      // Ignore DTO constructors requiring params.
    }
  }
  const validationMetadatas = argsType ? getMetadataStorage().getTargetValidationMetadatas(argsType, "", false, false) : [];
  const byProperty = new Map<string, any[]>();
  for (const metadata of validationMetadatas) {
    const list = byProperty.get(metadata.propertyName) ?? [];
    list.push(metadata);
    byProperty.set(metadata.propertyName, list);
  }

  const inferArgType = (property: string): string => {
    const metadatas = byProperty.get(property) ?? [];
    const names = new Set(metadatas.map((m) => m.name));

    if (names.has("isDayjs")) return "date";
    if (names.has("isBoolean")) return "boolean";
    if (names.has("isInt")) return "number";
    if (names.has("isString")) return "string";
    if (names.has("isMultiSelect")) return "multi-select";
    if (names.has("isIn")) return "single-select";

    if (!argsType) return "unknown";
    const reflected = Reflect.getMetadata("design:type", argsType.prototype, property) as Function | undefined;
    if (reflected === String) return "string";
    if (reflected === Number) return "number";
    if (reflected === Boolean) return "boolean";
    if (reflected === Date) return "Date";
    if (reflected?.name) return reflected.name;
    return "unknown";
  };

  const argumentFields = new Set<string>([
    ...Object.keys(argumentDescriptions),
    ...byProperty.keys(),
    ...Object.keys(defaultValues).filter((key) => defaultValues[key] !== undefined),
  ]);

  const normalizedArgumentRows = [...argumentFields]
    .sort((a, b) => a.localeCompare(b))
    .map((arg) => {
      const metadataItems = byProperty.get(arg) ?? [];
      const isOptional = metadataItems.some((m) => m.name === "isOptional");
      const typeLabel = inferArgType(arg);
      const isChoiceType = ["single-select", "multi-select"].includes(typeLabel);
      const defaultValue = defaultValues[arg];
      const baseDescription = argumentDescriptions[arg] ?? "";
      let description = baseDescription;
      const hasDefaultValue = defaultValue !== undefined;
      if (defaultValue !== undefined) {
        const defaultLabel = typeof defaultValue === "object" ? JSON.stringify(defaultValue) : String(defaultValue);
        description = baseDescription ? `${baseDescription} (default: ${defaultLabel})` : `Default value: ${defaultLabel}`;
      }
      if (isChoiceType) {
        let choiceValues: string[] = [];
        if (typeLabel === "single-select") {
          const enumMetadata = metadataItems.find((m) => m.name === "isIn");
          choiceValues = Array.isArray(enumMetadata?.constraints?.[0]) ? enumMetadata.constraints[0].map((v: unknown) => String(v)) : [];
        } else if (typeLabel === "multi-select") {
          const enumMetadata = metadataItems.find((m) => m.name === "isMultiSelect");
          choiceValues = Array.isArray(enumMetadata?.constraints) ? enumMetadata.constraints.map((v: unknown) => String(v)) : [];
        }

        if (choiceValues.length > 0) {
          description = description ? `${description}\nValues: ${choiceValues.join(", ")}` : `Values: ${choiceValues.join(", ")}`;
        }
      }
      const isRequired = !isOptional && !hasDefaultValue;
      const shortcut = argumentShortcuts[arg];
      const argumentName = `--${arg}${isRequired ? "*" : ""}${shortcut ? `, -${shortcut}` : ""}`;
      return [argumentName, typeLabel, description] as const;
    });

  const hasOptions = normalizedArgumentRows.length > 0;
  console.log(CLI.DISPLAY_NAME);
  console.log("");
  console.log("Usage:");
  console.log(`  ${CLI.BIN_NAME} ${canonicalCommandName} ${hasOptions ? "[options]" : ""}`);
  shortcut && console.log(`  ${CLI.BIN_NAME} ${shortcut} ${hasOptions ? "[options]" : ""}`);
  if (description) {
    console.log("");
    console.log("Description:");
    console.log(`  ${description}`);
  }

  if (hasOptions) {
    const argTable = createBorderlessTable([28, 20, Math.max(24, termWidth - 54)]);
    normalizedArgumentRows.forEach((row) => argTable.push(row as any));
    console.log("");
    console.log("Options:");
    console.log(argTable.toString());
  }

  if (examples.length > 0) {
    console.log("");
    console.log(examples.length === 1 ? "Example:" : "Examples:");
    for (const example of examples) {
      console.log(`  ${CLI.BIN_NAME} ${example}`);
    }
  }
}
