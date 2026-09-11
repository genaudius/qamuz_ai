<script lang="ts">
  import LibraryPanel from "$lib/components/LibraryPanel.svelte";
  import AddToPlaylistDialog from "$lib/components/AddToPlaylistDialog.svelte";
  import ListMusic from "@lucide/svelte/icons/list-music";
  import Plus from "@lucide/svelte/icons/plus";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  
  let { data } = $props();

  let activeTab = $state<'songs' | 'playlists' | 'artists'>('songs');
  let createPlaylistOpen = $state(false);
  let followedArtists = $state<Array<{
    id: string;
    userId: string;
    name: string;
    avatarUrl: string;
    trackCount: number;
  }>>([]);
  let loadingArtists = $state(false);

  let myPlaylists = $state<Array<{
    id: string;
    name: string;
    updatedAt: string;
    trackCount: number;
  }>>([]);
  let loadingPlaylists = $state(false);

  async function loadFollowedArtists() {
    loadingArtists = true;
    try {
      const res = await fetch('/api/artists/following');
      if (res.ok) {
        const payload = await res.json();
        followedArtists = Array.isArray(payload?.artists) ? payload.artists : [];
      }
    } catch {
      // ignore
    } finally {
      loadingArtists = false;
    }
  }

  async function loadPlaylists() {
    loadingPlaylists = true;
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const payload = await res.json();
        myPlaylists = Array.isArray(payload?.playlists) ? payload.playlists : [];
      }
    } catch {
      // ignore
    } finally {
      loadingPlaylists = false;
    }
  }

  async function unfollowArtist(artist: { id: string; userId: string; name: string }) {
    try {
      const res = await fetch('/api/artists/following', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistUserId: artist.userId || artist.id, action: 'unfollow' }),
      });
      if (res.ok) {
        followedArtists = followedArtists.filter((a) => a.id !== artist.id && a.userId !== artist.userId);
        toast.success(`Has quitado a ${artist.name} de tu lista`);
      } else {
        toast.error('No se pudo quitar de la lista');
      }
    } catch {
      toast.error('Error de comunicación con el servidor');
    }
  }

  onMount(() => {
    void loadFollowedArtists();
    void loadPlaylists();
  });
</script>

<svelte:head>
  <title>Tu Biblioteca — QAMUZ</title>
</svelte:head>

