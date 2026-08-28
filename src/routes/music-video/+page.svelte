<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { toast } from "svelte-sonner";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import type { PageData } from "./$types";
  import type { MusicVideoSong } from "./+page.server";
  import {
    MV_BACKGROUNDS,
    MV_CHARACTERS,
    MV_STYLES,
    MV_VIBES,
    type MusicVideoKind,
    type MusicVideoMode,
    type MusicVideoRatio
  } from "$lib/music-video/presets.js";
  import {
    CheckIcon,
    ChevronDownIcon,
    LoaderIcon,
    Music2Icon,
    SearchIcon,
    VideoIcon,
    XIcon
  } from "$lib/icons/index.js";
  import Zap from "@lucide/svelte/icons/zap";
  import Film from "@lucide/svelte/icons/film";
  import Layers from "@lucide/svelte/icons/layers";
  import Upload from "@lucide/svelte/icons/upload";

  let { data }: { data: PageData } = $props();

  type GeneratedClip = {
    videoId: string;
    url: string;
    title: string;
    prompt: string;
    style: string;
    thumbnailUrl?: string | null;
  };

  let videoType = $state<MusicVideoKind>("music-video");
  let selectedSongId = $state<string | null>(data.selectedSongId);
  let pickerOpen = $state(false);
  let songSearch = $state("");
  let is30sViralHook = $state(true);
  let selectedCharacter = $state("character-1");
  let noCharacter = $state(false);
  let lipSyncEnabled = $state(true);
  let selectedBackground = $state("bg-cyber");
  let randomBackground = $state(false);
  let videoStyle = $state("Ink style");
  let selectedVibeTags = $state<string[]>(["Chill", "Viral Hook 30s"]);
  let videoPrompt = $state("");
  let videoGenMode = $state<MusicVideoMode>("one-click");
  let videoAspectRatio = $state<MusicVideoRatio>("9:16");
  let modeMenuOpen = $state(false);
  let ratioMenuOpen = $state(false);
  let generating = $state(false);
  let generated = $state<GeneratedClip[]>([]);

  const songs = $derived((data.songs ?? []) as MusicVideoSong[]);
  const selectedSong = $derived(songs.find((song) => song.id === selectedSongId) ?? null);
  const filteredSongs = $derived(
    songs.filter((song) => {
      const q = songSearch.trim().toLowerCase();
      if (!q) return true;
      return `${song.title} ${song.genre ?? ""} ${song.prompt}`.toLowerCase().includes(q);
    })
  );
  const canGenerate = $derived(Boolean(data.session?.user?.id) && !data.isDemoMode && !generating);

  $effect(() => {
    const fromUrl = page.url.searchParams.get("song");
    if (fromUrl && fromUrl !== selectedSongId && songs.some((song) => song.id === fromUrl)) {
      selectedSongId = fromUrl;
    }
  });

  function pickSong(song: MusicVideoSong | null) {
    selectedSongId = song?.id ?? null;
    pickerOpen = false;
    const next = new URL(window.location.href);
    if (song?.id) next.searchParams.set("song", song.id);
    else next.searchParams.delete("song");
    void goto(`${next.pathname}${next.search}`, { replaceState: true, noScroll: true, keepFocus: true });
  }

  function toggleVibe(vibe: string) {
    selectedVibeTags = selectedVibeTags.includes(vibe)
      ? selectedVibeTags.filter((item) => item !== vibe)
      : [...selectedVibeTags, vibe];
  }

  $effect(() => {
    if (is30sViralHook && !selectedVibeTags.includes("Viral Hook 30s")) {
      selectedVibeTags = [...selectedVibeTags, "Viral Hook 30s"];
    }
  });

  async function generateMv(event: Event) {
    event.preventDefault();
    if (!canGenerate) {
      toast.error(data.isDemoMode ? "Generation is disabled in demo mode" : "Sign in to generate");
      return;
    }
    generating = true;
    try {
      const response = await fetch("/api/music-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicId: selectedSongId,
          videoType,
          is30sViralHook,
          characterId: selectedCharacter,
          noCharacter,
          backgroundId: selectedBackground,
          randomBackground,
          style: videoStyle,
          vibeTags: selectedVibeTags,
          prompt: videoPrompt,
          videoGenMode,
          aspectRatio: videoAspectRatio
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || "No pude generar el video");
        return;
      }
      generated = [
        {
          videoId: payload.videoId,
          url: payload.url,
          title: payload.title,
          prompt: payload.prompt,
          style: payload.style,
          thumbnailUrl: payload.thumbnailUrl
        },
        ...generated
      ];
      toast.success("Music video listo");
    } catch {
      toast.error("No pude conectar con el motor de video");
    } finally {
      generating = false;
    }
  }
