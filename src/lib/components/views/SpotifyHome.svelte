<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import {
    PlayIcon,
    StarIcon,
    SparkleIcon,
    AnalyticsIcon,
    FlameIcon,
    CrownIcon
  } from "$lib/icons/index.js";
  import TrackOptionsMenu from "$lib/components/TrackOptionsMenu.svelte";
  
  // Theme state (if you have one, or just assume dark based on global classes)
  // For now, we'll assume dark theme styling based on the design
  
  const getSession = getContext<() => App.Session | null>("session");
  const session = $derived(getSession?.() || null);
  const musicState = getContext<GlobalMusicState>("musicState");

  const fallbackRecentTracks: Array<{ id: string; title: string; artist: string; coverUrl: string; durationMs: number; url: string }> = [];

  let artists = $state<Array<{ id: string; name: string; avatarUrl: string }>>([]);
  
  let recentTracks = $state<Array<{
    id: string;
    title: string;
    artist: string;
    coverUrl: string;
    durationMs: number;
    url: string;
    videoUrl?: string;
    lyrics?: string;
  }>>([]);
  let hasLiveTracks = $state(false);
  let genreTags = $state<string[]>([]);

  let featuredPlaylists = $state<Array<{ id: string; title: string; coverUrl: string; tracks: typeof recentTracks }>>([]);
  
  let mockAlbums = $state<Array<{ id: string; title: string; artist: string; releaseYear: string; coverUrl: string; genre: string }>>([]);

  let greeting = $state("Buenas noches");

  async function loadHomeData() {
    try {
      const [trendingResponse, genresResponse] = await Promise.all([
        fetch("/api/home/trending?limit=24"),
        fetch("/api/home/genres"),
      ]);

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
            artist: track.artistName || "Artista QAMUZ",
            coverUrl: track.imageUrl || "",
            durationMs: track.durationMs || 200000,
            url: track.url || `/api/music/${track.id}`,
            videoUrl: track.videoUrl || undefined,
            lyrics: track.lyrics || undefined,
          }));

          const artistMap = new Map<string, { id: string; name: string; avatarUrl: string }>();
          for (const track of trendingTracks) {
            if (!track.artistId || artistMap.has(track.artistId)) {
              continue;
            }

            artistMap.set(track.artistId, {
              id: track.artistId,
              name: track.artistName || "Artista QAMUZ",
              avatarUrl: "/branding/qamuz/icon-dark.png",
            });
          }
          artists = Array.from(artistMap.values()).slice(0, 8);

          featuredPlaylists = [
            {
              id: "trending-now",
              title: "Tendencias QAMUZ",
              coverUrl: recentTracks[0]?.coverUrl || "",
              tracks: recentTracks.slice(0, 8),
            },
            {
              id: "for-you",
              title: "Para ti",
              coverUrl: recentTracks[1]?.coverUrl || recentTracks[0]?.coverUrl || "",
              tracks: recentTracks.slice(2, 10),
            },
          ];
        }
      }

      if (genresResponse.ok) {
        const genresPayload = await genresResponse.json();
        const genreTagsPayload = Array.isArray(genresPayload?.genres)
          ? genresPayload.genres.slice(0, 8)
          : [];
        genreTags = genreTagsPayload;

        if (genreTagsPayload.length > 0) {
          mockAlbums = genreTagsPayload.map((genre: string, index: number) => ({
            id: `genre-${genre}`,
            title: genre.charAt(0).toUpperCase() + genre.slice(1),
            artist: "Explorar género",
            releaseYear: String(new Date().getFullYear()),
            coverUrl: recentTracks[index]?.coverUrl || "/branding/qamuz/icon-dark.png",
            genre,
          }));
        }
      }
    } catch (loadError) {
      console.warn("Failed to load home API data", loadError);
    }
  }

  onMount(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 20) {
      greeting = "Buenas tardes";
    } else if (hour >= 20) {
      greeting = "Buenas noches";
    } else {
      greeting = "Buenos días";
    }

    const firstName = session?.user?.name ? session.user.name.trim().split(' ')[0] : '';
    if (firstName) {
      greeting = `${greeting}, ${firstName}`;
    }

    void loadHomeData();
  });

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function playTrack(track: any) {
    if (!track.url || !UUID_RE.test(track.id)) return;
    if (musicState.currentTrack?.id === track.id) {
      musicState.togglePlay();
    } else {
      musicState.playTrack({
        id: track.id,
        title: track.title,
        artist: track.artist || "Artista QAMUZ",
        imageUrl: track.coverUrl,
        url: track.url,
        videoUrl: track.videoUrl,
        lyrics: track.lyrics,
        durationMs: track.durationMs || 10000
      });
    }
  }
</script>

