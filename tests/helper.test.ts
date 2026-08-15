import { existsSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { Helper } from "../src/utilities/helper.js";
import { synchronizeMissingConfigKeys } from "../src/utilities/sync-config.js";

describe("Helper", () => {
  it("getProjectRoot should point to a folder containing package.json", () => {
    const root = Helper.getProjectRoot();
    expect(existsSync(path.join(root, "package.json"))).toBe(true);
  });

  it("sleepAsync should wait at least requested milliseconds", async () => {
    const start = Date.now();
    await Helper.sleepAsync(30);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it("writeFile/readFile/fileExists should work with a temp file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "giatk-cli-test-"));
    const filePath = path.join(tempDir, "sample.txt");

    try {
      expect(await Helper.fileExists(filePath)).toBe(false);
      await Helper.writeFile(filePath, "hello");
      expect(await Helper.fileExists(filePath)).toBe(true);
      expect(await Helper.readFile(filePath)).toBe("hello");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("readFileAs should parse JSON into object", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "giatk-cli-test-"));
    const filePath = path.join(tempDir, "sample.json");
    const payload = { name: "alice", enabled: true };

    try {
      await Helper.writeFile(filePath, JSON.stringify(payload));
      const parsed = await Helper.readFileAs<typeof payload>(filePath);
      expect(parsed).toEqual(payload);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("synchronizes config keys and preserves existing production values", () => {
    const production = {
      existing: "keep me",
      nested: { configured: true },
      obsolete: "remove me",
    };
    const changed = synchronizeMissingConfigKeys(
      {
        existing: "new default",
        addedString: "not copied",
        addedNumber: 10,
        nested: { configured: false, missing: { value: 10 } },
      },
      production,
    );

    expect(changed).toBe(true);
    expect(production).toEqual({
      existing: "keep me",
      addedString: "",
      addedNumber: null,
      nested: { configured: true, missing: { value: null } },
    });
  });
});
