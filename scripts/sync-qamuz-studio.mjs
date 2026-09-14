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

// The Studio source project lives next to the SaaS in the monorepo but is NOT
// present on the deploy host (VPS). When it is missing we must not fail the SaaS
// build: fall back to whatever is already in static/qamuz-studio/ (which the
// deploy carries), so `qamuz.ai/studio` keeps serving the last synced build.
const studioSourcePresent = await pathExists(studioRoot);

if (build && !studioSourcePresent) {
  console.warn(
    "[QAMUZ Studio] Proyecto Studio 2.0 no encontrado junto al SaaS. " +
      "Omito el build y uso lo que exista en static/qamuz-studio/.",
  );
}

if (build && studioSourcePresent) {
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

// If the Studio source is unavailable, keep the existing synced copy as-is.
if (!studioSourcePresent) {
  if (await pathExists(destination)) {
    console.log(
      `[QAMUZ Studio] Conservo el build existente en ${destination}.`,
    );
    process.exit(0);
  }
  console.warn(
    "[QAMUZ Studio] No hay build previo en static/qamuz-studio/. " +
      "El SaaS compilará sin el DAW embebido; /studio no cargará hasta sincronizar.",
  );
  process.exit(0);
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
