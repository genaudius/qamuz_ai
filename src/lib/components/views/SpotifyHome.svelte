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
  import HeroCarousel from "./HeroCarousel.svelte";
  
  // Theme state (if you have one, or just assume dark based on global classes)
  // For now, we'll assume dark theme styling based on the design
  
  const getSession = getContext<() => App.Session | null>("session");
  const session = $derived(getSession?.() || null);
  const musicState = getContext<GlobalMusicState>("musicState");

  const fallbackRecentTracks = [
    { id: "1", title: "Blinding Lights", artist: "The Weeknd", coverUrl: "https://i.scdn.co/image/ab67616d00001e028863bc11d2aa12b54f5aeb36", durationMs: 200000, url: "" },
    { id: "2", title: "Anti-Hero", artist: "Taylor Swift", coverUrl: "https://i.scdn.co/image/ab67616d00001e02bb54dde1edccdbb69436798b", durationMs: 200000, url: "" },
    { id: "3", title: "Me Porto Bonito", artist: "Bad Bunny", coverUrl: "https://i.scdn.co/image/ab67616d00001e0249d6fd6e8f6e806f8664160a", durationMs: 200000, url: "" },
    { id: "4", title: "Rich Flex", artist: "Drake", coverUrl: "https://i.scdn.co/image/ab67616d00001e020286377e68fa7075cdafc210", durationMs: 200000, url: "" },
    { id: "5", title: "Levitating", artist: "Dua Lipa", coverUrl: "https://i.scdn.co/image/ab67616d00001e02bd26ede1ae69327010d49946", durationMs: 200000, url: "" },
    { id: "6", title: "As It Was", artist: "Harry Styles", coverUrl: "https://i.scdn.co/image/ab67616d00001e022e02117d7742d9eef2934279", durationMs: 200000, url: "" }
  ];

  // Fallback/mock data used when home APIs are unavailable.
  let artists = $state([
    { id: "1", name: "The Weeknd", avatarUrl: "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb" },
    { id: "2", name: "Taylor Swift", avatarUrl: "https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0" },
    { id: "3", name: "Bad Bunny", avatarUrl: "https://i.scdn.co/image/ab6761610000e5eb9e3ceaeb6cb242d8d6380d14" },
    { id: "4", name: "Drake", avatarUrl: "https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9" },
    { id: "5", name: "Dua Lipa", avatarUrl: "https://i.scdn.co/image/ab6761610000e5eb4b96791e8dd2c22227d82531" }
  ]);
  
  let recentTracks = $state([...fallbackRecentTracks]);

  let featuredPlaylists = $state([
    { id: "1", title: "Today's Top Hits", coverUrl: "https://i.scdn.co/image/ab67706f00000002b662363a033b08e2b8665f57", tracks: [fallbackRecentTracks[0]] },
    { id: "2", title: "RapCaviar", coverUrl: "https://i.scdn.co/image/ab67706f000000021c50005a30ed9bba057f9ed3", tracks: [fallbackRecentTracks[3]] },
    { id: "3", title: "Viva Latino", coverUrl: "https://i.scdn.co/image/ab67706f00000002b55b6074eda1dceec946caf2", tracks: [fallbackRecentTracks[2]] },
    { id: "4", title: "Mega Hit Mix", coverUrl: "https://i.scdn.co/image/ab67706f00000002b0fe40a6e1692822f5a9d8f1", tracks: [fallbackRecentTracks[1]] },
    { id: "5", title: "All Out 2010s", coverUrl: "https://i.scdn.co/image/ab67706f00000002b489d89283f5c90716262a40", tracks: [fallbackRecentTracks[4]] }
  ]);
  
  let mockAlbums = $state([
    { id: "1", title: "After Hours", artist: "The Weeknd", releaseYear: "2020", coverUrl: "https://i.scdn.co/image/ab67616d00001e028863bc11d2aa12b54f5aeb36" },
    { id: "2", title: "Midnights", artist: "Taylor Swift", releaseYear: "2022", coverUrl: "https://i.scdn.co/image/ab67616d00001e02bb54dde1edccdbb69436798b" },
    { id: "3", title: "Un Verano Sin Ti", artist: "Bad Bunny", releaseYear: "2022", coverUrl: "https://i.scdn.co/image/ab67616d00001e0249d6fd6e8f6e806f8664160a" },
    { id: "4", title: "Her Loss", artist: "Drake", releaseYear: "2022", coverUrl: "https://i.scdn.co/image/ab67616d00001e020286377e68fa7075cdafc210" }
  ]);

  let greeting = $state("Good evening");

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
          recentTracks = trendingTracks.map((track: any) => ({
            id: track.id,
            title: track.title || "Untitled",
            artist: track.artistName || "Unknown",
            coverUrl: track.imageUrl || "",
            durationMs: track.durationMs || 200000,
            url: "",
          }));

          const artistMap = new Map<string, { id: string; name: string; avatarUrl: string }>();
          for (const track of trendingTracks) {
            if (!track.artistId || artistMap.has(track.artistId)) {
              continue;
            }

            artistMap.set(track.artistId, {
              id: track.artistId,
              name: track.artistName || "Unknown",
              avatarUrl: "https://dummyimage.com/200x200/222/fff&text=Q",
            });
          }
          artists = Array.from(artistMap.values()).slice(0, 8);

          featuredPlaylists = [
            {
              id: "trending-now",
              title: "Trending Now",
              coverUrl: recentTracks[0]?.coverUrl || "",
              tracks: recentTracks.slice(0, 8),
            },
            {
              id: "for-you",
              title: "For You",
              coverUrl: recentTracks[1]?.coverUrl || recentTracks[0]?.coverUrl || "",
              tracks: recentTracks.slice(2, 10),
            },
          ];
        }
      }

      if (genresResponse.ok) {
        const genresPayload = await genresResponse.json();
        const genreTags = Array.isArray(genresPayload?.genres)
          ? genresPayload.genres.slice(0, 4)
          : [];

        if (genreTags.length > 0) {
          mockAlbums = genreTags.map((genre: string, index: number) => ({
            id: `genre-${genre}`,
            title: genre.charAt(0).toUpperCase() + genre.slice(1),
            artist: "Genre Hub",
            releaseYear: String(new Date().getFullYear()),
            coverUrl: recentTracks[index]?.coverUrl || "https://dummyimage.com/400x400/111/fff&text=QAMUZ",
          }));
        }
      }
    } catch (loadError) {
      console.warn("Failed to load home API data, using fallback values", loadError);
    }
  }

  onMount(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 20) {
      greeting = "Good afternoon";
    } else if (hour >= 20) {
      greeting = "Good evening";
    } else {
      greeting = "Good morning";
    }

    const firstName = session?.user?.name ? session.user.name.trim().split(' ')[0] : '';
    if (firstName) {
      greeting = `${greeting}, ${firstName}`;
    }

    void loadHomeData();
  });

  function playTrack(track: any) {
    if (musicState.currentTrack?.id === track.id) {
      musicState.togglePlay();
    } else {
      musicState.playTrack({
        id: track.id,
        title: track.title,
        artist: track.artist || "Unknown",
        imageUrl: track.coverUrl,
        url: track.url || "",
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

    <HeroCarousel />

    <!-- Top Quick Grid (6 items) -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <!-- Liked Songs Tile -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="group relative flex items-center gap-2 sm:gap-4 transition-all rounded-md overflow-hidden cursor-pointer shadow-md bg-zinc-800/60 hover:bg-zinc-700/60 text-white"
      >
        <div class="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-500 flex items-center justify-center shrink-0 shadow">
          <StarIcon class="w-6 h-6 sm:w-8 sm:h-8 text-white fill-current" />
        </div>
        <span class="font-bold text-xs sm:text-sm truncate flex-1 pr-1 sm:pr-2 text-white">
          Liked Songs
        </span>
        <button 
          class="mr-2 sm:mr-4 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-qamuz-btn text-black hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 active:scale-95 transition-all shadow-xl"
        >
          <PlayIcon class="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
        </button>
      </div>

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
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-qamuz-btn text-black font-black flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <AnalyticsIcon class="w-6 h-6 animate-pulse text-zinc-900" />
          </div>
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <span class="text-white font-extrabold text-base">Smart AI Recommendations</span>
              <span class="bg-cyan-500/20 text-qamuz-primary border border-cyan-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                ENGINE
              </span>
            </div>
            <p class="text-xs text-zinc-300">
              Discover new music tailored just for you using our advanced AI algorithms.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-zinc-800/80 pt-3">
          <div class="flex items-center gap-2 text-[11px] text-emerald-400 font-bold">
            <FlameIcon class="w-3.5 h-3.5" />
            <span>Hot & Trending</span>
          </div>
          <span class="text-xs font-black text-black bg-qamuz-btn px-4 py-1.5 rounded-full group-hover:scale-105 transition-transform shadow">
            Discover
          </span>
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
              <span class="text-white font-extrabold text-base">Upgrade your Experience</span>
              <span class="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                PRO
              </span>
            </div>
            <p class="text-xs text-zinc-300">
              Get unlimited skips, highest audio quality, and early access to new AI models.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-zinc-800/80 pt-3">
          <div class="flex items-center gap-2 text-[11px] text-purple-300 font-bold">
            <FlameIcon class="w-3.5 h-3.5" />
            <span>Ad-free listening</span>
          </div>
          <span class="text-xs font-black text-white bg-purple-600 px-4 py-1.5 rounded-full group-hover:scale-105 transition-transform shadow">
            View Plans
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
            <span class="text-white font-extrabold text-base sm:text-lg">Qamuz AI Studio</span>
            <span class="bg-cyan-500/20 text-qamuz-primary border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              NEW
            </span>
          </div>
          <p class="text-xs text-zinc-300 max-w-xl">
            Create your own music from text prompts, generate album art, and more with our integrated AI tools.
          </p>
        </div>
      </div>

      <button 
        onclick={() => goto("/audio")}
        class="bg-qamuz-btn hover:bg-qamuz-btn text-black font-extrabold text-xs px-5 py-2.5 rounded-full group-hover:scale-105 transition-all shadow-md shrink-0 self-end sm:self-center"
      >
        Open Studio
      </button>
    </div>
  </div>

  <!-- Section: Recently Played -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
        Recently Played
      </h2>
      <span class="text-xs font-bold cursor-pointer transition-colors uppercase tracking-wider text-zinc-400 hover:text-white">
        Show All
      </span>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {#each recentTracks as track, idx}
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
        </div>
      {/each}
    </div>
  </section>

  <!-- Section: Popular Artists -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
        Popular Artists
      </h2>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {#each artists as artist}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="spotify-card p-3.5 rounded-lg flex flex-col items-center text-center gap-3 group cursor-pointer"
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
              Artist
            </span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Section: Featured Albums -->
  <section>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold hover:underline cursor-pointer transition-colors text-white">
        Featured Albums
      </h2>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {#each mockAlbums as album}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="spotify-card p-3.5 rounded-lg flex flex-col gap-3 group cursor-pointer"
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
</div>
