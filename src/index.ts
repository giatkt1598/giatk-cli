#!/usr/bin/env node
import "reflect-metadata";
import { loadCommands, parseArgs } from "@/infrastructures/index.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const commands = await loadCommands(join(__dirname, "commands"));

  const args = parseArgs();
  console.debug("🚀 ~ args:", args);

  const Cmd = commands.get(args.command!);
  if (Cmd) {
    await new Cmd().executeAsync();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
