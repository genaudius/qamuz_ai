<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import {
    PlayIcon,
    SparkleIcon,
  } from "$lib/icons/index.js";
  import HeroCarousel from "./HeroCarousel.svelte";
  import TrackOptionsMenu from "$lib/components/TrackOptionsMenu.svelte";
  import { toast } from "svelte-sonner";

  const getSession = getContext<() => App.Session | null>("session");
  const session = $derived(getSession?.() || null);
  const musicState = getContext<GlobalMusicState>("musicState");

  interface HomeTrack {
    id: string;
    title: string;
    artist: string;
    coverUrl: string;
    durationMs: number;
    url: string;
    videoUrl?: string;
    lyrics?: string;
    userId?: string;
    artistId?: string;
  }

  interface HomeArtist {
    id: string;
    userId?: string;
    name: string;
    avatarUrl: string;
    trackCount?: number;
    isFollowing?: boolean;
  }

  // Real data states only - fake artists eliminated
  let artists = $state<HomeArtist[]>([]);
  let followedArtists = $state<HomeArtist[]>([]);
  let recentTracks = $state<HomeTrack[]>([]);
  let hasLiveTracks = $state(false);
  let genreTags = $state<string[]>([]);

  let greeting = $state("Buenas noches");

  async function loadHomeData() {
    try {
      const [trendingResponse, genresResponse, artistsResponse] = await Promise.all([
        fetch("/api/home/trending?limit=24"),
        fetch("/api/home/genres"),
        fetch("/api/home/artists"),
      ]);

      if (artistsResponse.ok) {
        const artistsPayload = await artistsResponse.json();
        if (Array.isArray(artistsPayload?.artists)) {
          artists = artistsPayload.artists;
        }
      }

      if (trendingResponse.ok) {
        const trendingPayload = await trendingResponse.json();
        const trendingTracks = Array.isArray(trendingPayload?.tracks)
          ? trendingPayload.tracks
          : [];

        if (trendingTracks.length > 0) {
          hasLiveTracks = true;
          recentTracks = trendingTracks.map((track: any) => ({
            id: track.id,
            title: track.title || "Untitled",
            artist: track.artistName || "Unknown",
            coverUrl: track.imageUrl || "",
            durationMs: track.durationMs || 200000,
            url: track.url || `/api/music/${track.id}`,
            videoUrl: track.videoUrl || undefined,
            lyrics: track.lyrics || undefined,
            userId: track.userId || track.artistId,
            artistId: track.artistId || track.userId,
          }));
        } else {
          hasLiveTracks = false;
          recentTracks = [];
        }
      }

      if (genresResponse.ok) {
        const genresPayload = await genresResponse.json();
        if (Array.isArray(genresPayload?.genres)) {
          genreTags = genresPayload.genres.slice(0, 8);
        }
      }

      // Load followed artists for authenticated users
      if (session?.user) {
        await loadFollowedArtists();
      }
    } catch (e) {
      console.error("Error loading home data:", e);
    }
  }

  async function loadFollowedArtists() {
    try {
      const fRes = await fetch("/api/artists/following");
      if (fRes.ok) {
        const fPayload = await fRes.json();
        followedArtists = Array.isArray(fPayload?.artists) ? fPayload.artists : [];
      }
    } catch (err) {
      console.error("Error loading followed artists:", err);
    }
  }

  async function unfollowArtist(artist: HomeArtist) {
    const targetId = artist.userId || artist.id;
    try {
      const res = await fetch("/api/artists/following", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistUserId: targetId, action: "unfollow" }),
      });
      if (res.ok) {
        followedArtists = followedArtists.filter((a) => a.id !== artist.id && a.userId !== targetId);
        artists = artists.map((a) => (a.id === artist.id || a.userId === targetId) ? { ...a, isFollowing: false } : a);
        toast.success(`Has quitado a ${artist.name} de tu lista`);
      } else {
        toast.error("No se pudo quitar de la lista");
      }
    } catch {
      toast.error("Error de comunicación con el servidor");
    }
  }

  async function toggleArtistFollow(artist: HomeArtist) {
    if (!session?.user) {
      goto("/login");
      return;
    }
    const targetId = artist.userId || artist.id;
    const nextAction = artist.isFollowing ? "unfollow" : "follow";
    try {
      const res = await fetch("/api/artists/following", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistUserId: targetId, action: nextAction }),
      });
      const payload = await res.json().catch(() => null);
      if (res.ok) {
        const nextState = Boolean(payload?.isFollowing);
        artists = artists.map((a) => (a.id === artist.id || a.userId === targetId) ? { ...a, isFollowing: nextState } : a);
        if (nextState) {
          toast.success(`Ahora sigues a ${artist.name}`);
          await loadFollowedArtists();
        } else {
          followedArtists = followedArtists.filter((a) => a.id !== artist.id && a.userId !== targetId);
          toast.success(`Has dejado de seguir a ${artist.name}`);
        }
      } else {
        toast.error(payload?.error || "No se pudo actualizar el seguimiento");
      }
    } catch {
      toast.error("Error de comunicación con el servidor");
    }
  }

  function playTrack(track: HomeTrack) {
    if (musicState.currentTrack?.id === track.id) {
      void musicState.togglePlay();
      return;
    }

    void musicState.playTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      imageUrl: track.coverUrl,
      url: track.url || `/api/music/${track.id}`,
      videoUrl: track.videoUrl,
      lyrics: track.lyrics,
      durationMs: track.durationMs,
    });
  }

  function updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) greeting = "Buenos días";
    else if (hour < 18) greeting = "Buenas tardes";
    else greeting = "Buenas noches";
  }

  onMount(() => {
    updateGreeting();
    void loadHomeData();
  });
