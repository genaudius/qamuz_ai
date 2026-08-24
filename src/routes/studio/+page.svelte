<script lang="ts">
  import { dev } from "$app/environment";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  type StudioSession = { name: string; idea: string; createdAt: string; updatedAt: string; stage?: string; audioUrl?: string };
  const registryKey = "qamuz.studio.sessions.v1";
  const studioDevOrigin = "http://localhost:1420";
  let launched = $state(false), view = $state<"home" | "list" | "idea" | "name">("home");
  let idea = $state(""), sessionName = $state(""), studioSource = $state("");
  let sessions = $state<StudioSession[]>([]), nameWarning = $state("");

  const normalized = (value: string) => value.trim().toLocaleLowerCase("es").replace(/[\s_-]+/g, " ");
  const makeBaseName = (text: string) => {
    const words = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, " ")
      .trim().split(/\s+/).filter((word) => word.length > 2).slice(0, 4)
      .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
    return `QAMUZ-${words.join("-") || "Nueva-Cancion"}`;
  };
  function availableName(requested: string, musicIdea: string) {
    const base = requested.trim() || makeBaseName(musicIdea);
    if (!sessions.some((item) => normalized(item.name) === normalized(base))) return base;
    const genre = /merengue/i.test(musicIdea) ? "merengue" : /salsa/i.test(musicIdea) ? "salsa" : /bachata/i.test(musicIdea) ? "bachata" : "new";
    let proposal = `${base}-${genre}`, index = 2;
    while (sessions.some((item) => normalized(item.name) === normalized(proposal))) proposal = `${base}-${genre}-${index++}`;
    return proposal;
  }
  function saveRegistry(next: StudioSession[]) {
    sessions = next;
    localStorage.setItem(registryKey, JSON.stringify(next));
  }
  function studioUrl(params: URLSearchParams) {
    if (dev) return `${studioDevOrigin}/?${params}`;
    return `/qamuz-studio/?${params}`;
  }
  function launch(record: StudioSession, isNew: boolean) {
    const params = new URLSearchParams({
      embedded: "1",
      session: record.name,
      existing: isNew ? "0" : "1",
      newSession: isNew ? "1" : "0",
      idea: record.idea,
      autoPlan: isNew ? "1" : "0",
      home: window.location.origin + "/",
      plan: String(page.data.session?.user?.planTier ?? "free"),
      _t: Date.now().toString()
    });
    studioSource = studioUrl(params);
    const now = new Date().toISOString();
    const next = sessions.filter((item) => normalized(item.name) !== normalized(record.name));
    saveRegistry([{ ...record, updatedAt: now }, ...next]);
    sessionStorage.setItem("qamuz.studio.current", JSON.stringify(record));
    launched = true;
  }
  function createSession() {
    const requested = sessionName.trim(), finalName = availableName(requested, idea);
    if (requested && normalized(finalName) !== normalized(requested)) {
      nameWarning = `“${requested}” ya está en uso. He preparado “${finalName}”. Pulsa otra vez para aceptarlo o escribe otro nombre.`;
      sessionName = finalName;
      return;
    }
    const now = new Date().toISOString();
    launch({ name: finalName, idea: idea.trim(), createdAt: now, updatedAt: now, stage: "planning" }, true);
  }
  function continueToName() { if (idea.trim()) { nameWarning = ""; view = "name"; } }
  function isStudioOrigin(origin: string) {
    try {
      const url = new URL(origin);
      return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "qamuz.ai" || url.hostname.endsWith(".qamuz.ai");
    } catch {
      return false;
    }
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
        form.append("file", new Blob([new Uint8Array(bytes)], { type: data.file.type || "application/octet-stream" }), data.file.name || "audio.wav");
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
    try { sessions = JSON.parse(localStorage.getItem(registryKey) || "[]"); } catch { sessions = []; }
    view = sessions.length ? "home" : "idea";
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "qamuz-studio:api") {
        void proxyStudioApi(event);
        return;
      }
      if (event.data?.type === "qamuz-studio:navigate" && typeof event.data.path === "string") {
        launched = false;
        void goto(event.data.path);
        return;
      }
      if (event.data?.type !== "qamuz-studio:home") return;
      launched = false;
      void goto("/");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  });
