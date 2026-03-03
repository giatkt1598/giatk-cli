import { existsSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

export class Helper {
  static getProjectRoot() {
    let dir = dirname(fileURLToPath(import.meta.url));

    while (!existsSync(path.join(dir, "package.json"))) {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return dir;
  }

  static async sleepAsync(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async readFile(filePath: string) {
    const fs = await import("fs/promises");
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  }

  static async readFileAs<T>(filePath: string) {
    const fs = await import("fs/promises");
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  }

  static async fileExists(filePath: string) {
    const fs = await import("fs/promises");
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
