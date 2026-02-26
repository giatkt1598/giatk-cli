import { camelCase } from "lodash";

export interface ParsedArgs {
  command: string | undefined;
  options: Record<string, string | boolean>;
  positionals: string[];
}

export function parseArgs(argv = process.argv.slice(2)): ParsedArgs {
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
      const [key, inlineValue] = arg.slice(2).split("=");

      if (!key) continue;
      const normalizedKey = camelCase(key);

      if (inlineValue !== undefined) {
        options[normalizedKey] = inlineValue;
        i++;
        continue;
      }

      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        options[normalizedKey] = true; // flag
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
