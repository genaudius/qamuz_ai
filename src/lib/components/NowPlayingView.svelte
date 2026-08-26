<script lang="ts">
  import { getContext } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import X from "@lucide/svelte/icons/x";
  import * as Button from "$lib/components/ui/button/index.js";
  import { openSongInStudio, openSongStemsInStudio } from "$lib/studio-stems";

  const musicState = getContext<GlobalMusicState>("musicState");

  // Fallback to title if no lyrics, or format them.
  let lyrics = $derived(musicState.currentTrack?.lyrics || "");
  let lines = $derived(lyrics.split('\n').filter(l => l.trim().length > 0));
</script>

<div class="h-full w-full flex flex-col pt-4 overflow-hidden">
  <!-- Top bar -->
  <div class="px-6 flex items-center justify-between mb-4 flex-shrink-0">
    <div class="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Now Playing</div>
    <Button.Root variant="ghost" size="icon-sm" class="h-8 w-8 rounded-full cursor-pointer hover:bg-muted" onclick={() => musicState.toggleExpanded()}>
      <X class="h-4 w-4" />
    </Button.Root>
  </div>

  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
    <!-- Artwork / Video -->
    <div class="w-full flex flex-col items-center justify-center mb-6">
      {#if musicState.currentTrack?.videoUrl}
        <video 
            src={musicState.currentTrack.videoUrl} 
            class="w-full rounded-xl shadow-lg object-cover aspect-square bg-black"
            autoplay 
            muted 
            loop
        ></video>
      {:else if musicState.currentTrack?.imageUrl}
        <img 
            src={musicState.currentTrack.imageUrl} 
            alt="Cover Art" 
            class="w-full aspect-square object-cover rounded-xl shadow-lg" 
        />
      {:else}
        <div class="w-full aspect-square rounded-xl shadow-lg bg-muted flex items-center justify-center">
            <span class="text-muted-foreground text-sm">No Artwork</span>
        </div>
      {/if}
      <div class="mt-4 text-left w-full">
        <h2 class="text-xl font-bold truncate">{musicState.currentTrack?.title || "Unknown Title"}</h2>
        {#if musicState.currentTrack?.artist}
          <p class="text-sm text-muted-foreground truncate">{musicState.currentTrack?.artist}</p>
        {/if}
        {#if musicState.currentTrack?.id}
          <div class="mt-3 flex flex-wrap gap-2">
            <Button.Root
              variant="default"
              size="sm"
              class="cursor-pointer"
              onclick={() => openSongInStudio({
                id: musicState.currentTrack?.id,
                title: musicState.currentTrack?.title
              })}
            >
              Abrir en Studio
            </Button.Root>
            <Button.Root
              variant="outline"
              size="sm"
              class="cursor-pointer"
              onclick={() => openSongStemsInStudio({
                id: musicState.currentTrack?.id,
                title: musicState.currentTrack?.title
              })}
            >
              Extraer stems
            </Button.Root>
          </div>
        {/if}
      </div>
    </div>

    <!-- Lyrics -->
    <div class="bg-muted/30 rounded-xl p-4 min-h-[300px]">
      <div class="text-xs font-semibold uppercase text-muted-foreground mb-4">Lyrics</div>
      {#if lines.length > 0}
        <div class="space-y-4">
          {#each lines as line}
            <p class="text-base font-medium leading-relaxed transition-colors hover:text-primary cursor-pointer text-foreground/80 hover:text-foreground">
              {line}
            </p>
          {/each}
        </div>
      {:else}
        <div class="h-full flex items-center justify-center py-10">
          <p class="text-sm text-muted-foreground italic">No lyrics available</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
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
