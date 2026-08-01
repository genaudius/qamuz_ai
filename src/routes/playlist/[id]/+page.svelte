<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.playlist.name} - QAMUZ Playlist</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-8">
  <section class="rounded-2xl border border-border bg-card p-6">
    <h1 class="text-3xl font-bold tracking-tight">{data.playlist.name}</h1>
    <p class="mt-2 text-sm text-muted-foreground">{data.playlist.description || 'No description'}</p>
    <p class="mt-3 text-xs text-muted-foreground">By {data.playlist.ownerName || 'Unknown artist'}</p>
  </section>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Tracks</h2>
    {#if data.tracks.length === 0}
      <div class="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        No public tracks in this playlist yet.
      </div>
    {:else}
      <div class="space-y-3">
        {#each data.tracks as track}
          <article class="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="font-semibold truncate">{track.position}. {track.title || 'Untitled track'}</p>
              <p class="text-xs text-muted-foreground">{track.genre || 'Unknown genre'}</p>
            </div>
            <div class="text-xs text-muted-foreground whitespace-nowrap">
              {track.playsCount} plays · {track.likesCount} likes
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</div>
