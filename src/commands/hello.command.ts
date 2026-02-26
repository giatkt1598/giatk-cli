import { BaseCommand, Command } from "./base/index.js";

@Command("hello", {
  description: "Print a simple hello message.",
})
export class HelloCommand extends BaseCommand {
  async executeAsync() {
    console.log("Hello world");
  }
}
