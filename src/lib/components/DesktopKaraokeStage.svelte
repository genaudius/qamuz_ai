<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import { musicState as sharedMusicState } from "$lib/stores/music-state.js";
  import { notice } from "$lib/ui/notice.js";
  import { shareTrackLink } from "$lib/utils/share-track.js";
  import {
    activeLyricIndex,
    buildStructuredTimedLyrics,
    type TimedLyricLine
  } from "$lib/utils/lyrics-sync.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import Heart from "@lucide/svelte/icons/heart";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Share2 from "@lucide/svelte/icons/share-2";
  import Send from "@lucide/svelte/icons/send";
  import X from "@lucide/svelte/icons/x";
  import Play from "@lucide/svelte/icons/play";
  import Pause from "@lucide/svelte/icons/pause";

  const musicState = getContext<GlobalMusicState>("musicState") ?? sharedMusicState;

  type LocalComment = { id: string; text: string; at: number };

  const LINE_STEP = 68;

  let liked = $state(false);
  let likesCount = $state(0);
  let commentsOpen = $state(false);
  let commentText = $state("");
  let comments = $state<LocalComment[]>([]);
  let playhead = $state(0);
  let audioDuration = $state(0);
  let lastTrackId = $state<string | null>(null);
  let alignedLines = $state<TimedLyricLine[] | null>(null);
  let alignedSource = $state<"pending" | "kie" | "cached" | "stt" | "fallback" | "none">("pending");

  const track = $derived(musicState.currentTrack);

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
    const viewportCenter = 220;
    return viewportCenter - (focus * LINE_STEP + LINE_STEP * 0.5);
  });

  const progressPercent = $derived(duration > 0 ? Math.min(100, (playhead / duration) * 100) : 0);

  function formatTime(sec: number) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
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
        else if (src === "kie") alignedSource = "kie";
        else if (src === "stt") alignedSource = "stt";
        else if (src === "structure") alignedSource = "fallback";
        else alignedSource = alignedLines[0]?.timed ? "stt" : "fallback";

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
      // fallback
    }
    alignedSource = track?.lyrics ? "fallback" : "none";
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
      playhead = musicState.audioElement?.currentTime || musicState.currentTime || 0;
      audioDuration = 0;
      comments = loadComments(id);
      commentsOpen = false;
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

  function onSeekBarClick(event: MouseEvent & { currentTarget: HTMLElement }) {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const next = ratio * duration;
    playhead = next;
    musicState.seek(next);
  }
</script>

