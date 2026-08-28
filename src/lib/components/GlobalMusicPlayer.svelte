<script lang="ts">
  import { getContext } from "svelte";
  import { page } from "$app/state";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
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

  const musicState = getContext<GlobalMusicState>("musicState");

  let audioElement: HTMLAudioElement;
  let seekBar: HTMLDivElement | undefined;
  let isSeeking = $state(false);
  let playlistOpen = $state(false);
  let lastHandledPlayId = $state<string | null>(null);

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
    const fromTrack = (musicState.currentTrack?.durationMs ?? 0) / 1000;
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
    if (audioElement && musicState.currentTrack) {
      musicState.audioElement = audioElement;
      audioElement.volume = musicState.volume;
    }
  });

  $effect(() => {
    if (!audioElement || !musicState.currentTrack || isSeeking) return;
    if (musicState.isPlaying && audioElement.paused) {
      audioElement.play().catch((e) => console.error("Playback failed:", e));
    } else if (!musicState.isPlaying && !audioElement.paused) {
      audioElement.pause();
    }
  });
</script>

<audio
  bind:this={audioElement}
  src={musicState.currentTrack?.url || ""}
  preload="auto"
  ontimeupdate={handleTimeUpdate}
  onloadedmetadata={syncDuration}
  ondurationchange={syncDuration}
  oncanplay={syncDuration}
  onended={handleEnded}
></audio>
{#if musicState.currentTrack}
  <!-- The floating player pill -->
  <div
    class="fixed bottom-6 left-6 z-50 flex items-center px-4 justify-between h-[88px] bg-[#1c1c1c] text-white rounded-2xl shadow-2xl transition-all duration-300 border border-white/5 {musicState.isExpanded ? 'right-[370px]' : 'right-6'}"
  >
    <!-- Left: Track Info -->
    <div class="flex items-center gap-4 w-[28%] min-w-0 max-w-xs">
      <button
        type="button"
        class="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center relative group cursor-pointer border-none p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        onclick={() => musicState.toggleExpanded()}
      >
        {#if musicState.currentTrack.imageUrl}
          <img
            src={musicState.currentTrack.imageUrl}
            alt="Cover art"
            class="h-full w-full object-cover"
          />
        {:else}
          <ImageIcon class="h-6 w-6 text-muted-foreground" />
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
          class="text-sm font-bold truncate cursor-pointer hover:underline text-white border-none p-0 bg-transparent text-left outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          onclick={() => musicState.toggleExpanded()}
        >
          {musicState.currentTrack.title}
        </button>
        {#if musicState.currentTrack.artist}
          <span class="text-xs text-[#a0a0a0] truncate mt-0.5"
            >{musicState.currentTrack.artist}</span
          >
        {/if}
      </div>
    </div>

    <!-- Center: Controls -->
    <div
      class="flex flex-col items-center justify-center flex-1 min-w-[180px] px-4 gap-1.5"
    >
      <div class="flex items-center gap-6">
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
          onclick={() => musicState.togglePlay()}
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
          class="h-8 w-8 text-[#a0a0a0] hover:text-white rounded-full ml-2"
        >
          <!-- Repeat icon placeholder, using lucide refresh-cw or similar -->
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

      <!-- Progress Bar -->
      <div
        class="flex items-center gap-3 w-full text-[11px] text-[#a0a0a0] font-mono mt-1"
      >
        <span class="w-10 text-right">{formatTime(musicState.currentTime)}</span
        >
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
          <!-- Custom track -->
          <div class="w-full h-1 bg-[#404040] rounded-full overflow-hidden pointer-events-none">
            <!-- Fill -->
            <div
              class="h-full bg-[#3ae0d5]"
              style="width: {progressPercent}%"
            ></div>
          </div>
          <!-- Custom thumb -->
          <div
            class="absolute h-3 w-3 rounded-full bg-[#3ae0d5] shadow-sm transform -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style="left: {progressPercent}%"
          ></div>
        </div>
        <span class="w-10 text-left">{formatTime(usableDuration())}</span>
      </div>
    </div>

    <!-- Right: Extra Controls -->
    <div class="flex items-center justify-end gap-1 w-auto shrink-0 text-[#a0a0a0]">
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button.Root
            variant="ghost"
            size="icon"
            class="h-9 w-9 hover:text-white rounded-full"
            onclick={() => musicState.togglePublishModal()}
          >
            <!-- Send icon -->
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
      >
        <!-- Share icon -->
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
      <Button.Root
        variant="ghost"
        size="icon"
        class="h-9 w-9 hover:text-white rounded-full"
      >
        <!-- Heart icon -->
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
          ><path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          /></svg
        >
      </Button.Root>
      <TrackOptionsMenu
        song={{
          id: musicState.currentTrack.id,
          title: musicState.currentTrack.title,
          videoUrl: musicState.currentTrack.videoUrl,
          imageUrl: musicState.currentTrack.imageUrl,
          durationMs: musicState.currentTrack.durationMs
        }}
        side="top"
        showClosePlayer
        buttonClass="h-9 w-9 hover:text-white"
      />
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
{/if}

<PublishModal />
<AddToPlaylistDialog
  bind:open={playlistOpen}
  musicId={musicState.currentTrack?.id}
  title={musicState.currentTrack?.title}
/>
