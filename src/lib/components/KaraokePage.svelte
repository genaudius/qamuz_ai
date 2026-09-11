<script lang="ts">
  import { goto } from "$app/navigation";
  import { getContext, onMount, onDestroy } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import { musicState as sharedMusicState } from "$lib/stores/music-state.js";
  import { notice } from "$lib/ui/notice.js";
  import { shareTrackLink } from "$lib/utils/share-track.js";
  import {
    activeLyricIndex,
    buildStructuredTimedLyrics,
    type TimedLyricLine
  } from "$lib/utils/lyrics-sync.js";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Heart from "@lucide/svelte/icons/heart";
  import Share2 from "@lucide/svelte/icons/share-2";
  import Send from "@lucide/svelte/icons/send";
  import Upload from "@lucide/svelte/icons/upload";
  import Play from "@lucide/svelte/icons/play";
  import Pause from "@lucide/svelte/icons/pause";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Video from "@lucide/svelte/icons/video";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Eye from "@lucide/svelte/icons/eye";
  import UserRound from "@lucide/svelte/icons/user-round";
  import ListPlus from "@lucide/svelte/icons/list-plus";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import AddToPlaylistDialog from "$lib/components/AddToPlaylistDialog.svelte";
  import { fanLimitState } from "$lib/stores/fan-limit.svelte.js";

  let {
    musicId,
    isKaraokeUnlimited = false
  }: {
    musicId: string;
    isKaraokeUnlimited?: boolean;
  } = $props();

  const MAX_KARAOKE_PREVIEW = 30;
  let previewLimitNotified = $state(false);

  function enforcePreviewLimit() {
    if (isKaraokeUnlimited) return false;
    if (playhead >= MAX_KARAOKE_PREVIEW) {
      if (pageAudio) {
        pageAudio.pause();
        pageAudio.currentTime = MAX_KARAOKE_PREVIEW;
      }
      playhead = MAX_KARAOKE_PREVIEW;
      musicState.pauseTrack();
      if (!previewLimitNotified) {
        previewLimitNotified = true;
        fanLimitState.openModal(
          "Has alcanzado el límite de 30 segundos de vista previa en Karaoke. Suscríbete al Plan Fan Unlimited por solo $8 USD/mes para cantar temas completos sin límites."
        );
      }
      return true;
    }
    return false;
  }

  const musicState = getContext<GlobalMusicState>("musicState") ?? sharedMusicState;

  type TrackComment = {
    id: string;
    text: string;
    at: number;
    user?: { id: string; name: string; image?: string | null };
  };
  type MediaMode = "cover" | "video";

  const LINE_STEP = 68;

  let liked = $state(false);
  let likesCount = $state(0);
  let playsCount = $state(0);
  let commentsCount = $state(0);
  let commentText = $state("");
  let comments = $state<TrackComment[]>([]);
  let commentsOpen = $state(false);
  let commentsLoading = $state(false);
  let commentsPublic = $state(false);
  let playlistOpen = $state(false);
  let mediaMode = $state<MediaMode>("cover");
  let isTvScreen = $state(false);
  let playhead = $state(0);
  let audioDuration = $state(0);
  let lastTrackId = $state<string | null>(null);
  let viewedTrackId = $state<string | null>(null);
  let alignedLines = $state<TimedLyricLine[] | null>(null);
  let alignedSource = $state<
    "pending" | "local" | "kie" | "cached" | "stt" | "fallback" | "none"
  >("pending");
  let pageAudio = $state<HTMLAudioElement | null>(null);
  let mediaVideo = $state<HTMLVideoElement | null>(null);
  let booting = $state(true);

  const track = $derived(musicState.currentTrack);
  const hasVideo = $derived(Boolean(track?.videoUrl));
  const canWriteComments = $derived(commentsPublic && !isTvScreen);

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
    const viewportCenter = 200;
    return viewportCenter - (focus * LINE_STEP + LINE_STEP * 0.5);
  });

  const progressPercent = $derived(duration > 0 ? Math.min(100, (playhead / duration) * 100) : 0);

  function formatTime(sec: number) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function formatCount(n: number) {
    if (!Number.isFinite(n) || n < 0) return "0";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return String(Math.floor(n));
  }

  async function loadComments(id: string) {
    commentsLoading = true;
    try {
      const response = await fetch(`/api/music/${id}/comments`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        comments = [];
        commentsPublic = false;
        commentsCount = 0;
        return;
      }
      commentsPublic = Boolean(payload?.isPublic);
      commentsCount = Number(payload?.commentsCount || 0);
      comments = Array.isArray(payload?.comments) ? payload.comments : [];
    } catch {
      comments = [];
      commentsPublic = false;
    } finally {
      commentsLoading = false;
    }
  }

  async function recordView(id: string) {
    if (viewedTrackId === id) return;
    const key = `qamuz.view.${id}`;
    try {
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last < 30 * 60 * 1000) {
        viewedTrackId = id;
        return;
      }
    } catch {
      // ignore
    }
    try {
      const response = await fetch(`/api/music/${id}/view`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (response.ok && typeof payload?.playsCount === "number") {
        playsCount = payload.playsCount;
        if (musicState.currentTrack?.id === id) {
          musicState.currentTrack = {
            ...musicState.currentTrack,
            playsCount: payload.playsCount
          };
        }
      }
      if (payload?.counted) {
        viewedTrackId = id;
        try {
          sessionStorage.setItem(key, String(Date.now()));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  async function refreshStats(id: string) {
    try {
      const response = await fetch(`/api/music/${id}/info`);
      if (!response.ok) return;
      const info = await response.json();
      playsCount = Number(info.playsCount || 0);
      likesCount = Number(info.likesCount || likesCount);
      commentsCount = Number(info.commentsCount || commentsCount);
      if (musicState.currentTrack?.id === id) {
        musicState.currentTrack = {
          ...musicState.currentTrack,
          playsCount,
          likesCount,
          commentsCount,
          isPublic:
            typeof info.isPublic === "boolean" ? info.isPublic : musicState.currentTrack.isPublic,
          artistId: info.artistId || musicState.currentTrack.artistId,
          artist: info.artist || musicState.currentTrack.artist
        };
      }
    } catch {
      // ignore
    }
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

  async function ensureTrack() {
    if (!pageAudio) return;
    musicState.audioElement = pageAudio;
    booting = true;
    try {
      if (musicState.currentTrack?.id === musicId) {
        if (!pageAudio.src) {
          await musicState.playTrack(musicState.currentTrack);
        }
        return;
      }
      await musicState.playTrack({
        id: musicId,
        url: `/api/music/${musicId}`,
        title: "Generated Track",
        durationMs: 0
      });
    } finally {
      booting = false;
    }
  }

  function detectTvScreen() {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    if (/TV|SmartTV|Web0S|Tizen|AppleTV|BRAVIA|CrKey|AFT|GoogleTV/i.test(ua)) return true;
    // Large lean-back display without fine pointer (typical living-room TV browsers).
    return window.matchMedia("(hover: none) and (pointer: coarse) and (min-width: 1280px)").matches;
  }

  function setMediaMode(mode: MediaMode) {
    if (mode === "video" && !hasVideo) return;
    mediaMode = mode;
    if (mode === "video" && mediaVideo) {
      mediaVideo.currentTime = playhead;
      if (musicState.isPlaying) void mediaVideo.play().catch(() => undefined);
      else mediaVideo.pause();
    }
  }

  function openCommentsPanel() {
    commentsOpen = !commentsOpen;
  }

  $effect(() => {
    void musicId;
    void pageAudio;
    void ensureTrack();
  });

  $effect(() => {
    const id = track?.id;
    if (!id) return;
    if (id !== lastTrackId) {
      lastTrackId = id;
      playhead = musicState.audioElement?.currentTime || musicState.currentTime || 0;
      audioDuration = 0;
      comments = [];
      commentsOpen = false;
      mediaMode = "cover";
      playsCount = Number(track?.playsCount || 0);
      likesCount = Number(track?.likesCount || 0);
      commentsCount = Number(track?.commentsCount || 0);
      void refreshLike(id);
      void refreshStats(id);
      void loadComments(id);
      void loadAlignedLyrics(id);
      void recordView(id);
    }
  });

  $effect(() => {
    if (!hasVideo && mediaMode === "video") mediaMode = "cover";
  });

  $effect(() => {
    const video = mediaVideo;
    if (!video || mediaMode !== "video") return;
    const t = playhead;
    if (Math.abs((video.currentTime || 0) - t) > 0.35) {
      try {
        video.currentTime = t;
      } catch {
        // ignore seek races
      }
    }
    if (musicState.isPlaying && video.paused) void video.play().catch(() => undefined);
    if (!musicState.isPlaying && !video.paused) video.pause();
  });

  $effect(() => {
    if (!pageAudio) return;
    musicState.audioElement = pageAudio;
    pageAudio.volume = musicState.volume;
  });

  $effect(() => {
    if (!pageAudio || !track?.url) return;
    const absolute = new URL(track.url, window.location.origin).href;
    if (pageAudio.src !== absolute) {
      pageAudio.src = track.url;
      pageAudio.load();
    }
  });

  $effect(() => {
    if (!pageAudio || !track) return;
    if (musicState.isPlaying && pageAudio.paused) {
      const tryPlay = () =>
        pageAudio!
          .play()
          .then(() => {
            musicState.isPlaying = true;
          })
          .catch((e) => {
            console.warn("Karaoke autoplay / play prevented:", e);
            musicState.isPlaying = false;
          });

      if (pageAudio.readyState >= 2) {
        void tryPlay();
      } else {
        pageAudio.addEventListener("canplay", () => void tryPlay(), { once: true });
      }
    } else if (!musicState.isPlaying && !pageAudio.paused) {
      pageAudio.pause();
    }
  });

  onDestroy(() => {
    if (musicState.audioElement === pageAudio) {
      musicState.audioElement = null;
    }
  });

  onMount(() => {
    isTvScreen = detectTvScreen();
    const mq = window.matchMedia("(hover: none) and (pointer: coarse) and (min-width: 1280px)");
    const syncTv = () => {
      isTvScreen = detectTvScreen();
    };
    mq.addEventListener?.("change", syncTv);

    let raf = 0;
    const tick = () => {
      const audio = musicState.audioElement;
      if (audio) {
        const t = audio.currentTime;
        if (Number.isFinite(t)) {
          playhead = t;
          enforcePreviewLimit();
        }
        const d = audio.duration;
        if (Number.isFinite(d) && d > 0) audioDuration = d;
      } else if (Number.isFinite(musicState.currentTime)) {
        playhead = musicState.currentTime;
        enforcePreviewLimit();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener?.("change", syncTv);
    };
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
    if (track.isPublic) {
      notice.warning(
        "Esta canción ya está publicada",
        "Puedes actualizar los datos o despublicarla."
      );
    }
    musicState.openPublishModal(track);
  }

  async function addComment() {
    if (!track?.id) return;
    if (isTvScreen) {
      notice.warning("Modo TV", "En TV solo puedes ver comentarios.");
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    if (!commentsPublic && !track.isPublic) {
      notice.warning("Publica la canción", "Los comentarios solo están en canciones públicas.");
      return;
    }
    try {
      const response = await fetch(`/api/music/${track.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        notice.error("No pude publicar el comentario", payload?.error);
        return;
      }
      if (payload?.comment) {
        comments = [payload.comment, ...comments];
      }
      commentsCount = Number(payload?.commentsCount ?? commentsCount + 1);
      commentText = "";
      notice.success("Comentario publicado");
    } catch {
      notice.error("No pude publicar el comentario");
    }
  }

  function seekToLine(index: number) {
    const line = timedLines[index];
    if (!line || !Number.isFinite(line.start)) return;
    if (!isKaraokeUnlimited && line.start > MAX_KARAOKE_PREVIEW) {
      if (pageAudio) {
        pageAudio.pause();
        pageAudio.currentTime = MAX_KARAOKE_PREVIEW;
      }
      playhead = MAX_KARAOKE_PREVIEW;
      musicState.pauseTrack();
      fanLimitState.openModal(
        "Esta estrofa supera los 30 segundos de vista previa de Karaoke. ¡Suscríbete al Plan Fan Unlimited por solo $8 USD/mes para cantar la canción entera!"
      );
      return;
    }
    playhead = line.start;
    musicState.seek(line.start);
    if (!musicState.isPlaying) void musicState.togglePlay();
  }

  function onSeekBarClick(event: MouseEvent & { currentTarget: HTMLElement }) {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const next = ratio * duration;
    if (!isKaraokeUnlimited && next > MAX_KARAOKE_PREVIEW) {
      if (pageAudio) {
        pageAudio.pause();
        pageAudio.currentTime = MAX_KARAOKE_PREVIEW;
      }
      playhead = MAX_KARAOKE_PREVIEW;
      musicState.pauseTrack();
      fanLimitState.openModal(
        "La vista previa de Karaoke para cuentas gratuitas está limitada a 30 segundos. ¡Suscríbete al Plan Fan Unlimited por solo $8 USD/mes para desbloquear la canción completa!"
      );
      return;
    }
    playhead = next;
    musicState.seek(next);
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    void goto("/library");
  }

  function syncFromAudio() {
    const audio = pageAudio;
    if (!audio) return;
    if (Number.isFinite(audio.currentTime)) {
      playhead = audio.currentTime;
      musicState.currentTime = audio.currentTime;
      enforcePreviewLimit();
    }
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audioDuration = audio.duration;
      musicState.duration = audio.duration;
    }
  }

  function handleAudioError() {
    const err = pageAudio?.error;
    console.error("Karaoke audio error:", err?.code, err?.message, pageAudio?.src);
    musicState.isPlaying = false;
  }

  async function togglePlay() {
    await musicState.togglePlay();
  }
</script>

<audio
  bind:this={pageAudio}
  preload="auto"
  ontimeupdate={syncFromAudio}
  onloadedmetadata={syncFromAudio}
  ondurationchange={syncFromAudio}
  oncanplay={syncFromAudio}
  onplay={() => (musicState.isPlaying = true)}
  onpause={() => (musicState.isPlaying = false)}
  onended={() => (musicState.isPlaying = false)}
  onerror={handleAudioError}
></audio>

<div class="page" class:comments-open={commentsOpen}>
  <div
    class="bg"
    style={track?.imageUrl ? `background-image: url(${track.imageUrl})` : undefined}
  ></div>
  <div class="veil"></div>

  <header class="top">
    <button type="button" class="icon-btn" aria-label="Volver" onclick={goBack}>
      <ArrowLeft class="h-5 w-5" />
    </button>
    <div class="meta">
      <h1>{track?.title || (booting ? "Cargando…" : "Karaoke")}</h1>
      {#if track?.artist}
        <p>@{track.artist}</p>
      {/if}
    </div>
    <div class="stats" title="Vistas">
      <Eye class="h-4 w-4" />
      <span>{formatCount(playsCount)}</span>
      <span class="stats-label">vistas</span>
    </div>
    {#if !isKaraokeUnlimited}
      <button
        type="button"
        onclick={() => fanLimitState.openModal("Suscríbete al Plan Fan Unlimited por solo $8 USD/mes para disfrutar de Karaoke ilimitado sin cortes.")}
        class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition cursor-pointer shrink-0"
        title="Haz clic para desbloquear Karaoke completo"
      >
        <Sparkles class="w-3.5 h-3.5 animate-pulse text-amber-400" />
        <span>Vista Previa: 30s</span>
        <span class="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-md ml-1">Desbloquear</span>
      </button>
    {/if}
  </header>

  <div class="stage">
    <div class="hero">
      <div class="media-col">
        <div class="media-frame" class:video={mediaMode === "video" && hasVideo}>
          {#if mediaMode === "video" && track?.videoUrl}
            <video
              bind:this={mediaVideo}
              src={track.videoUrl}
              class="media-video"
              muted
              playsinline
              loop
            ></video>
          {:else if track?.imageUrl}
            <img src={track.imageUrl} alt="" class="cover-art" />
          {:else}
            <div class="cover-fallback">Sin portada</div>
          {/if}
          <div class="cover-fade" aria-hidden="true"></div>
        </div>

        {#if hasVideo}
          <div class="mode-row">
            <button
              type="button"
              class="mode-btn"
              class:on={mediaMode === "cover"}
              onclick={() => setMediaMode("cover")}
            >
              <ImageIcon class="h-4 w-4" />
              Portada
            </button>
            <button
              type="button"
              class="mode-btn"
              class:on={mediaMode === "video"}
              onclick={() => setMediaMode("video")}
            >
              <Video class="h-4 w-4" />
              Ver video
            </button>
          </div>
        {/if}
      </div>

      <div class="lyrics-col">
        <div class="brand-block">
          <h2 class="brand-title">QAMUZ KARAOKE</h2>
          <p class="brand-sub">
            DIVIÉRTETE CANTANDO TUS CREACIONES Y TU MÚSICA FAVORITA
          </p>
          {#if track?.artistId}
            <a class="artist-link" href={`/artist/${track.artistId}`}>
              <UserRound class="h-4 w-4" />
              <span>
                Ver perfil / canal
                {#if track.artist}
                  · @{track.artist}
                {/if}
              </span>
            </a>
            <p class="artist-hint">Entra al canal para seguir al artista</p>
          {/if}
        </div>

        <div class="track-heading">
          <h3 class="track-title">{track?.title || "Untitled"}</h3>
          <p class="track-artist">
            {#if track?.artistId}
              <a href={`/artist/${track.artistId}`}>@{track.artist || "artista"}</a>
            {:else}
              @{track?.artist || "QAMUZ"}
            {/if}
          </p>
        </div>

        {#if activeSection}
          <p class="section-tag">{activeSection}</p>
        {/if}
        <div class="lyrics-viewport" aria-live="polite">
          {#if timedLines.length}
            <div class="lyrics-engine" style={`transform: translate3d(0, ${lyricsEngineY}px, 0)`}>
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
        {:else if alignedSource === "local" || alignedSource === "stt" || alignedSource === "kie" || alignedSource === "cached"}
          <p class="sync-hint">Sync vocal</p>
        {:else if alignedSource === "fallback"}
          <p class="sync-hint">Sync por estructura</p>
        {/if}
      </div>
    </div>
  </div>

  <aside
    id="karaoke-comments"
    class="chat-sheet"
    class:open={commentsOpen}
    aria-hidden={!commentsOpen}
  >
    <div class="sheet-handle" aria-hidden="true"></div>
    <div class="chat-box">
      <div class="chat-head">
        <div>
          <strong>Comentarios</strong>
          <p>
            {#if commentsPublic}
              {formatCount(commentsCount || comments.length)} comentario{(commentsCount || comments.length) === 1
                ? ""
                : "s"} · {formatCount(playsCount)} vistas
            {:else}
              Solo en canciones públicas
            {/if}
          </p>
        </div>
        <button
          type="button"
          class="icon-btn sm"
          aria-label="Cerrar comentarios"
          onclick={() => (commentsOpen = false)}
        >
          <ChevronDown class="h-4 w-4" />
        </button>
      </div>

      {#if commentsPublic}
        {#if canWriteComments}
          <div class="compose">
            <input
              bind:value={commentText}
              placeholder="Añade un comentario…"
              maxlength="500"
              onkeydown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addComment();
                }
              }}
            />
            <button type="button" class="send" aria-label="Publicar comentario" onclick={() => void addComment()}>
              <Send class="h-4 w-4" />
            </button>
          </div>
        {:else}
          <p class="tv-hint">Modo TV: puedes leer comentarios, no escribir.</p>
        {/if}

        <div class="comment-list">
          {#if commentsLoading}
            <p class="empty-comments">Cargando comentarios…</p>
          {:else}
            {#each comments as comment}
              <div class="comment">
                <div class="comment-user">
                  {#if comment.user?.image}
                    <img src={comment.user.image} alt="" class="avatar" />
                  {:else}
                    <div class="avatar fallback">{(comment.user?.name || "?").slice(0, 1)}</div>
                  {/if}
                  <strong>{comment.user?.name || "Usuario"}</strong>
                  <span>{new Date(comment.at).toLocaleString()}</span>
                </div>
                <p>{comment.text}</p>
              </div>
            {:else}
              <p class="empty-comments">Sé el primero en comentar</p>
            {/each}
          {/if}
        </div>
      {:else}
        <div class="private-hint">
          <p>Los comentarios estilo YouTube se activan cuando la canción es pública.</p>
          <button type="button" class="publish-cta" onclick={openPublish}>Publicar canción</button>
        </div>
      {/if}
    </div>
  </aside>

  <footer class="player-dock">
    <div class="dock-left">
      {#if track?.imageUrl}
        <img src={track.imageUrl} alt="" class="dock-cover" />
      {:else}
        <div class="dock-cover empty"></div>
      {/if}
      <button
        type="button"
        class="play"
        aria-label={musicState.isPlaying ? "Pausar" : "Reproducir"}
        onclick={() => void togglePlay()}
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
    </div>

    <div class="dock-actions">
      <div class="dock-views" title="Vistas">
        <Eye class="h-4 w-4" />
        <span>{formatCount(playsCount)}</span>
      </div>
      <button
        type="button"
        class="dock-btn"
        title="Agregar a playlist"
        aria-label="Agregar a playlist"
        onclick={() => (playlistOpen = true)}
      >
        <ListPlus class="h-4.5 w-4.5" />
        <span>Playlist</span>
      </button>
      <button
        type="button"
        class="dock-btn"
        class:on={liked}
        title="Me gusta"
        aria-label="Me gusta"
        onclick={() => void toggleLike()}
      >
        <Heart class="h-4.5 w-4.5" fill={liked ? "currentColor" : "none"} />
        <span>{formatCount(likesCount) || "Like"}</span>
      </button>
      <button
        type="button"
        class="dock-btn"
        title="Compartir"
        aria-label="Compartir"
        onclick={() => void shareTrack()}
      >
        <Share2 class="h-4.5 w-4.5" />
        <span>Share</span>
      </button>
      <button
        type="button"
        class="dock-btn"
        title="Publicar"
        aria-label="Publicar"
        onclick={openPublish}
      >
        <Upload class="h-4.5 w-4.5" />
        <span>{track?.isPublic ? "Edit" : "Publish"}</span>
      </button>
      <button
        type="button"
        class="dock-btn"
        class:on={commentsOpen}
        title="Comentarios"
        aria-label="Comentarios"
        aria-expanded={commentsOpen}
        aria-controls="karaoke-comments"
        onclick={openCommentsPanel}
      >
        <MessageCircle class="h-4.5 w-4.5" />
        <span>Comments</span>
      </button>
    </div>
  </footer>
</div>

<AddToPlaylistDialog
  bind:open={playlistOpen}
  musicId={track?.id}
  title={track?.title}
/>

<style>
  .page {
    --footer-h: 5.75rem;
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    grid-template-rows: auto 1fr;
    color: #f4f4f5;
    overflow: hidden;
    background: #08080a;
    padding-bottom: calc(var(--footer-h) + 0.5rem);
  }
  .bg {
    position: absolute;
    inset: -40px;
    background: #0a0a0b center / cover no-repeat;
    filter: blur(56px) saturate(1.2);
    transform: scale(1.1);
    opacity: 0.5;
  }
  .veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 18% 35%, rgba(58, 224, 213, 0.12), transparent 45%),
      linear-gradient(180deg, rgba(8, 8, 10, 0.55), rgba(8, 8, 10, 0.9) 70%, #08080a);
  }

  .top,
  .stage {
    position: relative;
    z-index: 1;
  }

  .top {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem 1.25rem 0.5rem;
  }
  .meta {
    min-width: 0;
    flex: 1;
  }
  .stats {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.06);
    color: rgba(244, 244, 245, 0.88);
    font-size: 0.8rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .stats-label {
    font-weight: 550;
    color: rgba(244, 244, 245, 0.55);
    text-transform: lowercase;
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

  .stage {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0 1.25rem 0.5rem;
    transition: padding-bottom 0.28s ease;
  }

  .hero {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(280px, 44%) minmax(0, 1fr);
    align-items: stretch;
    gap: 0.5rem;
  }

  .media-col {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    align-self: center;
  }
  .media-frame {
    position: relative;
    width: 100%;
    max-width: min(520px, 100%);
    aspect-ratio: 1;
    border-radius: 1.25rem;
    overflow: hidden;
    box-shadow:
      0 30px 80px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(255, 255, 255, 0.06);
    background: #111;
  }
  .media-frame.video {
    aspect-ratio: 16 / 10;
  }
  .cover-art,
  .media-video {
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


  .mode-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    max-width: min(520px, 100%);
  }
  .mode-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    height: 2.2rem;
    padding: 0 0.8rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.05);
    color: rgba(244, 244, 245, 0.8);
    font-size: 0.78rem;
    font-weight: 650;
  }
  .mode-btn.on {
    color: #0a0a0b;
    background: #3ae0d5;
    border-color: #3ae0d5;
  }

  .lyrics-col {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    min-height: 0;
    margin-left: -3.5rem;
    padding: 1rem 0.25rem 1rem 0;
    z-index: 2;
  }
  .brand-block {
    margin: 0 0 0.85rem 1rem;
    max-width: 36rem;
  }
  .brand-title {
    margin: 0;
    font-size: clamp(1.85rem, 4.2vw, 3.1rem);
    font-weight: 850;
    letter-spacing: -0.04em;
    line-height: 0.95;
    color: #f4f4f5;
    text-shadow: 0 0 40px rgba(58, 224, 213, 0.22);
  }
  .brand-sub {
    margin: 0.55rem 0 0;
    font-size: clamp(0.72rem, 1.15vw, 0.88rem);
    font-weight: 650;
    letter-spacing: 0.08em;
    line-height: 1.35;
    text-transform: uppercase;
    color: rgba(244, 244, 245, 0.62);
  }
  .artist-link {
    margin-top: 0.75rem;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    max-width: 100%;
    padding: 0.45rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(58, 224, 213, 0.35);
    background: rgba(58, 224, 213, 0.1);
    color: #3ae0d5;
    font-size: 0.78rem;
    font-weight: 700;
    text-decoration: none;
  }
  .artist-link span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .artist-link:hover {
    background: rgba(58, 224, 213, 0.18);
  }
  .artist-hint {
    margin: 0.4rem 0 0;
    font-size: 0.72rem;
    color: rgba(244, 244, 245, 0.45);
  }
  .track-heading {
    margin: 0.35rem 0 0.65rem 1rem;
    max-width: 36rem;
  }
  .track-title {
    margin: 0;
    font-size: clamp(1.35rem, 2.8vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.15;
    color: #f4f4f5;
  }
  .track-artist {
    margin: 0.3rem 0 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(244, 244, 245, 0.7);
  }
  .track-artist a {
    color: #3ae0d5;
    text-decoration: none;
  }
  .track-artist a:hover {
    text-decoration: underline;
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
    max-height: min(62vh, 520px);
    overflow: hidden;
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
    font-size: clamp(1.2rem, 2.4vw, 2.05rem);
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
    font-size: 1.1rem;
    margin: 3rem 1rem;
  }
  .sync-hint {
    margin: 0.5rem 0 0 1rem;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(244, 244, 245, 0.4);
  }

  .player-dock {
    position: fixed;
    left: 0.85rem;
    right: 0.85rem;
    bottom: 0.75rem;
    z-index: 6;
    height: var(--footer-h);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 0.85rem;
    border-radius: 1.15rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(18, 18, 20, 0.92);
    backdrop-filter: blur(18px);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
  }
  .dock-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex: 1;
  }
  .dock-cover {
    width: 3rem;
    height: 3rem;
    border-radius: 0.55rem;
    object-fit: cover;
    flex-shrink: 0;
  }
  .dock-cover.empty {
    background: rgba(255, 255, 255, 0.08);
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
    max-width: 420px;
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
    margin-top: 0.3rem;
    font-size: 0.7rem;
    color: rgba(244, 244, 245, 0.5);
    font-variant-numeric: tabular-nums;
  }
  .dock-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }
  .dock-views {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-right: 0.35rem;
    padding: 0 0.55rem;
    color: rgba(244, 244, 245, 0.7);
    font-size: 0.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .dock-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 2.35rem;
    padding: 0 0.7rem;
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(244, 244, 245, 0.72);
    font-size: 0.72rem;
    font-weight: 650;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .dock-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
  .dock-btn.on {
    color: #3ae0d5;
    border-color: rgba(58, 224, 213, 0.3);
    background: rgba(58, 224, 213, 0.1);
  }


  .chat-sheet {
    --comments-w: min(380px, calc(100vw - 1.5rem));
    position: fixed;
    right: 0.85rem;
    left: auto;
    width: var(--comments-w);
    top: 0.85rem;
    bottom: calc(var(--footer-h) + 0.95rem);
    z-index: 5;
    display: flex;
    flex-direction: column;
    transform: translateY(110%);
    opacity: 0;
    pointer-events: none;
    transition:
      transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.2s ease;
  }
  .chat-sheet.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .page.comments-open .stage {
    padding-right: calc(var(--comments-w, 380px) + 1rem);
  }
  @media (max-width: 900px) {
    .chat-sheet {
      --comments-w: calc(100vw - 1.5rem);
      right: 0.75rem;
      left: 0.75rem;
      width: auto;
    }
    .page.comments-open .stage {
      padding-right: 0;
    }
  }
  .sheet-handle {
    width: 2.5rem;
    height: 0.28rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    margin: 0 auto 0.55rem;
    flex-shrink: 0;
  }
  .chat-box {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 1.15rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(14, 14, 16, 0.96);
    backdrop-filter: blur(18px);
    padding: 0.85rem 0.95rem 1rem;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.5);
  }
  .chat-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-shrink: 0;
  }
  .chat-head strong {
    display: block;
    font-size: 1rem;
  }
  .chat-head p {
    margin: 0.15rem 0 0;
    font-size: 0.75rem;
    color: rgba(244, 244, 245, 0.5);
  }
  .compose {
    display: flex;
    gap: 0.45rem;
    margin: 0.85rem 0 0.75rem;
    flex-shrink: 0;
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
  .comment-user {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.35rem;
  }
  .avatar {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 999px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .avatar.fallback {
    display: grid;
    place-items: center;
    background: rgba(58, 224, 213, 0.2);
    color: #3ae0d5;
    font-size: 0.7rem;
    font-weight: 750;
  }
  .comment-user strong {
    font-size: 0.8rem;
  }
  .comment-user span {
    margin-left: auto;
    font-size: 0.68rem;
    color: rgba(244, 244, 245, 0.45);
  }
  .comment p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  .tv-hint {
    margin: 0.75rem 0;
    text-align: center;
    color: rgba(244, 244, 245, 0.55);
    font-size: 0.85rem;
  }
  .empty-comments {
    margin: 1rem 0;
    text-align: center;
    color: rgba(244, 244, 245, 0.45);
    font-size: 0.85rem;
  }
  .private-hint {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 0.9rem;
    border: 1px dashed rgba(255, 255, 255, 0.14);
    text-align: center;
  }
  .private-hint p {
    margin: 0 0 0.85rem;
    color: rgba(244, 244, 245, 0.65);
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .publish-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.35rem;
    padding: 0 1rem;
    border-radius: 999px;
    background: #3ae0d5;
    color: #0a0a0b;
    font-size: 0.8rem;
    font-weight: 750;
  }

  @media (max-width: 900px) {
    .page {
      --footer-h: 7.5rem;
    }
    .player-dock {
      flex-direction: column;
      align-items: stretch;
      height: auto;
      min-height: var(--footer-h);
      padding-bottom: 0.75rem;
    }
    .dock-actions {
      justify-content: space-between;
      overflow-x: auto;
    }
    .dock-btn span {
      display: none;
    }
    .dock-btn {
      flex: 1;
      padding: 0;
      min-height: 2.5rem;
    }
  }

  @media (max-width: 1023px) {
    .hero {
      grid-template-columns: 1fr;
      overflow: auto;
    }
    .lyrics-col {
      margin-left: 0;
    }
    .brand-block {
      margin-left: 0;
      text-align: center;
      max-width: none;
    }
    .track-heading {
      margin-left: 0;
      text-align: center;
      max-width: none;
    }
    .media-frame {
      max-width: min(360px, 80vw);
      margin: 0 auto;
    }
    .mode-row {
      justify-content: center;
      margin: 0 auto;
    }
    .cover-fade {
      background: linear-gradient(
        180deg,
        transparent 55%,
        rgba(8, 8, 10, 0.55) 78%,
        #08080a 100%
      );
    }
    .lyric-line {
      text-align: center;
    }
  }
</style>
