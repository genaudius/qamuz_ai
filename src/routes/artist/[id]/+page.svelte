<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { getContext, onMount } from 'svelte';
  import type { ActionData, PageData } from './$types';
  import type { GlobalMusicState } from '$lib/stores/music.svelte.js';
  import TrackOptionsMenu from '$lib/components/TrackOptionsMenu.svelte';
  import { toast } from 'svelte-sonner';
  import { fanLimitState } from '$lib/stores/fan-limit.svelte.js';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  const musicState = getContext<GlobalMusicState>('musicState');

  let isFollowing = $state(false);
  let followerCount = $state(data.artist.followersCount || 0);
  let followError = $state('');
  let isFollowSubmitting = $state(false);

  onMount(() => {
    isFollowing = data.artist.isFollowing || false;
    followerCount = data.artist.followersCount || 0;
  });

  function formatCompactNumber(value: number) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: value >= 1000000 ? 1 : 0,
    }).format(value);
  }

  function formatFullNumber(value: number) {
    return new Intl.NumberFormat('en-US').format(value);
  }

  const totalTrackPlays = $derived(
    data.tracks.reduce((total, track) => total + (track.playsCount || 0), 0)
  );

  const monthlyListeners = $derived(
    data.artist.isDemoProfile
      ? Math.max(125000, Math.round((data.artist.followersCount || 0) * 3.7))
      : Math.max(250, Math.round(totalTrackPlays / Math.max(data.tracks.length, 1) * 1.35))
  );

  const topTracks = $derived(
    [...data.tracks]
      .sort((left, right) => (right.playsCount || 0) - (left.playsCount || 0))
      .slice(0, 5)
  );

  const releaseCards = $derived(
    data.publicPlaylists.length > 0
      ? data.publicPlaylists.slice(0, 6).map((playlist, index) => ({
          id: playlist.id,
          title: playlist.name,
          subtitle: playlist.description || 'Curated release',
          meta: `Playlist • ${new Date(playlist.updatedAt || Date.now()).getFullYear()}`,
          art: data.tracks[index]?.imageUrl || data.artist.userImage,
          href: `/playlist/${playlist.id}`,
        }))
      : data.tracks.slice(0, 6).map((track, index) => ({
          id: track.id,
          title: track.title || track.prompt || 'Untitled track',
          subtitle: track.isInstrumental ? 'Instrumental track' : 'Generated track',
          meta: `Single • ${new Date(track.createdAt || Date.now()).getFullYear()}`,
          art: track.imageUrl || data.artist.userImage,
          href: '#',
        }))
  );

  const relatedArtists = $derived(data.relatedArtists || []);

  function playArtistTrack(track: PageData['tracks'][number]) {
    if (!musicState || data.artist.isDemoProfile) return;
    musicState.queue = data.tracks.map((item) => ({
      id: item.id,
      url: `/api/music/${item.id}`,
      title: item.title || item.prompt || 'Untitled track',
      artist: data.artist.userName || 'QAMUZ',
      imageUrl: item.imageUrl || data.artist.userImage || undefined,
      videoUrl: item.videoUrl || undefined,
      lyrics: item.lyrics || undefined,
      durationMs: item.durationMs || 0,
    }));
    musicState.playTrack({
      id: track.id,
      url: `/api/music/${track.id}`,
      title: track.title || track.prompt || 'Untitled track',
      artist: data.artist.userName || 'QAMUZ',
      imageUrl: track.imageUrl || data.artist.userImage || undefined,
      videoUrl: track.videoUrl || undefined,
      lyrics: track.lyrics || undefined,
      durationMs: track.durationMs || 0,
    });
  }

  const spotlightRelease = $derived(releaseCards[0] || null);

  $effect(() => {
    if (!form) {
      return;
    }

    if (form.success && form.action === 'toggleFollow') {
      isFollowSubmitting = false;
      followError = '';
      isFollowing = form.isFollowing;
      followerCount = form.followersCount;
      data.artist.isFollowing = form.isFollowing;
      data.artist.followersCount = form.followersCount;
      if (form.isFollowing) {
        toast.success(`Ahora sigues a ${data.artist.stageName || data.artist.userName}`);
      } else {
        toast.success(`Has dejado de seguir a ${data.artist.stageName || data.artist.userName}`);
      }
      return;
    }

    if (form.error && form.action === 'toggleFollow') {
      isFollowSubmitting = false;
      followError = form.error;
      toast.error(form.error);
    }
  });
