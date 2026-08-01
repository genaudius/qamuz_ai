<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import Play from "@lucide/svelte/icons/play";
  import Pause from "@lucide/svelte/icons/pause";
  import SkipBack from "@lucide/svelte/icons/skip-back";
  import SkipForward from "@lucide/svelte/icons/skip-forward";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Maximize2 from "@lucide/svelte/icons/maximize-2";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import PublishModal from "$lib/components/PublishModal.svelte";
  import * as Button from "$lib/components/ui/button/index.js";

  const musicState = getContext<GlobalMusicState>("musicState");

  let audioElement: HTMLAudioElement;
  let isSeeking = false;

  function handleTimeUpdate() {
    if (audioElement && !isSeeking) {
      musicState.currentTime = audioElement.currentTime;
    }
  }

  function handleLoadedMetadata() {
    if (audioElement) {
      musicState.duration = audioElement.duration;
    }
  }

  function handleEnded() {
    musicState.isPlaying = false;
  }

  function handleSeekStart() {
    isSeeking = true;
  }

  function handleSeekEnd(value: number[]) {
    isSeeking = false;
    musicState.seek(value[0]);
  }

  function formatTime(seconds: number) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  onMount(() => {
    // Reactivity handled by svelte 5 runes
  });

  $effect(() => {
    if (audioElement && musicState.currentTrack) {
      if (musicState.audioElement !== audioElement) {
        musicState.audioElement = audioElement;
        audioElement.volume = musicState.volume;
      }

      // Handle play state sync
      if (musicState.isPlaying && audioElement.paused) {
        audioElement.play().catch((e) => console.error("Playback failed:", e));
      } else if (!musicState.isPlaying && !audioElement.paused) {
        audioElement.pause();
      }
    }
  });
</script>

<audio
  bind:this={audioElement}
  src={musicState.currentTrack?.url || ""}
  ontimeupdate={handleTimeUpdate}
  onloadedmetadata={handleLoadedMetadata}
  onended={handleEnded}
></audio>
{#if musicState.currentTrack}
  <!-- The floating player pill -->
  <div
    class="absolute bottom-6 left-6 z-50 flex items-center px-4 justify-between h-[88px] bg-[#1c1c1c] text-white rounded-2xl shadow-2xl transition-all duration-300 border border-white/5 right-6"
  >
    <!-- Left: Track Info -->
    <div class="flex items-center gap-4 w-1/4 min-w-0">
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
      class="flex flex-col items-center justify-center w-2/4 max-w-2xl px-4 gap-1.5"
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
          class="flex-1 relative flex items-center h-4 group cursor-pointer"
        >
          <input
            type="range"
            min="0"
            max={musicState.duration || 100}
            step="1"
            value={musicState.currentTime}
            oninput={(e) => {
              musicState.currentTime = parseFloat(e.currentTarget.value);
              // handleSeek is not defined, just update current time
              if (audioElement) {
                audioElement.currentTime = musicState.currentTime;
              }
            }}
            onpointerdown={() => handleSeekStart()}
            onpointerup={() => handleSeekEnd([musicState.currentTime])}
            class="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />
          <!-- Custom track -->
          <div class="w-full h-1 bg-[#404040] rounded-full overflow-hidden">
            <!-- Fill -->
            <div
              class="h-full bg-[#3ae0d5]"
              style="width: {(musicState.currentTime /
                (musicState.duration || 1)) *
                100}%"
            ></div>
          </div>
          <!-- Custom thumb -->
          <div
            class="absolute h-3 w-3 rounded-full bg-[#3ae0d5] shadow-sm transform -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style="left: {(musicState.currentTime /
              (musicState.duration || 1)) *
              100}%"
          ></div>
        </div>
        <span class="w-10 text-left">{formatTime(musicState.duration)}</span>
      </div>
    </div>

    <!-- Right: Extra Controls -->
    <div class="flex items-center justify-end gap-1 w-1/4 text-[#a0a0a0]">
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
      <Button.Root
        variant="ghost"
        size="icon"
        class="h-9 w-9 hover:text-white rounded-full"
      >
        <!-- Queue/Playlist icon -->
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
      </Button.Root>
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
      <Button.Root
        variant="ghost"
        size="icon"
        class="h-9 w-9 hover:text-white rounded-full"
        onclick={() => musicState.closePlayer()}
      >
        <!-- More Vertical / Close (Mapping close to more for now or keeping close logic) -->
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
          ><circle cx="12" cy="12" r="1" /><circle
            cx="12"
            cy="5"
            r="1"
          /><circle cx="12" cy="19" r="1" /></svg
        >
      </Button.Root>
    </div>
  </div>
{/if}

<PublishModal />
