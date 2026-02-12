#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadCommands, parseArgs } from "@/infrastructures/index.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = await loadCommands(join(__dirname, "commands"));

const args = parseArgs();
console.log("🚀 ~ args:", args);

const Cmd = commands.get(args.command!);
if (Cmd) {
  await new Cmd().executeAsync();
}
