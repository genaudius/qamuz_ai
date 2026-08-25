<script lang="ts">
  import { dev } from "$app/environment";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { authClient } from "$lib/auth-client";

  const studioDevOrigin = "http://localhost:1420";
  let studioSource = $state("");
  let studioFrame = $state<HTMLIFrameElement | null>(null);

  function studioUrl(params: URLSearchParams) {
    if (dev) return `${studioDevOrigin}/?${params}`;
    return `/qamuz-studio/?${params}`;
  }

  function isStudioOrigin(origin: string) {
    try {
      const url = new URL(origin);
      return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "qamuz.ai" || url.hostname.endsWith(".qamuz.ai");
    } catch {
      return false;
    }
  }

  function readLocalSessions() {
    try {
      const parsed = JSON.parse(localStorage.getItem("qamuz.studio.sessions.v1") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function sendUserToStudio(source: MessageEventSource | null, origin: string) {
    if (!source || typeof (source as Window).postMessage !== "function") return;
    const user = page.data.session?.user;
    (source as Window).postMessage(
      {
        type: "qamuz-studio:user",
        user: {
          name: user?.name ?? "",
          email: user?.email ?? "",
          plan: user?.planTier ?? "free"
        }
      },
      origin
    );
  }

  function sendSessionsToStudio(source: MessageEventSource | null, origin: string) {
    if (!source || typeof (source as Window).postMessage !== "function") return;
    (source as Window).postMessage({ type: "qamuz-studio:sessions", sessions: readLocalSessions() }, origin);
    sendUserToStudio(source, origin);
  }

  async function proxyStudioApi(event: MessageEvent) {
    const data = event.data;
    if (!data || data.type !== "qamuz-studio:api" || typeof data.id !== "string") return;
    const source = event.source as Window | null;
    const reply = (payload: Record<string, unknown>, transfer?: Transferable[]) => {
      source?.postMessage({ type: "qamuz-studio:api-result", id: data.id, ...payload }, event.origin, transfer);
    };
    try {
      if (!isStudioOrigin(event.origin)) {
        reply({ status: 403, error: "origin" });
        return;
      }
      const path = String(data.path || "");
      if (!path.startsWith("/api/")) {
        reply({ status: 400, error: "path" });
        return;
      }
      const method = String(data.method || "GET").toUpperCase();
      const headers = new Headers();
      let body: BodyInit | undefined;
      if (data.file?.bytes) {
        const form = new FormData();
        const bytes = data.file.bytes as ArrayBuffer;
        form.append("file", new Blob([new Uint8Array(bytes)], { type: data.file.type || "application/octet-binary" }), data.file.name || "audio.wav");
        if (data.fields && typeof data.fields === "object") {
          for (const [key, value] of Object.entries(data.fields as Record<string, string>)) {
            form.append(key, value);
          }
        }
        body = form;
      } else if (data.json) {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(data.json);
      }
      const response = await fetch(path, { method, headers, body, credentials: "same-origin" });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        reply({ status: response.status, json: await response.json(), contentType });
        return;
      }
      const bytes = await response.arrayBuffer();
      reply({ status: response.status, bytes, contentType }, [bytes]);
    } catch (error) {
      reply({ status: 0, error: (error as Error).message });
    }
  }

  onMount(() => {
    const params = new URLSearchParams({
      embedded: "1",
      home: window.location.origin + "/",
      plan: String(page.data.session?.user?.planTier ?? "free"),
      _t: Date.now().toString()
    });
    for (const key of ["session", "idea", "extractStems", "musicId", "genre", "instrumental", "autoPlan", "bpm"]) {
      const value = page.url.searchParams.get(key);
      if (value) params.set(key, value);
    }
    studioSource = studioUrl(params);

    const onMessage = (event: MessageEvent) => {
      if (!isStudioOrigin(event.origin)) return;
      if (event.data?.type === "qamuz-studio:api") {
        void proxyStudioApi(event);
        return;
      }
      if (event.data?.type === "qamuz-studio:ready") {
        sendSessionsToStudio(event.source, event.origin);
        return;
      }
      if (event.data?.type === "qamuz-studio:sessions-write" && Array.isArray(event.data.sessions)) {
        localStorage.setItem("qamuz.studio.sessions.v1", JSON.stringify(event.data.sessions));
        return;
      }
      if (event.data?.type === "qamuz-studio:navigate" && typeof event.data.path === "string") {
        void goto(event.data.path);
        return;
      }
      if (event.data?.type === "qamuz-studio:sign-out") {
        void (async () => {
          try {
            await authClient.signOut({
              fetchOptions: {
                async onSuccess() {
                  await invalidateAll();
                }
              }
            });
          } catch {
            // Fall through to login even if the client call fails.
          }
          void goto("/login");
        })();
        return;
      }
      if (event.data?.type !== "qamuz-studio:home") return;
      void goto("/");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  });
</script>

<svelte:head>
  <title>QAMUZ Studio</title>
  <meta name="description" content="Estudio musical multipista de QAMUZ AI con Maestro y GenAudius." />
</svelte:head>

<section class="h-screen w-full overflow-hidden bg-[#131313]">
  {#if studioSource}
    <iframe
      bind:this={studioFrame}
      title="QAMUZ Studio"
      src={studioSource}
      class="h-full w-full border-0 bg-[#131313]"
      allow="clipboard-read; clipboard-write; autoplay; midi; microphone"
      onload={() => {
        if (studioFrame?.contentWindow) {
          sendSessionsToStudio(studioFrame.contentWindow, new URL(studioSource, window.location.href).origin);
        }
      }}
    ></iframe>
  {/if}
</section>
