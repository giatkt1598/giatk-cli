import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

function getBuildVersion() {
    try {
        return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return "";
    }
}

const buildPackage = {
    name: pkg.name ?? "",
    version: pkg.version ?? "",
    buildVersion: getBuildVersion(),
    type: "module",
};

build({
    entryPoints: ["src/index.ts", "src/commands/**/*.ts"],
    external: ["shelljs"],
    outdir: "dist",
    splitting: false,
    bundle: true,
    platform: "node",
    format: 'esm',
    target: "node18",

    minify: true,
    sourcemap: false,
    treeShaking: true,

    logLevel: "info"
})
    .then(async () => {
        await writeFile(path.join("dist", "package.json"), `${JSON.stringify(buildPackage, null, 2)}\n`, "utf8");
    })
    .catch(() => process.exit(1));
