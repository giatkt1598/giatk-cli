import { BaseCommand, Command } from "./base/index.js";

@Command("hello")
export class HelloCommand extends BaseCommand {
  async executeAsync() {
    console.log("Hello world");
  }
}