</script>

<svelte:head>
  <title>Music Video — QAMUZ</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-24 sm:p-6">
  <div class="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-emerald-950/70 via-background to-purple-950/40 p-6 shadow-xl">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">QAMUZ Video Render</p>
        <h1 class="text-2xl font-black tracking-tight sm:text-3xl">Videoclip desde una canción</h1>
        <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
          Elige una pista, Music Video o Lyrics Video, y el enganche de 30s. Esto no es el generador genérico de Image & Video.
        </p>
      </div>
      <div class="flex rounded-xl border border-border bg-black/40 p-1">
        <button type="button" class="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Video</button>
        <button type="button" class="rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground" onclick={() => goto("/image-video")}>
          Image & Video
        </button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
    <form class="flex flex-col gap-4 rounded-2xl border border-border bg-card/80 p-5 shadow-xl lg:col-span-6" onsubmit={generateMv}>
      <div class="flex items-center gap-8 border-b border-border pb-2">
        <button
          type="button"
          class="relative pb-2 text-sm font-bold {videoType === 'music-video' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => (videoType = "music-video")}
        >
          Music Video
          {#if videoType === "music-video"}
            <span class="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-primary shadow-[0_0_12px_hsl(var(--primary))]"></span>
          {/if}
        </button>
        <button
          type="button"
          class="relative pb-2 text-sm font-bold {videoType === 'lyrics-video' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => (videoType = "lyrics-video")}
        >
          Lyrics Video
          {#if videoType === "lyrics-video"}
            <span class="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-primary shadow-[0_0_12px_hsl(var(--primary))]"></span>
          {/if}
        </button>
      </div>

      <div class="rounded-2xl border border-border bg-muted/20 p-3.5">
        <label class="text-xs font-bold">Song</label>
        <div class="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-primary">
              {#if selectedSong?.imageUrl && !selectedSong.imageUrl.startsWith("data:")}
                <img src={selectedSong.imageUrl} alt="" class="h-full w-full object-cover" />
              {:else}
                <Music2Icon class="h-4 w-4" />
              {/if}
            </div>
            {#if selectedSong}
              <div class="min-w-0">
                <p class="truncate text-xs font-bold">{selectedSong.title}</p>
                <p class="truncate text-[11px] text-muted-foreground">{selectedSong.genre || "QAMUZ Track"}</p>
              </div>
            {:else}
              <p class="truncate text-xs text-muted-foreground">Elegir cualquier canción creada...</p>
            {/if}
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold hover:bg-muted"
            onclick={() => (pickerOpen = true)}
          >
            Select a song
          </button>
        </div>
      </div>

      <div class="relative rounded-2xl border border-primary/40 bg-gradient-to-r from-emerald-950/40 via-purple-950/20 to-black p-3.5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <Zap class="h-4 w-4 text-primary" />
            <span class="text-xs font-black uppercase tracking-wide">Enganche de Tendencia AI (30s Clip Viral)</span>
          </div>
          <Switch bind:checked={is30sViralHook} />
        </div>
        <p class="mt-2 text-[11px] leading-snug text-muted-foreground">
          La IA identifica el enganche, el ritmo más trascendente y arma un clip para TikTok/Reels.
        </p>
      </div>

      {#if videoType === "music-video"}
        <div class="rounded-2xl border border-border bg-muted/20 p-3.5">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-xs font-bold">MV character</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground">Lip-sync</span>
              <Switch bind:checked={lipSyncEnabled} />
            </div>
          </div>
          <div class="flex items-center gap-2.5 overflow-x-auto pb-1">
            <div class="flex h-[5.5rem] w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-background text-muted-foreground">
              <Upload class="h-3.5 w-3.5" />
              <span class="text-[9px] font-bold">Upload</span>
            </div>
            {#each MV_CHARACTERS as character}
              <button
                type="button"
                class="relative h-[5.5rem] w-16 shrink-0 overflow-hidden rounded-xl border-2 {selectedCharacter === character.id && !noCharacter ? 'border-primary ring-1 ring-primary' : 'border-transparent opacity-60 hover:opacity-100'}"
                onclick={() => { selectedCharacter = character.id; noCharacter = false; }}
              >
                <img src={character.img} alt={character.name} class="h-full w-full object-cover" />
              </button>
            {/each}
          </div>
          <label class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" bind:checked={noCharacter} class="rounded border-border" />
            No Character
          </label>
        </div>
      {/if}

      <div class="rounded-2xl border border-border bg-muted/20 p-3.5">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-xs font-bold">Background</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-foreground">Random</span>
            <Switch bind:checked={randomBackground} />
          </div>
        </div>
        <div class="flex items-center gap-2.5 overflow-x-auto pb-1">
          {#each MV_BACKGROUNDS as background}
            <button
              type="button"
              class="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 {selectedBackground === background.id ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}"
              onclick={() => { selectedBackground = background.id; randomBackground = false; }}
            >
              <img src={background.img} alt={background.name} class="h-full w-full object-cover" />
            </button>
          {/each}
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-muted/20 p-3.5">
        <span class="text-xs font-bold">Visual Style</span>
        <div class="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
          {#each MV_STYLES as style}
            <button
              type="button"
              class="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 {videoStyle === style.id ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'}"
              onclick={() => (videoStyle = style.id)}
            >
              <img src={style.img} alt={style.name} class="h-full w-full object-cover" />
              <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5 text-[9px] font-bold text-white">{style.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-muted/20 p-3.5">
        <span class="text-xs font-bold">Vibe</span>
        <p class="text-[10px] text-muted-foreground">Pick emotions or keywords for the AI video rhythm</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          {#each MV_VIBES as vibe}
            <button
              type="button"
              class="rounded-full border px-2.5 py-1 text-[11px] {selectedVibeTags.includes(vibe) ? 'border-border bg-muted font-bold' : 'border-border/60 text-muted-foreground hover:text-foreground'}"
              onclick={() => toggleVibe(vibe)}
            >
              {vibe}
            </button>
          {/each}
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-muted/20 p-3.5">
        <label class="text-xs font-bold" for="mv-prompt">Prompt adicional / Instrucciones del guión</label>
        <textarea
          id="mv-prompt"
          bind:value={videoPrompt}
          rows="2"
          placeholder="Ej: Luces de neón, movimientos de cámara lentos en el clímax..."
          class="mt-1.5 w-full resize-none rounded-xl border border-border bg-background p-2.5 text-xs outline-none focus:border-primary"
        ></textarea>
      </div>

      <div class="relative flex items-center justify-between gap-2 pt-1">
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
            onclick={() => { modeMenuOpen = !modeMenuOpen; ratioMenuOpen = false; }}
          >
            <Zap class="h-3.5 w-3.5 text-primary" />
            {videoGenMode === "one-click" ? "One-click mode" : "Storyboard mode"}
            <ChevronDownIcon class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {#if modeMenuOpen}
            <div class="absolute bottom-full left-0 z-20 mb-2 flex w-64 flex-col gap-1 rounded-2xl border border-border bg-popover p-2 shadow-2xl">
              <button type="button" class="rounded-xl p-2.5 text-left {videoGenMode === 'one-click' ? 'border border-primary/40 bg-primary/10' : 'hover:bg-muted'}" onclick={() => { videoGenMode = "one-click"; modeMenuOpen = false; }}>
                <div class="flex items-center gap-2 text-xs font-bold"><Zap class="h-3.5 w-3.5 text-primary" /> One-click mode</div>
                <p class="mt-0.5 text-[10px] text-muted-foreground">AI handles every shot. Just hit generate</p>
              </button>
              <button type="button" class="rounded-xl p-2.5 text-left {videoGenMode === 'storyboard' ? 'border border-primary/40 bg-primary/10' : 'hover:bg-muted'}" onclick={() => { videoGenMode = "storyboard"; modeMenuOpen = false; }}>
                <div class="flex items-center gap-2 text-xs font-bold"><Layers class="h-3.5 w-3.5" /> Storyboard mode</div>
                <p class="mt-0.5 text-[10px] text-muted-foreground">Pack opening, development and climax into one clip</p>
              </button>
            </div>
          {/if}
        </div>

        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
            onclick={() => { ratioMenuOpen = !ratioMenuOpen; modeMenuOpen = false; }}
          >
            <span class="font-mono text-primary">{videoAspectRatio}</span>
            <ChevronDownIcon class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {#if ratioMenuOpen}
            <div class="absolute bottom-full right-0 z-20 mb-2 flex w-28 flex-col gap-1 rounded-xl border border-border bg-popover p-1 shadow-2xl">
              {#each (["16:9", "9:16", "3:4", "4:3"] as const) as ratio}
                <button type="button" class="flex items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs font-bold {videoAspectRatio === ratio ? 'bg-primary/20 text-primary' : 'hover:bg-muted'}" onclick={() => { videoAspectRatio = ratio; ratioMenuOpen = false; }}>
                  {ratio}
                  {#if videoAspectRatio === ratio}<CheckIcon class="h-3 w-3" />{/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <button
          type="submit"
          disabled={!canGenerate}
          class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-black text-primary-foreground shadow-lg disabled:opacity-50"
        >
          {#if generating}
            <LoaderIcon class="h-4 w-4 animate-spin" />
            Generating MV...
          {:else}
            Generate MV
          {/if}
        </button>
      </div>
    </form>

    <div class="flex flex-col gap-4 lg:col-span-6">
      <h3 class="flex items-center gap-2 text-base font-bold">
        <Film class="h-5 w-5 text-purple-400" />
        Mis Videos Creados ({generated.length})
      </h3>

      {#if generating}
        <div class="flex flex-col items-center gap-4 rounded-2xl border border-purple-500/40 bg-card p-6 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-xl">
            <Film class="h-8 w-8 animate-bounce" />
          </div>
          <div>
            <h4 class="text-base font-bold">Generando guión y clip cinemático...</h4>
            <p class="text-xs text-muted-foreground">Maestro renderiza el videoclip a partir de la canción. Puede tardar varios minutos.</p>
          </div>
        </div>
      {:else if generated.length === 0 && !selectedSong?.videoUrl}
        <div class="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <VideoIcon class="h-12 w-12 opacity-40" />
          <p class="text-sm font-semibold text-foreground">No has generado videos musicales aún</p>
          <p class="max-w-xs text-xs">Usa una canción creada para generar videoclips o lyrics videos.</p>
        </div>
      {:else}
        <div class="grid max-h-[640px] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2">
          {#each generated as clip (clip.videoId)}
            <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <video src={clip.url} class="aspect-video w-full bg-black object-cover" controls playsinline></video>
              <div class="p-3">
                <p class="truncate text-xs font-bold">{clip.title}</p>
                <p class="mt-1 line-clamp-2 text-[11px] italic text-muted-foreground">“{clip.prompt}”</p>
              </div>
            </div>
          {/each}
          {#if selectedSong?.videoUrl && !generated.some((clip) => clip.url === selectedSong.videoUrl)}
            <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <video src={selectedSong.videoUrl} class="aspect-video w-full bg-black object-cover" controls playsinline></video>
              <div class="p-3">
                <p class="truncate text-xs font-bold">Video de {selectedSong.title}</p>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

{#if pickerOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
    <div class="relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
      <div class="flex items-center justify-between border-b border-border pb-3">
        <div class="flex items-center gap-2">
          <Music2Icon class="h-5 w-5 text-primary" />
          <h3 class="text-base font-bold">Seleccionar Canción Creada</h3>
        </div>
        <button type="button" class="rounded-full p-1 hover:bg-muted" onclick={() => (pickerOpen = false)}>
          <XIcon class="h-5 w-5" />
        </button>
      </div>
      <div class="relative">
        <SearchIcon class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          bind:value={songSearch}
          placeholder="Buscar por título o género..."
          class="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-xs outline-none focus:border-primary"
        />
      </div>
      <div class="flex max-h-[400px] flex-col gap-2 overflow-y-auto">
        <button
          type="button"
          class="flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold {!selectedSongId ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}"
          onclick={() => pickSong(null)}
        >
          Generar sin canción vinculada (Solo Prompt)
          {#if !selectedSongId}<CheckIcon class="h-4 w-4 text-primary" />{/if}
        </button>
        {#if filteredSongs.length === 0}
          <p class="py-8 text-center text-xs text-muted-foreground">No se encontraron canciones.</p>
        {:else}
          {#each filteredSongs as song}
            <button
              type="button"
              class="flex items-center justify-between rounded-xl border p-3 text-left {selectedSongId === song.id ? 'border-primary bg-primary/15' : 'border-border hover:bg-muted'}"
              onclick={() => pickSong(song)}
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {#if song.imageUrl && !song.imageUrl.startsWith("data:")}
                    <img src={song.imageUrl} alt="" class="h-full w-full object-cover" />
                  {/if}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-bold">{song.title}</p>
                  <p class="truncate text-[11px] text-muted-foreground">{song.genre || "QAMUZ Track"}</p>
                </div>
              </div>
              {#if selectedSongId === song.id}<CheckIcon class="h-4 w-4 text-primary" />{/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
