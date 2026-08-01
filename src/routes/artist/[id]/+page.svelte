<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.artist.userName || 'Artist'} - QAMUZ</title>
</svelte:head>

<div class="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8">
  <section class="rounded-2xl border border-border bg-card p-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-2">
        <h1 class="text-3xl font-bold tracking-tight">{data.artist.userName || 'Artist profile'}</h1>
        <p class="text-sm text-muted-foreground">{data.artist.bio || 'No bio yet.'}</p>
      </div>
      <div class="text-sm">
        {#if data.artist.verifiedAt}
          <span class="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-600">Verified Artist</span>
        {:else}
          <span class="inline-flex rounded-full bg-zinc-500/15 px-3 py-1 font-semibold text-zinc-500">Unverified Artist</span>
        {/if}
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Public Tracks</h2>
    {#if data.tracks.length === 0}
      <div class="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        This artist has no published tracks yet.
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.tracks as track}
          <article class="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 class="font-semibold">{track.title || 'Untitled track'}</h3>
            <p class="text-xs text-muted-foreground">{track.genre || 'Unknown genre'}</p>
            <p class="text-xs text-muted-foreground">{track.playsCount} plays · {track.likesCount} likes</p>
          </article>
        {/each}
      </div>
    {/if}
  </section>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Public Playlists</h2>
    {#if data.publicPlaylists.length === 0}
      <div class="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
        This artist has no public playlists yet.
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#each data.publicPlaylists as playlist}
          <a href={`/playlist/${playlist.id}`} class="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
            <h3 class="font-semibold">{playlist.name}</h3>
            <p class="text-sm text-muted-foreground">{playlist.description || 'No description'}</p>
          </a>
        {/each}
      </div>
    {/if}
  </section>
</div>