</script>

<svelte:head>
  <title>{data.artist.userName || 'Artist'} - QAMUZ</title>
</svelte:head>

<div class="min-h-screen bg-[linear-gradient(180deg,#294d44_0%,#15221e_18%,#101916_40%,#0f1714_100%)] text-white">
  <section class="relative overflow-hidden border-b border-white/8">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_75%_30%,rgba(0,191,99,0.24),transparent_28%)]"></div>
    <div class="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-8 pt-10 sm:px-6 lg:flex-row lg:items-end lg:px-8 lg:pb-10 lg:pt-16">
      <div class="h-44 w-44 shrink-0 overflow-hidden rounded-full bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-56 sm:w-56 lg:h-64 lg:w-64">
        {#if data.artist.userImage}
          <img src={data.artist.userImage} alt={data.artist.userName || 'Artist'} class="h-full w-full object-cover" />
        {/if}
      </div>

      <div class="flex-1 space-y-5">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-white/80">
            {#if data.artist.verifiedAt}
              <span class="inline-flex items-center rounded-full bg-emerald-400/18 px-3 py-1 text-emerald-200 ring-1 ring-emerald-300/30">
                Verified Artist
              </span>
            {:else}
              <span class="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white/75 ring-1 ring-white/15">
                Artist Profile
              </span>
            {/if}
            {#if data.artist.isDemoProfile}
              <span class="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white/75 ring-1 ring-white/15">
                Demo
              </span>
            {/if}
          </div>

          <h1 class="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            {data.artist.userName || 'Artist profile'}
          </h1>

          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/82 sm:text-base">
            <span class="font-semibold text-white">{formatFullNumber(monthlyListeners)} monthly listeners</span>
            <span>{formatFullNumber(followerCount)} followers</span>
            <span>{formatFullNumber(totalTrackPlays)} total plays</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          {#if data.artist.isOwnProfile}
            <a
              href="/settings/profile"
              class="inline-flex min-w-32 items-center justify-center rounded-full bg-qamuz-btn px-6 py-3 text-sm font-extrabold text-black transition-all hover:scale-105"
            >
              Edit profile
            </a>
          {:else}
            <form
              method="POST"
              action="?/toggleFollow"
              use:enhance={() => {
                isFollowSubmitting = true;
                followError = '';
                return async ({ result, update }) => {
                  isFollowSubmitting = false;
                  if (result.type === 'failure' && (result.data as any)?.error === 'FAN_ARTIST_LIMIT_REACHED') {
                    const data = result.data as any;
                    fanLimitState.openModal(data.message, data.limit, data.price);
                    return;
                  }
                  await update();
                };
              }}
            >
              <button
                type="submit"
                class={`group inline-flex min-w-36 items-center justify-center rounded-full px-6 py-3 text-sm font-extrabold transition-all ${
                  isFollowing
                    ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-red-500/20 hover:text-red-300 hover:ring-red-500/40 cursor-pointer'
                    : 'bg-qamuz-btn text-black hover:scale-105 cursor-pointer'
                }`}
                disabled={isFollowSubmitting || !page.data.session?.user?.id}
                title={isFollowing ? 'Dejar de seguir y quitar de mi lista' : 'Seguir a este artista'}
              >
                {#if !page.data.session?.user?.id}
                  Inicia sesión para seguir
                {:else if isFollowSubmitting}
                  Guardando...
                {:else if isFollowing}
                  <span class="group-hover:hidden flex items-center gap-1.5">
                    <span>✓</span>
                    <span>Siguiendo</span>
                  </span>
                  <span class="hidden group-hover:inline-flex items-center gap-1.5 text-red-300">
                    <span>✕</span>
                    <span>Dejar de seguir</span>
                  </span>
                {:else}
                  <span class="flex items-center gap-1.5">
                    <span>+</span>
                    <span>Seguir</span>
                  </span>
                {/if}
              </button>
            </form>
          {/if}

          <a
            href="#popular"
            class="inline-flex min-w-28 items-center justify-center rounded-full border border-white/16 bg-white/6 px-5 py-3 text-sm font-bold text-white/92 transition-colors hover:bg-white/12"
          >
            Popular
          </a>
        </div>

        {#if followError}
          <p class="text-sm text-red-300">{followError}</p>
        {/if}
      </div>
    </div>
  </section>

  <div class="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
    <section class="grid gap-10 xl:grid-cols-[minmax(0,1.45fr)_340px] xl:items-start">
      <div class="space-y-12">
        <section id="popular" class="space-y-4">
          <div>
            <h2 class="text-3xl font-black tracking-tight">Popular</h2>
            <p class="text-sm text-white/55">Top tracks listeners are replaying right now.</p>
          </div>

          {#if topTracks.length === 0}
            <div class="spotify-card rounded-2xl p-5 text-sm text-muted-foreground">
              This artist has no published tracks yet.
            </div>
          {:else}
            <div class="overflow-hidden rounded-2xl border border-white/8 bg-black/16">
              {#each topTracks as track, index}
                {@const isPlayingThis = musicState?.currentTrack?.id === track.id}
                <div
                  class="group grid cursor-pointer grid-cols-[32px_minmax(0,1fr)_auto_32px] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/6 sm:grid-cols-[40px_64px_minmax(0,1fr)_auto_auto_32px] sm:px-5"
                  role="button"
                  tabindex="0"
                  onclick={() => playArtistTrack(track)}
                  onkeydown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      playArtistTrack(track);
                    }
                  }}
                >
                  <div class="text-center text-sm font-bold text-white/65">{index + 1}</div>
                  <div class="hidden h-14 w-14 overflow-hidden rounded-lg bg-white/8 sm:block">
                      {#if track.imageUrl || data.artist.userImage}
                        <img src={track.imageUrl || data.artist.userImage} alt={track.title || track.prompt || 'Track'} class="h-full w-full object-cover" />
                    {/if}
                  </div>
                  <div class="min-w-0">
                      <div class="truncate text-sm font-bold {isPlayingThis ? 'text-[#3ae0d5]' : 'text-white'}">{track.title || track.prompt || 'Untitled track'}</div>
                      <div class="truncate text-xs text-white/55">{track.isInstrumental ? 'Instrumental release' : 'Generated release'}</div>
                  </div>
                  <div class="text-xs text-white/55">{formatCompactNumber(track.playsCount || 0)}</div>
                  <div class="hidden text-xs text-white/40 sm:block">{formatCompactNumber(track.likesCount || 0)} likes</div>
                  <div onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()}>
                    <TrackOptionsMenu
                      song={{
                        id: track.id,
                        title: track.title,
                        prompt: track.prompt,
                        isInstrumental: track.isInstrumental,
                        videoUrl: track.videoUrl,
                        imageUrl: track.imageUrl || data.artist.userImage,
                        userId: data.artist.id,
                        artistId: data.artist.id
                      }}
                      buttonClass="opacity-100"
                    />
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <section class="space-y-4">
          <div>
            <h2 class="text-3xl font-black tracking-tight">Popular releases</h2>
            <p class="text-sm text-white/55">Albums, singles and playlists in the main flow, not detached from the discography.</p>
          </div>

          {#if releaseCards.length === 0}
            <div class="spotify-card rounded-2xl p-5 text-sm text-muted-foreground">
              No public releases available yet.
            </div>
          {:else}
            <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {#each releaseCards as release}
                <a href={release.href} class="spotify-card rounded-2xl p-3.5 transition-transform hover:-translate-y-1">
                  <div class="aspect-square overflow-hidden rounded-xl bg-zinc-900 shadow-lg">
                    {#if release.art}
                      <img src={release.art} alt={release.title} class="h-full w-full object-cover" />
                    {/if}
                  </div>
                  <div class="mt-3 space-y-1">
                    <div class="truncate text-sm font-bold text-white">{release.title}</div>
                    <div class="line-clamp-2 text-xs text-white/55">{release.subtitle}</div>
                    <div class="text-[11px] text-white/38">{release.meta}</div>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </section>
      </div>

      <aside class="space-y-8 xl:sticky xl:top-6">
        {#if spotlightRelease}
          <section class="space-y-4">
            <div>
              <h2 class="text-2xl font-black tracking-tight">Artist Pick</h2>
              <p class="text-sm text-white/55">Secondary spotlight, kept below the main profile context.</p>
            </div>

            <div class="overflow-hidden rounded-3xl border border-white/10 bg-white/6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
              <div class="aspect-[16/10] bg-zinc-900">
                {#if spotlightRelease.art}
                  <img src={spotlightRelease.art} alt={spotlightRelease.title} class="h-full w-full object-cover" />
                {/if}
              </div>
              <div class="space-y-3 p-5">
                <div class="text-xs font-bold uppercase tracking-[0.2em] text-qamuz-primary">Featured release</div>
                <div>
                  <h3 class="text-xl font-black text-white">{spotlightRelease.title}</h3>
                  <p class="mt-1 text-sm text-white/65">{spotlightRelease.subtitle}</p>
                </div>
                <p class="text-xs text-white/45">{spotlightRelease.meta}</p>
                {#if spotlightRelease.href !== '#'}
                  <a href={spotlightRelease.href} class="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/16">
                    Open release
                  </a>
                {/if}
              </div>
            </div>
          </section>
        {/if}
      </aside>
    </section>

    {#if relatedArtists.length > 0}
      <section class="space-y-4">
        <div>
          <h2 class="text-3xl font-black tracking-tight">Artistas similares</h2>
          <p class="text-sm text-white/55">Otros artistas de la comunidad de QAMUZ.</p>
        </div>

        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {#each relatedArtists as artist}
            <a href={`/artist/${artist.id}`} class="spotify-card rounded-2xl p-3.5 text-center transition-transform hover:-translate-y-1">
              <div class="mx-auto h-28 w-28 overflow-hidden rounded-full bg-zinc-900 shadow-lg">
                <img src={artist.avatarUrl} alt={artist.name} class="h-full w-full object-cover" />
              </div>
              <div class="mt-3">
                <div class="truncate text-sm font-bold text-white">{artist.name}</div>
                <div class="text-xs text-white/48">Artista</div>
              </div>
            </a>
          {/each}
        </div>
      </section>
    {/if}

    <section class="space-y-4">
      <div>
        <h2 class="text-3xl font-black tracking-tight">About</h2>
        <p class="text-sm text-white/55">Longer context belongs later in the page, after the music and related artists.</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div class="overflow-hidden rounded-3xl border border-white/10 bg-white/6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div class="aspect-[4/5] bg-zinc-900">
            {#if data.artist.userImage}
              <img src={data.artist.userImage} alt={data.artist.userName || 'Artist'} class="h-full w-full object-cover" />
            {/if}
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl bg-black/22 p-4">
              <div class="text-[11px] uppercase tracking-[0.18em] text-white/45">Monthly listeners</div>
              <div class="mt-1 text-2xl font-black text-white">{formatCompactNumber(monthlyListeners)}</div>
            </div>
            <div class="rounded-2xl bg-black/22 p-4">
              <div class="text-[11px] uppercase tracking-[0.18em] text-white/45">Followers</div>
              <div class="mt-1 text-2xl font-black text-white">{formatCompactNumber(followerCount)}</div>
            </div>
            <div class="rounded-2xl bg-black/22 p-4">
              <div class="text-[11px] uppercase tracking-[0.18em] text-white/45">Total plays</div>
              <div class="mt-1 text-2xl font-black text-white">{formatCompactNumber(totalTrackPlays)}</div>
            </div>
          </div>

          <div class="mt-6 max-w-3xl space-y-4">
            <p class="text-base leading-7 text-white/78">
              {data.artist.bio || 'This artist has not published a bio yet.'}
            </p>

            <div class="flex flex-wrap gap-2 text-xs text-white/45">
              <span class="rounded-full bg-black/22 px-3 py-1">{data.tracks.length} tracks</span>
              <span class="rounded-full bg-black/22 px-3 py-1">{data.publicPlaylists.length} releases</span>
              {#if data.artist.verifiedAt}
                <span class="rounded-full bg-black/22 px-3 py-1">Verified artist</span>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
