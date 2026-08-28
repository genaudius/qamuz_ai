<script lang="ts">
  import { getContext } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import Play from "@lucide/svelte/icons/play";
  import MusicIcon from "@lucide/svelte/icons/music";
  import PanelRightClose from "@lucide/svelte/icons/panel-right-close";
  import * as Table from "$lib/components/ui/table/index.js";
  import TrackOptionsMenu from "$lib/components/TrackOptionsMenu.svelte";
  
  let { songs = [] } = $props<{ songs: any[] }>();
  
  const musicState = getContext<GlobalMusicState>("musicState");
  
  // Track if the sidebar should be open (user preference in this session)
  let sidebarOpen = $state(true);
  
  function playSong(song: any) {
    if (song.status && song.status !== 'completed') {
      return;
    }

    const track = {
        id: song.id,
        url: `/api/music/${song.id}`,
        title: song.prompt?.substring(0, 50) || "Generated Track",
        imageUrl: song.imageUrl,
        videoUrl: song.videoUrl,
        lyrics: song.lyrics,
        durationMs: song.durationMs
    };
    
    musicState.playTrack(track);
    sidebarOpen = true; // Auto-open sidebar when playing a track
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  }
</script>

<div class="h-full w-full overflow-hidden flex flex-col bg-background/50">
  <div class="flex-1 overflow-y-auto px-4 py-6 md:px-6 custom-scrollbar">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">Library</h2>
        {#if musicState && musicState.musicSubMode !== 'custom'}
          <button 
            class="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/50 transition-colors"
            onclick={() => musicState.showLibrary = false}
            title="Close Library"
          >
            <PanelRightClose class="w-5 h-5" />
          </button>
        {/if}
      </div>
      
      {#if songs.length === 0}
          <div class="text-center py-20 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
              <MusicIcon class="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p class="text-lg">No songs created yet.</p>
              <p class="text-sm mt-2">Generate some music to see it here!</p>
          </div>
      {:else}
          <div class="rounded-md border bg-card/60 backdrop-blur-sm">
            <Table.Root>
              <Table.Header>
                <Table.Row class="hover:bg-transparent">
                  <Table.Head class="w-[40px] text-center">#</Table.Head>
                  <Table.Head>Title</Table.Head>
                  <Table.Head class="text-right pr-4">Date Added</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each songs as song, index}
                  {@const isPlayingThis = musicState.currentTrack?.id === song.id}
                  {@const isPending = song.status && song.status !== 'completed'}
                  <Table.Row class={`group border-b/50 ${isPending ? 'cursor-default opacity-90' : 'cursor-pointer'} ${isPlayingThis ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/50'}`} onclick={() => playSong(song)}>
                    <Table.Cell class="font-medium relative w-[40px] text-center px-2">
                      {#if isPending}
                          <div class="flex items-center justify-center">
                            <div class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                          </div>
                      {:else if isPlayingThis && musicState.isPlaying}
                          <!-- Animated playing indicator -->
                          <div class="flex gap-[2px] items-end h-4 w-4 mx-auto justify-center">
                              <div class="w-[3px] bg-primary animate-bounce h-full"></div>
                              <div class="w-[3px] bg-primary animate-bounce h-2/3" style="animation-delay: 150ms"></div>
                              <div class="w-[3px] bg-primary animate-bounce h-1/2" style="animation-delay: 300ms"></div>
                          </div>
                      {:else}
                          <!-- Index or Play Icon (on hover) -->
                          <div class="flex items-center justify-center">
                            <span class={`text-muted-foreground group-hover:hidden ${isPlayingThis ? 'text-primary' : ''}`}>{index + 1}</span>
                            <Play class={`w-4 h-4 hidden group-hover:block ${isPlayingThis ? 'text-primary fill-primary' : 'text-foreground'}`} />
                          </div>
                      {/if}
                    </Table.Cell>
                    
                    <Table.Cell class="px-2">
                      <div class="flex items-center gap-3 py-1">
                        <!-- Tiny thumbnail for the list -->
                        <div class="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {#if song.imageUrl}
                                <img src={song.imageUrl} alt="Thumbnail" class="w-full h-full object-cover" />
                            {:else}
                                <MusicIcon class="w-5 h-5 text-muted-foreground/50" />
                            {/if}
                        </div>
                        <!-- Track details -->
                        <div class="flex flex-col min-w-0 pr-2">
                            <span class={`font-medium truncate leading-tight ${isPlayingThis ? 'text-primary' : 'text-foreground'}`} title={song.prompt}>{song.prompt || "Generated Track"}</span>
                            {#if isPending}
                                <span class="text-xs text-amber-500 mt-0.5 px-1.5 py-0.5 rounded-sm bg-amber-500/10 w-fit">Creating...</span>
                            {:else if song.isInstrumental}
                                <span class="text-xs text-muted-foreground mt-0.5 px-1.5 py-0.5 rounded-sm bg-muted/50 w-fit">Instrumental</span>
                            {/if}
                        </div>
                      </div>
                    </Table.Cell>
                    
                    <Table.Cell class="text-right pr-4 px-2">
                      {#if isPending}
                        <span class="text-sm text-amber-500">Working...</span>
                      {:else}
                        <div class="flex items-center justify-end gap-1">
                          <TrackOptionsMenu
                            song={{
                              id: song.id,
                              title: song.title,
                              prompt: song.prompt,
                              genre: song.genre,
                              isInstrumental: song.isInstrumental,
                              videoUrl: song.videoUrl,
                              imageUrl: song.imageUrl
                            }}
                            buttonClass="text-muted-foreground hover:text-foreground opacity-100"
                          />
                          <span class="text-sm text-muted-foreground min-w-16">{formatDate(song.createdAt)}</span>
                        </div>
                      {/if}
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
      {/if}
  </div>
</div>

<style>
/* Custom scrollbar for the panel */
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
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.5);
}
</style>
