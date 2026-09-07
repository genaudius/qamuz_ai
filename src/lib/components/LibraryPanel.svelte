<script lang="ts">
  import { getContext } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import { musicState as sharedMusicState } from "$lib/stores/music-state.js";
  import Play from "@lucide/svelte/icons/play";
  import MusicIcon from "@lucide/svelte/icons/music";
  import PanelRightClose from "@lucide/svelte/icons/panel-right-close";
  import Share2 from "@lucide/svelte/icons/share-2";
  import Heart from "@lucide/svelte/icons/heart";
  import Send from "@lucide/svelte/icons/send";
  import TrackOptionsMenu from "$lib/components/TrackOptionsMenu.svelte";
  import { shareTrackLink } from "$lib/utils/share-track.js";
  import { notice } from "$lib/ui/notice.js";
  import { openKaraokePage } from "$lib/open-karaoke.js";

  let { songs = [] } = $props<{ songs: any[] }>();

  const musicState = getContext<GlobalMusicState>("musicState") ?? sharedMusicState;

  let likedById = $state<Record<string, boolean>>({});
  let likeFetchStarted = new Set<string>();

  $effect(() => {
    const ids = songs
      .map((song) => song?.id)
      .filter((id): id is string => Boolean(id) && !String(id).startsWith("pending-"))
      .filter((id) => !likeFetchStarted.has(id));

    if (ids.length === 0) return;

    for (const id of ids) likeFetchStarted.add(id);

    let cancelled = false;
    void (async () => {
      const patch: Record<string, boolean> = {};
      await Promise.all(
        ids.slice(0, 40).map(async (id) => {
          try {
            const response = await fetch(`/api/music/${id}/like`);
            if (!response.ok) return;
            const payload = await response.json();
            patch[id] = Boolean(payload?.liked);
          } catch {
            // ignore
          }
        })
      );
      if (!cancelled && Object.keys(patch).length > 0) {
        likedById = { ...likedById, ...patch };
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  function playSong(song: any) {
    if (song.status && song.status !== "completed") return;

    void musicState.playTrack({
      id: song.id,
      url: `/api/music/${song.id}`,
      title: songTitle(song),
      imageUrl: song.imageUrl,
      videoUrl: song.videoUrl,
      lyrics: song.lyrics,
      durationMs: song.durationMs || 0,
      isPublic: typeof song.isPublic === "boolean" ? song.isPublic : undefined
    });
  }

  function openTitleKaraoke(song: any, event: Event) {
    stopRow(event);
    if (song.status && song.status !== "completed") return;
    void openKaraokePage(musicState, {
      id: song.id,
      title: songTitle(song),
      imageUrl: song.imageUrl,
      videoUrl: song.videoUrl,
      lyrics: song.lyrics,
      durationMs: song.durationMs || 0,
      isPublic: song.isPublic
    });
  }

  function songTitle(song: any) {
    return (song.title || song.prompt || "Generated Track").toString();
  }

  function stopRow(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  async function toggleLike(song: any, event: Event) {
    stopRow(event);
    if (!song?.id || String(song.id).startsWith("pending-")) {
      notice.error("Todavía se está generando");
      return;
    }
    try {
      const response = await fetch(`/api/music/${song.id}/like`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        notice.error("No pude guardar el like", payload?.error);
        return;
      }
      likedById = { ...likedById, [song.id]: Boolean(payload?.liked) };
      notice.success(likedById[song.id] ? "Agregada a Me gusta" : "Quitada de Me gusta");
    } catch {
      notice.error("No pude guardar el like");
    }
  }

  async function shareSong(song: any, event: Event) {
    stopRow(event);
    if (!song?.id || String(song.id).startsWith("pending-")) {
      notice.error("Todavía se está generando");
      return;
    }
    const result = await shareTrackLink({
      id: song.id,
      title: songTitle(song)
    });
    if (result === "shared") return;
    if (result === "copied") notice.success("Enlace copiado");
    else notice.error("No se pudo compartir");
  }

  async function publishSong(song: any, event: Event) {
    stopRow(event);
    if (!song?.id || String(song.id).startsWith("pending-")) {
      notice.error("No se puede publicar", "Esta canción aún no está lista.");
      return;
    }

    let isPublic = typeof song.isPublic === "boolean" ? song.isPublic : undefined;
    if (typeof isPublic !== "boolean") {
      try {
        const response = await fetch(`/api/music/${song.id}/info`);
        if (response.ok) {
          const info = await response.json();
          isPublic = Boolean(info?.isPublic);
        }
      } catch {
        // Modal can still check.
      }
    }

    if (isPublic) {
      notice.warning(
        "Esta canción ya está publicada",
        "Puedes actualizar los datos o despublicarla desde el panel."
      );
    }

    musicState.openPublishModal({
      id: song.id,
      url: `/api/music/${song.id}`,
      title: songTitle(song),
      imageUrl: song.imageUrl || undefined,
      videoUrl: song.videoUrl || undefined,
      durationMs: song.durationMs || 0,
      genre: song.genre ?? null,
      isPublic
    });
  }
</script>

<div class="h-full w-full overflow-hidden flex flex-col bg-background/50">
  <div class="flex-1 overflow-y-auto px-2 py-5 md:px-4 custom-scrollbar">
    <div class="flex items-center justify-between mb-4 px-2">
      <h2 class="text-xl font-bold">Library</h2>
      {#if musicState && musicState.musicSubMode !== "custom"}
        <button
          class="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/50 transition-colors"
          onclick={() => (musicState.showLibrary = false)}
          title="Close Library"
        >
          <PanelRightClose class="w-5 h-5" />
        </button>
      {/if}
    </div>

    {#if songs.length === 0}
      <div class="text-center py-20 text-muted-foreground bg-muted/30 rounded-xl border border-dashed mx-1">
        <MusicIcon class="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p class="text-lg">No songs created yet.</p>
        <p class="text-sm mt-2">Generate some music to see it here!</p>
      </div>
    {:else}
      <div class="flex flex-col gap-1">
        {#each songs as song, index}
          {@const isPlayingThis = musicState.currentTrack?.id === song.id}
          {@const isPending = song.status && song.status !== "completed"}
          {@const liked = Boolean(likedById[song.id])}
          <div
            class="song-row group"
            class:playing={isPlayingThis}
            class:pending={isPending}
            role="button"
            tabindex="0"
            onclick={() => playSong(song)}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                playSong(song);
              }
            }}
          >
            <div class="thumb" class:live={isPlayingThis && musicState.isPlaying}>
              {#if isPending}
                <div class="w-2 h-2 rounded-full bg-[#3ae0d5] animate-pulse"></div>
              {:else if song.imageUrl}
                <img src={song.imageUrl} alt="" class="h-full w-full object-cover" />
              {:else}
                <MusicIcon class="w-4 h-4 text-muted-foreground/55" />
              {/if}

              {#if !isPending}
                <div
                  class="thumb-fx"
                  class:visible={isPlayingThis && musicState.isPlaying}
                >
                  {#if isPlayingThis && musicState.isPlaying}
                    <span class="eq" aria-hidden="true">
                      <span class="animate-eq-1"></span>
                      <span class="animate-eq-2"></span>
                      <span class="animate-eq-3"></span>
                      <span class="animate-eq-4"></span>
                    </span>
                  {:else}
                    <Play class="h-3.5 w-3.5 fill-current" />
                  {/if}
                </div>
              {/if}
            </div>

              <div class="meta">
                <button
                  type="button"
                  class="title"
                  class:active={isPlayingThis}
                  title="Abrir karaoke"
                  onclick={(e) => openTitleKaraoke(song, e)}
                >
                  {songTitle(song)}
                </button>
                <span class="sub">
                  {#if isPending}
                    Creating…
                  {:else if song.isPublic}
                    Publicada
                  {:else if song.isInstrumental}
                    Instrumental
                  {:else}
                    #{index + 1}
                  {/if}
                </span>
              </div>

            {#if !isPending}
              <div class="quick-actions" onpointerdown={stopRow} onclick={stopRow}>
                <button
                  type="button"
                  class="qbtn"
                  class:liked
                  title={liked ? "Quitar de Me gusta" : "Me gusta"}
                  aria-label={liked ? "Quitar de Me gusta" : "Me gusta"}
                  onclick={(e) => void toggleLike(song, e)}
                >
                  <Heart class="h-[18px] w-[18px]" fill={liked ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  class="qbtn"
                  title="Compartir"
                  aria-label="Compartir"
                  onclick={(e) => void shareSong(song, e)}
                >
                  <Share2 class="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  class="qbtn"
                  title="Publicar"
                  aria-label="Publicar"
                  onclick={(e) => void publishSong(song, e)}
                >
                  <Send class="h-[18px] w-[18px]" />
                </button>
                <TrackOptionsMenu
                  song={{
                    id: song.id,
                    title: song.title,
                    prompt: song.prompt,
                    genre: song.genre,
                    isInstrumental: song.isInstrumental,
                    videoUrl: song.videoUrl,
                    imageUrl: song.imageUrl,
                    durationMs: song.durationMs,
                    isPublic: song.isPublic
                  }}
                  buttonClass="qbtn-more"
                />
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .song-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 3.4rem;
    padding: 0.4rem 0.55rem 0.4rem 0.45rem;
    border-radius: 0.65rem;
    background: hsl(var(--muted) / 0.28);
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .song-row:hover {
    background: hsl(var(--muted) / 0.55);
    border-color: hsl(var(--border) / 0.55);
  }
  .song-row.playing {
    background: linear-gradient(
      90deg,
      hsl(174 70% 55% / 0.18),
      hsl(var(--muted) / 0.42) 55%,
      hsl(var(--muted) / 0.28)
    );
    border-color: hsl(174 70% 55% / 0.35);
  }
  .song-row.pending {
    opacity: 0.8;
    cursor: default;
  }

  .thumb {
    position: relative;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.45rem;
    overflow: hidden;
    background: hsl(var(--muted));
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .thumb.live {
    box-shadow: 0 0 0 1.5px hsl(174 70% 55% / 0.55);
  }
  .thumb-fx {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.5);
    color: #3ae0d5;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .thumb-fx.visible,
  .song-row:hover .thumb-fx {
    opacity: 1;
  }
  .eq {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 14px;
  }
  .eq span {
    display: block;
    width: 3px;
    height: 100%;
    border-radius: 1px;
    background: #3ae0d5;
  }

  .meta {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .title {
    display: block;
    width: 100%;
    text-align: left;
    font-weight: 600;
    font-size: 0.9rem;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: transparent;
    border: 0;
    padding: 0;
    color: inherit;
    cursor: pointer;
  }
  .title:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .title.active {
    color: #3ae0d5;
  }
  .sub {
    font-size: 0.72rem;
    color: hsl(var(--muted-foreground));
  }

  .quick-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
    flex-shrink: 0;
    color: hsl(var(--muted-foreground));
  }
  .qbtn {
    height: 2.15rem;
    width: 2.15rem;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .qbtn:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--background) / 0.35);
  }
  .qbtn.liked {
    color: #3ae0d5;
  }

  :global(.qbtn-more) {
    height: 2.15rem !important;
    width: 2.15rem !important;
    border-radius: 9999px !important;
    color: hsl(var(--muted-foreground)) !important;
  }
  :global(.qbtn-more:hover) {
    color: hsl(var(--foreground)) !important;
    background: hsl(var(--background) / 0.35) !important;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.3);
    border-radius: 20px;
  }
</style>
