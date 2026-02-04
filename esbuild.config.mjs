import { build } from "esbuild";


build({
    entryPoints: ["src/index.ts", "src/commands/*"],
    external: ["./commands/*"],
    outdir: "dist",
    splitting: true,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",

    minify: true,
    sourcemap: false,
    treeShaking: true,

    logLevel: "info"
}).catch(() => process.exit(1));