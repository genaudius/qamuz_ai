<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { authClient } from "$lib/auth-client";

  let studioFrame = $state<HTMLIFrameElement | null>(null);
  let studioMissing = $state(false);
  let reloadNonce = $state(0);

  function studioUrl(params: URLSearchParams) {
    return `/qamuz-studio/?${params}`;
  }

  function studioParams() {
    const params = new URLSearchParams({
      embedded: "1",
      home: `${page.url.origin}/`,
      plan: String(page.data.session?.user?.planTier ?? "free")
    });
    for (const key of ["session", "idea", "extractStems", "musicId", "genre", "instrumental", "autoPlan", "bpm"]) {
      const value = page.url.searchParams.get(key);
      if (value) params.set(key, value);
    }
    if (reloadNonce) params.set("_t", String(reloadNonce));
    return params;
  }

  const studioSource = $derived(studioUrl(studioParams()));

  function isStudioOrigin(origin: string) {
    try {
      const url = new URL(origin);
      return url.origin === page.url.origin || url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "qamuz.ai" || url.hostname.endsWith(".qamuz.ai");
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
      let targetPath = path
        .replace(/^\/api\/project(?=\?|$)/, "/api/studio/projects")
        .replace(/^\/api\/history(?=\?|$)/, "/api/studio/history")
        .replace(/^\/api\/audio\/upload(?=\?|$)/, "/api/studio/audio")
        .replace(/^\/api\/music\/generate(?=\?|$)/, "/api/music-generation");
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
        const modelMap: Record<string, string> = {
          V4: "suno-v4",
          V4_5: "suno-v4.5",
          V4_5PLUS: "suno-v4.5-plus",
          V5: "suno-v5",
          V5_5: "suno-v5.5"
        };
        const jsonBody = path.startsWith("/api/music/generate") && method === "POST"
          ? {
              prompt: data.json.prompt,
              modelId: modelMap[String(data.json.model || "V5")] || "suno-v5",
              forceInstrumental: Boolean(data.json.instrumental),
              title: data.json.title,
              projectId: data.json.projectId
            }
          : data.json;
        body = JSON.stringify(jsonBody);
      }
      const response = await fetch(targetPath, { method, headers, body, credentials: "same-origin" });
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = await response.json();
        if (path.startsWith("/api/music/generate")) {
          if (method === "POST") {
            reply({ status: response.status, json: { jobId: payload.jobId, status: payload.status === "queued" ? "PENDING" : payload.status, error: payload.error }, contentType });
            return;
          }
          const result = payload.result || {};
          reply({
            status: response.status,
            json: payload.status === "completed"
              ? { jobId: payload.jobId, status: "SUCCESS", audioUrl: `/api/music/${result.musicId}`, imageUrl: result.imageUrl, duration: Number(result.durationMs || 0) / 1000, title: result.title }
              : { jobId: payload.jobId, status: payload.status === "failed" ? "GENERATE_AUDIO_FAILED" : "PENDING", error: payload.error || result.error },
            contentType
          });
          return;
        }
        reply({ status: response.status, json: payload, contentType });
        return;
      }
      const bytes = await response.arrayBuffer();
      reply({ status: response.status, bytes, contentType }, [bytes]);
    } catch (error) {
      reply({ status: 0, error: (error as Error).message });
    }
  }

  function pingStudio() {
    studioMissing = false;
    void fetch("/qamuz-studio/index.html", { method: "HEAD", signal: AbortSignal.timeout(2500) }).catch(() => {
      studioMissing = true;
    });
  }

  function retryStudio() {
    reloadNonce = Date.now();
    pingStudio();
  }

  onMount(() => {
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
    pingStudio();

    return () => {
      window.removeEventListener("message", onMessage);
    };
  });
</script>

<svelte:head>
  <title>QAMUZ Studio</title>
  <meta name="description" content="Estudio musical multipista de QAMUZ AI con Maestro y GenAudius." />
</svelte:head>

<section class="relative h-screen w-full overflow-hidden bg-[#131313]">
  <iframe
    bind:this={studioFrame}
    title="QAMUZ Studio"
    src={studioSource}
    class="h-full w-full border-0 bg-[#131313]"
    allow="clipboard-read; clipboard-write; autoplay; midi; microphone; fullscreen"
    onload={() => {
      studioMissing = false;
      if (studioFrame?.contentWindow) {
        sendSessionsToStudio(studioFrame.contentWindow, new URL(studioSource, page.url.origin).origin);
      }
    }}
  ></iframe>

  {#if studioMissing}
    <div class="absolute inset-0 z-10 flex items-center justify-center bg-[#131313]/90 px-6">
      <div class="max-w-md rounded-2xl border border-white/10 bg-[#1b1b1b] p-8 text-center text-white">
        <p class="text-xs font-semibold tracking-[0.2em] text-violet-300">QAMUZ STUDIO 2.0</p>
        <h1 class="mt-3 text-2xl font-semibold">El DAW no está en marcha</h1>
        <p class="mt-3 text-sm leading-relaxed text-white/70">
          El módulo integrado del Studio no está disponible. Vuelve a compilar el SaaS y prueba nuevamente.
        </p>
        <button
          type="button"
          class="mt-6 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold"
          onclick={() => retryStudio()}
        >
          Reintentar
        </button>
      </div>
    </div>
  {/if}
</section>
