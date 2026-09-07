import { cp, mkdir, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const saasRoot = resolve(root, "..");
const studioRoot = resolve(saasRoot, "../Qamuz_Daw_Studio/qamuz_studio_2.0");
const studioDist = resolve(studioRoot, "dist");
const destination = resolve(saasRoot, "static/qamuz-studio");
const build = process.argv.includes("--build");
const devMode = process.argv.includes("--dev");

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

if (devMode && !build) {
  console.log("[QAMUZ Studio] Dev: el iframe usa http://127.0.0.1:1420 (Studio 2.0).");
  process.exit(0);
}

if (build) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "build"],
    {
      cwd: studioRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        QAMUZ_STUDIO_BASE: "/qamuz-studio/",
      },
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    console.error("[QAMUZ Studio] Falló el build de Studio 2.0.");
    process.exit(result.status ?? 1);
  }
}

if (!(await pathExists(studioDist))) {
  console.error(
    "[QAMUZ Studio] No hay dist de Studio 2.0. Corre `npm run studio:build` desde Qamuz_Ai.",
  );
  process.exit(1);
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(studioDist, destination, { recursive: true });
console.log(`[QAMUZ Studio] Copiado Studio 2.0 a ${destination}`);
