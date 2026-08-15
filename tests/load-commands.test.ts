import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { scanCommandManifest, scanCommandModules } from "../src/infrastructures/load-commands.js";

describe("command discovery", () => {
  it("discovers command modules recursively", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "giatk-cli-commands-"));
    const dockerDir = path.join(root, "docker");

    try {
      await mkdir(dockerDir);
      await writeFile(
        path.join(dockerDir, "docker-start.command.ts"),
        '@Command("docker start", { description: "Start a container" })',
      );

      const modules = await scanCommandModules(root);
      const manifest = await scanCommandManifest(root);

      expect(modules).toHaveLength(1);
      expect(modules[0]?.fileName).toBe(path.join("docker", "docker-start.command.ts"));
      expect(manifest.get("docker start")).toMatchObject({
        name: "docker start",
        description: "Start a container",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
