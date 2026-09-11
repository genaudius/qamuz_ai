<script lang="ts">
  import { getContext } from 'svelte';
  import type { PageData } from './$types';
  import type { GlobalMusicState } from '$lib/stores/music.svelte.js';
  import Play from '@lucide/svelte/icons/play';
  import TrackOptionsMenu from '$lib/components/TrackOptionsMenu.svelte';

  let { data }: { data: PageData } = $props();
  const musicState = getContext<GlobalMusicState>('musicState');

  function formatDuration(durationMs?: number | null) {
    if (!durationMs || durationMs <= 0) return '';
    const totalSeconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function toPlayerTrack(track: PageData['tracks'][number]) {
    return {
      id: track.id,
      url: `/api/music/${track.id}`,
      title: track.title || track.prompt || 'Untitled track',
      artist: data.playlist.ownerName || 'QAMUZ',
      imageUrl: track.imageUrl || data.playlist.ownerImage || undefined,
      videoUrl: track.videoUrl || undefined,
      lyrics: track.lyrics || undefined,
      durationMs: track.durationMs || 0,
    };
  }

  function playTrack(track: PageData['tracks'][number]) {
    if (!musicState) return;
    musicState.queue = data.tracks.map(toPlayerTrack);
    musicState.playTrack(toPlayerTrack(track));
  }

  function playAll() {
    if (data.tracks.length === 0) return;
    playTrack(data.tracks[0]);
  }
</script>

<svelte:head>
  <title>{data.playlist.name} - QAMUZ Playlist</title>
</svelte:head>

<div class="min-h-screen bg-[linear-gradient(180deg,#294d44_0%,#15221e_18%,#101916_40%,#0f1714_100%)] text-white">
  <section class="relative overflow-hidden border-b border-white/8">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_75%_30%,rgba(0,191,99,0.22),transparent_28%)]"></div>
    <div class="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 pb-8 pt-10 sm:px-6 lg:flex-row lg:items-end lg:px-8 lg:pb-10 lg:pt-14">
      <div class="h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-52 sm:w-52">
        {#if data.tracks[0]?.imageUrl || data.playlist.ownerImage}
          <img
            src={data.tracks[0]?.imageUrl || data.playlist.ownerImage}
            alt={data.playlist.name}
            class="h-full w-full object-cover"
          />
        {/if}
      </div>

      <div class="flex-1 space-y-4">
        <div class="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-white/80">
          <span class="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white/75 ring-1 ring-white/15">
            Playlist
          </span>
          {#if data.playlist.isPublic}
            <span class="inline-flex items-center rounded-full bg-emerald-400/18 px-3 py-1 text-emerald-200 ring-1 ring-emerald-300/30">
              Public
            </span>
          {:else}
            <span class="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white/75 ring-1 ring-white/15">
              Private
            </span>
          {/if}
        </div>

        <h1 class="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
          {data.playlist.name}
        </h1>

        <p class="text-sm text-white/70">
          {data.playlist.description || 'Sin descripción'}
        </p>
        <p class="text-sm text-white/55">
          By {data.playlist.ownerName || 'Unknown artist'} · {data.tracks.length}
          {data.tracks.length === 1 ? 'canción' : 'canciones'}
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex min-w-32 items-center justify-center gap-2 rounded-full bg-qamuz-btn px-6 py-3 text-sm font-extrabold text-black transition-all hover:scale-105 disabled:opacity-50"
            disabled={data.tracks.length === 0}
            onclick={playAll}
          >
            <Play class="h-4 w-4 fill-current" />
            Play
          </button>
          <a
            href={`/artist/${data.playlist.ownerId}`}
            class="inline-flex min-w-28 items-center justify-center rounded-full border border-white/16 bg-white/6 px-5 py-3 text-sm font-bold text-white/92 transition-colors hover:bg-white/12"
          >
            Artist profile
          </a>
        </div>
      </div>
    </div>
  </section>

  <div class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <section class="space-y-4">
      <h2 class="text-2xl font-black tracking-tight">Tracks</h2>

      {#if data.tracks.length === 0}
        <div class="spotify-card rounded-2xl p-5 text-sm text-white/55">
          {data.isOwner
            ? 'Esta playlist todavía no tiene canciones.'
            : 'No public tracks in this playlist yet.'}
        </div>
      {:else}
        <div class="overflow-hidden rounded-2xl border border-white/8 bg-black/16">
          {#each data.tracks as track, index}
            {@const isPlayingThis = musicState?.currentTrack?.id === track.id}
            <div
              class="group grid w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto_32px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/6 sm:grid-cols-[40px_64px_minmax(0,1fr)_auto_32px] sm:px-5 {isPlayingThis ? 'bg-white/8' : ''}"
              role="button"
              tabindex="0"
              onclick={() => playTrack(track)}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  playTrack(track);
                }
              }}
            >
              <div class="text-center text-sm font-bold text-white/65">{index + 1}</div>
              <div class="hidden h-14 w-14 overflow-hidden rounded-lg bg-white/8 sm:block">
                {#if track.imageUrl || data.playlist.ownerImage}
                  <img
                    src={track.imageUrl || data.playlist.ownerImage}
                    alt={track.title || track.prompt || 'Track'}
                    class="h-full w-full object-cover"
                  />
                {/if}
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-bold {isPlayingThis ? 'text-[#3ae0d5]' : 'text-white'}">
                  {track.title || track.prompt || 'Untitled track'}
                </div>
                <div class="truncate text-xs text-white/55">
                  {track.isInstrumental ? 'Instrumental release' : 'Generated release'}
                  {#if data.isOwner && !track.isPublic}
                    · Private
                  {/if}
                </div>
              </div>
              <div class="text-xs text-white/55 whitespace-nowrap">
                {formatDuration(track.durationMs) || `${track.playsCount || 0} plays`}
              </div>
              <div onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()}>
                <TrackOptionsMenu
                  song={{
                    id: track.id,
                    title: track.title,
                    prompt: track.prompt,
                    genre: track.genre,
                    isInstrumental: track.isInstrumental,
                    videoUrl: track.videoUrl,
                    imageUrl: track.imageUrl,
                    userId: track.userId
                  }}
                  buttonClass="opacity-100"
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>
