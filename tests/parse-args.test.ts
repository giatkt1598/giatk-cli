import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { IsString } from "class-validator";
import { CommandOf } from "../src/commands/base/base.command.js";
import { Shortcut } from "../src/decorators/shortcut.decorator.js";
import { parseArgs } from "../src/infrastructures/parse-args.js";

describe("parseArgs", () => {
  it("parses a command and subcommand as one command path", () => {
    const originalArgv = process.argv;
    process.argv = ["node", "giatk", "docker", "start", "-n", "my-container"];

    try {
      expect(parseArgs()).toEqual({
        command: "docker start",
        commandParts: ["docker", "start"],
        options: { n: "my-container" },
        positionals: [],
      });
    } finally {
      process.argv = originalArgv;
    }
  });

  it("keeps existing single-level command parsing", () => {
    const originalArgv = process.argv;
    process.argv = ["node", "giatk", "sample", "--dry-run"];

    try {
      expect(parseArgs()).toMatchObject({
        command: "sample",
        commandParts: ["sample"],
        options: { dryRun: true },
      });
    } finally {
      process.argv = originalArgv;
    }
  });

  it("maps an argument shortcut to its typed property", () => {
    class Args {
      @IsString()
      @Shortcut("n")
      name!: string;
    }

    class TestCommand extends CommandOf(Args) {
      async executeAsync() {}
    }

    const originalArgv = process.argv;
    process.argv = ["node", "giatk", "test", "-n", "alice"];

    try {
      expect(new TestCommand().args.name).toBe("alice");
    } finally {
      process.argv = originalArgv;
    }
  });
});
