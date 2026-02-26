import { camelCase } from "lodash";

export interface ParsedArgs {
  command: string | undefined;
  options: Record<string, string | boolean>;
  positionals: string[];
}

function isNegativeNumberToken(value: string | undefined) {
  return typeof value === "string" && /^-\d+(\.\d+)?$/.test(value);
}

export function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  let command: string | undefined;
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];

  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    // command (first non-flag)
    if (!command && !arg?.startsWith("-")) {
      command = arg;
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
      const normalizedKey = camelCase(key);

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
          options[camelCase(key)] = true;
        }
        i++;
        continue;
      }

      const normalizedKey = camelCase(keyPart);
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

  return { command, options, positionals };
}
