<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { musicState } from "$lib/stores/music-state.js";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import { toast } from "svelte-sonner";
  import { shareTrackLink } from "$lib/utils/share-track.js";
  import { openSongStemsInStudio } from "$lib/studio-stems.js";
  import {
    activeLyricIndex,
    buildStructuredTimedLyrics,
    type TimedLyricLine
  } from "$lib/utils/lyrics-sync.js";
  import Heart from "@lucide/svelte/icons/heart";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Share2 from "@lucide/svelte/icons/share-2";
  import Pencil from "@lucide/svelte/icons/pencil";
  import Tags from "@lucide/svelte/icons/tags";
  import X from "@lucide/svelte/icons/x";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Play from "@lucide/svelte/icons/play";
  import Pause from "@lucide/svelte/icons/pause";
  import Send from "@lucide/svelte/icons/send";
  import AudioLines from "@lucide/svelte/icons/audio-lines";

  const ctxMusic = getContext<GlobalMusicState>("musicState") ?? musicState;

  type VideoMode = "cover" | "vertical" | "cinematic";
  type SheetKind = null | "comments" | "edit" | "tags";

  type LocalComment = {
    id: string;
    text: string;
    at: number;
  };

  let videoEl = $state<HTMLVideoElement | undefined>(undefined);
  let videoMode = $state<VideoMode>("cover");
  let liked = $state(false);
  let likesCount = $state(0);
  let sheet = $state<SheetKind>(null);
  let editTitle = $state("");
  let editGenre = $state("");
  let editTags = $state("");
  let commentText = $state("");
  let comments = $state<LocalComment[]>([]);
  let saving = $state(false);
  let lyricsHost = $state<HTMLDivElement | undefined>(undefined);
  let seekBar = $state<HTMLDivElement | undefined>(undefined);
  let isSeeking = $state(false);
  /** High-frequency playhead from the real <audio> clock (not store timeupdate). */
  let playhead = $state(0);
  let audioDuration = $state(0);
  let lastStageTrackId = $state<string | null>(null);
  let alignedLines = $state<TimedLyricLine[] | null>(null);
  let alignedSource = $state<
    "pending" | "local" | "kie" | "cached" | "stt" | "fallback" | "none"
  >("pending");

  const LINE_STEP = 34;

  const track = $derived(ctxMusic.currentTrack);

  const duration = $derived.by(() => {
    if (audioDuration > 0) return audioDuration;
    const fromAudio = ctxMusic.audioElement?.duration;
    if (Number.isFinite(fromAudio) && (fromAudio as number) > 0) return fromAudio as number;
    if (ctxMusic.duration > 0) return ctxMusic.duration;
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

  /** Move only the lyric engine — never the cover / stage. */
  const lyricsEngineY = $derived.by(() => {
    const focus = activeLine < 0 ? 0 : activeLine;
    const viewportCenter = 74;
    return viewportCenter - (focus * LINE_STEP + LINE_STEP * 0.5);
  });

  const progressPercent = $derived(
    duration > 0 ? Math.min(100, Math.max(0, (playhead / duration) * 100)) : 0
  );

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

        if (ctxMusic.currentTrack?.id === id) {
          ctxMusic.currentTrack = {
            ...ctxMusic.currentTrack,
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
      // Fall through to structure-aware timing.
    }
    alignedSource = track?.lyrics ? "fallback" : "none";
  }

  $effect(() => {
    const id = track?.id;
    if (!id) return;
    if (id !== lastStageTrackId) {
      lastStageTrackId = id;
      playhead = ctxMusic.audioElement?.currentTime || ctxMusic.currentTime || 0;
      audioDuration = 0;
      comments = loadComments(id);
      void refreshLike(id);
      void loadAlignedLyrics(id);
    }
    editTitle = track?.title || "";
    editGenre = track?.genre || "";
    editTags = (track?.tags || []).join(", ");
  });

  // NOTE: do NOT use scrollIntoView — it scrolls the whole stage (cover included).
  // Lyric focus is handled only by translating `.lyrics-engine` inside the clipped viewport.

  $effect(() => {
    const video = videoEl;
    const playing = ctxMusic.isPlaying;
    if (!video) return;
    if (playing) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
    if (Number.isFinite(playhead)) {
      const drift = Math.abs(video.currentTime - playhead);
      if (drift > 0.45) video.currentTime = playhead;
    }
  });

  onMount(() => {
    let raf = 0;
    let lastStoreSync = 0;
    const tick = () => {
      const audio = ctxMusic.audioElement;
      if (audio && !isSeeking) {
        const t = audio.currentTime;
        if (Number.isFinite(t)) playhead = t;
        const d = audio.duration;
        if (Number.isFinite(d) && d > 0) {
          audioDuration = d;
          if (Math.abs(ctxMusic.duration - d) > 0.25) {
            ctxMusic.duration = d;
          }
        }
        const now = performance.now();
        if (now - lastStoreSync > 120 && Number.isFinite(t)) {
          ctxMusic.currentTime = t;
          lastStoreSync = now;
        }
      } else if (!isSeeking && Number.isFinite(ctxMusic.currentTime)) {
        playhead = ctxMusic.currentTime;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

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

  function onVideoMeta() {
    if (!videoEl) return;
    const w = videoEl.videoWidth || 0;
    const h = videoEl.videoHeight || 0;
    if (w > 0 && h > 0) {
      videoMode = h >= w * 1.05 ? "vertical" : "cinematic";
    } else {
      videoMode = "cinematic";
    }
  }

  async function toggleLike() {
    if (!track?.id) return;
    try {
      const response = await fetch(`/api/music/${track.id}/like`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || "No pude guardar el like");
        return;
      }
      liked = Boolean(payload?.liked);
      likesCount = Number(payload?.likesCount || likesCount);
    } catch {
      toast.error("No pude guardar el like");
    }
  }

  async function shareTrack() {
    if (!track?.id) return;
    const result = await shareTrackLink({
      id: track.id,
      title: track.title || "Untitled track"
    });
    if (result === "shared") return;
    toast[result === "copied" ? "success" : "error"](
      result === "copied" ? "Enlace copiado" : "No se pudo compartir"
    );
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
    toast.success("Comentario publicado");
  }

  async function saveMeta(kind: "edit" | "tags") {
    if (!track?.id || saving) return;
    saving = true;
    try {
      const tags = editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const response = await fetch(`/api/music/${track.id}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || track.title,
          genre: editGenre.trim() || null,
          tags
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.message || payload?.error || "No pude guardar");
        return;
      }
      ctxMusic.currentTrack = {
        ...track,
        title: payload?.track?.title || editTitle.trim() || track.title,
        genre: payload?.track?.genre ?? (editGenre.trim() || null),
        tags: payload?.track?.tags || tags
      };
      toast.success(kind === "edit" ? "Título actualizado" : "Tags actualizados");
      sheet = null;
    } catch {
      toast.error("No pude guardar");
    } finally {
      saving = false;
    }
  }

  function closeStage() {
    ctxMusic.isExpanded = false;
  }

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function seekFromClientX(clientX: number) {
    if (!seekBar || duration <= 0) return;
    const rect = seekBar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const next = ratio * duration;
    playhead = next;
    ctxMusic.seek(next);
  }

  function handleSeekPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    isSeeking = true;
    seekBar?.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  }

  function handleSeekPointerMove(event: PointerEvent) {
    if (!isSeeking) return;
    seekFromClientX(event.clientX);
  }

  function handleSeekPointerUp(event: PointerEvent) {
    if (!isSeeking) return;
    seekFromClientX(event.clientX);
    isSeeking = false;
    try {
      seekBar?.releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
  }

  function extractStemsToEditor() {
    if (!track?.id) return;
    ctxMusic.isExpanded = false;
    openSongStemsInStudio({
      id: track.id,
      title: track.title,
      prompt: track.title,
      genre: track.genre || undefined,
      imageUrl: track.imageUrl || undefined
    });
  }
</script>

{#if track}
  <div
    class="stage"
    class:vertical={videoMode === "vertical"}
    class:cinematic={videoMode === "cinematic"}
    class:cover-mode={!track.videoUrl}
  >
    <div class="media">
      {#if track.videoUrl}
        <video
          bind:this={videoEl}
          src={track.videoUrl}
          class="media-el"
          playsinline
          muted
          loop
          preload="metadata"
          onloadedmetadata={onVideoMeta}
        ></video>
        {#if videoMode === "cinematic"}
          <div class="cine-vignette"></div>
          <div class="cine-grain"></div>
        {/if}
      {:else if track.imageUrl}
        <div class="cover-stage">
          <img
            class="cover-blur"
            src={track.imageUrl}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <img
            class="cover-art"
            src={track.imageUrl}
            alt=""
            decoding="async"
            fetchpriority="high"
            draggable="false"
          />
        </div>
      {:else}
        <div class="cover-stage">
          <div class="cover-art placeholder">QAMUZ</div>
        </div>
      {/if}
      <div class="media-fade"></div>
    </div>

    <button type="button" class="close" aria-label="Cerrar" onclick={closeStage}>
      <ChevronDown class="h-6 w-6" />
    </button>

    <div class="rail">
      <button type="button" class="rail-btn" class:on={liked} onclick={() => void toggleLike()} aria-label="Me gusta">
        <Heart class="h-7 w-7" fill={liked ? "currentColor" : "none"} />
        <span>{likesCount || ""}</span>
      </button>
      <button type="button" class="rail-btn" onclick={() => (sheet = "comments")} aria-label="Comentarios">
        <MessageCircle class="h-7 w-7" />
        <span>{comments.length || ""}</span>
      </button>
      <button type="button" class="rail-btn" onclick={() => void shareTrack()} aria-label="Compartir">
        <Share2 class="h-7 w-7" />
        <span>Share</span>
      </button>
      <button type="button" class="rail-btn" onclick={() => (sheet = "edit")} aria-label="Editar título">
        <Pencil class="h-6 w-6" />
        <span>Título</span>
      </button>
      <button type="button" class="rail-btn" onclick={() => (sheet = "tags")} aria-label="Tags">
        <Tags class="h-6 w-6" />
        <span>Tags</span>
      </button>
      <button type="button" class="rail-btn" onclick={extractStemsToEditor} aria-label="Extraer stems">
        <AudioLines class="h-6 w-6" />
        <span>Stems</span>
      </button>
    </div>

    <div class="bottom">
      <div class="meta">
        <h2>{track.title}</h2>
        {#if track.artist}
          <p class="artist">@{track.artist}</p>
        {/if}
        {#if (track.tags || []).length}
          <div class="tags">
            {#each track.tags || [] as tag}
              <span>#{tag}</span>
            {/each}
          </div>
        {/if}
      </div>

      <div class="lyrics-viewport" bind:this={lyricsHost} aria-live="polite">
        {#if activeSection && activeLine < 0}
          <p class="lyric-section">{activeSection}</p>
        {/if}
        {#if timedLines.length}
          <div
            class="lyrics-engine"
            style={`transform: translate3d(0, ${lyricsEngineY}px, 0)`}
          >
            {#each timedLines as line, index}
              <p
                data-line={index}
                class="lyric-line"
                class:active={index === activeLine}
                class:passed={activeLine >= 0 && index < activeLine}
              >
                {line.text}
              </p>
            {/each}
          </div>
        {:else}
          <p class="lyric-empty">Sin letras — disfruta el groove</p>
        {/if}
        {#if alignedSource === "pending"}
          <p class="lyric-sync-hint">Calibrando voz…</p>
        {:else if alignedSource === "local" || alignedSource === "kie" || alignedSource === "cached" || alignedSource === "stt"}
          <p class="lyric-sync-hint">Sync vocal</p>
        {:else if alignedSource === "fallback"}
          <p class="lyric-sync-hint">Sync por estructura</p>
        {/if}
      </div>

      <div class="transport">
        <button
          type="button"
          class="play"
          aria-label={ctxMusic.isPlaying ? "Pausar" : "Reproducir"}
          onclick={() => void ctxMusic.togglePlay()}
        >
          {#if ctxMusic.isPlaying}
            <Pause class="h-5 w-5" />
          {:else}
            <Play class="h-5 w-5 ml-0.5" />
          {/if}
        </button>
        <div class="seek-wrap">
          <div
            class="progress"
            role="slider"
            tabindex="0"
            aria-label="Posición de reproducción"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(playhead)}
            bind:this={seekBar}
            onpointerdown={handleSeekPointerDown}
            onpointermove={handleSeekPointerMove}
            onpointerup={handleSeekPointerUp}
            onpointercancel={handleSeekPointerUp}
            onkeydown={(e) => {
              if (duration <= 0) return;
              if (e.key === "ArrowRight") {
                e.preventDefault();
                ctxMusic.seek(Math.min(duration, playhead + 5));
                playhead = Math.min(duration, playhead + 5);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                ctxMusic.seek(Math.max(0, playhead - 5));
                playhead = Math.max(0, playhead - 5);
              }
            }}
          >
            <div class="fill" style={`width: ${progressPercent}%`}></div>
            <div class="knob" style={`left: ${progressPercent}%`}></div>
          </div>
          <div class="times">
            <span>{formatTime(playhead)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>

    {#if sheet}
      <button type="button" class="sheet-backdrop" aria-label="Cerrar panel" onclick={() => (sheet = null)}></button>
      <div class="sheet">
        <div class="sheet-head">
          <strong>
            {#if sheet === "comments"}Comentarios
            {:else if sheet === "edit"}Cambiar título
            {:else}Tags{/if}
          </strong>
          <button type="button" class="icon" aria-label="Cerrar" onclick={() => (sheet = null)}>
            <X class="h-4 w-4" />
          </button>
        </div>

        {#if sheet === "comments"}
          <div class="comment-compose">
            <input
              bind:value={commentText}
              placeholder="Escribe un comentario..."
              maxlength="280"
              onkeydown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addComment();
                }
              }}
            />
            <button type="button" class="send" aria-label="Enviar" onclick={addComment}>
              <Send class="h-4 w-4" />
            </button>
          </div>
          <div class="comment-list">
            {#each comments as comment}
              <div class="comment">
                <p>{comment.text}</p>
                <span>{new Date(comment.at).toLocaleString()}</span>
              </div>
            {:else}
              <p class="empty">Sé el primero en comentar</p>
            {/each}
          </div>
        {:else if sheet === "edit"}
          <label>
            Título
            <input bind:value={editTitle} maxlength="80" />
          </label>
          <label>
            Género
            <input bind:value={editGenre} maxlength="40" placeholder="bachata, pop..." />
          </label>
          <button type="button" class="primary" disabled={saving} onclick={() => void saveMeta("edit")}>
            Guardar
          </button>
        {:else}
          <label>
            Tags (separados por coma)
            <input bind:value={editTags} maxlength="160" placeholder="romantic, night, latin" />
          </label>
          <button type="button" class="primary" disabled={saving} onclick={() => void saveMeta("tags")}>
            Guardar tags
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .stage {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: #050505;
    color: #fff;
    overflow: hidden;
    overscroll-behavior: none;
    touch-action: manipulation;
  }

  .media {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .media-el {
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #111;
  }

  .stage.cinematic .media-el {
    object-fit: contain;
    background: #000;
  }

  .stage.vertical .media-el {
    object-fit: cover;
  }

  /* Don't stretch a ~512px cover to full-bleed — keep it crisp. */
  .cover-stage {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: calc(72px + env(safe-area-inset-top)) 24px 34vh;
  }

  .cover-blur {
    position: absolute;
    inset: -18%;
    width: 136%;
    height: 136%;
    object-fit: cover;
    filter: blur(42px) saturate(1.25) brightness(0.48);
    transform: scale(1.08);
    pointer-events: none;
  }

  .cover-art {
    position: relative;
    z-index: 1;
    width: min(78vw, 360px);
    max-width: 100%;
    aspect-ratio: 1;
    height: auto;
    object-fit: cover;
    border-radius: 22px;
    box-shadow:
      0 28px 70px rgba(0, 0, 0, 0.62),
      0 0 0 1px rgba(255, 255, 255, 0.08);
    image-rendering: auto;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    transform: translateZ(0);
  }

  .placeholder {
    display: grid;
    place-items: center;
    font-weight: 800;
    letter-spacing: 0.2em;
    color: #3ae0d5;
    background: linear-gradient(145deg, #1a2224, #0c1011);
  }

  .media-fade,
  .cine-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .stage.cover-mode .media-fade {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.45) 0%,
      rgba(0, 0, 0, 0.08) 32%,
      rgba(0, 0, 0, 0.2) 52%,
      rgba(0, 0, 0, 0.92) 100%
    );
  }

  .media-fade {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.35) 0%,
      rgba(0, 0, 0, 0.05) 28%,
      rgba(0, 0, 0, 0.15) 55%,
      rgba(0, 0, 0, 0.88) 100%
    );
  }

  .cine-vignette {
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%);
  }

  .cine-grain {
    position: absolute;
    inset: 0;
    opacity: 0.08;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  .close {
    position: absolute;
    top: calc(10px + env(safe-area-inset-top));
    left: 12px;
    z-index: 5;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 0;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    display: grid;
    place-items: center;
  }

  .rail {
    position: absolute;
    right: 10px;
    bottom: calc(168px + env(safe-area-inset-bottom));
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
  }

  .rail-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    border: 0;
    background: transparent;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
  }

  .rail-btn.on {
    color: #ff5d7a;
  }

  .bottom {
    position: absolute;
    left: 0;
    right: 64px;
    bottom: 0;
    z-index: 4;
    padding: 0 16px calc(18px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .meta h2 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    line-height: 1.2;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.55);
  }

  .artist {
    margin: 2px 0 0;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.85rem;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .tags span {
    font-size: 11px;
    color: #3ae0d5;
    font-weight: 600;
  }

  .lyrics-viewport {
    position: relative;
    height: 148px;
    overflow: hidden;
    isolation: isolate;
    contain: layout paint;
    mask-image: linear-gradient(180deg, transparent, #000 16%, #000 82%, transparent);
    -webkit-mask-image: linear-gradient(180deg, transparent, #000 16%, #000 82%, transparent);
  }

  .lyrics-engine {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    will-change: transform;
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  .lyric-line {
    margin: 0;
    height: 34px;
    display: flex;
    align-items: center;
    opacity: 0.45;
    font-size: 1.02rem;
    font-weight: 650;
    line-height: 1.25;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
    color: rgba(255, 255, 255, 0.72);
    transition:
      opacity 0.3s ease,
      color 0.3s ease,
      filter 0.3s ease,
      font-size 0.3s ease;
  }

  .lyric-line.active {
    opacity: 1;
    color: #fff;
    font-size: 1.18rem;
    filter: drop-shadow(0 0 12px rgba(58, 224, 213, 0.35));
  }

  .lyric-line.passed {
    opacity: 0.28;
    color: rgba(255, 255, 255, 0.4);
  }

  .lyric-empty {
    margin: 0;
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.55);
    font-style: italic;
    font-size: 0.9rem;
  }

  .lyric-section {
    position: absolute;
    top: 8px;
    left: 0;
    z-index: 2;
    margin: 0;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(58, 224, 213, 0.85);
    font-weight: 700;
  }

  .lyric-sync-hint {
    position: absolute;
    right: 0;
    bottom: 2px;
    margin: 0;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.35);
  }

  .transport {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .play {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 0;
    background: #3ae0d5;
    color: #041314;
    display: grid;
    place-items: center;
    flex: none;
  }

  .seek-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .progress {
    position: relative;
    height: 18px;
    display: flex;
    align-items: center;
    touch-action: none;
    cursor: pointer;
  }

  .progress::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.25);
  }

  .fill {
    position: absolute;
    left: 0;
    height: 4px;
    border-radius: 999px;
    background: #3ae0d5;
    pointer-events: none;
  }

  .knob {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    margin-left: -7px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
    transform: translateY(-50%);
    pointer-events: none;
  }

  .times {
    display: flex;
    justify-content: space-between;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.55);
    font-variant-numeric: tabular-nums;
  }

  .sheet-backdrop {
    position: absolute;
    inset: 0;
    z-index: 8;
    border: 0;
    background: rgba(0, 0, 0, 0.45);
  }

  .sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9;
    max-height: 62vh;
    border-radius: 20px 20px 0 0;
    background: #151515;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .icon {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 0;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    display: grid;
    place-items: center;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  input {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #0f0f0f;
    color: #fff;
    padding: 12px 12px;
    font-size: 14px;
  }

  .primary,
  .send {
    border: 0;
    border-radius: 12px;
    background: #3ae0d5;
    color: #041314;
    font-weight: 700;
    padding: 12px 14px;
  }

  .comment-compose {
    display: flex;
    gap: 8px;
  }

  .comment-compose input {
    flex: 1;
  }

  .send {
    width: 44px;
    display: grid;
    place-items: center;
    padding: 0;
  }

  .comment-list {
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .comment {
    background: rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 10px 12px;
  }

  .comment p {
    margin: 0;
    font-size: 14px;
  }

  .comment span {
    display: block;
    margin-top: 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
  }

  .empty {
    color: rgba(255, 255, 255, 0.5);
    font-size: 13px;
    text-align: center;
    padding: 20px 0;
  }

  @media (min-width: 1024px) {
    .stage {
      display: none;
    }
  }
</style>
