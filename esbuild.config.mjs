import { build } from "esbuild";
import pkg from "./package.json" with { type: "json" };

build({
    entryPoints: ["src/index.ts", "src/commands/*"],
    external: ["./commands/*"],
    outdir: "dist",
    splitting: false,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",

    minify: true,
    sourcemap: false,
    treeShaking: true,

    logLevel: "info",
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    }
}).catch(() => process.exit(1));