<div class="flex h-full w-full pb-24 overflow-hidden relative">
  <div class="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8 h-[calc(100vh-6rem)]">
    <!-- Header Tabs -->
    <div class="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800/80 flex-wrap">
      <div class="flex items-center gap-2 bg-zinc-900/90 p-1 rounded-full border border-zinc-800 flex-wrap">
        <button
          type="button"
          onclick={() => (activeTab = 'songs')}
          class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {activeTab === 'songs' ? 'bg-qamuz-btn text-black shadow-md' : 'text-zinc-400 hover:text-white'}"
        >
          Mis Canciones ({data.songs?.length || 0})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'playlists')}
          class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {activeTab === 'playlists' ? 'bg-qamuz-btn text-black shadow-md' : 'text-zinc-400 hover:text-white'}"
        >
          Mis Playlists ({myPlaylists.length})
        </button>
        <button
          type="button"
          onclick={() => (activeTab = 'artists')}
          class="px-4 py-1.5 rounded-full text-xs font-bold transition-all {activeTab === 'artists' ? 'bg-qamuz-btn text-black shadow-md' : 'text-zinc-400 hover:text-white'}"
        >
          Artistas que sigo ({followedArtists.length})
        </button>
      </div>

      {#if activeTab === 'playlists'}
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all shadow-sm"
          onclick={() => (createPlaylistOpen = true)}
        >
          <Plus class="h-4 w-4" />
          Nueva Playlist
        </button>
      {/if}
    </div>

    {#if activeTab === 'songs'}
      <LibraryPanel songs={data.songs} />
    {:else if activeTab === 'playlists'}
      <!-- Playlists View -->
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-bold text-white">Tus Playlists</h2>
          <p class="text-xs text-zinc-400 mt-1">Organiza tus canciones, cambia su orden y escúchalas en reproducción continua o aleatoria.</p>
        </div>

        {#if loadingPlaylists}
          <div class="py-12 text-center text-zinc-400 text-sm">
            Cargando playlists...
          </div>
        {:else if myPlaylists.length === 0}
          <div class="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center max-w-md mx-auto">
            <div class="w-14 h-14 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto mb-4 text-2xl">
              🎵
            </div>
            <h3 class="text-white font-bold text-base mb-1">Aún no tienes ninguna playlist</h3>
            <p class="text-xs text-zinc-400 mb-5">
              Crea tu primera lista para organizar tus creaciones favoritas y disfrutar de reproducción continua.
            </p>
            <button
              type="button"
              onclick={() => (createPlaylistOpen = true)}
              class="inline-flex items-center gap-2 bg-qamuz-btn text-black font-extrabold text-xs px-5 py-2.5 rounded-full hover:scale-105 transition-all shadow-md"
            >
              <Plus class="h-4 w-4" />
              Crear Playlist
            </button>
          </div>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {#each myPlaylists as pl}
              <a
                href={`/playlist/${pl.id}`}
                class="spotify-card p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/90 transition-all flex flex-col justify-between gap-4 group"
              >
                <div class="flex items-start gap-4">
                  <div class="w-14 h-14 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ListMusic class="h-7 w-7 text-emerald-400" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <h4 class="font-bold text-base truncate text-white group-hover:text-qamuz-primary transition-colors">
                      {pl.name}
                    </h4>
                    <span class="text-xs text-zinc-400 block mt-1">
                      {pl.trackCount} {pl.trackCount === 1 ? 'canción' : 'canciones'}
                    </span>
                  </div>
                </div>

                <div class="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                  <span>Abrir lista</span>
                  <span class="text-white/40 group-hover:text-white transition-colors">➔</span>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {:else}
      <!-- Followed Artists View -->
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-bold text-white">Artistas que sigues</h2>
          <p class="text-xs text-zinc-400 mt-1">Aquí puedes ver los artistas que has guardado en tu lista y dejar de seguirlos cuando desees.</p>
        </div>

        {#if loadingArtists}
          <div class="py-12 text-center text-zinc-400 text-sm">
            Cargando artistas...
          </div>
        {:else if followedArtists.length === 0}
          <div class="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center max-w-md mx-auto">
            <div class="w-14 h-14 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto mb-4 text-2xl">
              🎤
            </div>
            <h3 class="text-white font-bold text-base mb-1">No estás siguiendo a ningún artista</h3>
            <p class="text-xs text-zinc-400 mb-5">
              Explora los artistas de la plataforma y síguelos para tenerlos siempre a mano aquí en tu biblioteca.
            </p>
            <a
              href="/"
              class="inline-block bg-qamuz-btn text-black font-extrabold text-xs px-5 py-2.5 rounded-full hover:scale-105 transition-all shadow-md"
            >
              Explorar Artistas
            </a>
          </div>
        {:else}
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {#each followedArtists as artist}
              <div class="spotify-card p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 transition-all flex flex-col items-center text-center gap-3 group relative">
                <a href={`/artist/${artist.id}`} class="flex flex-col items-center text-center gap-2.5 w-full">
                  <div class="relative w-28 h-28 rounded-full overflow-hidden shadow-xl bg-zinc-800 border border-zinc-700/50">
                    <img
                      src={artist.avatarUrl}
                      alt={artist.name}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div class="w-full min-w-0">
                    <h4 class="font-bold text-sm truncate text-white group-hover:text-qamuz-primary transition-colors">
                      {artist.name}
                    </h4>
                    <span class="text-[11px] text-zinc-400 block mt-0.5">
                      {artist.trackCount} {artist.trackCount === 1 ? 'canción' : 'canciones'}
                    </span>
                  </div>
                </a>

                <div class="flex flex-col w-full gap-2 pt-1 border-t border-zinc-800/60">
                  <a
                    href={`/artist/${artist.id}`}
                    class="w-full text-center text-xs font-semibold py-1 rounded-md bg-white/5 hover:bg-white/10 text-white transition-all"
                  >
                    Ver Perfil
                  </a>
                  <button
                    type="button"
                    onclick={() => unfollowArtist(artist)}
                    class="w-full text-center text-xs font-bold py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="Dejar de seguir y quitar de mi lista"
                  >
                    <span>✕</span>
                    <span>Dejar de seguir</span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<AddToPlaylistDialog
  bind:open={createPlaylistOpen}
  onclose={() => void loadPlaylists()}
/>