</script>

<svelte:head><title>QAMUZ Studio</title><meta name="description" content="Estudio musical multipista de QAMUZ AI con Maestro y GenAudius." /></svelte:head>

<section class="relative h-full min-h-[620px] overflow-hidden bg-[#07090d]">
  {#if !launched}
    <div class="relative flex h-full min-h-[620px] items-center justify-center overflow-hidden bg-[#05060b] p-5">
      <div class="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-95" style="background-image: url('/assets/qamuz-studio-entry-v1.png')" aria-hidden="true"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(10,14,28,.08)_0%,rgba(5,7,14,.28)_48%,rgba(3,4,8,.72)_100%)]" aria-hidden="true"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-[#080a14]/10 via-transparent to-[#020307]/55" aria-hidden="true"></div>
      <div class="pointer-events-none absolute left-1/2 top-[7%] h-[57%] w-[50%] -translate-x-1/2 rounded-[2.5rem] border border-cyan-100/15 bg-gradient-to-br from-white/[.055] via-transparent to-violet-300/[.05] shadow-[inset_0_1px_0_rgba(255,255,255,.11),inset_0_-1px_0_rgba(116,92,255,.1),0_0_100px_rgba(76,92,220,.12)] backdrop-blur-[1px]" aria-hidden="true"></div>
      <div class="pointer-events-none absolute left-[24.5%] top-[15%] h-[38%] w-px bg-gradient-to-b from-transparent via-violet-400/80 to-transparent shadow-[0_0_22px_7px_rgba(139,92,246,.32)]" aria-hidden="true"></div>
      <div class="pointer-events-none absolute right-[24.5%] top-[15%] h-[38%] w-px bg-gradient-to-b from-transparent via-fuchsia-400/75 to-transparent shadow-[0_0_22px_7px_rgba(168,85,247,.3)]" aria-hidden="true"></div>
      <div class="relative z-10 -translate-y-28 w-full max-w-lg overflow-hidden rounded-3xl border border-violet-200/40 bg-[#090d18]/74 shadow-[0_35px_110px_rgba(0,0,0,.74),-20px_0_65px_rgba(104,72,189,.18),20px_0_65px_rgba(96,74,220,.2),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-2xl">
        <div class="border-b border-white/10 px-6 py-5"><p class="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">QAMUZ · MAESTRO</p><h1 class="mt-2 text-2xl font-semibold text-white">QAMUZ Studio</h1></div>
        <div class="space-y-5 p-6">
          {#if view === "home"}
            <div class="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm leading-6 text-slate-200">¡Qué bueno verte otra vez! ¿Continuamos con la última canción o creamos una sesión nueva?</div>
            {#if sessions[0]}<button onclick={() => launch(sessions[0], false)} class="w-full rounded-2xl border border-violet-400/25 bg-violet-400/10 p-4 text-left text-white"><span class="block text-xs uppercase tracking-wider text-violet-300">Continuar última sesión</span><strong class="mt-1 block text-lg">{sessions[0].name}</strong><span class="mt-1 block truncate text-sm text-slate-400">{sessions[0].idea}</span></button>{/if}
            <div class="grid grid-cols-2 gap-3"><button onclick={() => (view = "list")} class="rounded-xl border border-white/15 px-5 py-3 text-slate-200">Ver mis sesiones ({sessions.length})</button><button onclick={() => { idea = ""; sessionName = ""; view = "idea"; }} class="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 font-semibold text-white">＋ Nueva canción</button></div>
          {:else if view === "list"}
            <div class="flex items-center justify-between"><div><h2 class="text-lg font-semibold text-white">Tus sesiones</h2><p class="text-sm text-slate-400">Elige cuál deseas continuar.</p></div><button onclick={() => (view = "home")} class="rounded-lg border border-white/15 px-3 py-2 text-slate-300">Volver</button></div>
            <div class="max-h-80 space-y-2 overflow-auto">{#each sessions as item}<button onclick={() => launch(item, false)} class="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-violet-400/40"><strong class="block text-white">{item.name}</strong><span class="block truncate text-sm text-slate-400">{item.idea}</span><span class="mt-1 block text-xs text-cyan-300">{item.stage === "rendered" ? "Audio creado" : "Plan en desarrollo"}</span></button>{/each}</div>
          {:else if view === "idea"}
            <div class="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm leading-6 text-slate-200">Esta será una sesión nueva. Dime qué quieres que haga en esta canción y prepararé el proyecto.</div>
            <label class="block text-sm text-slate-300" for="studioIdea">Tu idea musical</label><textarea id="studioIdea" bind:value={idea} rows="5" placeholder="Ej.: Una bachata romántica y bailable sobre un amor que regresa…" class="w-full resize-none rounded-2xl border border-white/15 bg-black/35 p-4 text-white outline-none focus:border-violet-400"></textarea>
            <div class="grid grid-cols-[auto_1fr] gap-3">{#if sessions.length}<button onclick={() => (view = "home")} class="rounded-xl border border-white/15 px-5 py-3 text-slate-300">Atrás</button>{/if}<button onclick={continueToName} disabled={!idea.trim()} class="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 font-semibold text-white disabled:opacity-40">Continuar</button></div>
          {:else}
            <div class="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4 text-sm leading-6 text-slate-200">¿Cómo quieres llamar esta sesión? Si lo dejas vacío crearé un título QAMUZ derivado de la idea.</div>
            <label class="block text-sm text-slate-300" for="studioName">Nombre de la sesión <span class="text-slate-500">(opcional)</span></label><input id="studioName" bind:value={sessionName} oninput={() => (nameWarning = "")} onkeydown={(event) => event.key === "Enter" && createSession()} placeholder={makeBaseName(idea)} class="w-full rounded-2xl border border-white/15 bg-black/35 p-4 text-white outline-none focus:border-violet-400" />
            {#if nameWarning}<div class="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">{nameWarning}</div>{/if}
            <div class="grid grid-cols-[auto_1fr] gap-3"><button onclick={() => (view = "idea")} class="rounded-xl border border-white/15 px-5 py-3 text-slate-300">Atrás</button><button onclick={createSession} class="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 font-semibold text-white">Abrir sesión y trabajar</button></div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="relative h-full min-h-[620px] overflow-hidden bg-[#04050a]">
      <div class="absolute inset-0 bg-cover bg-top bg-no-repeat opacity-95" style="background-image: url('/assets/qamuz-studio-entry-v1.png')" aria-hidden="true"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(7,10,20,.1)_0%,rgba(3,5,10,.32)_57%,rgba(1,2,5,.78)_100%)]" aria-hidden="true"></div>
      <div class="pointer-events-none absolute left-[20%] right-[20%] top-[8%] h-[55%] rounded-[1.8rem] border border-violet-200/30 bg-[#070b14]/42 shadow-[0_0_85px_rgba(99,72,210,.2),inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur-md" aria-hidden="true"></div>
      <iframe title="QAMUZ Studio" src={studioSource} class="absolute inset-0 z-10 h-full w-full border-0 bg-[#111113]" allow="clipboard-read; clipboard-write; autoplay; midi; microphone"></iframe>
      <div class="pointer-events-none absolute bottom-[3%] left-1/2 z-10 -translate-x-1/2 rounded-full border border-violet-300/20 bg-[#070912]/75 px-5 py-2 text-[10px] font-semibold tracking-[.18em] text-violet-200/80 backdrop-blur-xl">QAMUZ DIGITAL MIX CONSOLE · SESIÓN ACTIVA</div>
    </div>
  {/if}
</section>
