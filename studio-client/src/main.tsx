import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./studio.css";

type BridgeResult = {
  type: "qamuz-studio:api-result";
  id: string;
  status: number;
  json?: unknown;
  bytes?: ArrayBuffer;
  contentType?: string;
  error?: string;
};

const nativeFetch = window.fetch.bind(window);
const params = new URLSearchParams(window.location.search);
const embedded = params.get("embedded") === "1" && window.parent !== window;
const parentOrigin = (() => {
  try { return document.referrer ? new URL(document.referrer).origin : "*"; }
  catch { return "*"; }
})();

if (embedded) {
  const pending = new Map<string, (result: BridgeResult) => void>();
  window.addEventListener("message", (event) => {
    if (parentOrigin !== "*" && event.origin !== parentOrigin) return;
    if (event.data?.type === "qamuz-studio:user") {
      sessionStorage.setItem("qamuz.studio.user", JSON.stringify(event.data.user || {}));
      return;
    }
    const result = event.data as BridgeResult;
    if (result?.type !== "qamuz-studio:api-result" || !pending.has(result.id)) return;
    pending.get(result.id)?.(result);
    pending.delete(result.id);
  });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return nativeFetch(input, init);

    const id = crypto.randomUUID();
    const request: Record<string, unknown> = {
      type: "qamuz-studio:api",
      id,
      path: `${url.pathname}${url.search}`,
      method: String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase(),
    };
    const body = init?.body;
    const transfer: Transferable[] = [];
    if (body instanceof FormData) {
      const fields: Record<string, string> = {};
      for (const [key, value] of body.entries()) {
        if (value instanceof File) {
          const bytes = await value.arrayBuffer();
          request.file = { name: value.name, type: value.type, bytes };
          transfer.push(bytes);
        } else fields[key] = value;
      }
      request.fields = fields;
    } else if (typeof body === "string") {
      try { request.json = JSON.parse(body); }
      catch { request.json = body; }
    }

    const result = await new Promise<BridgeResult>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        pending.delete(id);
        reject(new Error("El SaaS no respondió al Studio"));
      }, 30000);
      pending.set(id, (value) => { window.clearTimeout(timer); resolve(value); });
      window.parent.postMessage(request, parentOrigin, transfer);
    });
    if (!result.status) throw new TypeError(result.error || "No se pudo conectar con QAMUZ");
    if (result.bytes) return new Response(result.bytes, { status: result.status, headers: { "Content-Type": result.contentType || "application/octet-stream" } });
    return new Response(JSON.stringify(result.json ?? { error: result.error }), { status: result.status, headers: { "Content-Type": "application/json" } });
  };

  window.parent.postMessage({ type: "qamuz-studio:ready" }, parentOrigin);
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
