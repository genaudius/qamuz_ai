<script lang="ts">
  import { dev } from "$app/environment";
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { authClient } from "$lib/auth-client";
  import { Lock, ShieldCheck, Clock, AlertTriangle, Music, Sliders, Mic2, ArrowRight, ArrowLeft } from "@lucide/svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toast } from "svelte-sonner";

  let { data } = $props();

  // Keep the hostname identical to the Vite host used by Studio in local dev.
  const studioDevOrigin = "http://127.0.0.1:1420";
  const studioProductionOrigin = "https://qamuz.studio";
  let studioFrame = $state<HTMLIFrameElement | null>(null);
  let studioMissing = $state(false);
  let reloadNonce = $state(0);

  // Gatekeeper state for unverified users
  let verificationRole = $state<"artist" | "producer" | "producer_artist">("artist");
  let stageName = $state("");
  let portfolio = $state("");
  let isSubmitting = $state(false);
  let currentStatus = $state("none");

  $effect(() => {
    verificationRole = data.userProfile.userType === "producer_artist" ? "producer_artist" : data.userProfile.userType === "producer" ? "producer" : "artist";
    stageName = data.userProfile.artistName || data.userProfile.name || "";
    currentStatus = data.userProfile.verificationStatus;
  });

  function studioUrl(params: URLSearchParams) {
    if (dev) return `${studioDevOrigin}/?${params}`;
    return `${studioProductionOrigin}/?${params}`;
  }

  function studioParams() {
    const params = new URLSearchParams({
      embedded: "1",
      home: `${page.url.origin}/`,
      plan: String(data.userProfile?.planTier ?? "free")
    });
    for (const key of ["session", "idea", "extractStems", "musicId", "genre", "instrumental", "autoPlan", "bpm", "imageUrl"]) {
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
      return (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "qamuz.ai" ||
        url.hostname.endsWith(".qamuz.ai") ||
        url.hostname === "qamuz.studio" ||
        url.hostname.endsWith(".qamuz.studio")
      );
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
    (source as Window).postMessage(
      {
        type: "qamuz-studio:user",
        user: {
          name: data.userProfile?.name ?? "",
          email: data.userProfile?.email ?? "",
          plan: data.userProfile?.planTier ?? "free"
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
    const msgData = event.data;
    if (!msgData || msgData.type !== "qamuz-studio:api" || typeof msgData.id !== "string") return;
    const source = event.source as Window | null;
    const reply = (payload: Record<string, unknown>, transfer?: Transferable[]) => {
      source?.postMessage({ type: "qamuz-studio:api-result", id: msgData.id, ...payload }, event.origin, transfer);
    };
    try {
      if (!isStudioOrigin(event.origin)) {
        reply({ status: 403, error: "origin" });
        return;
      }
      const path = String(msgData.path || "");
      if (!path.startsWith("/api/")) {
        reply({ status: 400, error: "path" });
        return;
      }
      const method = String(msgData.method || "GET").toUpperCase();
      const isMediaPath = path.startsWith("/api/music/") || path.startsWith("/api/music-tools/");
      const headers = new Headers();
      if (isMediaPath) headers.set("X-Studio-Stream", "1");
      let body: BodyInit | undefined;
      if (msgData.file?.bytes) {
        const form = new FormData();
        const bytes = msgData.file.bytes as ArrayBuffer;
        form.append("file", new Blob([new Uint8Array(bytes)], { type: msgData.file.type || "application/octet-binary" }), msgData.file.name || "audio.wav");
        if (msgData.fields && typeof msgData.fields === "object") {
          for (const [key, value] of Object.entries(msgData.fields as Record<string, string>)) {
            form.append(key, value);
          }
        }
        body = form;
      } else if (msgData.json) {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(msgData.json);
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

  function pingStudio() {
    if (!dev || !data.isAllowed) return;
    studioMissing = false;
    void fetch(studioDevOrigin, { method: "GET", mode: "cors", signal: AbortSignal.timeout(2500) }).catch(() => {
      studioMissing = true;
    });
  }

  function retryStudio() {
    reloadNonce = Date.now();
    pingStudio();
  }

  async function handleRequestVerification() {
    if (!stageName.trim()) {
      toast.error("Por favor ingresa tu nombre artístico o de productor.");
      return;
    }

    isSubmitting = true;
    try {
      const res = await fetch("/api/user/verification-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: verificationRole,
          artistName: stageName.trim(),
          portfolioUrl: portfolio.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok || resData.error) {
        toast.error(resData.error || "No se pudo procesar la solicitud.");
        return;
      }

      currentStatus = "pending";
      toast.success("¡Solicitud enviada! Nuestro equipo revisará tu perfil en breve.");
    } catch (e) {
      console.error(e);
      toast.error("Error al enviar la solicitud.");
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    if (!data.isAllowed) return;

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
            // Fall through to login
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
  <title>QAMUZ DAW Studio 2.0</title>
  <meta name="description" content="Estudio musical multipista profesional de QAMUZ AI." />
</svelte:head>

{#if data.isAllowed}
  <!-- STUDIO PERMITIDO (Artistas/Productores Verificados o Admins) -->
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
            En local, el SaaS abre Studio 2.0 en <code class="text-violet-200">http://127.0.0.1:1420</code>.
            Arráncalo con <code class="text-violet-200">npm run dev</code> en
            <code class="text-violet-200">Qamuz_Daw_Studio/qamuz_studio_2.0</code> y vuelve a intentar.
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
{:else}
  <!-- GATEKEEPER BLOQUEO: Requiere Verificación de Artista o Productor -->
  <div class="min-h-[92vh] w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-neutral-950 via-[#0d0d12] to-neutral-950 text-white">
    <div class="max-w-xl w-full rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
      <!-- Glow background -->
      <div class="absolute -top-24 -left-24 w-60 h-60 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-60 h-60 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Icon & Title -->
      <div class="text-center space-y-3 relative z-10">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400 shadow-inner">
          <Lock class="w-8 h-8" />
        </div>

        <div class="space-y-1">
          <span class="text-xs uppercase font-bold tracking-widest text-violet-400">
            QAMUZ DAW Studio 2.0
          </span>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Acceso Exclusivo para Artistas & Productores
          </h1>
        </div>

        <p class="text-sm text-neutral-300 leading-relaxed max-w-md mx-auto">
          Para producir música profesional multipista, mezclar stems y exportar proyectos en el DAW Studio, debes estar registrado y verificado oficialmente como <strong class="text-white">Artista</strong> o <strong class="text-white">Productor Musical</strong>.
        </p>
      </div>

      <!-- Estado Actual del Usuario -->
      <div class="mt-6 p-4 rounded-2xl border bg-neutral-950/60 relative z-10 {currentStatus === 'pending' ? 'border-amber-500/30 bg-amber-950/20' : currentStatus === 'rejected' ? 'border-red-500/30 bg-red-950/20' : 'border-neutral-800'}">
        <div class="flex items-center gap-3">
          {#if currentStatus === 'pending'}
            <Clock class="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <p class="text-xs font-semibold text-amber-300">Solicitud en revisión</p>
              <p class="text-[11px] text-neutral-400">
                Tu solicitud está siendo revisada por los administradores de QAMUZ. En breve recibirás acceso al DAW.
              </p>
            </div>
          {:else if currentStatus === 'rejected'}
            <AlertTriangle class="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p class="text-xs font-semibold text-red-300">Solicitud anterior no aprobada</p>
              <p class="text-[11px] text-neutral-400">
                Puedes volver a enviar tu solicitud con más enlaces o referencias para ser verificado.
              </p>
            </div>
          {:else}
            <ShieldCheck class="w-5 h-5 text-violet-400 shrink-0" />
            <div>
              <p class="text-xs font-semibold text-neutral-200">
                Tu rol actual: <span class="text-violet-400 font-bold capitalize">{data.userProfile.userType === 'fan' ? 'Fanático / Fan' : data.userProfile.userType}</span>
              </p>
              <p class="text-[11px] text-neutral-400">
                {data.userProfile.userType === 'fan' ? 'Los fanáticos disfrutan de reproducción y playlists. Para producir en el DAW, solicita verificación.' : 'Aún no cuentas con verificación activa.'}
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Formulario para solicitar verificación si no está en revisión -->
      {#if currentStatus !== 'pending'}
        <div class="mt-6 space-y-4 pt-4 border-t border-neutral-800 relative z-10">
          <p class="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Solicitar Verificación Profesional
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onclick={() => (verificationRole = "artist")}
              class="flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer {verificationRole === 'artist' ? 'bg-primary/20 border-primary text-white font-semibold' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'}"
            >
              <Mic2 class="w-4 h-4 text-primary shrink-0" />
              <div>
                <span class="text-xs block">Artista Musical</span>
                <span class="text-[10px] text-neutral-400">Cantar & componer</span>
              </div>
            </button>

            <button
              type="button"
              onclick={() => (verificationRole = "producer")}
              class="flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer {verificationRole === 'producer' ? 'bg-purple-600/20 border-purple-500 text-white font-semibold' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'}"
            >
              <Sliders class="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span class="text-xs block">Productor Musical</span>
                <span class="text-[10px] text-neutral-400">Beats & producción</span>
              </div>
            </button>

            <button
              type="button"
              onclick={() => (verificationRole = "producer_artist")}
              class="flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer {verificationRole === 'producer_artist' ? 'bg-cyan-600/20 border-cyan-500 text-white font-semibold' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'}"
            >
              <Music class="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span class="text-xs block">Productor & Artista</span>
                <span class="text-[10px] text-neutral-400">Produce & canta</span>
              </div>
            </button>
          </div>

          <div class="space-y-1.5">
            <Label for="stageName" class="text-xs text-neutral-300">
              {verificationRole === "artist" ? "Nombre Artístico" : "Nombre de Productor"} *
            </Label>
            <Input
              id="stageName"
              bind:value={stageName}
              placeholder="Ej. Nova Sound, DJ Metro..."
              class="bg-neutral-950 border-neutral-800 text-sm"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="portfolio" class="text-xs text-neutral-300">
              Enlace de referencia o portafolio (Spotify, Soundcloud, Instagram)
            </Label>
            <Input
              id="portfolio"
              bind:value={portfolio}
              placeholder="https://..."
              class="bg-neutral-950 border-neutral-800 text-sm"
            />
          </div>

          <Button
            onclick={handleRequestVerification}
            disabled={isSubmitting}
            class="w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95 text-white font-semibold py-2.5"
          >
            {#if isSubmitting}
              <span class="animate-pulse">Enviando solicitud...</span>
            {:else}
              <span class="flex items-center gap-2">
                Solicitar Verificación y Acceso al DAW
                <ArrowRight class="w-4 h-4" />
              </span>
            {/if}
          </Button>
        </div>
      {/if}

      <!-- Enlaces secundarios -->
      <div class="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 relative z-10">
        <a href="/" class="flex items-center gap-1.5 hover:text-white transition">
          <ArrowLeft class="w-3.5 h-3.5" />
          Volver al Inicio
        </a>
        <a href="/library" class="flex items-center gap-1.5 hover:text-white transition">
          <Music class="w-3.5 h-3.5" />
          Mi Biblioteca Musical
        </a>
      </div>
    </div>
  </div>
{/if}
