<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { page } from "$app/state";
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
  import SkipBack from "@lucide/svelte/icons/skip-back";
  import SkipForward from "@lucide/svelte/icons/skip-forward";
  import Shuffle from "@lucide/svelte/icons/shuffle";
  import Send from "@lucide/svelte/icons/send";
  import AudioLines from "@lucide/svelte/icons/audio-lines";
  import Upload from "@lucide/svelte/icons/upload";

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
  const currentUserId = $derived(page.data?.session?.user?.id);
  const currentUserRole = $derived(page.data?.session?.user?.role);
  const isCurrentUserAdmin = $derived(Boolean(page.data?.session?.user?.isAdmin || currentUserRole === "admin"));
  let fetchedOwnerId = $state<string | null>(null);

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
    if (!isOwner) {
      toast.error("No tienes permisos para editar canciones de otros artistas");
      return;
    }
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
          <!-- Fondo ambiental difuminado para llenar la pantalla sin distorsión ni pérdida de calidad -->
          <div class="ambient-backdrop" aria-hidden="true">
            <img
              class="ambient-img"
              src={track.imageUrl}
              alt=""
              decoding="async"
              draggable="false"
            />
            <div class="ambient-darken"></div>
          </div>

          <!-- Cuadro central con encuadre cuadrado y brillo gloss verdoso resplandeciente a color vino -->
          <div class="central-frame-wrap">
            <div class="gloss-frame">
              <div class="gloss-frame-inner">
                <img
                  class="cover-art-square"
                  src={track.imageUrl}
                  alt={track.title || "Carátula de música"}
                  decoding="async"
                  fetchpriority="high"
                  draggable="false"
                />
                <div class="gloss-sheen" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="cover-stage placeholder-stage">
          <div class="central-frame-wrap">
            <div class="gloss-frame">
              <div class="gloss-frame-inner placeholder-inner">
                <span class="placeholder-brand">QAMUZ AI</span>
                <p class="placeholder-title">{track.title || "Generación Musical"}</p>
                <div class="gloss-sheen" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
      {/if}
      <div class="media-fade"></div>
    </div>

    <!-- Header superior estilo Shorts -->
    <div class="stage-top-bar">
      <button type="button" class="top-icon-btn" aria-label="Cerrar reproductor" onclick={closeStage}>
        <ChevronDown class="h-6 w-6" />
      </button>
      <div class="stage-badge">
        <span class="live-indicator"></span>
        <span class="stage-badge-text">NOW PLAYING</span>
      </div>
    </div>

    <!-- Rail lateral derecho estilo YouTube Shorts -->
    <div class="rail">
      <button type="button" class="rail-btn" class:on={liked} onclick={() => void toggleLike()} aria-label="Me gusta">
        <div class="rail-icon-wrap" class:liked={liked}>
          <Heart class="h-6 w-6" fill={liked ? "currentColor" : "none"} />
        </div>
        <span>{likesCount || "Me gusta"}</span>
      </button>
      <button type="button" class="rail-btn" onclick={() => (sheet = "comments")} aria-label="Comentarios">
        <div class="rail-icon-wrap">
          <MessageCircle class="h-6 w-6" />
        </div>
        <span>{comments.length || "Comentar"}</span>
      </button>
      <button type="button" class="rail-btn" onclick={() => void shareTrack()} aria-label="Compartir">
        <div class="rail-icon-wrap">
          <Share2 class="h-6 w-6" />
        </div>
        <span>Share</span>
      </button>
      {#if isOwner}
        <button type="button" class="rail-btn" onclick={() => (sheet = "edit")} aria-label="Editar título">
          <div class="rail-icon-wrap">
            <Pencil class="h-5 w-5" />
          </div>
          <span>Título</span>
        </button>
        <button type="button" class="rail-btn" onclick={() => (sheet = "tags")} aria-label="Tags">
          <div class="rail-icon-wrap">
            <Tags class="h-5 w-5" />
          </div>
          <span>Tags</span>
        </button>
      {/if}
      <button type="button" class="rail-btn" onclick={extractStemsToEditor} aria-label="Extraer stems">
        <div class="rail-icon-wrap">
          <AudioLines class="h-5 w-5" />
        </div>
        <span>Stems</span>
      </button>
      {#if !isDifferentOwner}
        <button type="button" class="rail-btn" onclick={() => ctxMusic.openPublishModal(track)} aria-label="Publicar">
          <div class="rail-icon-wrap">
            <Upload class="h-5 w-5" />
          </div>
          <span>{track.isPublic ? "Pública" : "Publicar"}</span>
        </button>
      {/if}
      <button
        type="button"
        class="rail-btn"
        class:on={ctxMusic.isShuffle}
        onclick={() => ctxMusic.toggleShuffle()}
        aria-label="Modo aleatorio"
      >
        <div class="rail-icon-wrap" class:liked={ctxMusic.isShuffle}>
          <Shuffle class="h-5 w-5" />
        </div>
        <span>{ctxMusic.isShuffle ? "Aleatorio" : "En orden"}</span>
      </button>
    </div>

    <!-- Zona inferior: Metadatos, Líricas karaoke dinámicas y Barra de transporte -->
    <div class="bottom">
      <div class="meta">
        <div class="creator-row">
          {#if track.artist}
            <span class="artist-badge">@{track.artist}</span>
          {/if}
          {#if track.genre}
            <span class="genre-pill">{track.genre}</span>
          {/if}
        </div>
        <h2 class="track-title">{track.title}</h2>
        {#if (track.tags || []).length}
          <div class="tags">
            {#each track.tags || [] as tag}
              <span>#{tag}</span>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Letras sincronizadas estilo subtítulos de Shorts -->
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
          <p class="lyric-empty">Disfruta la música en QAMUZ AI</p>
        {/if}
        {#if alignedSource === "pending"}
          <p class="lyric-sync-hint">Calibrando voz…</p>
        {:else if alignedSource === "local" || alignedSource === "kie" || alignedSource === "cached" || alignedSource === "stt"}
          <p class="lyric-sync-hint">Sync vocal</p>
        {:else if alignedSource === "fallback"}
          <p class="lyric-sync-hint">Sync por estructura</p>
        {/if}
      </div>

      <!-- Barra de transporte Shorts -->
      <div class="transport">
        <div class="transport-controls">
          <button
            type="button"
            class="skip-btn"
            aria-label="Canción anterior"
            onclick={() => void ctxMusic.prevTrack()}
          >
            <SkipBack class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="play-btn"
            aria-label={ctxMusic.isPlaying ? "Pausar" : "Reproducir"}
            onclick={() => void ctxMusic.togglePlay()}
          >
            {#if ctxMusic.isPlaying}
              <Pause class="h-5 w-5" />
            {:else}
              <Play class="h-5 w-5 ml-0.5" />
            {/if}
          </button>
          <button
            type="button"
            class="skip-btn"
            aria-label="Siguiente canción"
            onclick={() => void ctxMusic.nextTrack()}
          >
            <SkipForward class="h-4 w-4" />
          </button>
        </div>
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
        {:else if sheet === "edit" && isOwner}
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
        {:else if sheet === "tags" && isOwner}
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
    background: #000;
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
    background: #000;
  }

  .stage.cinematic .media-el {
    object-fit: contain;
    background: #000;
  }

  .stage.vertical .media-el {
    object-fit: cover;
  }

  /* Contenedor del escenario para imágenes con atmósfera ambiental */
  .cover-stage {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Fondo ambiental desenfocado: llena la pantalla con atmósfera luminosa de la carátula sin perder nitidez */
  .ambient-backdrop {
    position: absolute;
    inset: -30px;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .ambient-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    filter: blur(52px) brightness(0.22) saturate(1.4);
    transform: scale(1.25);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }

  .ambient-darken {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at 50% 40%,
      rgba(0, 0, 0, 0.25) 0%,
      rgba(0, 0, 0, 0.65) 60%,
      rgba(0, 0, 0, 0.94) 100%
    );
  }

  /* Encuadre central: posiciona la imagen en el centro visual superior dejando aire a los controles inferiores y riel derecho */
  .central-frame-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: calc(54px + env(safe-area-inset-top));
    padding-bottom: calc(230px + env(safe-area-inset-bottom));
    padding-left: 16px;
    padding-right: 32px;
    box-sizing: border-box;
  }

  /* Cuadro cuadrado más grande con diseño verdoso gloss resplandeciente a color vino */
  .gloss-frame {
    position: relative;
    width: min(82vw, 340px);
    aspect-ratio: 1 / 1;
    max-height: min(82vw, 340px);
    border-radius: 28px;
    padding: 3px;
    background: linear-gradient(
      135deg,
      #00ffaa 0%,
      #00e599 18%,
      #10b981 32%,
      #2dd4bf 42%,
      #4a044e 60%,
      #701a75 72%,
      #831843 84%,
      #be123c 100%
    );
    box-shadow:
      -8px -8px 28px -4px rgba(0, 255, 170, 0.42),
      10px 12px 38px -4px rgba(190, 18, 60, 0.58),
      0 24px 60px rgba(0, 0, 0, 0.9),
      0 0 50px -10px rgba(16, 185, 129, 0.3),
      inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
      inset 0 -1.5px 3px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: gloss-resplandor 5s infinite alternate ease-in-out;
  }

  @keyframes gloss-resplandor {
    0% {
      box-shadow:
        -8px -8px 26px -4px rgba(0, 255, 170, 0.36),
        10px 12px 34px -4px rgba(190, 18, 60, 0.5),
        0 20px 50px rgba(0, 0, 0, 0.85),
        0 0 38px -8px rgba(16, 185, 129, 0.25),
        inset 0 1.5px 2px rgba(255, 255, 255, 0.6);
      transform: scale(1);
    }
    100% {
      box-shadow:
        -10px -10px 38px -2px rgba(0, 255, 170, 0.56),
        14px 16px 46px -2px rgba(225, 29, 72, 0.74),
        0 28px 70px rgba(0, 0, 0, 0.95),
        0 0 60px -5px rgba(16, 185, 129, 0.42),
        inset 0 2px 3px rgba(255, 255, 255, 0.85);
      transform: scale(1.012);
    }
  }

  .gloss-frame-inner {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 25px;
    overflow: hidden;
    background: #0d0f12;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover-art-square {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    border-radius: 25px;
    display: block;
    image-rendering: auto;
    filter: contrast(1.04) brightness(0.98);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    transform: translateZ(0);
  }

  /* Capa de brillo y reflejo especular tipo gloss */
  .gloss-sheen {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 25px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.3) 0%,
      rgba(255, 255, 255, 0.08) 26%,
      transparent 48%,
      rgba(190, 18, 60, 0.14) 80%,
      rgba(0, 255, 170, 0.1) 100%
    );
    box-shadow:
      inset 0 0 16px rgba(0, 0, 0, 0.35),
      inset 0 1px 1px rgba(255, 255, 255, 0.4);
  }

  .placeholder-inner {
    flex-direction: column;
    gap: 12px;
    padding: 24px;
    text-align: center;
    background: radial-gradient(circle at center, #1b262c 0%, #080d11 100%);
  }

  .placeholder-brand {
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: 0.25em;
    color: #3ae0d5;
    text-shadow: 0 0 24px rgba(58, 224, 213, 0.4);
  }

  .placeholder-title {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
    max-width: 260px;
  }

  .media-fade,
  .cine-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* Gradiente cinematográfico Shorts: protege la barra superior y crea fondo oscuro de alto contraste abajo */
  .stage.cover-mode .media-fade,
  .media-fade {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.72) 0%,
      rgba(0, 0, 0, 0.25) 12%,
      rgba(0, 0, 0, 0.04) 30%,
      rgba(0, 0, 0, 0.15) 50%,
      rgba(0, 0, 0, 0.65) 68%,
      rgba(0, 0, 0, 0.92) 86%,
      rgba(0, 0, 0, 0.98) 100%
    );
  }

  .cine-vignette {
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.65) 100%);
  }

  .cine-grain {
    position: absolute;
    inset: 0;
    opacity: 0.06;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  /* Barra superior estilo YouTube Shorts */
  .stage-top-bar {
    position: absolute;
    top: calc(12px + env(safe-area-inset-top));
    left: 14px;
    right: 14px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: auto;
  }

  .top-icon-btn {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.15s ease;
  }

  .top-icon-btn:active {
    transform: scale(0.92);
    background: rgba(0, 0, 0, 0.65);
  }

  .stage-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .live-indicator {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #3ae0d5;
    box-shadow: 0 0 8px #3ae0d5;
    animation: pulse-glow 2s infinite ease-in-out;
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }

  .stage-badge-text {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: rgba(255, 255, 255, 0.9);
  }

  /* Rail vertical derecho estilo Shorts */
  .rail {
    position: absolute;
    right: 12px;
    bottom: calc(130px + env(safe-area-inset-bottom));
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
    max-height: calc(100dvh - 200px);
    overflow-y: auto;
    scrollbar-width: none;
    pointer-events: auto;
  }

  .rail-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border: 0;
    background: transparent;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  .rail-btn:active {
    transform: scale(0.92);
  }

  .rail-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: grid;
    place-items: center;
    color: #fff;
    transition: background 0.2s, color 0.2s;
  }

  .rail-icon-wrap.liked {
    color: #ff3366;
    background: rgba(255, 51, 102, 0.2);
    border-color: rgba(255, 51, 102, 0.4);
  }

  .rail-btn.on {
    color: #ff3366;
  }

  /* Zona inferior con metadatos y controles */
  .bottom {
    position: absolute;
    left: 0;
    right: 76px;
    bottom: 0;
    z-index: 10;
    padding: 0 16px calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: auto;
  }

  .creator-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .artist-badge {
    font-size: 0.88rem;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9);
  }

  .genre-pill {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(58, 224, 213, 0.18);
    border: 1px solid rgba(58, 224, 213, 0.35);
    color: #3ae0d5;
    backdrop-filter: blur(8px);
  }

  .meta h2.track-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1.2;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85);
    color: #fff;
    letter-spacing: -0.01em;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  }

  .tags span {
    font-size: 11px;
    color: #3ae0d5;
    font-weight: 600;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  }

  .lyrics-viewport {
    position: relative;
    height: 100px;
    overflow: hidden;
    isolation: isolate;
    contain: layout paint;
    mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 20%, #000 80%, transparent 100%);
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
    opacity: 0.4;
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.25;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
    color: rgba(255, 255, 255, 0.75);
    transition: opacity 0.3s ease, color 0.3s ease, font-size 0.3s ease;
  }

  .lyric-line.active {
    opacity: 1;
    color: #fff;
    font-size: 1.15rem;
    font-weight: 800;
    filter: drop-shadow(0 0 12px rgba(58, 224, 213, 0.45));
  }

  .lyric-line.passed {
    opacity: 0.22;
    color: rgba(255, 255, 255, 0.4);
  }

  .lyric-empty {
    margin: 0;
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
    font-size: 0.88rem;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
  }

  .lyric-section {
    position: absolute;
    top: 4px;
    left: 0;
    z-index: 2;
    margin: 0;
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(58, 224, 213, 0.9);
    font-weight: 700;
  }

  .lyric-sync-hint {
    position: absolute;
    right: 0;
    bottom: 2px;
    margin: 0;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
  }

  /* Controles de transporte estilo Shorts */
  .transport {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }

  .transport-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }

  .skip-btn {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(12px);
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease;
  }

  .skip-btn:active {
    transform: scale(0.9);
    background: rgba(255, 255, 255, 0.2);
  }

  .play-btn {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    border: 0;
    background: #3ae0d5;
    color: #041314;
    display: grid;
    place-items: center;
    flex: none;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(58, 224, 213, 0.4);
    transition: transform 0.15s ease, background 0.2s ease;
  }

  .play-btn:active {
    transform: scale(0.92);
  }

  .seek-wrap {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .progress {
    position: relative;
    height: 20px;
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
    height: 5px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.28);
  }

  .fill {
    position: absolute;
    left: 0;
    height: 5px;
    border-radius: 999px;
    background: #3ae0d5;
    box-shadow: 0 0 10px rgba(58, 224, 213, 0.5);
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
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    transform: translateY(-50%);
    pointer-events: none;
  }

  .times {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
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
