<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { page } from "$app/state";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import { musicState as sharedMusicState } from "$lib/stores/music-state.js";
  import { notice } from "$lib/ui/notice.js";
  import { shareTrackLink } from "$lib/utils/share-track.js";
  import { openSongInStudio, openSongStemsInStudio } from "$lib/studio-stems";
  import { openKaraokePage } from "$lib/open-karaoke.js";
  import {
    activeLyricIndex,
    buildStructuredTimedLyrics,
    type TimedLyricLine
  } from "$lib/utils/lyrics-sync.js";
  import X from "@lucide/svelte/icons/x";
  import Heart from "@lucide/svelte/icons/heart";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Share2 from "@lucide/svelte/icons/share-2";
  import Upload from "@lucide/svelte/icons/upload";
  import Send from "@lucide/svelte/icons/send";
  import * as Button from "$lib/components/ui/button/index.js";

  const musicState = getContext<GlobalMusicState>("musicState") ?? sharedMusicState;

  type LocalComment = { id: string; text: string; at: number };
  type Panel = null | "comments";

  const LINE_STEP = 36;

  let liked = $state(false);
  let likesCount = $state(0);
  let panel = $state<Panel>(null);
  let commentText = $state("");
  let comments = $state<LocalComment[]>([]);
  let playhead = $state(0);
  let audioDuration = $state(0);
  let lastTrackId = $state<string | null>(null);
  let alignedLines = $state<TimedLyricLine[] | null>(null);
  let alignedSource = $state<
    "pending" | "local" | "kie" | "cached" | "stt" | "fallback" | "none"
  >("pending");
  let fetchedOwnerId = $state<string | null>(null);

  const track = $derived(musicState.currentTrack);
  const currentUserId = $derived(page.data?.session?.user?.id);
  const currentUserRole = $derived(page.data?.session?.user?.role);
  const isCurrentUserAdmin = $derived(Boolean(page.data?.session?.user?.isAdmin || currentUserRole === "admin"));

  const isDifferentOwner = $derived(
    Boolean(
      fetchedOwnerId &&
      currentUserId &&
      fetchedOwnerId !== currentUserId &&
      !isCurrentUserAdmin
    )
  );

  const isOwner = $derived(
    Boolean(
      currentUserId &&
      !isDifferentOwner &&
      (isCurrentUserAdmin ||
       (track?.userId && track.userId === currentUserId) ||
       (track?.artistId && track.artistId === currentUserId) ||
       (fetchedOwnerId && fetchedOwnerId === currentUserId) ||
       (!track?.userId && !track?.artistId && !fetchedOwnerId))
    )
  );

  const duration = $derived.by(() => {
    if (audioDuration > 0) return audioDuration;
    const fromAudio = musicState.audioElement?.duration;
    if (Number.isFinite(fromAudio) && (fromAudio as number) > 0) return fromAudio as number;
    if (musicState.duration > 0) return musicState.duration;
    const ms = track?.durationMs ?? 0;
    return ms > 0 ? ms / 1000 : 0;
  });

  const timedLines = $derived.by((): TimedLyricLine[] => {
    if (alignedLines && alignedLines.length > 0) return alignedLines;
    if (track?.timedLyrics?.length) {
      return track.timedLyrics.map((line) => ({
        text: line.text,
        start: line.start,
        end: line.end,
        timed: true,
        section: line.section
      }));
    }
    return buildStructuredTimedLyrics(track?.lyrics || "", duration);
  });

  const activeLine = $derived(activeLyricIndex(timedLines, playhead));
  const activeSection = $derived(
    activeLine >= 0 ? timedLines[activeLine]?.section : timedLines[0]?.section
  );

  const lyricsEngineY = $derived.by(() => {
    const focus = activeLine < 0 ? 0 : activeLine;
    const viewportCenter = 88;
    return viewportCenter - (focus * LINE_STEP + LINE_STEP * 0.5);
  });

  async function loadAlignedLyrics(id: string) {
    alignedSource = "pending";
    alignedLines = null;
    try {
      const response = await fetch(`/api/music/${id}/aligned-lyrics`);
      const payload = await response.json().catch(() => null);
      const lines = Array.isArray(payload?.lines) ? payload.lines : [];
      if (lines.length > 0) {
        alignedLines = lines.map(
          (line: { text: string; start: number; end?: number; section?: string }) => ({
            text: line.text,
            start: Number(line.start) || 0,
            end: line.end != null ? Number(line.end) : undefined,
            timed: true,
            section: line.section
          })
        );
        const src = String(payload?.source || "");
        if (src === "cached") alignedSource = "cached";
        else if (src === "local") alignedSource = "local";
        else if (src === "kie") alignedSource = "kie";
        else if (src === "stt") alignedSource = "stt";
        else if (src === "structure") alignedSource = "fallback";
        else alignedSource = alignedLines[0]?.timed ? "local" : "fallback";

        if (musicState.currentTrack?.id === id) {
          musicState.currentTrack = {
            ...musicState.currentTrack,
            timedLyrics: alignedLines.map((l) => ({
              text: l.text,
              start: l.start,
              end: l.end,
              section: l.section
            }))
          };
        }
        return;
      }
    } catch {
      // structure fallback
    }
    alignedSource = track?.lyrics ? "fallback" : "none";
  }

  function commentsKey(id: string) {
    return `qamuz.music.comments.${id}`;
  }

  function loadComments(id: string): LocalComment[] {
    try {
      const raw = localStorage.getItem(commentsKey(id));
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveComments(id: string, next: LocalComment[]) {
    localStorage.setItem(commentsKey(id), JSON.stringify(next.slice(0, 80)));
  }

  async function refreshLike(id: string) {
    try {
      const response = await fetch(`/api/music/${id}/like`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) return;
      liked = Boolean(payload?.liked);
      likesCount = Number(payload?.likesCount || 0);
    } catch {
      // ignore
    }
  }

  $effect(() => {
    const id = track?.id;
    if (!id) return;
    if (id !== lastTrackId) {
      lastTrackId = id;
      fetchedOwnerId = null;
      if (!track.userId && !track.artistId) {
        void fetch(`/api/music/${id}/info`)
          .then(async (response) => {
            if (!response.ok) return;
            const payload = await response.json().catch(() => null);
            if (payload?.userId || payload?.artistId) {
              fetchedOwnerId = payload.userId || payload.artistId;
            }
          })
          .catch(() => undefined);
      }
      playhead = musicState.audioElement?.currentTime || musicState.currentTime || 0;
      audioDuration = 0;
      comments = loadComments(id);
      panel = null;
      void refreshLike(id);
      void loadAlignedLyrics(id);
    }
  });

  onMount(() => {
    let raf = 0;
    const tick = () => {
      const audio = musicState.audioElement;
      if (audio) {
        const t = audio.currentTime;
        if (Number.isFinite(t)) playhead = t;
        const d = audio.duration;
        if (Number.isFinite(d) && d > 0) audioDuration = d;
      } else if (Number.isFinite(musicState.currentTime)) {
        playhead = musicState.currentTime;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  async function toggleLike() {
    if (!track?.id) return;
    try {
      const response = await fetch(`/api/music/${track.id}/like`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        notice.error("No pude guardar el like", payload?.error);
        return;
      }
      liked = Boolean(payload?.liked);
      likesCount = Number(payload?.likesCount || likesCount);
      notice.success(liked ? "Agregada a Me gusta" : "Quitada de Me gusta");
    } catch {
      notice.error("No pude guardar el like");
    }
  }

  async function shareTrack() {
    if (!track?.id) return;
    const result = await shareTrackLink({
      id: track.id,
      title: track.title || "Untitled track"
    });
    if (result === "shared") return;
    if (result === "copied") notice.success("Enlace copiado");
    else notice.error("No se pudo compartir");
  }

  function openPublish() {
    if (!track?.id) return;
    if (isDifferentOwner) {
      notice.error("Acceso denegado", "Solo el artista creador puede publicar esta canción.");
      return;
    }
    if (track.isPublic) {
      notice.warning(
        "Esta canción ya está publicada",
        "Puedes actualizar los datos o despublicarla."
      );
    }
    musicState.openPublishModal(track);
  }

  function addComment() {
    if (!track?.id) return;
    const text = commentText.trim();
    if (!text) return;
    const next: LocalComment = {
      id: crypto.randomUUID(),
      text,
      at: Date.now()
    };
    comments = [next, ...comments];
    saveComments(track.id, comments);
    commentText = "";
    notice.success("Comentario publicado");
  }

  function seekToLine(index: number) {
    const line = timedLines[index];
    if (!line || !Number.isFinite(line.start)) return;
    playhead = line.start;
    musicState.seek(line.start);
    if (!musicState.isPlaying) void musicState.togglePlay();
  }
</script>

{#if track}
  <div class="h-full w-full flex flex-col pt-4 overflow-hidden">
    <div class="px-5 flex items-center justify-between mb-3 flex-shrink-0">
      <div class="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
        Now Playing
      </div>
      <Button.Root
        variant="ghost"
        size="icon-sm"
        class="h-8 w-8 rounded-full cursor-pointer hover:bg-muted"
        onclick={() => musicState.toggleExpanded()}
      >
        <X class="h-4 w-4" />
      </Button.Root>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 pb-5">
      <div class="w-full flex flex-col items-center justify-center mb-4">
        {#if track.videoUrl}
          <video
            src={track.videoUrl}
            class="w-full rounded-xl shadow-lg object-cover aspect-square bg-black"
            autoplay
            muted
            loop
            playsinline
          ></video>
        {:else if track.imageUrl}
          <img
            src={track.imageUrl}
            alt="Cover Art"
            class="w-full aspect-square object-cover rounded-xl shadow-lg"
          />
        {:else}
          <div class="w-full aspect-square rounded-xl shadow-lg bg-muted flex items-center justify-center">
            <span class="text-muted-foreground text-sm">No Artwork</span>
          </div>
        {/if}

        <div class="mt-4 text-left w-full">
          <button
            type="button"
            class="text-xl font-bold truncate text-left w-full hover:underline"
            title="Abrir karaoke"
            onclick={() => void openKaraokePage(musicState, track)}
          >
            {track.title || "Unknown Title"}
          </button>
          {#if track.artist}
            <p class="text-sm text-muted-foreground truncate">{track.artist}</p>
          {/if}
        </div>

        <!-- Social actions -->
        <div class="mt-4 w-full grid gap-2" class:grid-cols-4={isOwner} class:grid-cols-3={!isOwner}>
          <button
            type="button"
            class="action"
            class:on={liked}
            aria-label="Me gusta"
            onclick={() => void toggleLike()}
          >
            <Heart class="h-4 w-4" fill={liked ? "currentColor" : "none"} />
            <span>{likesCount || "Like"}</span>
          </button>
          <button
            type="button"
            class="action"
            aria-label="Comentarios"
            onclick={() => (panel = panel === "comments" ? null : "comments")}
          >
            <MessageCircle class="h-4 w-4" />
            <span>{comments.length || "Comentar"}</span>
          </button>
          <button
            type="button"
            class="action"
            aria-label="Compartir"
            onclick={() => void shareTrack()}
          >
            <Share2 class="h-4 w-4" />
            <span>Share</span>
          </button>
          {#if isOwner}
            <button type="button" class="action" aria-label="Publicar" onclick={openPublish}>
              <Upload class="h-4 w-4" />
              <span>{track.isPublic ? "Publicada" : "Publicar"}</span>
            </button>
          {/if}
        </div>

        {#if panel === "comments"}
          <div class="mt-3 w-full rounded-xl border border-border/60 bg-muted/25 p-3">
            <div class="flex items-center gap-2">
              <input
                class="flex-1 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm outline-none focus:border-primary"
                bind:value={commentText}
                maxlength="280"
                placeholder="Escribe un comentario…"
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addComment();
                  }
                }}
              />
              <button
                type="button"
                class="rounded-lg bg-primary text-primary-foreground p-2"
                aria-label="Enviar"
                onclick={addComment}
              >
                <Send class="h-4 w-4" />
              </button>
            </div>
            <div class="mt-3 max-h-40 space-y-2 overflow-y-auto">
              {#each comments as comment}
                <div class="rounded-lg bg-background/50 px-3 py-2">
                  <p class="text-sm">{comment.text}</p>
                  <span class="text-[11px] text-muted-foreground">
                    {new Date(comment.at).toLocaleString()}
                  </span>
                </div>
              {:else}
                <p class="text-xs text-muted-foreground italic py-2">Sé el primero en comentar</p>
              {/each}
            </div>
          </div>
        {/if}

        {#if track.id}
          <div class="mt-3 flex flex-wrap gap-2 w-full">
            <Button.Root
              variant="default"
              size="sm"
              class="cursor-pointer"
              onclick={() =>
                openSongInStudio({
                  id: track.id,
                  title: track.title,
                  imageUrl: track.imageUrl
                })}
            >
              Abrir en Studio
            </Button.Root>
            <Button.Root
              variant="outline"
              size="sm"
              class="cursor-pointer"
              onclick={() => {
                musicState.isExpanded = false;
                openSongStemsInStudio({
                  id: track.id,
                  title: track.title,
                  imageUrl: track.imageUrl
                });
              }}
            >
              Extraer stems
            </Button.Root>
          </div>
        {/if}
      </div>

      <!-- Synced lyrics -->
      <div class="lyrics-panel">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs font-semibold uppercase text-muted-foreground">Lyrics</div>
          {#if alignedSource === "pending"}
            <span class="hint">Calibrando voz…</span>
          {:else if alignedSource === "local" || alignedSource === "stt" || alignedSource === "kie" || alignedSource === "cached"}
            <span class="hint">Sync vocal</span>
          {:else if alignedSource === "fallback"}
            <span class="hint">Sync por estructura</span>
          {/if}
        </div>

        <div class="lyrics-viewport" aria-live="polite">
          {#if activeSection && activeLine < 0}
            <p class="lyric-section">{activeSection}</p>
          {/if}
          {#if timedLines.length}
            <div class="lyrics-engine" style={`transform: translate3d(0, ${lyricsEngineY}px, 0)`}>
              {#each timedLines as line, index}
                <button
                  type="button"
                  data-line={index}
                  class="lyric-line"
                  class:active={index === activeLine}
                  class:passed={activeLine >= 0 && index < activeLine}
                  onclick={() => seekToLine(index)}
                >
                  {line.text}
                </button>
              {/each}
            </div>
          {:else}
            <p class="lyric-empty">Sin letras — disfruta el groove</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    border-radius: 0.85rem;
    border: 1px solid hsl(var(--border) / 0.7);
    background: hsl(var(--muted) / 0.35);
    padding: 0.55rem 0.35rem;
    color: hsl(var(--muted-foreground));
    font-size: 0.65rem;
    font-weight: 600;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .action:hover {
    color: hsl(var(--foreground));
    border-color: hsl(var(--border));
    background: hsl(var(--muted) / 0.55);
  }
  .action.on {
    color: #fb7185;
    border-color: rgba(251, 113, 133, 0.35);
    background: rgba(251, 113, 133, 0.1);
  }

  .lyrics-panel {
    margin-top: 0.25rem;
    border-radius: 1rem;
    border: 1px solid hsl(var(--border) / 0.55);
    background: hsl(var(--muted) / 0.28);
    padding: 0.85rem 0.75rem 1rem;
  }
  .hint {
    font-size: 0.65rem;
    color: hsl(var(--muted-foreground));
  }
  .lyrics-viewport {
    position: relative;
    height: 220px;
    overflow: hidden;
    mask-image: linear-gradient(180deg, transparent 0%, #000 14%, #000 78%, transparent 100%);
  }
  .lyrics-engine {
    will-change: transform;
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .lyric-section {
    position: absolute;
    left: 0.5rem;
    top: 0.35rem;
    z-index: 2;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: hsl(var(--muted-foreground));
  }
  .lyric-line {
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    min-height: 36px;
    padding: 0.35rem 0.5rem;
    color: hsl(var(--muted-foreground) / 0.75);
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.35;
    cursor: pointer;
    transition: color 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
  }
  .lyric-line.passed {
    opacity: 0.45;
  }
  .lyric-line.active {
    color: hsl(var(--foreground));
    font-weight: 700;
    font-size: 1.05rem;
    transform: translateX(2px);
  }
  .lyric-empty {
    padding: 2.5rem 0.5rem;
    text-align: center;
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
    font-style: italic;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: hsl(var(--border));
    border-radius: 10px;
  }
</style>
