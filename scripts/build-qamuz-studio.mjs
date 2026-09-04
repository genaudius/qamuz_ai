import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "static/qamuz-studio");
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "assets"), { recursive: true });
await build({
  entryPoints: [resolve(root, "studio-client/src/main.tsx")],
  outfile: resolve(output, "assets/studio.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  sourcemap: false,
  jsx: "automatic",
});
await cp(resolve(root, "studio-client/public"), output, { recursive: true });
await writeFile(resolve(output, "index.html"), `<!doctype html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101114"><title>QAMUZ Studio</title><link rel="icon" href="./favicon.ico"><link rel="stylesheet" href="./assets/studio.css"></head><body><div id="root"></div><script type="module" src="./assets/studio.js"></script></body></html>\n`);
console.log("[QAMUZ Studio] Integrado en static/qamuz-studio");