{#if track}
  <div
    class="karaoke"
    class:chat-open={commentsOpen}
    role="dialog"
    aria-label="Karaoke Now Playing"
  >
    <div
      class="bg"
      style={track.imageUrl ? `background-image: url(${track.imageUrl})` : undefined}
    ></div>
    <div class="veil"></div>

    <header class="top">
      <button
        type="button"
        class="icon-btn"
        aria-label="Cerrar karaoke"
        title="Cerrar"
        onclick={() => musicState.closeKaraoke()}
      >
        <X class="h-5 w-5" />
      </button>

      <div class="identity">
        <div class="meta">
          <h1>{track.title || "Untitled"}</h1>
          {#if track.artist}
            <p>@{track.artist}</p>
          {/if}
        </div>
      </div>

      <div class="social">
        <button
          type="button"
          class="pill"
          class:on={liked}
          aria-label="Me gusta"
          onclick={() => void toggleLike()}
        >
          <Heart class="h-4 w-4" fill={liked ? "currentColor" : "none"} />
          <span>{likesCount || "Like"}</span>
        </button>
        <button
          type="button"
          class="pill"
          aria-label="Compartir"
          onclick={() => void shareTrack()}
        >
          <Share2 class="h-4 w-4" />
          <span>Share</span>
        </button>
        <button
          type="button"
          class="pill"
          class:on={commentsOpen}
          aria-label={commentsOpen ? "Cerrar comentarios" : "Abrir comentarios"}
          onclick={() => (commentsOpen = !commentsOpen)}
        >
          <MessageCircle class="h-4 w-4" />
          <span>{comments.length || "Chat"}</span>
        </button>
      </div>
    </header>

    <div class="body">
      <main class="stage">
        <div class="hero">
          <div class="cover-wrap">
            {#if track.imageUrl}
              <img src={track.imageUrl} alt="" class="cover-art" />
            {:else}
              <div class="cover-fallback">Sin portada</div>
            {/if}
            <div class="cover-fade" aria-hidden="true"></div>
          </div>

          <div class="lyrics-col">
            {#if activeSection}
              <p class="section-tag">{activeSection}</p>
            {/if}

            <div class="lyrics-viewport" aria-live="polite">
              {#if timedLines.length}
                <div
                  class="lyrics-engine"
                  style={`transform: translate3d(0, ${lyricsEngineY}px, 0)`}
                >
                  {#each timedLines as line, index}
                    <button
                      type="button"
                      class="lyric-line"
                      class:active={index === activeLine}
                      class:passed={activeLine >= 0 && index < activeLine}
                      class:upcoming={activeLine >= 0 && index === activeLine + 1}
                      onclick={() => seekToLine(index)}
                    >
                      {line.text}
                    </button>
                  {/each}
                </div>
              {:else}
                <p class="empty">Sin letras — disfruta el groove</p>
              {/if}
            </div>

            {#if alignedSource === "pending"}
              <p class="sync-hint">Calibrando voz…</p>
            {:else if alignedSource === "stt" || alignedSource === "kie" || alignedSource === "cached"}
              <p class="sync-hint">Sync vocal</p>
            {:else if alignedSource === "fallback"}
              <p class="sync-hint">Sync por estructura</p>
            {/if}
          </div>
        </div>

        <footer class="transport">
          <button
            type="button"
            class="play"
            aria-label={musicState.isPlaying ? "Pausar" : "Reproducir"}
            onclick={() => void musicState.togglePlay()}
          >
            {#if musicState.isPlaying}
              <Pause class="h-5 w-5" />
            {:else}
              <Play class="h-5 w-5 ml-0.5" />
            {/if}
          </button>
          <div class="seek">
            <button type="button" class="bar" aria-label="Posición" onclick={onSeekBarClick}>
              <span class="fill" style={`width: ${progressPercent}%`}></span>
            </button>
            <div class="times">
              <span>{formatTime(playhead)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </footer>
      </main>

      <button
        type="button"
        class="chat-toggle"
        class:open={commentsOpen}
        aria-expanded={commentsOpen}
        aria-controls="karaoke-comments"
        onclick={() => (commentsOpen = !commentsOpen)}
      >
        {#if commentsOpen}
          <ChevronRight class="h-4 w-4" />
        {:else}
          <ChevronLeft class="h-4 w-4" />
          <MessageCircle class="h-4 w-4" />
          <span>{comments.length}</span>
        {/if}
      </button>

      <aside
        id="karaoke-comments"
        class="chat"
        class:open={commentsOpen}
        aria-hidden={!commentsOpen}
      >
        <div class="chat-head">
          <strong>Comentarios</strong>
          <button
            type="button"
            class="icon-btn sm"
            aria-label="Cerrar comentarios"
            onclick={() => (commentsOpen = false)}
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
        <div class="compose">
          <input
            bind:value={commentText}
            placeholder="Escribe un comentario…"
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
            <p class="empty-comments">Sé el primero en comentar</p>
          {/each}
        </div>
      </aside>
    </div>
  </div>
{/if}

<style>
  .karaoke {
    --chat-w: 320px;
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    grid-template-rows: auto 1fr;
    color: #f4f4f5;
    overflow: hidden;
  }
  .bg {
    position: absolute;
    inset: -40px;
    background: #0a0a0b center / cover no-repeat;
    filter: blur(56px) saturate(1.2);
    transform: scale(1.1);
    opacity: 0.55;
  }
  .veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 18% 35%, rgba(58, 224, 213, 0.12), transparent 45%),
      linear-gradient(180deg, rgba(8, 8, 10, 0.55), rgba(8, 8, 10, 0.88) 70%, #08080a);
  }

  .top,
  .body {
    position: relative;
    z-index: 1;
  }

  .top {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem 0.5rem;
  }
  .identity {
    min-width: 0;
    flex: 1;
  }
  .meta h1 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 750;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta p {
    margin: 0.1rem 0 0;
    font-size: 0.85rem;
    color: rgba(244, 244, 245, 0.65);
  }
  .social {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    height: 2.35rem;
    padding: 0 0.85rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(244, 244, 245, 0.88);
    font-size: 0.8rem;
    font-weight: 650;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .pill:hover {
    background: rgba(255, 255, 255, 0.12);
  }
  .pill.on {
    color: #3ae0d5;
    border-color: rgba(58, 224, 213, 0.4);
    background: rgba(58, 224, 213, 0.12);
  }
  .icon-btn {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: inherit;
    flex-shrink: 0;
  }
  .icon-btn.sm {
    width: 2rem;
    height: 2rem;
  }
  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .body {
    display: grid;
    grid-template-columns: 1fr;
    min-height: 0;
    position: relative;
  }
  .karaoke.chat-open .body {
    grid-template-columns: 1fr var(--chat-w);
  }

  .stage {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 0.25rem 1.5rem 1rem;
  }

  .hero {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(280px, 42%) minmax(0, 1fr);
    gap: 0;
    align-items: stretch;
  }

  .cover-wrap {
    position: relative;
    align-self: center;
    width: 100%;
    max-width: min(520px, 100%);
    aspect-ratio: 1;
    border-radius: 1.25rem;
    overflow: hidden;
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(255, 255, 255, 0.06);
  }
  .cover-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .cover-fallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(244, 244, 245, 0.45);
  }
  /* Bottom of cover dissolves into lyrics plane */
  .cover-fade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        90deg,
        transparent 55%,
        rgba(8, 8, 10, 0.35) 78%,
        rgba(8, 8, 10, 0.92) 100%
      ),
      linear-gradient(
        180deg,
        transparent 48%,
        rgba(8, 8, 10, 0.25) 68%,
        rgba(8, 8, 10, 0.85) 88%,
        #08080a 100%
      );
  }

  .lyrics-col {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    min-height: 0;
    margin-left: -4.5rem;
    padding: 1rem 0.5rem 1rem 0;
    z-index: 2;
  }
  .section-tag {
    margin: 0 0 0.5rem 1rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #3ae0d5;
  }
  .lyrics-viewport {
    position: relative;
    flex: 1;
    max-height: min(68vh, 560px);
    overflow: hidden;
    /* Lyrics rise into the cover and vanish at the top */
    mask-image: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0, 0, 0, 0.35) 10%,
      #000 22%,
      #000 78%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      180deg,
      transparent 0%,
      rgba(0, 0, 0, 0.35) 10%,
      #000 22%,
      #000 78%,
      transparent 100%
    );
  }
  .lyrics-engine {
    will-change: transform;
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .lyric-line {
    display: block;
    width: 100%;
    min-height: 68px;
    padding: 0.3rem 1rem;
    border: 0;
    background: transparent;
    text-align: left;
    font-size: clamp(1.25rem, 2.6vw, 2.15rem);
    font-weight: 650;
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: rgba(244, 244, 245, 0.28);
    cursor: pointer;
    transition:
      color 0.25s ease,
      transform 0.25s ease,
      text-shadow 0.25s ease,
      opacity 0.25s ease;
  }
  .lyric-line.passed {
    color: rgba(58, 224, 213, 0.42);
    opacity: 0.8;
  }
  .lyric-line.upcoming {
    color: rgba(244, 244, 245, 0.55);
  }
  .lyric-line.active {
    color: #3ae0d5;
    transform: translateX(6px) scale(1.04);
    text-shadow: 0 0 28px rgba(58, 224, 213, 0.35);
    font-weight: 800;
  }
  .empty {
    color: rgba(244, 244, 245, 0.45);
    font-size: 1.15rem;
    margin: 3rem 1rem;
  }
  .sync-hint {
    margin: 0.5rem 0 0 1rem;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(244, 244, 245, 0.4);
  }

  .transport {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.65rem 0 0.25rem;
    max-width: 720px;
  }
  .play {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #3ae0d5;
    color: #0a0a0b;
    flex-shrink: 0;
  }
  .seek {
    flex: 1;
    min-width: 0;
  }
  .bar {
    position: relative;
    display: block;
    width: 100%;
    height: 0.4rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.15);
    overflow: hidden;
    cursor: pointer;
    border: 0;
    padding: 0;
  }
  .fill {
    display: block;
    height: 100%;
    background: #3ae0d5;
  }
  .times {
    display: flex;
    justify-content: space-between;
    margin-top: 0.35rem;
    font-size: 0.72rem;
    color: rgba(244, 244, 245, 0.5);
    font-variant-numeric: tabular-nums;
  }

  .chat-toggle {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    z-index: 4;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.5rem;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(20, 20, 22, 0.82);
    color: rgba(244, 244, 245, 0.9);
    font-size: 0.78rem;
    font-weight: 650;
    backdrop-filter: blur(12px);
    transition: right 0.28s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease;
  }
  .karaoke.chat-open .chat-toggle {
    right: calc(var(--chat-w) + 0.55rem);
    background: rgba(58, 224, 213, 0.16);
    border-color: rgba(58, 224, 213, 0.35);
    color: #3ae0d5;
    padding: 0.55rem;
  }

  .chat {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: var(--chat-w);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(12, 12, 14, 0.94);
    backdrop-filter: blur(18px);
    padding: 0.85rem 0.9rem 1rem;
    transform: translateX(100%);
    opacity: 0;
    pointer-events: none;
    transition:
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.2s ease;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 3;
  }
  .karaoke.chat-open .chat {
    position: relative;
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }
  .chat-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .chat-head strong {
    font-size: 0.95rem;
  }
  .compose {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }
  .compose input {
    flex: 1;
    min-width: 0;
    height: 2.4rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: inherit;
    padding: 0 0.75rem;
    outline: none;
    font-size: 0.85rem;
  }
  .compose input:focus {
    border-color: rgba(58, 224, 213, 0.45);
  }
  .send {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 0.75rem;
    display: grid;
    place-items: center;
    background: #3ae0d5;
    color: #0a0a0b;
    flex-shrink: 0;
  }
  .comment-list {
    overflow-y: auto;
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .comment {
    border-radius: 0.85rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.65rem 0.75rem;
  }
  .comment p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .comment span {
    display: block;
    margin-top: 0.3rem;
    font-size: 0.68rem;
    color: rgba(244, 244, 245, 0.45);
  }
  .empty-comments {
    margin: 1rem 0;
    text-align: center;
    color: rgba(244, 244, 245, 0.45);
    font-size: 0.85rem;
  }

  @media (max-width: 1180px) {
    .hero {
      grid-template-columns: minmax(240px, 38%) minmax(0, 1fr);
    }
    .lyrics-col {
      margin-left: -2.5rem;
    }
    .karaoke {
      --chat-w: 280px;
    }
  }

  @media (max-width: 1023px) {
    .karaoke {
      display: none;
    }
  }
</style>
