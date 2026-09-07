<script lang="ts">
  import { page } from "$app/state";
  import { musicState } from "$lib/stores/music-state.js";
  import { toast } from "svelte-sonner";
  import Play from "@lucide/svelte/icons/play";
  import Pause from "@lucide/svelte/icons/pause";
  import SkipBack from "@lucide/svelte/icons/skip-back";
  import SkipForward from "@lucide/svelte/icons/skip-forward";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Maximize2 from "@lucide/svelte/icons/maximize-2";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import PublishModal from "$lib/components/PublishModal.svelte";
  import AddToPlaylistDialog from "$lib/components/AddToPlaylistDialog.svelte";
  import TrackOptionsMenu from "$lib/components/TrackOptionsMenu.svelte";
  import * as Button from "$lib/components/ui/button/index.js";
  import X from "@lucide/svelte/icons/x";
  import { shareTrackLink } from "$lib/utils/share-track.js";

  let audioElement = $state<HTMLAudioElement | undefined>(undefined);
  let seekBar = $state<HTMLDivElement | undefined>(undefined);
  let isSeeking = $state(false);
  let playlistOpen = $state(false);
  let lastHandledPlayId = $state<string | null>(null);

  // Parent layout only mounts this when musicState.currentTrack is set.
  const activeTrack = $derived(musicState.currentTrack as NonNullable<typeof musicState.currentTrack>);

  $effect(() => {
    const playId = page.url.searchParams.get("play");
    if (!playId || playId === lastHandledPlayId) return;

    lastHandledPlayId = playId;

    void (async () => {
      try {
        const response = await fetch(`/api/music/${playId}/info`);
        const info = await response.json().catch(() => null);
        if (!response.ok || !info?.url) {
          toast.error(info?.message || "No se pudo cargar la canción");
          return;
        }

        await musicState.playTrack({
          id: info.id,
          url: info.url,
          title: info.title,
          artist: info.artist,
          imageUrl: info.imageUrl,
          videoUrl: info.videoUrl,
          lyrics: info.lyrics,
          durationMs: info.durationMs || 0,
        });
      } catch {
        toast.error("No se pudo cargar la canción");
      } finally {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("play");
        const cleaned = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
        window.history.replaceState({}, "", cleaned);
      }
    })();
  });

  function usableDuration(): number {
    const fromAudio = audioElement?.duration;
    const fromState = musicState.duration;
    const fromTrack = (activeTrack?.durationMs ?? 0) / 1000;
    if (Number.isFinite(fromAudio) && fromAudio > 0) return fromAudio;
    if (Number.isFinite(fromState) && fromState > 0) return fromState;
    if (Number.isFinite(fromTrack) && fromTrack > 0) return fromTrack;
    return 0;
  }

  let progressPercent = $derived.by(() => {
    const duration = usableDuration();
    if (duration <= 0) return 0;
    return Math.min(100, Math.max(0, (musicState.currentTime / duration) * 100));
  });

  async function shareCurrentTrack() {
    const active = activeTrack;
    if (!active?.id) {
      toast.error("No hay canción para compartir");
      return;
    }
    const result = await shareTrackLink({
      id: active.id,
      title: active.title || "Untitled track"
    });
    if (result === "shared") return;
    if (result === "copied") {
      toast.success("Enlace copiado al portapapeles");
      return;
    }
    toast.error("No se pudo compartir la canción");
  }

  function syncDuration() {
    if (!audioElement) return;
    const audioDuration = audioElement.duration;
    if (Number.isFinite(audioDuration) && audioDuration > 0) {
      musicState.duration = audioDuration;
    }
  }

  function handleTimeUpdate() {
    if (audioElement && !isSeeking) {
      musicState.currentTime = audioElement.currentTime;
      syncDuration();
    }
  }

  function handleEnded() {
    musicState.isPlaying = false;
    musicState.currentTime = usableDuration() || musicState.currentTime;
  }

  function handleAudioError() {
    const err = audioElement?.error;
    console.error("Audio element error:", err?.code, err?.message, audioElement?.src);
    musicState.isPlaying = false;
    if (activeTrack) {
      toast.error("No se pudo reproducir el audio");
    }
  }

  function seekFromClientX(clientX: number) {
    if (!seekBar) return;
    const duration = usableDuration();
    if (duration <= 0) return;
    const rect = seekBar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    musicState.seek(ratio * duration);
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
      // Capture may already be released.
    }
  }

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  $effect(() => {
    if (!audioElement) return;
    musicState.audioElement = audioElement;
    audioElement.volume = musicState.volume;
  });

  $effect(() => {
    if (!audioElement || !activeTrack?.url) return;
    const absolute = new URL(activeTrack.url, window.location.origin).href;
    if (audioElement.src !== absolute) {
      audioElement.src = activeTrack.url;
      audioElement.load();
    }
  });

  $effect(() => {
    if (!audioElement || !activeTrack || isSeeking) return;
    if (musicState.isPlaying && audioElement.paused) {
      const tryPlay = () =>
        audioElement!
          .play()
          .then(() => {
            musicState.isPlaying = true;
          })
          .catch((e) => {
            console.error("Playback failed:", e);
            musicState.isPlaying = false;
          });

      if (audioElement.readyState >= 2) {
        void tryPlay();
      } else {
        audioElement.addEventListener("canplay", () => void tryPlay(), { once: true });
      }
    } else if (!musicState.isPlaying && !audioElement.paused) {
      audioElement.pause();
    }
  });
