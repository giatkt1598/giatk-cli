#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { loadCommands } from "./infrastructures/load-commands.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = await loadCommands(join(__dirname, "commands"));

const args = (await import("./infrastructures/parse-args.js")).parseArgs();
console.log("🚀 ~ args:", args);

const Cmd = commands.get("hello");
if (Cmd) {
  await new Cmd().executeAsync();
}
