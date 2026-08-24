import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const defaultSource =
  "C:/Users/genau/antigravity/GenAudius_Project/GenAudius_V1/genaudius/runtime/static/playground.html";
const source = resolve(process.env.GENAUDIUS_STUDIO_SOURCE || defaultSource);
const destination = resolve("static/qamuz-studio-v1/index.html");
const channelAlignmentCss = `
  <style id="qamuz-channel-alignment">
    .mixer {
      grid-template-columns: none !important;
      grid-template-rows: minmax(0, 1fr) !important;
      grid-auto-flow: column !important;
      grid-auto-columns: minmax(126px, 1fr) !important;
      align-items: stretch !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
    }
    .mixer .channel {
      min-width: 126px !important;
      height: 100% !important;
      min-height: 0 !important;
    }
  </style>`;
const sharedShellRedirect = `
  <script id="qamuz-shared-shell-redirect">
    (() => {
      const params = new URLSearchParams(location.search);
      if (window.top === window.self && params.get("embedded") === "1" && params.get("inner") !== "1") {
        location.replace("/qamuz-studio-shell/" + location.search);
      }
    })();
  </script>`;

try {
  const sourceInfo = await stat(source);
  if (!sourceInfo.isFile()) {
    throw new Error(`La fuente no es un archivo: ${source}`);
  }

  await mkdir(dirname(destination), { recursive: true });
  let html = await readFile(source, "utf8");
  html = html.replace(/\s*<style id="qamuz-channel-alignment">[\s\S]*?<\/style>/, "");
  html = html.replace(/\s*<script id="qamuz-shared-shell-redirect">[\s\S]*?<\/script>/, "");
  html = html.replace("</head>", `${channelAlignmentCss}\n</head>`);
  html = html.replace("</head>", `${sharedShellRedirect}\n</head>`);
  await writeFile(destination, html, "utf8");
  console.log(`[QAMUZ Studio] Sincronizado desde ${source}`);
} catch (error) {
  console.error(
    "[QAMUZ Studio] No se pudo sincronizar el playground. Define GENAUDIUS_STUDIO_SOURCE si cambió de ubicación.",
  );
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