</script>

<audio
  bind:this={audioElement}
  preload="auto"
  ontimeupdate={handleTimeUpdate}
  onloadedmetadata={syncDuration}
  ondurationchange={syncDuration}
  oncanplay={syncDuration}
  onended={handleEnded}
  onerror={handleAudioError}
></audio>

  <div
    class="player-shell fixed z-50 flex items-center bg-[#1c1c1c] text-white shadow-2xl border border-white/5 transition-all duration-300
      bottom-[calc(4rem+env(safe-area-inset-bottom))] left-3 right-3 h-[76px] px-3 gap-2 rounded-2xl
      lg:bottom-6 lg:left-6 lg:h-[88px] lg:px-5 lg:gap-4
      {musicState.isExpanded ? 'max-lg:hidden lg:right-[370px]' : 'lg:right-6'}"
  >
    <!-- Left: Track Info -->
    <div class="flex items-center gap-2 md:gap-4 min-w-0 flex-1 basis-[30%] max-w-[40%]">
      <button
        type="button"
        class="h-11 w-11 md:h-14 md:w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center relative group cursor-pointer border-none p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        onclick={() => musicState.toggleExpanded()}
      >
        {#if activeTrack.imageUrl}
          <img
            src={activeTrack.imageUrl}
            alt="Cover art"
            class="h-full w-full object-cover"
          />
        {:else}
          <ImageIcon class="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
        {/if}
        <div
          class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
        >
          <Maximize2 class="h-4 w-4 text-white" />
        </div>
      </button>
      <div class="flex flex-col min-w-0 justify-center">
        <button
          type="button"
          class="text-xs md:text-sm font-bold truncate cursor-pointer hover:underline text-white border-none p-0 bg-transparent text-left outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          onclick={() => musicState.toggleExpanded()}
        >
          {activeTrack.title}
        </button>
        {#if activeTrack.artist}
          <span class="text-[11px] md:text-xs text-[#a0a0a0] truncate mt-0.5"
            >{activeTrack.artist}</span
          >
        {/if}
      </div>
    </div>

    <!-- Center: Controls -->
    <div
      class="flex flex-col items-center justify-center flex-1 min-w-0 max-w-2xl px-1 md:px-4 gap-0.5 md:gap-1.5"
    >
      <div class="flex items-center gap-3 md:gap-6">
        <Button.Root
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-[#a0a0a0] hover:text-white rounded-full"
        >
          <SkipBack class="h-5 w-5 fill-current" />
        </Button.Root>
        <Button.Root
          variant="ghost"
          size="icon"
          class="h-10 w-10 rounded-full bg-[#3ae0d5] text-black hover:bg-[#3ae0d5]/90 hover:scale-105 transition-all shadow-md"
          onclick={() => void musicState.togglePlay()}
        >
          {#if musicState.isPlaying}
            <Pause class="h-5 w-5 fill-current" />
          {:else}
            <Play class="h-5 w-5 fill-current ml-1" />
          {/if}
        </Button.Root>
        <Button.Root
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-[#a0a0a0] hover:text-white rounded-full"
        >
          <SkipForward class="h-5 w-5 fill-current" />
        </Button.Root>
        <Button.Root
          variant="ghost"
          size="icon"
          class="hidden sm:inline-flex h-8 w-8 text-[#a0a0a0] hover:text-white rounded-full ml-1 md:ml-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
            ><path d="m17 2 4 4-4 4" /><path
              d="M3 11v-1a4 4 0 0 1 4-4h14"
            /><path d="m7 22-4-4 4-4" /><path
              d="M21 13v1a4 4 0 0 1-4 4H3"
            /></svg
          >
        </Button.Root>
      </div>

      <!-- Progress Bar: same on mobile and desktop -->
      <div
        class="flex items-center gap-2 md:gap-3 w-full text-[10px] md:text-[11px] text-[#a0a0a0] font-mono"
      >
        <span class="w-8 md:w-10 text-right tabular-nums">{formatTime(musicState.currentTime)}</span>
        <div
          bind:this={seekBar}
          role="slider"
          tabindex="0"
          aria-label="Song progress"
          aria-valuemin={0}
          aria-valuemax={usableDuration()}
          aria-valuenow={musicState.currentTime}
          class="flex-1 relative flex items-center h-4 group cursor-pointer select-none"
          onpointerdown={handleSeekPointerDown}
          onpointermove={handleSeekPointerMove}
          onpointerup={handleSeekPointerUp}
          onpointercancel={handleSeekPointerUp}
          onkeydown={(event) => {
            const duration = usableDuration();
            if (duration <= 0) return;
            if (event.key === "ArrowRight") {
              event.preventDefault();
              musicState.seek(musicState.currentTime + 5);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              musicState.seek(musicState.currentTime - 5);
            }
          }}
        >
          <div class="w-full h-1 bg-[#404040] rounded-full overflow-hidden pointer-events-none">
            <div
              class="h-full bg-[#3ae0d5]"
              style="width: {progressPercent}%"
            ></div>
          </div>
          <div
            class="absolute h-3 w-3 rounded-full bg-[#3ae0d5] shadow-sm transform -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style="left: {progressPercent}%"
          ></div>
        </div>
        <span class="w-8 md:w-10 text-left tabular-nums">{formatTime(usableDuration())}</span>
      </div>
    </div>

    <!-- Right: Extra Controls -->
    <div class="flex items-center justify-end gap-0.5 md:gap-1 shrink-0 basis-[30%] max-w-[40%] text-[#a0a0a0]">
      <div class="hidden sm:contents">
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button.Root
              variant="ghost"
              size="icon"
              class="h-9 w-9 hover:text-white rounded-full"
              onclick={() => musicState.togglePublishModal()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4.5 w-4.5"
                ><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg
              >
            </Button.Root>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <p>Publish</p>
          </Tooltip.Content>
        </Tooltip.Root>
        <Button.Root
          variant="ghost"
          size="icon"
          class="h-9 w-9 hover:text-white rounded-full"
          onclick={() => void shareCurrentTrack()}
          aria-label="Compartir canción"
          title="Compartir"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4.5 w-4.5"
            ><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle
              cx="18"
              cy="19"
              r="3"
            /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line
              x1="15.41"
              x2="8.59"
              y1="6.51"
              y2="10.49"
            /></svg
          >
        </Button.Root>
        <button
          type="button"
          class="h-9 w-9 hover:text-white rounded-full inline-flex items-center justify-center"
          aria-label="Agregar a playlist"
          title="Agregar a playlist"
          onclick={() => (playlistOpen = true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4.5 w-4.5"
            ><line x1="21" x2="3" y1="6" y2="6" /><line
              x1="21"
              x2="9"
              y1="12"
              y2="12"
            /><line x1="21" x2="7" y1="18" y2="18" /><path d="M3 16v5" /><path
              d="M5 18H1"
            /></svg
          >
        </button>
        <TrackOptionsMenu
          song={{
            id: activeTrack.id,
            title: activeTrack.title,
            videoUrl: activeTrack.videoUrl,
            imageUrl: activeTrack.imageUrl,
            durationMs: activeTrack.durationMs
          }}
          side="top"
          showClosePlayer
          buttonClass="h-9 w-9 hover:text-white"
        />
      </div>
      <Button.Root
        variant="ghost"
        size="icon"
        class="h-9 w-9 hover:text-white rounded-full"
        aria-label="Cerrar reproductor"
        onclick={() => musicState.closePlayer()}
      >
        <X class="h-4.5 w-4.5" />
      </Button.Root>
    </div>
  </div>

<PublishModal />
<AddToPlaylistDialog
  bind:open={playlistOpen}
  musicId={activeTrack?.id}
  title={activeTrack?.title}
/>
