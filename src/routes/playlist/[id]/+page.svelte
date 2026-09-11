<script lang="ts">
  import { getContext } from 'svelte';
  import type { PageData } from './$types';
  import type { GlobalMusicState } from '$lib/stores/music.svelte.js';
  import Play from '@lucide/svelte/icons/play';
  import Shuffle from '@lucide/svelte/icons/shuffle';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import TrackOptionsMenu from '$lib/components/TrackOptionsMenu.svelte';
  import { toast } from 'svelte-sonner';

  let { data }: { data: PageData } = $props();
  const musicState = getContext<GlobalMusicState>('musicState');

  let tracks = $state([...data.tracks]);
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let isSavingOrder = $state(false);

  $effect(() => {
    tracks = [...data.tracks];
  });

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
    const playerTracks = tracks.map(toPlayerTrack);
    const index = playerTracks.findIndex((t) => t.id === track.id);
    void musicState.playQueue(playerTracks, index >= 0 ? index : 0, musicState.isShuffle);
  }

  function playAll() {
    if (tracks.length === 0 || !musicState) return;
    void musicState.playQueue(tracks.map(toPlayerTrack), 0, false);
  }

  function playShuffle() {
    if (tracks.length === 0 || !musicState) return;
    void musicState.playQueue(tracks.map(toPlayerTrack), 0, true);
  }

  // --- Reordenamiento y Drag-and-Drop ---

  async function persistOrder(updatedTracks: typeof tracks) {
    if (!data.isOwner || isSavingOrder) return;
    isSavingOrder = true;
    try {
      const response = await fetch(`/api/playlists/${data.playlist.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedMusicIds: updatedTracks.map((t) => t.id) })
      });
      if (response.ok) {
        if (musicState) {
          musicState.reorderQueue(updatedTracks.map(toPlayerTrack));
        }
        toast.success('Orden de la playlist guardado');
      } else {
        toast.error('No se pudo guardar el nuevo orden');
      }
    } catch {
      toast.error('Error al guardar el orden de la playlist');
    } finally {
      isSavingOrder = false;
    }
  }

  function moveTrack(fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= tracks.length) return;
    const reordered = [...tracks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    tracks = reordered;
    void persistOrder(reordered);
  }

  function handleDragStart(event: DragEvent, index: number) {
    if (!data.isOwner) return;
    draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(event: DragEvent, index: number) {
    if (!data.isOwner || draggedIndex === null) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    if (!data.isOwner || draggedIndex === null || draggedIndex === targetIndex) {
      draggedIndex = null;
      dragOverIndex = null;
      return;
    }

    const reordered = [...tracks];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    tracks = reordered;
    draggedIndex = null;
    dragOverIndex = null;
    void persistOrder(reordered);
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
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
        {#if tracks[0]?.imageUrl || data.playlist.ownerImage}
          <img
            src={tracks[0]?.imageUrl || data.playlist.ownerImage}
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
          By {data.playlist.ownerName || 'Unknown artist'} · {tracks.length}
          {tracks.length === 1 ? 'canción' : 'canciones'}
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="inline-flex min-w-32 items-center justify-center gap-2 rounded-full bg-qamuz-btn px-6 py-3 text-sm font-extrabold text-black transition-all hover:scale-105 disabled:opacity-50"
            disabled={tracks.length === 0}
            onclick={playAll}
          >
            <Play class="h-4 w-4 fill-current" />
            Play en orden
          </button>
          <button
            type="button"
            class="inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/15 hover:scale-105 disabled:opacity-50"
            disabled={tracks.length === 0}
            onclick={playShuffle}
          >
            <Shuffle class="h-4 w-4" />
            Aleatorio
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
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-2xl font-black tracking-tight">Canciones</h2>
          {#if data.isOwner && tracks.length > 1}
            <p class="text-xs text-white/55 mt-0.5">
              💡 Arrastra las canciones con el icono ⋮⋮ o usa las flechas para reordenar tu lista.
            </p>
          {/if}
        </div>
      </div>

      {#if tracks.length === 0}
        <div class="spotify-card rounded-2xl p-5 text-sm text-white/55">
          {data.isOwner
            ? 'Esta playlist todavía no tiene canciones.'
            : 'No public tracks in this playlist yet.'}
        </div>
      {:else}
        <div class="overflow-hidden rounded-2xl border border-white/8 bg-black/16 divide-y divide-white/5">
          {#each tracks as track, index}
            {@const isPlayingThis = musicState?.currentTrack?.id === track.id}
            {@const isDraggingThis = draggedIndex === index}
            {@const isTargetThis = dragOverIndex === index}
            <div
              class="group grid w-full cursor-pointer grid-cols-[auto_32px_minmax(0,1fr)_auto_32px] items-center gap-2.5 px-3 py-2.5 text-left transition-all hover:bg-white/6 sm:grid-cols-[auto_40px_56px_minmax(0,1fr)_auto_auto] sm:px-4 {isPlayingThis ? 'bg-white/8' : ''} {isDraggingThis ? 'opacity-40 scale-[0.99]' : ''} {isTargetThis ? 'border-t-2 border-[#3ae0d5] bg-white/10' : ''}"
              role="button"
              tabindex="0"
              draggable={data.isOwner}
              ondragstart={(e) => handleDragStart(e, index)}
              ondragover={(e) => handleDragOver(e, index)}
              ondragenter={(e) => handleDragOver(e, index)}
              ondragleave={handleDragLeave}
              ondrop={(e) => handleDrop(e, index)}
              ondragend={handleDragEnd}
              onclick={() => playTrack(track)}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  playTrack(track);
                }
              }}
            >
              <!-- Tirador Drag & Drop o número -->
              {#if data.isOwner}
                <div class="flex items-center gap-1">
                  <div
                    class="cursor-grab active:cursor-grabbing p-1 text-white/40 hover:text-white transition-colors"
                    title="Arrastrar para mover"
                  >
                    <GripVertical class="h-4 w-4" />
                  </div>
                  <div class="flex flex-col sm:hidden">
                    <button
                      type="button"
                      class="p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                      disabled={index === 0}
                      onclick={(e) => {
                        e.stopPropagation();
                        moveTrack(index, -1);
                      }}
                      title="Subir"
                    >
                      <ChevronUp class="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      class="p-0.5 text-white/40 hover:text-white disabled:opacity-20"
                      disabled={index === tracks.length - 1}
                      onclick={(e) => {
                        e.stopPropagation();
                        moveTrack(index, 1);
                      }}
                      title="Bajar"
                    >
                      <ChevronDown class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              {/if}

              <div class="text-center text-sm font-bold text-white/65">{index + 1}</div>

              <!-- Carátula pequeña -->
              <div class="hidden h-12 w-12 overflow-hidden rounded-lg bg-white/8 sm:block">
                {#if track.imageUrl || data.playlist.ownerImage}
                  <img
                    src={track.imageUrl || data.playlist.ownerImage}
                    alt={track.title || track.prompt || 'Track'}
                    class="h-full w-full object-cover"
                  />
                {/if}
              </div>

              <!-- Título e info -->
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

              <!-- Duración -->
              <div class="text-xs text-white/55 whitespace-nowrap">
                {formatDuration(track.durationMs) || `${track.playsCount || 0} plays`}
              </div>

              <!-- Botones mover en Desktop para el dueño -->
              {#if data.isOwner}
                <div class="hidden sm:flex items-center gap-0.5" onclick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    class="h-7 w-7 rounded-md bg-white/5 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition-colors disabled:opacity-20 disabled:pointer-events-none"
                    disabled={index === 0}
                    onclick={() => moveTrack(index, -1)}
                    title="Mover arriba"
                  >
                    <ChevronUp class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="h-7 w-7 rounded-md bg-white/5 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition-colors disabled:opacity-20 disabled:pointer-events-none"
                    disabled={index === tracks.length - 1}
                    onclick={() => moveTrack(index, 1)}
                    title="Mover abajo"
                  >
                    <ChevronDown class="h-4 w-4" />
                  </button>
                </div>
              {/if}

              <!-- Menú de opciones -->
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
