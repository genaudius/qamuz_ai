<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getContext, onMount } from 'svelte';
  import type { GlobalMusicState } from '$lib/stores/music.svelte.js';
  import TrackOptionsMenu from '$lib/components/TrackOptionsMenu.svelte';
  import { PlayIcon } from '$lib/icons/index.js';

  const musicState = getContext<GlobalMusicState>('musicState');

  type DiscoverTrack = {
    id: string;
    title: string;
    artist: string;
    coverUrl: string;
    durationMs: number;
    url: string;
    videoUrl?: string;
    lyrics?: string;
    genre?: string | null;
  };

  let tracks = $state<DiscoverTrack[]>([]);
  let genres = $state<string[]>([]);
  let loading = $state(true);
  let selectedGenre = $state('');

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  async function loadGenres() {
    const response = await fetch('/api/home/genres');
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    genres = Array.isArray(payload?.genres) ? payload.genres : [];
  }

  async function loadTracks(genre = '') {
    loading = true;
    try {
      const params = new URLSearchParams({ limit: '48' });
      if (genre) params.set('genre', genre);
      const response = await fetch(`/api/home/trending?${params}`);
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      const rows = Array.isArray(payload?.tracks) ? payload.tracks : [];
      tracks = rows.map((track: any) => ({
        id: track.id,
        title: track.title || 'Untitled',
        artist: track.artistName || 'Unknown',
        coverUrl: track.imageUrl || 'https://dummyimage.com/400x400/111/fff&text=QAMUZ',
        durationMs: track.durationMs || 200000,
        url: track.url || `/api/music/${track.id}`,
        videoUrl: track.videoUrl || undefined,
        lyrics: track.lyrics || undefined,
        genre: track.genre || null
      }));
    } finally {
      loading = false;
    }
  }

  function selectGenre(genre: string) {
    selectedGenre = genre;
    const next = new URL(page.url);
    if (genre) next.searchParams.set('genre', genre);
    else next.searchParams.delete('genre');
    goto(`${next.pathname}${next.search}`, { replaceState: true, noScroll: true });
    void loadTracks(genre);
  }

  function playTrack(track: DiscoverTrack) {
    if (!UUID_RE.test(track.id)) return;
    const url = track.url || `/api/music/${track.id}`;
    if (musicState.currentTrack?.id === track.id) {
      void musicState.togglePlay();
      return;
    }
    void musicState.playTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      imageUrl: track.coverUrl,
      url,
      videoUrl: track.videoUrl,
      lyrics: track.lyrics,
      durationMs: track.durationMs
    });
  }

  onMount(() => {
    selectedGenre = page.url.searchParams.get('genre')?.trim().toLowerCase() || '';
    void loadGenres();
    void loadTracks(selectedGenre);
  });
</script>

<svelte:head>
  <title>Discover — QAMUZ</title>
</svelte:head>

<div class="flex flex-col gap-8 pb-16 p-4 lg:p-8 animate-fade-in">
  <div>
    <h1 class="text-3xl font-extrabold text-white mb-2">Discover</h1>
    <p class="text-sm text-zinc-400 max-w-2xl">
      Public tracks from the QAMUZ community. Publish your songs to appear here.
    </p>
  </div>

  {#if genres.length > 0}
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        onclick={() => selectGenre('')}
        class="px-4 py-1.5 rounded-full text-xs font-bold transition-colors {selectedGenre ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-qamuz-btn text-black'}"
      >
        All
      </button>
      {#each genres as genre}
        <button
          type="button"
          onclick={() => selectGenre(genre)}
          class="px-4 py-1.5 rounded-full text-xs font-bold transition-colors {selectedGenre === genre ? 'bg-qamuz-btn text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}"
        >
          {genre.charAt(0).toUpperCase() + genre.slice(1)}
        </button>
      {/each}
    </div>
  {/if}

  {#if loading}
    <p class="text-zinc-400 text-sm">Loading tracks…</p>
  {:else if tracks.length === 0}
    <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
      <p class="text-white font-semibold mb-2">No public tracks yet</p>
      <p class="text-sm text-zinc-400 mb-5">
        Publish a track from your library to seed Discover and Trending.
      </p>
      <button
        type="button"
        onclick={() => goto('/library')}
        class="bg-qamuz-btn text-black font-bold text-sm px-5 py-2.5 rounded-full"
      >
        Go to Library
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {#each tracks as track}
        {@const isCurrent = musicState.currentTrack?.id === track.id}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          onclick={() => playTrack(track)}
          class="spotify-card p-3.5 rounded-lg flex flex-col gap-3 group cursor-pointer relative"
        >
          <div class="relative aspect-square w-full rounded-md overflow-hidden shadow-lg bg-zinc-800">
            <img src={track.coverUrl} alt={track.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <button
              onclick={(e) => {
                e.stopPropagation();
                playTrack(track);
              }}
              class="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-qamuz-btn text-black flex items-center justify-center shadow-2xl transition-all duration-200 {isCurrent && musicState.isPlaying ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95'}"
            >
              <PlayIcon class="w-5 h-5 fill-current ml-0.5" />
            </button>
          </div>
          <div class="flex flex-col gap-1 min-w-0">
            <span class="font-bold text-sm truncate {isCurrent ? 'text-qamuz-primary' : 'text-white'}">{track.title}</span>
            <span class="text-xs truncate text-zinc-400">{track.artist}</span>
          </div>
          <div class="absolute top-2 right-2 z-10" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
            <TrackOptionsMenu
              song={{
                id: track.id,
                title: track.title,
                imageUrl: track.coverUrl,
                videoUrl: track.videoUrl,
                durationMs: track.durationMs
              }}
              buttonClass="bg-black/55 text-white opacity-100"
            />
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