<div class="flex flex-col gap-8 pb-12 animate-fade-in select-none p-4 lg:p-8 dark">
  <!-- Greeting Header -->
  <div>
    <h1 class="text-3xl font-extrabold tracking-tight mb-6 text-white transition-colors">
      {greeting}
    </h1>

    <section class="mb-6 overflow-hidden rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_18%_12%,rgba(5,224,233,.2),transparent_34%),linear-gradient(125deg,#101a20,#0b0d10_55%,#17130a)] p-6 shadow-2xl sm:p-9">
      <div class="max-w-2xl">
        <span class="text-xs font-black tracking-[0.22em] text-cyan-300">GEN AUDIUS IS QAMUZ</span>
        <h2 class="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Crea. Mezcla. Publica.</h2>
        <p class="mt-4 max-w-xl text-base leading-relaxed text-zinc-300">Convierte una idea en una canción completa, abre sus pistas en QAMUZ Studio y guarda cada versión en tu biblioteca.</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <button type="button" onclick={() => goto("/audio")} class="rounded-full bg-qamuz-btn px-6 py-3 text-sm font-black text-black transition-transform hover:scale-105">Crear canción</button>
          <button type="button" onclick={() => goto("/studio")} class="rounded-full border border-white/20 bg-white/8 px-6 py-3 text-sm font-bold text-white hover:bg-white/14">Abrir Studio</button>
        </div>
      </div>
    </section>

    <!-- Top Quick Grid (6 items) -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <!-- Liked Songs Tile -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        onclick={() => goto("/library")}
        class="group relative flex items-center gap-2 sm:gap-4 transition-all rounded-md overflow-hidden cursor-pointer shadow-md bg-zinc-800/60 hover:bg-zinc-700/60 text-white"
      >
        <div class="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-500 flex items-center justify-center shrink-0 shadow">
          <StarIcon class="w-6 h-6 sm:w-8 sm:h-8 text-white fill-current" />
        </div>
        <span class="font-bold text-xs sm:text-sm truncate flex-1 pr-1 sm:pr-2 text-white">
          Tu biblioteca
        </span>
        <button 
          class="mr-2 sm:mr-4 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-qamuz-btn text-black hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          <PlayIcon class="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
        </button>
      </div>

      <button type="button" onclick={() => goto("/audio")} class="group relative flex items-center gap-2 overflow-hidden rounded-md bg-zinc-800/60 text-left text-white shadow-md transition-all hover:bg-zinc-700/60 sm:gap-4">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-700 text-black sm:h-20 sm:w-20"><SparkleIcon class="h-7 w-7" /></span>
        <span class="text-xs font-bold sm:text-sm">Crear con IA</span>
      </button>

      <button type="button" onclick={() => goto("/studio")} class="group relative flex items-center gap-2 overflow-hidden rounded-md bg-zinc-800/60 text-left text-white shadow-md transition-all hover:bg-zinc-700/60 sm:gap-4">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center bg-gradient-to-br from-amber-300 to-orange-600 text-black sm:h-20 sm:w-20"><AnalyticsIcon class="h-7 w-7" /></span>
        <span class="text-xs font-bold sm:text-sm">QAMUZ Studio</span>
      </button>

      <!-- Quick Playlists -->
      {#each featuredPlaylists as pl}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="group relative flex items-center gap-2 sm:gap-4 transition-all rounded-md overflow-hidden cursor-pointer shadow-md bg-zinc-800/60 hover:bg-zinc-700/60 text-white"
        >
          <img 
            src={pl.coverUrl} 
            alt={pl.title}
            class="w-14 h-14 sm:w-20 sm:h-20 object-cover shrink-0 shadow" 
          />
          <span class="font-bold text-xs sm:text-sm truncate flex-1 pr-1 sm:pr-2 text-white">
            {pl.title}
          </span>
          <button 
            onclick={(e) => {
              e.stopPropagation();
              if (pl.tracks.length > 0) {
                playTrack(pl.tracks[0]);
              }
            }}
            class="mr-2 sm:mr-4 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-qamuz-btn text-black hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            <PlayIcon class="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
          </button>
        </div>
      {/each}
    </div>

    <!-- Recommendation Engine & Plan Recommendation Grid -->
    <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Card 1: Music Recommendation Algorithm -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="relative rounded-2xl p-5 bg-gradient-to-r from-emerald-950/90 via-zinc-900 to-indigo-950/90 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group shadow-xl flex flex-col justify-between gap-4"
        onclick={() => goto("/discover")}
        onkeydown={(e) => e.key === "Enter" && goto("/discover")}
        role="button"
        tabindex="0"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-qamuz-btn text-black font-black flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <AnalyticsIcon class="w-6 h-6 animate-pulse text-zinc-900" />
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-white font-extrabold text-base">Descubrimiento inteligente</span>
              <span class="bg-cyan-500/20 text-qamuz-primary border border-cyan-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                ENGINE
              </span>
            </div>
            <p class="text-xs text-zinc-300">
              Escucha música publicada por la comunidad y descubre artistas de QAMUZ.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-zinc-800/80 pt-3">
          <div class="flex items-center gap-2 text-[11px] text-emerald-400 font-bold">
            <FlameIcon class="w-3.5 h-3.5" />
            <span>Tendencias</span>
          </div>
          <button
            type="button"
            onclick={() => goto("/discover")}
            class="text-xs font-black text-black bg-qamuz-btn px-4 py-1.5 rounded-full group-hover:scale-105 transition-transform shadow"
          >
            Explorar
          </button>
        </div>
      </div>

      <!-- Card 2: Subscription Plan Recommender -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="relative rounded-2xl p-5 bg-gradient-to-r from-purple-950/90 via-zinc-900 to-zinc-900 border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer group shadow-xl flex flex-col justify-between gap-4"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <CrownIcon class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-white font-extrabold text-base">Amplía tu estudio</span>
              <span class="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                PRO
              </span>
            </div>
            <p class="text-xs text-zinc-300">
              Aumenta tus créditos, calidad de audio y acceso a los modelos musicales.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-zinc-800/80 pt-3">
          <div class="flex items-center gap-2 text-[11px] text-purple-300 font-bold">
            <FlameIcon class="w-3.5 h-3.5" />
            <span>Planes para creadores</span>
          </div>
          <span class="text-xs font-black text-white bg-purple-600 px-4 py-1.5 rounded-full group-hover:scale-105 transition-transform shadow">
            Ver planes
          </span>
        </div>
      </div>
    </div>

    <!-- Qamuz AI Studio Callout Banner -->
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
            <span class="text-white font-extrabold text-base sm:text-lg">QAMUZ Studio</span>
            <span class="bg-cyan-500/20 text-qamuz-primary border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              DAW
            </span>
          </div>
          <p class="text-xs text-zinc-300 max-w-xl">
            Abre una canción en estéreo, extrae stems y continúa la mezcla en el editor multipista.
          </p>
        </div>
      </div>

      <button 
        onclick={() => goto("/studio")}
        class="bg-qamuz-btn hover:bg-qamuz-btn text-black font-extrabold text-xs px-5 py-2.5 rounded-full group-hover:scale-105 transition-all shadow-md shrink-0 self-end sm:self-center"
      >
        Abrir Studio
      </button>
    </div>
  </div>

  <!-- Section: Recently Played -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
        {hasLiveTracks ? "Tendencias QAMUZ" : "Música de QAMUZ"}
      </h2>
      <button
        type="button"
        onclick={() => goto("/discover")}
        class="text-xs font-bold cursor-pointer transition-colors uppercase tracking-wider text-zinc-400 hover:text-white"
      >
        Ver todo
      </button>
    </div>

    {#if !hasLiveTracks}
      <div class="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center mb-4">
        <p class="text-white font-semibold mb-2">Todavía no hay canciones públicas</p>
        <p class="text-sm text-zinc-400 mb-5">
          Publica una canción desde tu biblioteca para mostrarla aquí y en Explorar.
        </p>
        <button
          type="button"
          onclick={() => goto("/library")}
          class="bg-qamuz-btn text-black font-bold text-sm px-5 py-2.5 rounded-full"
        >
          Ir a la biblioteca
        </button>
      </div>
    {/if}

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {#each (hasLiveTracks ? recentTracks : fallbackRecentTracks) as track, idx}
        {@const isCurrent = musicState.currentTrack?.id === track.id}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          onclick={() => playTrack(track)}
          class="spotify-card p-3.5 rounded-lg flex flex-col gap-3 group cursor-pointer relative"
        >
          <div class="relative aspect-square w-full rounded-md overflow-hidden shadow-lg bg-zinc-800">
            <img 
              src={track.coverUrl} 
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
              }}
              buttonClass="bg-black/55 text-white opacity-100"
            />
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Section: Popular Artists -->
  {#if artists.length}
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
        Artistas populares
      </h2>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {#each artists as artist}
        <a
          href={`/artist/${artist.id}`}
          class="spotify-card p-3.5 rounded-lg flex flex-col items-center text-center gap-3 group cursor-pointer"
          aria-label={`Open ${artist.name} profile`}
        >
          <div class="relative w-32 h-32 rounded-full overflow-hidden shadow-xl bg-zinc-800">
            <img 
              src={artist.avatarUrl} 
              alt={artist.name} 
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div class="flex flex-col gap-0.5 min-w-0 w-full">
            <span class="font-bold text-sm truncate text-white">
              {artist.name}
            </span>
            <span class="text-xs capitalize text-zinc-400">
              Artista
            </span>
          </div>
        </a>
      {/each}
    </div>
  </section>
  {/if}

  <!-- Section: Featured Albums -->
  {#if mockAlbums.length}
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
        Géneros destacados
      </h2>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {#each mockAlbums as album}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="spotify-card p-3.5 rounded-lg flex flex-col gap-3 group cursor-pointer"
          onclick={() => goto(album.genre ? `/discover?genre=${encodeURIComponent(album.genre)}` : "/discover")}
        >
          <div class="relative aspect-square w-full rounded-md overflow-hidden shadow-md bg-zinc-800">
            <img 
              src={album.coverUrl} 
              alt={album.title}
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="font-bold text-sm truncate text-white">{album.title}</span>
            <span class="text-xs truncate text-zinc-400">{album.artist} • {album.releaseYear}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>
  {/if}
</div>
