import _ from "lodash";

export interface ParsedArgs {
  command: string | undefined;
  commandParts: string[];
  options: Record<string, string | boolean>;
  positionals: string[];
}

function isNegativeNumberToken(value: string | undefined) {
  return typeof value === "string" && /^-\d+(\.\d+)?$/.test(value);
}

export function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  const commandParts: string[] = [];
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    // Command and subcommand tokens are the leading non-flag arguments.
    if (commandParts.length > 0 || !arg?.startsWith("-")) {
      if (arg && !arg.startsWith("-")) {
        commandParts.push(arg);
        i++;
        continue;
      }
    }

    // Keep non-command positional arguments for future command support.
    if (arg && !arg.startsWith("-")) {
      positionals.push(arg);
      i++;
      continue;
    }

    // --key value | --key="value"
    if (arg?.startsWith("--")) {
      const raw = arg.slice(2);
      const separatorIndex = raw.indexOf("=");
      const key = separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw;
      const inlineValue = separatorIndex >= 0 ? raw.slice(separatorIndex + 1) : undefined;

      if (!key) {
        i++;
        continue;
      }
      const normalizedKey = _.camelCase(key);

      if (inlineValue !== undefined) {
        options[normalizedKey] = inlineValue;
        i++;
        continue;
      }

      const next = argv[i + 1];
      if (!next || (next.startsWith("-") && !isNegativeNumberToken(next))) {
        options[normalizedKey] = true; // flag
        i++;
      } else {
        options[normalizedKey] = next;
        i += 2;
      }
      continue;
    }

    // -k value | -k | -abc
    if (arg?.startsWith("-") && arg.length > 1) {
      const raw = arg.slice(1);
      const separatorIndex = raw.indexOf("=");
      const keyPart = separatorIndex >= 0 ? raw.slice(0, separatorIndex) : raw;
      const inlineValue = separatorIndex >= 0 ? raw.slice(separatorIndex + 1) : undefined;

      if (keyPart.length > 1 && inlineValue === undefined) {
        for (const key of keyPart) {
          options[_.camelCase(key)] = true;
        }
        i++;
        continue;
      }

      const normalizedKey = _.camelCase(keyPart);
      if (!normalizedKey) {
        i++;
        continue;
      }

      if (inlineValue !== undefined) {
        options[normalizedKey] = inlineValue;
        i++;
        continue;
      }

      const next = argv[i + 1];
      if (!next || (next.startsWith("-") && !isNegativeNumberToken(next))) {
        options[normalizedKey] = true;
        i++;
      } else {
        options[normalizedKey] = next;
        i += 2;
      }
      continue;
    }

    // positional args
    arg && positionals.push(arg);
    i++;
  }

  return {
    command: commandParts.length > 0 ? commandParts.join(" ") : undefined,
    commandParts,
    options,
    positionals,
  };
}