</script>

<div class="space-y-8 pb-32">
  <!-- Top Greeting & Studio Banner -->
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-extrabold tracking-tight text-white">{greeting}</h1>
    </div>

    <!-- Hero Carousel -->
    <HeroCarousel />

    <!-- Qamuz AI Studio Callout -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="mt-4 relative rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-zinc-900 to-purple-950 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#ffde59] to-[#05e0e9] flex items-center justify-center text-black font-black shrink-0 shadow-lg group-hover:scale-110 transition-transform">
          <SparkleIcon class="w-6 h-6 fill-current animate-pulse text-zinc-900" />
        </div>
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-white font-extrabold text-base sm:text-lg">Qamuz AI Studio</span>
            <span class="bg-cyan-500/20 text-qamuz-primary border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              ACTIVO
            </span>
          </div>
          <p class="text-xs text-zinc-300 max-w-xl">
            Crea música tropical y urbana desde descripciones de texto, mezcla pistas a 96kHz y descarga stems multitrack.
          </p>
        </div>
      </div>

      <button 
        onclick={() => goto("/audio")}
        class="bg-qamuz-btn hover:bg-qamuz-btn text-black font-extrabold text-xs px-5 py-2.5 rounded-full group-hover:scale-105 transition-all shadow-md shrink-0 self-end sm:self-center cursor-pointer"
      >
        Abrir Studio
      </button>
    </div>
  </div>

  <!-- Section: Trending Now -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
        Tendencias
      </h2>
      <button
        type="button"
        onclick={() => goto("/discover")}
        class="text-xs font-bold cursor-pointer transition-colors uppercase tracking-wider text-zinc-400 hover:text-white"
      >
        Ver Todo
      </button>
    </div>

    {#if hasLiveTracks}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {#each recentTracks as track}
          {@const isCurrent = musicState.currentTrack?.id === track.id}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onclick={() => playTrack(track)}
            class="spotify-card p-3.5 rounded-lg flex flex-col gap-3 group cursor-pointer relative"
          >
            <div class="relative aspect-square w-full rounded-md overflow-hidden shadow-lg bg-zinc-800">
              <img 
                src={track.coverUrl || 'https://dummyimage.com/400x400/111/fff&text=QAMUZ'} 
                alt={track.title}
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <button 
                onclick={(e) => {
                  e.stopPropagation();
                  playTrack(track);
                }}
                class="absolute right-2 bottom-2 w-11 h-11 rounded-full bg-qamuz-btn text-black flex items-center justify-center shadow-2xl transition-all duration-200 {isCurrent && musicState.isPlaying ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95'}"
              >
                {#if isCurrent && musicState.isPlaying}
                  <span class="flex items-end gap-0.5 h-4">
                    <span class="w-1 bg-black animate-eq-1"></span>
                    <span class="w-1 bg-black animate-eq-2"></span>
                    <span class="w-1 bg-black animate-eq-3"></span>
                  </span>
                {:else}
                  <PlayIcon class="w-5 h-5 fill-current ml-0.5" />
                {/if}
              </button>
            </div>

            <div class="flex flex-col gap-1 min-w-0">
              <span class="font-bold text-sm truncate {isCurrent ? 'text-qamuz-primary' : 'text-white'}">
                {track.title}
              </span>
              <span class="text-xs truncate text-zinc-400">
                {track.artist}
              </span>
            </div>
            <div class="absolute top-2 right-2 z-10" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
              <TrackOptionsMenu
                song={{
                  id: track.id,
                  title: track.title,
                  imageUrl: track.coverUrl,
                  videoUrl: track.videoUrl,
                  durationMs: track.durationMs,
                  userId: track.userId,
                  artistId: track.artistId,
                }}
                buttonClass="bg-black/55 text-white opacity-100"
              />
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center mb-4">
        <p class="text-white font-semibold mb-2">No hay canciones públicas todavía</p>
        <p class="text-sm text-zinc-400 mb-5">
          Publica tus temas desde tu biblioteca para que aparezcan en Tendencias y Descubrir.
        </p>
        <button
          type="button"
          onclick={() => goto("/library")}
          class="bg-qamuz-btn text-black font-bold text-sm px-5 py-2.5 rounded-full cursor-pointer"
        >
          Ir a Mi Biblioteca
        </button>
      </div>
    {/if}
  </section>

  <!-- Section: Artistas que sigues (Visible if user follows any artists) -->
  {#if followedArtists.length > 0}
    <section>
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white" onclick={() => goto("/library")}>
            Artistas que sigues
          </h2>
          <span class="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full font-mono font-semibold">
            {followedArtists.length}
          </span>
        </div>
        <button
          type="button"
          onclick={() => goto("/library")}
          class="text-xs font-bold transition-colors uppercase tracking-wider text-zinc-400 hover:text-white cursor-pointer"
        >
          Ver en Biblioteca →
        </button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {#each followedArtists as artist}
          <div class="spotify-card p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col items-center text-center gap-2.5 group relative hover:border-zinc-700 transition-all">
            <a
              href={`/artist/${artist.id}`}
              class="flex flex-col items-center text-center gap-2 w-full cursor-pointer"
            >
              <div class="relative w-28 h-28 rounded-full overflow-hidden shadow-xl bg-zinc-800 border border-zinc-700/40">
                <img 
                  src={artist.avatarUrl} 
                  alt={artist.name} 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div class="flex flex-col gap-0.5 min-w-0 w-full">
                <span class="font-bold text-sm truncate text-white group-hover:text-qamuz-primary transition-colors">
                  {artist.name}
                </span>
                <span class="text-xs text-zinc-400">
                  {artist.trackCount} {artist.trackCount === 1 ? 'canción' : 'canciones'}
                </span>
              </div>
            </a>

            <button
              type="button"
              onclick={() => unfollowArtist(artist)}
              class="w-full text-xs font-bold py-1.5 rounded-full bg-zinc-800/80 hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-zinc-700 hover:border-red-500/40 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              title="Dejar de seguir y quitar de mi lista"
            >
              <span>✕</span>
              <span>Dejar de seguir</span>
            </button>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Section: Popular Artists (Real Artists Only) -->
  <section>
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
          Artistas Populares
        </h2>
      </div>
    </div>

    {#if artists.length > 0}
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {#each artists as artist}
          <div class="spotify-card p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col items-center text-center gap-2.5 group relative hover:border-zinc-700 transition-all">
            <a
              href={`/artist/${artist.id}`}
              class="flex flex-col items-center text-center gap-2 w-full cursor-pointer"
              aria-label={`Abrir perfil de ${artist.name}`}
            >
              <div class="relative w-28 h-28 rounded-full overflow-hidden shadow-xl bg-zinc-800 border border-zinc-700/40">
                <img 
                  src={artist.avatarUrl} 
                  alt={artist.name} 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div class="flex flex-col gap-0.5 min-w-0 w-full">
                <span class="font-bold text-sm truncate text-white group-hover:text-qamuz-primary transition-colors">
                  {artist.name}
                </span>
                <span class="text-xs capitalize text-zinc-400">
                  Artista
                </span>
              </div>
            </a>

            {#if artist.userId === session?.user?.id || artist.id === session?.user?.id}
              <a
                href={`/artist/${artist.id}`}
                class="w-full text-xs font-bold py-1.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center justify-center gap-1.5 hover:bg-zinc-700 hover:text-white transition-all cursor-pointer"
              >
                <span>👤</span>
                <span>Tu Perfil</span>
              </a>
            {:else if session?.user}
              <button
                type="button"
                onclick={() => toggleArtistFollow(artist)}
                class={`group/btn w-full text-xs font-bold py-1.5 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm border ${
                  artist.isFollowing
                    ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40'
                    : 'bg-qamuz-btn text-black border-transparent hover:scale-105'
                }`}
                title={artist.isFollowing ? 'Dejar de seguir y quitar de mi lista' : 'Seguir a este artista'}
              >
                {#if artist.isFollowing}
                  <span class="group-hover/btn:hidden flex items-center gap-1">
                    <span>✓</span>
                    <span>Siguiendo</span>
                  </span>
                  <span class="hidden group-hover/btn:inline-flex items-center gap-1 text-red-300">
                    <span>✕</span>
                    <span>Dejar de seguir</span>
                  </span>
                {:else}
                  <span>+ Seguir</span>
                {/if}
              </button>
            {:else}
              <a
                href="/login"
                class="w-full text-xs font-bold py-1.5 rounded-full bg-zinc-800/60 text-zinc-400 border border-zinc-700/60 hover:text-white hover:border-zinc-500 transition-all flex items-center justify-center gap-1 text-center cursor-pointer"
              >
                + Seguir
              </a>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div class="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto mb-3 text-zinc-300 text-xl">
          🎤
        </div>
        <p class="text-white font-semibold mb-1">No hay artistas registrados aún</p>
        <p class="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
          Los artistas ficticios fueron eliminados. A medida que tú o tus usuarios creen canciones públicas y perfiles de artista, aparecerán automáticamente aquí.
        </p>
        <button
          type="button"
          onclick={() => goto("/audio")}
          class="bg-qamuz-btn hover:bg-qamuz-btn text-black font-bold text-xs px-4 py-2 rounded-full transition-transform hover:scale-105 cursor-pointer"
        >
          Crear Canción en el Studio
        </button>
      </div>
    {/if}
  </section>
</div>
