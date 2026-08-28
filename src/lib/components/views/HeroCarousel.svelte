<script lang="ts">
  import { onMount, onDestroy, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import type { GlobalMusicState } from '$lib/stores/music.svelte.js';
  import {
    ChevronLeftIcon,
    ChevronRightIcon,
    PlayIcon,
    PauseIcon,
    SparkleIcon,
    InfoIcon
  } from '$lib/icons/index.js';

  // State context
  const musicState = getContext<GlobalMusicState>('musicState');

  // Hardcoded English translations based on the prototype keys
  const t = (key: string) => {
    const map: Record<string, string> = {
      'hero.slide1Badge': 'NEW',
      'hero.slide1Title': 'Qamuz AI Studio',
      'hero.slide1Subtitle': 'Create original music with AI',
      'hero.slide1Desc': 'Turn your ideas into full tracks in seconds. Just type what you want to hear.',
      'hero.slide2Badge': 'TRENDING',
      'hero.slide2Title': 'Un Verano Sin Ti',
      'hero.slide2Subtitle': 'Bad Bunny',
      'hero.slide2Desc': 'The most streamed album globally.',
      'hero.slide3Badge': 'NEW RELEASE',
      'hero.slide3Title': 'Mañana Será Bonito',
      'hero.slide3Subtitle': 'Karol G',
      'hero.slide3Desc': 'Listen to the new album now.',
      'hero.slide4Badge': 'FOCUS',
      'hero.slide4Title': 'Lofi Beats',
      'hero.slide4Subtitle': 'Chill vibes for working',
      'hero.slide4Desc': 'Instrumental beats to keep you focused.',
      'hero.openAiStudio': 'Open Studio',
      'hero.playNow': 'Play Now',
      'hero.pause': 'Pause',
      'hero.learnMore': 'Learn More'
    };
    return map[key] || key;
  };

  const slides = [
    {
      id: 'slide-ai-studio',
      badgeKey: 'hero.slide1Badge',
      titleKey: 'hero.slide1Title',
      subtitleKey: 'hero.slide1Subtitle',
      descKey: 'hero.slide1Desc',
      bgImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-[#1DB954] to-cyan-500',
      badgeBg: 'bg-emerald-500/20 text-[#1DB954] border-emerald-500/40',
      actionType: 'navigate_ai'
    },
    {
      id: 'slide-bad-bunny',
      badgeKey: 'hero.slide2Badge',
      titleKey: 'hero.slide2Title',
      subtitleKey: 'hero.slide2Subtitle',
      descKey: 'hero.slide2Desc',
      bgImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-amber-500 to-red-600',
      badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      actionType: 'play_track',
      trackSample: {
        id: "1", 
        title: "Me Porto Bonito", 
        artist: "Bad Bunny", 
        coverUrl: "https://i.scdn.co/image/ab67616d00001e0249d6fd6e8f6e806f8664160a", 
        durationMs: 200000, 
        url: ""
      }
    },
    {
      id: 'slide-karol-g',
      badgeKey: 'hero.slide3Badge',
      titleKey: 'hero.slide3Title',
      subtitleKey: 'hero.slide3Subtitle',
      descKey: 'hero.slide3Desc',
      bgImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-pink-500 to-purple-600',
      badgeBg: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
      actionType: 'play_track',
      trackSample: {
        id: "2", 
        title: "PROVENZA", 
        artist: "Karol G", 
        coverUrl: "https://i.scdn.co/image/ab67616d00001e02f907de708b77134015dc3dfb", 
        durationMs: 200000, 
        url: ""
      }
    },
    {
      id: 'slide-lofi',
      badgeKey: 'hero.slide4Badge',
      titleKey: 'hero.slide4Title',
      subtitleKey: 'hero.slide4Subtitle',
      descKey: 'hero.slide4Desc',
      bgImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-cyan-500 to-blue-600',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      actionType: 'play_track',
      trackSample: {
        id: "3", 
        title: "Lofi Study", 
        artist: "Lofi Girl", 
        coverUrl: "https://i.scdn.co/image/ab67616d00001e02fddccf1fb360155b46e3fb27", 
        durationMs: 200000, 
        url: ""
      }
    }
  ];

  let currentIndex = $state(0);
  let isHovered = $state(false);
  let timer: ReturnType<typeof setInterval>;

  const currentSlide = $derived(slides[currentIndex]);

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (!isHovered) {
        currentIndex = (currentIndex + 1) % slides.length;
      }
    }, 5000);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
  }

  onMount(() => {
    startTimer();
  });

  onDestroy(() => {
    stopTimer();
  });

  $effect(() => {
    if (isHovered) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  function handlePrev() {
    currentIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
  }

  function handleNext() {
    currentIndex = (currentIndex + 1) % slides.length;
  }

  function handlePrimaryAction() {
    if (currentSlide.actionType === 'navigate_ai') {
      goto('/audio');
    } else if (currentSlide.actionType === 'play_track' && currentSlide.trackSample) {
      if (!currentSlide.trackSample.url) {
        goto('/library');
        return;
      }
      if (musicState.currentTrack?.id === currentSlide.trackSample.id) {
        musicState.togglePlay();
      } else {
        musicState.playTrack({
          id: currentSlide.trackSample.id,
          title: currentSlide.trackSample.title,
          artist: currentSlide.trackSample.artist,
          imageUrl: currentSlide.trackSample.coverUrl,
          url: currentSlide.trackSample.url,
          durationMs: currentSlide.trackSample.durationMs
        });
      }
    } else {
      goto('/library');
    }
  }

  const isCurrentPlaying = $derived(
    currentSlide.trackSample && 
    musicState.currentTrack?.id === currentSlide.trackSample.id && 
    musicState.isPlaying
  );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="relative w-full rounded-2xl overflow-hidden shadow-2xl group border border-zinc-800 bg-zinc-950 transition-all mb-8"
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
>
  <!-- Background Image Carousel Container -->
  <div class="relative h-[260px] sm:h-[320px] md:h-[360px] w-full overflow-hidden">
    {#each slides as slide, index (slide.id)}
      {@const isActive = index === currentIndex}
      <div
        class="absolute inset-0 transition-opacity duration-700 ease-in-out {isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}"
      >
        <!-- Image -->
        <img
          src={slide.bgImage}
          alt={t(slide.titleKey)}
          class="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-1000"
        />

        <!-- Dark Overlays & Gradients -->
        <div class="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent sm:w-3/4"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30"></div>

        <!-- Slide Content -->
        <div class="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end sm:justify-center max-w-2xl gap-3 text-white z-20">
          <div class="flex items-center gap-2">
            <span class="text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border {slide.badgeBg} backdrop-blur-md">
              {t(slide.badgeKey)}
            </span>
          </div>

          <h2 class="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none drop-shadow-md">
            {t(slide.titleKey)}
          </h2>

          <p class="text-xs sm:text-sm font-semibold text-zinc-300">
            {t(slide.subtitleKey)}
          </p>

          <p class="text-xs text-zinc-400 hidden sm:line-clamp-2 max-w-lg leading-relaxed">
            {t(slide.descKey)}
          </p>

          <!-- Call To Action Buttons -->
          <div class="flex items-center gap-3 mt-2">
            <button
              onclick={handlePrimaryAction}
              class="flex items-center gap-2 bg-qamuz-btn hover:bg-[#fcd338] text-black font-extrabold text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              {#if currentSlide.actionType === 'navigate_ai'}
                <SparkleIcon class="w-4 h-4 fill-current" />
                <span>{t('hero.openAiStudio')}</span>
              {:else}
                {#if isCurrentPlaying}
                  <PauseIcon class="w-4 h-4 fill-current" />
                  <span>{t('hero.pause')}</span>
                {:else}
                  <PlayIcon class="w-4 h-4 fill-current" />
                  <span>{t('hero.playNow')}</span>
                {/if}
              {/if}
            </button>

            <button
              onclick={() => {
                if (currentSlide.actionType === 'navigate_ai') {
                  goto('/audio');
                } else {
                  goto('/library');
                }
              }}
              class="flex items-center gap-2 bg-black/50 hover:bg-zinc-800/80 text-white font-bold text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-full border border-zinc-700/80 backdrop-blur-md transition-all hover:border-zinc-500"
            >
              <InfoIcon class="w-4 h-4" />
              <span class="hidden sm:inline">{t('hero.learnMore')}</span>
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Navigation Arrows -->
  <button
    onclick={handlePrev}
    class="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-zinc-700/60 transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 backdrop-blur-md shadow-2xl"
    title="Previous"
  >
    <ChevronLeftIcon class="w-6 h-6" />
  </button>

  <button
    onclick={handleNext}
    class="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-zinc-700/60 transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 backdrop-blur-md shadow-2xl"
    title="Next"
  >
    <ChevronRightIcon class="w-6 h-6" />
  </button>

  <!-- Pagination Dots -->
  <div class="absolute bottom-3 right-4 sm:right-6 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800">
    {#each slides as _, idx}
      <button
        onclick={() => currentIndex = idx}
        class="transition-all rounded-full {idx === currentIndex ? 'w-6 h-2 bg-[#ffde59]' : 'w-2 h-2 bg-zinc-600 hover:bg-zinc-400'}"
        title="Slide {idx + 1}"
      ></button>
    {/each}
  </div>
</div>
