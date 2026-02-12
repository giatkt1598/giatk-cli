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
}
