<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';

  // State
  let isDrawerOpen = $state(false);
  let lang = $state<'es' | 'en'>('es');
  let currentSlide = $state(0);
  let mode = $state<'vocal' | 'instrumental'>('vocal');
  let promptText = $state('Salsa brava con solo de trombón ardiente, piano montuno y congas al golpe');
  let isPlaying = $state(true);
  let isGenerating = $state(false);
  let generatedSuccess = $state(false);

  const totalSlides = 4;
  let autoSlideTimer: any = null;

  const slides = [
    {
      title: 'Salsa Brava & Timba Cubana',
      tag: 'Clave 3:2 • 106 BPM',
      subtag: '🎺 Metales & Timbal',
      desc: 'Montuno sincopado de piano analógico, congas ardientes en tempo real y pregones orquestales con metales vivos.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDi-XLZwe6_sfbnkukW2Utmej2ER3UO7s0_-OMKePP8DouW1BuOlrC5Elf2_o5xku7F4WtrJ1OcmXCW74XSZ1ctag-U4xjVfcuNphb4Ea07YXtLmagksoGUQjpZgLN9l7B7pFL-VhzkhI1YtX2fx_5m6Oj2iFY_F4xZM8K_preYuagbc0g8zyQ2uheru0rBdGRRh6rWaal0OFkpRatUDfXYbJHGOvgOsDYBRsmB1xe1c40xLFCBfuA',
      badgeColor: 'bg-[#00ff88]/20 border-[#00ff88]/40 text-[#00ff88]',
      subColor: 'text-[#E5B842]'
    },
    {
      title: 'Bachata Sensual & Moderna',
      tag: '130 BPM • Dominicana',
      subtag: '🎸 Requinto Virtuoso',
      desc: 'Línea de requinto brillante con chorus vintage, percusión de martillo en bongó y subgraves envolventes.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpM99s7ecom1-08S1U0oddL2z82xT-AKGVDqshDxrEeyrVpqkrRx9_9uuyfRrGHJKu0luVOTy1FLkzKw_Cm4B4WDKbpsNufrCvjXX4j6dJZpjNWnglXFPIBgJGXPKW9oOdlWCDICmvqK_iwBUPIvg08dBPspVbiJW9nlwoNhe8hSLDWFuRBwEoILwbHsYb2WpRjtfOmAbAyhc7ee_jzaqmesgD-m0Cpgluj4BOVCLyLC2KixWO-CQ',
      badgeColor: 'bg-[#ffb1c5]/20 border-[#ffb1c5]/40 text-[#ffb1c5]',
      subColor: 'text-[#00daf3]'
    },
    {
      title: 'Reggaetón 2025 & Dembow Pro',
      tag: '94-118 BPM • 2025',
      subtag: '🔥 Sub 808 & Kick Seco',
      desc: 'Pegada demoledora, percusión sincopada callejera y procesamiento vocal con autotune de última generación.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOF8yreMJvdw5pEBEiiCUyuO6j67bLUPB7FuNpgdSw6bWoo2EfMUPoRaNDtDnkJUo-bg5c2N9kkT054tPKRvGibL_oCnGV7alZMEEnUswnVtpG3NFDAPer-DzeEU6gP6PlqQyhdVp7gXgNEaLBR3KK6KFBNtIq1ccZu_wO6wqaAYKGdAu-x1j-Tw8SnQn6C0VDJ9E5NlXs3rT6W70Nu1E4eLCmHolx1BXkyUwNgHjLgGKU0-bm8RU',
      badgeColor: 'bg-[#00daf3]/20 border-[#00daf3]/40 text-[#00daf3]',
      subColor: 'text-[#FF2A55]'
    },
    {
      title: 'Merengue Mambo & Cumbia Sonidera',
      tag: '100-165 BPM • Caribe',
      subtag: '🪗 Acordeón & Tambora',
      desc: 'Golpe festivo, güiro con sabrosura, acordeón cromático y saxofones mamberos explosivos listos para pista.',
      img: 'https://lh3.googleusercontent.com/aida/AEtjO1UeOzmtDKZ6Fe2L4C_nPBhSco2SXsbG97d0i7WKqjLSABcSNgIqfjjK6fzZ6hd0xJEMRW4VaVv0TppTtKFHqu6lndFUQvO7RTMcudTOwg59w_Y63LZq5Ok-a0vxl16LAxeYcLsVclb5MwyOiwdwfd6fVm9fIlHKY-s7ZxxJnwepinqJ7S7Ukgwm4LngoK7w8yxXOxLRBb5_gBBq-vcXTI-dPw5NNoSiAbe_5rHwUOWBqCz_B3aKQtA4-g',
      badgeColor: 'bg-[#E5B842]/20 border-[#E5B842]/40 text-[#E5B842]',
      subColor: 'text-[#00ff88]'
    }
  ];

  function updateSlider(index: number) {
    currentSlide = (index + totalSlides) % totalSlides;
  }

  function startAutoSlide() {
    clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(() => {
      updateSlider(currentSlide + 1);
    }, 4500);
  }

  function toggleDrawer() {
    isDrawerOpen = !isDrawerOpen;
  }

  function closeDrawer() {
    isDrawerOpen = false;
  }

  function selectGenre(text: string) {
    promptText = text;
    const promptElem = document.getElementById('prompt-section');
    if (promptElem) {
      promptElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function handleQuickCreate() {
    isGenerating = true;
    setTimeout(() => {
      isGenerating = false;
      generatedSuccess = true;
      setTimeout(() => {
        generatedSuccess = false;
        goto(`/audio?prompt=${encodeURIComponent(promptText)}`);
      }, 900);
    }, 1200);
  }

  let touchStartX = 0;
  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
  }
  function handleTouchEnd(e: TouchEvent) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) updateSlider(currentSlide + 1);
      else updateSlider(currentSlide - 1);
      startAutoSlide();
    }
  }

  onMount(() => {
    startAutoSlide();
  });

  onDestroy(() => {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
  });
</script>

<svelte:head>
  <title>QAMUZ AI - Música Tropical & Urbana</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
</svelte:head>

<div class="modern-landing bg-[#0a0b0e] text-[#F8F9FA] font-sans flex flex-col min-h-screen relative antialiased selection:bg-[#00ff88] selection:text-[#003919] overflow-x-hidden">
  <!-- 1. Header Responsivo (Mobile Compacto + Desktop Completo) -->
  <header class="fixed top-0 w-full z-40 pt-safe bg-[#0a0b0e]/85 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
    <div class="max-w-7xl mx-auto h-16 px-4 md:px-8 flex items-center justify-between">
      <!-- Brand & Mobile Toggle -->
      <div class="flex items-center gap-3 md:gap-8">
        <!-- Botón Hamburger (Visible sólo en Mobile/Tablet <lg) -->
        <button
          type="button"
          aria-label="Abrir Menú"
          class="lg:hidden w-9 h-9 rounded-xl bg-[#14151B] border border-white/10 flex items-center justify-center text-[#F8F9FA] hover:border-[#00ff88]/40 active:scale-95 transition-all"
          onclick={toggleDrawer}
        >
          <span class="material-symbols-outlined text-[21px] transition-transform duration-300">
            {isDrawerOpen ? 'close' : 'menu'}
          </span>
        </button>

        <!-- Logo QAMUZ -->
        <a class="flex items-center gap-2.5 group cursor-pointer" href="/" id="brand-link">
          <div class="q-symbol-container flex-shrink-0 scale-105 transition-transform group-hover:scale-110">
            <div class="q-ring"></div>
            <div class="q-slash"></div>
          </div>
          <div class="flex items-baseline tracking-wider">
            <span class="font-headline font-bold text-xl md:text-2xl text-white">Q</span>
            <span class="font-headline font-bold text-xl md:text-2xl text-[#F8F9FA] tracking-wide">AMUZ</span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#00ff88] ml-1 shadow-[0_0_6px_#00FF88]"></span>
          </div>
        </a>

        <!-- Desktop Links de Navegación -->
        <nav class="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-300">
          <a class="text-white font-semibold flex items-center gap-1.5 hover:text-[#00ff88] transition-colors" href="/audio">
            <span>Estudio DAW</span>
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] font-bold">96kHz</span>
          </a>
          <a class="hover:text-[#00ff88] transition-colors" href="#catalogo-generos">Géneros</a>
          <a class="hover:text-[#00ff88] transition-colors" href="#prompt-section">Generador IA</a>
          <a class="hover:text-[#00ff88] transition-colors" href="#planes-section">Planes &amp; Stems</a>
          <a class="hover:text-[#00ff88] transition-colors flex items-center gap-1" href="#daw-monitor">
            <span class="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></span>
            <span>Live Monitor</span>
          </a>
        </nav>
      </div>

      <!-- Quick Actions & Profile (Mobile compacto / Desktop completo) -->
      <div class="flex items-center gap-2.5 md:gap-4">
        <!-- Search Input Desktop -->
        <div class="hidden md:flex items-center relative w-56 lg:w-72">
          <span class="material-symbols-outlined absolute left-3 text-[18px] text-zinc-500">search</span>
          <input
            class="w-full h-9 pl-9 pr-3 rounded-full bg-[#14151B] border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#00ff88]/60 focus:ring-1 focus:ring-[#00ff88]/50 transition-all"
            placeholder="Buscar ritmos, BPM, artistas..."
            type="text"
          />
        </div>

        <!-- Selector de Idioma Desktop -->
        <div class="hidden sm:flex items-center p-0.5 rounded-full bg-[#14151B] border border-white/10 text-xs font-mono">
          <button
            type="button"
            class="px-2.5 py-1 rounded-full {lang === 'es' ? 'bg-[#00ff88] text-[#003919] font-bold shadow-[0_0_6px_rgba(0,255,136,0.3)]' : 'text-[#8E92A4] hover:text-white'} transition-all"
            onclick={() => (lang = 'es')}
          >
            ES
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-full {lang === 'en' ? 'bg-[#00ff88] text-[#003919] font-bold shadow-[0_0_6px_rgba(0,255,136,0.3)]' : 'text-[#8E92A4] hover:text-white'} transition-all"
            onclick={() => (lang = 'en')}
          >
            EN
          </button>
        </div>

        <!-- Botón Crear Música -->
        <a
          aria-label="Crear Música"
          class="h-9 px-3.5 md:px-5 rounded-full bg-[#00ff88] text-[#003919] font-headline font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-[0_0_14px_rgba(0,255,136,0.4)] hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] active:scale-95 transition-all"
          href="/login"
        >
          <span class="material-symbols-outlined text-[18px]">bolt</span>
          <span class="hidden sm:inline">Crear Tema</span>
        </a>

        <!-- Botón Iniciar Sesión / Perfil -->
        <a
          href="/login"
          aria-label="Iniciar Sesión"
          class="h-9 px-3 rounded-full bg-[#2C2D35]/70 border border-white/10 flex items-center justify-center gap-1.5 text-[#8E92A4] hover:text-white hover:border-[#00ff88]/40 active:scale-95 transition-all text-xs font-semibold"
          title="Iniciar Sesión"
        >
          <span class="material-symbols-outlined text-[19px]">person</span>
          <span class="hidden md:inline text-white">Entrar</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Drawer / Sidebar Desplegable Interactivo (Mobile) -->
  {#if isDrawerOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 lg:hidden"
      onclick={closeDrawer}
    ></div>
  {/if}

  <aside
    class="fixed top-0 left-0 bottom-0 w-[84%] max-w-[340px] bg-[#0B0C10] border-r border-white/10 z-50 flex flex-col justify-between p-5 pt-safe pb-safe {isDrawerOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-out shadow-2xl overflow-y-auto no-scrollbar lg:hidden"
  >
    <!-- Drawer Top: Logo Único 'QAMUZ' y botón Cerrar -->
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between pb-4 border-b border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="q-symbol-container flex-shrink-0">
            <div class="q-ring"></div>
            <div class="q-slash"></div>
          </div>
          <div class="flex items-baseline">
            <span class="font-headline font-bold text-xl tracking-wider text-white">Q</span>
            <span class="font-headline font-bold text-xl tracking-wider text-[#F8F9FA]">AMUZ</span>
            <span class="w-1.5 h-1.5 rounded-full bg-[#00ff88] ml-1 shadow-[0_0_6px_#00FF88]"></span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar Menú"
          class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
          onclick={closeDrawer}
        >
          <span class="material-symbols-outlined text-[19px]">close</span>
        </button>
      </div>

      <!-- Lista de Navegación Expandida -->
      <nav class="flex flex-col gap-1.5">
        <span class="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1 px-2">Navegación de Estudio</span>
        <a
          class="drawer-nav-item flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] group transition-all"
          href="/"
          onclick={closeDrawer}
        >
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[20px]">home</span>
            <div class="flex flex-col">
              <span class="font-headline font-semibold text-sm text-white group-hover:text-[#00ff88] transition-colors">Inicio</span>
              <span class="text-[10px] text-zinc-400">Dashboard &amp; Feed</span>
            </div>
          </div>
          <span class="material-symbols-outlined text-[16px] text-[#00ff88] opacity-80">chevron_right</span>
        </a>

        <a
          class="drawer-nav-item flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#14151B] text-zinc-300 hover:text-white border border-transparent hover:border-white/5 group transition-all"
          href="/audio"
          onclick={closeDrawer}
        >
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[20px] text-zinc-400 group-hover:text-[#00ff88] transition-colors">graphic_eq</span>
            <div class="flex flex-col">
              <span class="font-headline font-semibold text-sm text-white group-hover:text-[#00ff88] transition-colors">DAW Studio</span>
              <span class="text-[10px] text-zinc-500">Secuenciador IA v4.2</span>
            </div>
          </div>
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] font-bold">96kHz</span>
        </a>

        <a
          class="drawer-nav-item flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#14151B] text-zinc-300 hover:text-white border border-transparent hover:border-white/5 group transition-all"
          href="#catalogo-generos"
          onclick={closeDrawer}
        >
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[20px] text-zinc-400 group-hover:text-[#ffb1c5] transition-colors">library_music</span>
            <div class="flex flex-col">
              <span class="font-headline font-semibold text-sm text-white group-hover:text-[#ffb1c5] transition-colors">Explorar Géneros</span>
              <span class="text-[10px] text-zinc-500">Tropicales &amp; Urbanos</span>
            </div>
          </div>
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">Presets</span>
        </a>

        <a
          class="drawer-nav-item flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#14151B] text-zinc-300 hover:text-white border border-transparent hover:border-white/5 group transition-all"
          href="#daw-monitor"
          onclick={closeDrawer}
        >
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[20px] text-zinc-400 group-hover:text-[#E5B842] transition-colors">tune</span>
            <div class="flex flex-col">
              <span class="font-headline font-semibold text-sm text-white group-hover:text-[#E5B842] transition-colors">Mixer Analógico</span>
              <span class="text-[10px] text-zinc-500">Separador de Stems</span>
            </div>
          </div>
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#E5B842]/20 text-[#E5B842] font-bold">-9 LUFS</span>
        </a>

        <a
          class="drawer-nav-item flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#14151B] text-zinc-300 hover:text-white border border-transparent hover:border-white/5 group transition-all"
          href="#planes-section"
          onclick={closeDrawer}
        >
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-[20px] text-zinc-400 group-hover:text-[#00daf3] transition-colors">diamond</span>
            <div class="flex flex-col">
              <span class="font-headline font-semibold text-sm text-white group-hover:text-[#00daf3] transition-colors">Planes &amp; Créditos</span>
              <span class="text-[10px] text-zinc-500">Stems y Derechos Full</span>
            </div>
          </div>
          <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00ff88] text-[#003919] font-bold shadow-[0_0_6px_rgba(0,255,136,0.3)]">PRO</span>
        </a>
      </nav>
    </div>

    <!-- Drawer Bottom: Selector Idioma + Botón Crear Canción -->
    <div class="flex flex-col gap-3 pt-4 border-t border-white/10 mt-4">
      <div class="flex items-center justify-between px-2">
        <span class="text-xs font-mono text-zinc-400">Idioma / Language</span>
        <div class="flex items-center p-0.5 rounded-full bg-[#14151B] border border-white/10 text-xs font-mono">
          <button
            type="button"
            class="px-2.5 py-0.5 rounded-full {lang === 'es' ? 'bg-[#00ff88] text-[#003919] font-bold shadow-[0_0_6px_rgba(0,255,136,0.3)]' : 'text-[#8E92A4] hover:text-white'} transition-all"
            onclick={() => (lang = 'es')}
          >
            ES
          </button>
          <span class="text-white/20 text-[10px] px-0.5">|</span>
          <button
            type="button"
            class="px-2.5 py-0.5 rounded-full {lang === 'en' ? 'bg-[#00ff88] text-[#003919] font-bold shadow-[0_0_6px_rgba(0,255,136,0.3)]' : 'text-[#8E92A4] hover:text-white'} transition-all"
            onclick={() => (lang = 'en')}
          >
            EN
          </button>
        </div>
      </div>
      <a
        class="w-full py-2.5 rounded-xl bg-[#00ff88] text-[#003919] font-headline font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(0,255,136,0.35)] active:scale-95 transition-all"
        href="/login"
        onclick={closeDrawer}
      >
        <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
        <span>Crear Canción Gratis</span>
      </a>
      <div class="flex items-center justify-center gap-2 text-[10px] font-mono text-zinc-500 pt-1">
        <span class="w-1.5 h-1.5 rounded-full bg-[#00ff88]"></span>
        <span>Engine v4.2 • Baja Latencia Activa</span>
      </div>
    </div>
  </aside>

  <!-- Main Content Flow Responsivo -->
  <main class="flex flex-col relative w-full pt-16 pb-20 md:pb-8 min-h-screen">
    <!-- Ambient studio glows -->
    <div class="absolute top-16 left-1/2 -translate-x-1/2 w-72 md:w-[600px] h-44 md:h-80 bg-gradient-to-b from-[#681e37]/20 to-transparent blur-3xl pointer-events-none -z-10"></div>
    <div class="absolute top-96 right-0 w-60 md:w-96 h-60 md:h-96 bg-[#00ff88]/10 blur-3xl pointer-events-none -z-10"></div>

    <div class="max-w-7xl mx-auto w-full px-4 md:px-8 space-y-6 md:space-y-8 mt-2 md:mt-4">
      <!-- 2. Slideshow / Hero Interactivo de Estilos Latinos -->
      <section class="w-full">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="relative w-full rounded-2xl md:rounded-3xl overflow-hidden bg-[#14151B] border border-white/10 shadow-2xl"
          ontouchstart={handleTouchStart}
          ontouchend={handleTouchEnd}
        >
          <!-- Slide Track Container -->
          <div class="flex transition-transform duration-500 ease-out w-full" style="transform: translateX(-{currentSlide * 100}%);">
            {#each slides as slide, idx}
              <div class="min-w-full relative h-[280px] sm:h-[340px] md:h-[420px] lg:h-[460px] p-5 md:p-10 flex flex-col justify-end overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10"></div>
                <img
                  alt={slide.title}
                  class="absolute inset-0 w-full h-full object-cover opacity-45 transform scale-105"
                  src={slide.img}
                />
                <div class="relative z-20 flex flex-col gap-1.5 md:gap-2 max-w-2xl">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-2.5 py-0.5 rounded-full {slide.badgeColor} border text-[11px] md:text-xs font-mono font-bold uppercase">
                      {slide.tag}
                    </span>
                    <span class="text-xs md:text-sm font-mono {slide.subColor}">
                      {slide.subtag}
                    </span>
                  </div>
                  <h2 class="font-headline text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                    {slide.title}
                  </h2>
                  <p class="text-xs sm:text-sm md:text-base text-zinc-300 line-clamp-2">
                    {slide.desc}
                  </p>
                </div>
              </div>
            {/each}
          </div>

          <!-- Navigation Buttons -->
          <button
            type="button"
            aria-label="Anterior"
            class="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-9 h-9 md:w-12 md:h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/80 hover:border-[#00ff88]/50 active:scale-90 transition-all z-30 cursor-pointer"
            onclick={() => {
              updateSlider(currentSlide - 1);
              startAutoSlide();
            }}
          >
            <span class="material-symbols-outlined text-[20px] md:text-[24px]">chevron_left</span>
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            class="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-9 h-9 md:w-12 md:h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-black/80 hover:border-[#00ff88]/50 active:scale-90 transition-all z-30 cursor-pointer"
            onclick={() => {
              updateSlider(currentSlide + 1);
              startAutoSlide();
            }}
          >
            <span class="material-symbols-outlined text-[20px] md:text-[24px]">chevron_right</span>
          </button>

          <!-- Dots Indicator -->
          <div class="absolute bottom-3 md:bottom-5 inset-x-0 z-30 flex items-center justify-center gap-2">
            {#each slides as _, idx}
              <button
                type="button"
                aria-label="Slide {idx + 1}"
                class="{idx === currentSlide ? 'w-6 md:w-8 h-1.5 md:h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00FF88]' : 'w-2 h-1.5 md:h-2 rounded-full bg-white/30'} transition-all cursor-pointer"
                onclick={() => {
                  updateSlider(idx);
                  startAutoSlide();
                }}
              ></button>
            {/each}
          </div>
        </div>
      </section>

      <!-- 3. Consola de Creación: Quick Prompt Creator -->
      <section class="w-full" id="prompt-section">
        <div class="p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#14151B] border border-white/10 shadow-xl flex flex-col gap-4">
          <!-- Input & Mode Selector Header -->
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs md:text-sm font-mono text-[#00ff88] flex items-center gap-1.5 font-semibold">
                <span class="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse"></span>
                MOTOR TROPICAL &amp; URBANO IA v4.2
              </span>
              <span class="hidden sm:inline-block text-[11px] font-mono text-zinc-500 bg-[#0B0C10] px-2 py-0.5 rounded border border-white/5">
                DSP 96kHz Lossless
              </span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center p-0.5 rounded-lg bg-[#0B0C10] border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  class="px-3 py-1 rounded-md {mode === 'vocal' ? 'bg-[#00ff88] text-[#003919] font-bold' : 'text-[#8E92A4] hover:text-white'} transition-all cursor-pointer"
                  onclick={() => (mode = 'vocal')}
                >
                  Vocal
                </button>
                <button
                  type="button"
                  class="px-3 py-1 rounded-md {mode === 'instrumental' ? 'bg-[#00ff88] text-[#003919] font-bold' : 'text-[#8E92A4] hover:text-white'} transition-all cursor-pointer"
                  onclick={() => (mode = 'instrumental')}
                >
                  Instrumental
                </button>
              </div>
            </div>
          </div>

          <div class="relative">
            <textarea
              class="w-full bg-[#0B0C10] text-sm md:text-base text-white placeholder:text-zinc-500 rounded-xl p-3.5 md:p-4 border border-white/10 focus:border-[#00ff88]/60 focus:outline-none focus:ring-1 focus:ring-[#00ff88]/60 resize-none transition-all"
              id="prompt-box"
              placeholder="Describe tu tema tropical o urbano (ej. Salsa brava con trombón ardiente o Dembow 118 BPM con bajo 808)..."
              rows="2"
              bind:value={promptText}
            ></textarea>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-xs font-mono text-zinc-400 self-start sm:self-center flex-wrap">
              <span class="text-zinc-500">Sugerencias rápidas:</span>
              <button
                type="button"
                class="hover:text-[#00ff88] underline decoration-dotted text-zinc-300 cursor-pointer"
                onclick={() => selectGenre('Bachata sensual con requinto agudo y bajo melódico moderno')}
              >
                Bachata Requinto
              </button>
              <span>•</span>
              <button
                type="button"
                class="hover:text-[#00ff88] underline decoration-dotted text-zinc-300 cursor-pointer"
                onclick={() => selectGenre('Dembow dominicano con kick seco a 118 BPM y palitos callejeros')}
              >
                Dembow 118
              </button>
            </div>

            <button
              type="button"
              class="w-full sm:w-auto sm:min-w-[240px] h-12 px-6 rounded-xl bg-[#00ff88] text-[#003919] font-headline font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.35)] hover:shadow-[0_0_28px_rgba(0,255,136,0.55)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
              onclick={handleQuickCreate}
              disabled={isGenerating}
            >
              {#if isGenerating}
                <span class="material-symbols-outlined text-[19px] animate-spin">sync</span>
                <span>Sintetizando Orquesta Lossless...</span>
              {:else if generatedSuccess}
                <span class="material-symbols-outlined text-[19px]">check_circle</span>
                <span>¡Tema Listo! Abriendo Studio...</span>
              {:else}
                <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
                <span>Crear Canción Gratis</span>
              {/if}
            </button>
          </div>
        </div>
      </section>

      <!-- 4. Mini Tarjeta DAW / Reproductor en Tiempo Real -->
      <section class="w-full" id="daw-monitor">
        <div class="p-4 md:p-5 rounded-2xl md:rounded-3xl bg-[#1A1C24] border border-white/10 flex flex-col gap-3 shadow-lg">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-3 md:gap-4">
              <button
                type="button"
                aria-label="Reproducir/Pausar"
                class="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#00ff88] text-[#003919] flex items-center justify-center shadow-[0_0_14px_rgba(0,255,136,0.4)] active:scale-90 hover:scale-105 transition-all flex-shrink-0 cursor-pointer"
                onclick={() => (isPlaying = !isPlaying)}
              >
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <div class="flex flex-col">
                <div class="flex items-center gap-2">
                  <span class="text-sm md:text-base font-bold text-white">Fuego &amp; Candela (Stems Live)</span>
                  <span class="hidden md:inline-flex text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] font-bold">MULTITRACK 4x</span>
                </div>
                <span class="text-[11px] md:text-xs font-mono text-zinc-400">106 BPM • Clave 3:2 • 96kHz Master DSP • -9.2 LUFS</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 rounded-md bg-white/5 text-[10px] md:text-xs font-mono text-[#E5B842] border border-[#E5B842]/30 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-[#E5B842] {isPlaying ? 'animate-ping' : ''}"></span>
                MONITOR DE ESTUDIO ON
              </span>
            </div>
          </div>

          <!-- Forma de onda animada -->
          <div class="flex items-center gap-1 md:gap-1.5 h-9 md:h-11 px-3 rounded-xl bg-[#0B0C10] border border-white/5 overflow-hidden">
            <div class="flex-1 bg-[#00ff88] h-3 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}"></div>
            <div class="flex-1 bg-[#00ff88] h-6 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 80ms"></div>
            <div class="flex-1 bg-[#E5B842] h-8 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 140ms"></div>
            <div class="flex-1 bg-[#00ff88] h-4 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 200ms"></div>
            <div class="flex-1 bg-[#00daf3] h-7 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 110ms"></div>
            <div class="flex-1 bg-[#00ff88] h-5 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 240ms"></div>
            <div class="flex-1 bg-[#E5B842] h-7 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 170ms"></div>
            <div class="flex-1 bg-[#FF2A55] h-4 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 90ms"></div>
            <div class="flex-1 bg-[#00ff88] h-8 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 300ms"></div>
            <div class="flex-1 bg-[#00daf3] h-5 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 160ms"></div>
            <div class="flex-1 bg-[#00ff88] h-7 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 220ms"></div>
            <div class="flex-1 bg-[#E5B842] h-4 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 80ms"></div>
            <div class="flex-1 bg-[#00ff88] h-3 rounded-full {isPlaying ? 'animate-pulse' : 'opacity-30'}" style="animation-delay: 130ms"></div>
          </div>

          <!-- Instrumentos activos y status de tiempo -->
          <div class="flex items-center justify-between text-[11px] md:text-xs font-mono text-[#8E92A4] px-1">
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-[#00ff88]"></span>
              <span class="text-zinc-300 font-medium">Congas L/R • Piano Montuno • Trombón Mudo • Bajo Baby</span>
            </div>
            <span class="text-zinc-400 font-bold">01:24 / 03:40</span>
          </div>
        </div>
      </section>

      <!-- 5. SECCIÓN DE GÉNEROS CON IMAGEN DE FONDO DE ESTUDIO -->
      <section class="w-full relative rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl p-5 md:p-8" id="catalogo-generos">
        <img
          alt="Estudio de Grabación Profesional"
          class="absolute inset-0 w-full h-full object-cover object-center opacity-30 select-none pointer-events-none scale-105"
          src="https://lh3.googleusercontent.com/aida/AEtjO1UeOzmtDKZ6Fe2L4C_nPBhSco2SXsbG97d0i7WKqjLSABcSNgIqfjjK6fzZ6hd0xJEMRW4VaVv0TppTtKFHqu6lndFUQvO7RTMcudTOwg59w_Y63LZq5Ok-a0vxl16LAxeYcLsVclb5MwyOiwdwfd6fVm9fIlHKY-s7ZxxJnwepinqJ7S7Ukgwm4LngoK7w8yxXOxLRBb5_gBBq-vcXTI-dPw5NNoSiAbe_5rHwUOWBqCz_B3aKQtA4-g"
        />
        <div class="absolute inset-0 bg-gradient-to-b from-[#0a0b0e]/95 via-[#0a0b0e]/85 to-[#0a0b0e]/95 backdrop-blur-[2px] pointer-events-none"></div>

        <div class="relative z-10 flex flex-col gap-6 md:gap-8">
          <!-- Header de la Sección -->
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00FF88]"></span>
                <span class="text-xs font-mono text-[#00ff88] font-semibold uppercase tracking-wider">Catálogo Musical Especializado</span>
              </div>
              <h3 class="font-headline text-2xl md:text-3xl font-bold text-white mt-1">Explorar por Género</h3>
              <p class="text-xs md:text-sm text-zinc-300 max-w-xl mt-0.5">Modelos orquestales afinados en vivo: percusión acústica latina, vientos sincopados y síntesis urbana 2025.</p>
            </div>
            <div class="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#00ff88]">1-Tap Generación Instantánea</span>
            </div>
          </div>

          <!-- Categoría 1: RITMOS TROPICALES -->
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="text-lg">🌴</span>
              <h4 class="font-headline text-lg md:text-xl font-bold text-white tracking-wide">Tropical &amp; Tradicional Antillano</h4>
              <span class="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">4 Estilos</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <!-- Salsa Brava & Timba -->
              <button
                type="button"
                class="genre-card p-4 rounded-xl bg-[#0B0C10]/90 border border-white/10 text-left hover:border-[#00ff88]/60 hover:bg-[#14151B] active:scale-[0.98] transition-all group shadow-md cursor-pointer"
                onclick={() => selectGenre('Salsa Brava y Timba Cubana con sección ardiente de metales, clave 3:2, tumbao en piano y congas afinadas')}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl group-hover:scale-110 transition-transform">🎺</span>
                  <span class="text-[10px] font-mono text-[#00ff88] bg-[#00ff88]/15 px-2 py-0.5 rounded-full font-bold border border-[#00ff88]/30">Clave 3:2 • 106 BPM</span>
                </div>
                <div class="font-headline font-semibold text-base text-white group-hover:text-[#00ff88] transition-colors">Salsa Brava &amp; Timba</div>
                <div class="text-xs text-[#8E92A4] mt-0.5">Metales sincopados, montuno &amp; pregones</div>
                <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Campana &amp; Güiro</span>
                  <span class="text-[#00ff88] font-semibold group-hover:translate-x-0.5 transition-transform">Generar →</span>
                </div>
              </button>

              <!-- Bachata Sensual -->
              <button
                type="button"
                class="genre-card p-4 rounded-xl bg-[#0B0C10]/90 border border-white/10 text-left hover:border-[#ffb1c5]/60 hover:bg-[#14151B] active:scale-[0.98] transition-all group shadow-md cursor-pointer"
                onclick={() => selectGenre('Bachata Sensual Dominicana con requinto virtuoso, guira metálica, martillo en bongó y bajo profundo')}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl group-hover:scale-110 transition-transform">🎸</span>
                  <span class="text-[10px] font-mono text-[#ffb1c5] bg-[#ffb1c5]/15 px-2 py-0.5 rounded-full font-bold border border-[#ffb1c5]/30">130 BPM • Dominicana</span>
                </div>
                <div class="font-headline font-semibold text-base text-white group-hover:text-[#ffb1c5] transition-colors">Bachata Sensual</div>
                <div class="text-xs text-[#8E92A4] mt-0.5">Requinto virtuoso, martillo &amp; bajo melódico</div>
                <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Bongó &amp; Güira</span>
                  <span class="text-[#ffb1c5] font-semibold group-hover:translate-x-0.5 transition-transform">Generar →</span>
                </div>
              </button>

              <!-- Cumbia Sonidera -->
              <button
                type="button"
                class="genre-card p-4 rounded-xl bg-[#0B0C10]/90 border border-white/10 text-left hover:border-[#E5B842]/60 hover:bg-[#14151B] active:scale-[0.98] transition-all group shadow-md cursor-pointer"
                onclick={() => selectGenre('Cumbia Sonidera y Colombiana con sintetizadores retro, güiro arrastrado, acordeón cromático y bajo marcado')}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl group-hover:scale-110 transition-transform">🪗</span>
                  <span class="text-[10px] font-mono text-[#E5B842] bg-[#E5B842]/15 px-2 py-0.5 rounded-full font-bold border border-[#E5B842]/30">98 BPM • Clásico</span>
                </div>
                <div class="font-headline font-semibold text-base text-white group-hover:text-[#E5B842] transition-colors">Cumbia Sonidera</div>
                <div class="text-xs text-[#8E92A4] mt-0.5">Güiro sabroso, sintetizadores &amp; acordeón</div>
                <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Ritmo Arrastrado</span>
                  <span class="text-[#E5B842] font-semibold group-hover:translate-x-0.5 transition-transform">Generar →</span>
                </div>
              </button>

              <!-- Merengue Mambo -->
              <button
                type="button"
                class="genre-card p-4 rounded-xl bg-[#0B0C10]/90 border border-white/10 text-left hover:border-[#00daf3]/60 hover:bg-[#14151B] active:scale-[0.98] transition-all group shadow-md cursor-pointer"
                onclick={() => selectGenre('Merengue Mambo caribeño con tambora veloz a dos baquetas, saxofones mamberos ardientes y güira picada')}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl group-hover:scale-110 transition-transform">🥁</span>
                  <span class="text-[10px] font-mono text-[#00daf3] bg-[#00daf3]/15 px-2 py-0.5 rounded-full font-bold border border-[#00daf3]/30">160 BPM • Rápido</span>
                </div>
                <div class="font-headline font-semibold text-base text-white group-hover:text-[#00daf3] transition-colors">Merengue Mambo</div>
                <div class="text-xs text-[#8E92A4] mt-0.5">Tambora veloz, saxos explosivos &amp; fiesta</div>
                <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Mambo Urbano</span>
                  <span class="text-[#00daf3] font-semibold group-hover:translate-x-0.5 transition-transform">Generar →</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Categoría 2: URBANO & MODERNO -->
          <div class="flex flex-col gap-3 pt-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">🔥</span>
              <h4 class="font-headline text-lg md:text-xl font-bold text-white tracking-wide">Urbano, Calle &amp; Moderno</h4>
              <span class="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">3 Estilos 2025</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <!-- Reggaetón 2025 -->
              <button
                type="button"
                class="genre-card p-4 rounded-xl bg-[#0B0C10]/90 border border-white/10 text-left hover:border-[#FF2A55]/60 hover:bg-[#14151B] active:scale-[0.98] transition-all group shadow-md cursor-pointer"
                onclick={() => selectGenre('Reggaetón 2025 con bajo Sub 808 masivo, sintetizadores oscuros, dembow pegador y melodía vocal envolvente')}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl group-hover:scale-110 transition-transform">⚡</span>
                  <span class="text-[10px] font-mono text-[#FF2A55] bg-[#FF2A55]/15 px-2 py-0.5 rounded-full font-bold border border-[#FF2A55]/30">94 BPM • 808 Sub</span>
                </div>
                <div class="font-headline font-semibold text-base text-white group-hover:text-[#FF2A55] transition-colors">Reggaetón 2025</div>
                <div class="text-xs text-[#8E92A4] mt-0.5">Dembow comercial, synths oscuros &amp; subgraves</div>
                <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Club &amp; Radio Ready</span>
                  <span class="text-[#FF2A55] font-semibold group-hover:translate-x-0.5 transition-transform">Generar →</span>
                </div>
              </button>

              <!-- Dembow Dominicano -->
              <button
                type="button"
                class="genre-card p-4 rounded-xl bg-[#0B0C10]/90 border border-white/10 text-left hover:border-[#E5B842]/60 hover:bg-[#14151B] active:scale-[0.98] transition-all group shadow-md cursor-pointer"
                onclick={() => selectGenre('Dembow Dominicano de calle trepidante con kick seco, palitos acelerados, vocales picados y tempo frenético')}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl group-hover:scale-110 transition-transform">🔊</span>
                  <span class="text-[10px] font-mono text-[#E5B842] bg-[#E5B842]/15 px-2 py-0.5 rounded-full font-bold border border-[#E5B842]/30">118 BPM • Calle</span>
                </div>
                <div class="font-headline font-semibold text-base text-white group-hover:text-[#E5B842] transition-colors">Dembow Dominicano</div>
                <div class="text-xs text-[#8E92A4] mt-0.5">Kick seco, palitos dominicanos &amp; velocidad</div>
                <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Frenético Calle</span>
                  <span class="text-[#E5B842] font-semibold group-hover:translate-x-0.5 transition-transform">Generar →</span>
                </div>
              </button>

              <!-- Trap Latino -->
              <button
                type="button"
                class="genre-card p-4 rounded-xl bg-[#0B0C10]/90 border border-white/10 text-left hover:border-[#00daf3]/60 hover:bg-[#14151B] active:scale-[0.98] transition-all group shadow-md cursor-pointer"
                onclick={() => selectGenre('Trap Latino melódico y oscuro con hi-hat rolls en triplete, bajo 808 distorsionado y guitarras melancólicas')}
              >
                <div class="flex items-center justify-between mb-2">
                  <span class="text-2xl group-hover:scale-110 transition-transform">🎙️</span>
                  <span class="text-[10px] font-mono text-[#00daf3] bg-[#00daf3]/15 px-2 py-0.5 rounded-full font-bold border border-[#00daf3]/30">140 BPM (Half 70)</span>
                </div>
                <div class="font-headline font-semibold text-base text-white group-hover:text-[#00daf3] transition-colors">Trap Latino</div>
                <div class="text-xs text-[#8E92A4] mt-0.5">Hi-hat rolls, distorsión 808 &amp; guitarras tristes</div>
                <div class="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Auto-Tune Melódico</span>
                  <span class="text-[#00daf3] font-semibold group-hover:translate-x-0.5 transition-transform">Generar →</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. Selector de Planes de Estudio -->
      <section class="w-full pt-2" id="planes-section">
        <div class="text-center max-w-xl mx-auto mb-6">
          <h3 class="font-headline text-2xl md:text-3xl font-bold text-white">Planes de Estudio</h3>
          <p class="text-xs md:text-sm text-[#8E92A4] mt-1">Canciones completas, stems separados WAV 24-bit y derechos comerciales 100% tuyos.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <!-- Básico -->
          <div class="p-5 md:p-6 rounded-2xl bg-[#14151B] border border-white/10 flex flex-col justify-between text-center hover:border-white/20 transition-all">
            <div>
              <span class="text-xs font-semibold text-[#8E92A4] uppercase tracking-wider block">Básico</span>
              <span class="font-headline text-3xl font-bold text-white mt-1 block">$0</span>
              <span class="text-xs font-mono text-zinc-400 block mt-1">10 temas gratis por día</span>
              <ul class="mt-4 text-xs text-zinc-300 space-y-2 text-left border-t border-white/5 pt-4">
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> MP3 Standard 192kbps</li>
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> Todos los ritmos latinos</li>
                <li class="flex items-center gap-2 text-zinc-500"><span class="text-zinc-600">✕</span> Sin descarga de stems</li>
              </ul>
            </div>
            <a href="/login" class="mt-6 w-full py-2.5 rounded-xl bg-white/5 text-xs md:text-sm font-semibold text-white hover:bg-white/10 active:scale-95 transition-all border border-white/5 block">
              Comenzar Gratis
            </a>
          </div>

          <!-- Pro (Highlight) -->
          <div class="relative p-5 md:p-6 rounded-2xl bg-[#1A1C24] border-2 border-[#00ff88] shadow-[0_0_28px_rgba(0,255,136,0.2)] flex flex-col justify-between text-center overflow-hidden transform md:-translate-y-1">
            <div class="absolute top-0 inset-x-0 h-1 bg-[#00ff88]"></div>
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00ff88] bg-[#00ff88]/10 px-2.5 py-0.5 rounded-full inline-block">MÁS ELEGIDO POR PRODUCTORES</span>
              <span class="text-sm font-semibold text-white block mt-2">Plan Pro Studio</span>
              <span class="font-headline text-3xl md:text-4xl font-bold text-[#00ff88] mt-1 block">$10<span class="text-xs text-zinc-400 font-normal"> /mes</span></span>
              <span class="text-xs font-mono text-zinc-300 block mt-1">500 canciones + 4 Stems WAV</span>
              <ul class="mt-4 text-xs text-zinc-200 space-y-2 text-left border-t border-white/10 pt-4">
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> Audio Lossless WAV 96kHz</li>
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> Separación de 4 Stems (Voz, Bajo, Batería, Armonía)</li>
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> Licencia comercial total</li>
              </ul>
            </div>
            <a href="/login" class="mt-6 w-full py-2.5 rounded-xl bg-[#00ff88] text-[#003919] text-xs md:text-sm font-bold shadow-[0_0_14px_rgba(0,255,136,0.35)] hover:shadow-[0_0_22px_rgba(0,255,136,0.55)] active:scale-95 transition-all block">
              Elegir Plan Pro
            </a>
          </div>

          <!-- Premier -->
          <div class="p-5 md:p-6 rounded-2xl bg-[#14151B] border border-white/10 flex flex-col justify-between text-center hover:border-white/20 transition-all">
            <div>
              <span class="text-xs font-semibold text-[#8E92A4] uppercase tracking-wider block">Sello &amp; Premier</span>
              <span class="font-headline text-3xl font-bold text-white mt-1 block">$30<span class="text-xs text-zinc-400 font-normal"> /mes</span></span>
              <span class="text-xs font-mono text-zinc-400 block mt-1">Generaciones Ilimitadas &amp; MIDI</span>
              <ul class="mt-4 text-xs text-zinc-300 space-y-2 text-left border-t border-white/5 pt-4">
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> Exportación MIDI completa</li>
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> Stems multitrack aislados (8 pistas)</li>
                <li class="flex items-center gap-2"><span class="text-[#00ff88]">✓</span> API y soporte prioritario 24/7</li>
              </ul>
            </div>
            <a href="/login" class="mt-6 w-full py-2.5 rounded-xl bg-white/5 text-xs md:text-sm font-semibold text-white hover:bg-white/10 active:scale-95 transition-all border border-white/5 block">
              Elegir Premier
            </a>
          </div>
        </div>
      </section>
    </div>

    <!-- FOOTER RESPONSIVO -->
    <footer class="mt-12 border-t border-white/10 bg-[#0a0b0e] px-4 md:px-8 pt-10 md:pt-16 pb-8">
      <div class="max-w-7xl mx-auto w-full">
        <!-- DESKTOP FOOTER -->
        <div class="hidden md:grid grid-cols-5 gap-8 pb-12 border-b border-white/10">
          <div class="col-span-2 flex flex-col gap-4 pr-6">
            <div class="flex items-center gap-2.5">
              <div class="q-symbol-container scale-100">
                <div class="q-ring"></div>
                <div class="q-slash"></div>
              </div>
              <div class="flex items-baseline tracking-wider">
                <span class="font-headline font-bold text-2xl text-white">Q</span>
                <span class="font-headline font-bold text-2xl text-[#F8F9FA]">AMUZ</span>
                <span class="w-1.5 h-1.5 rounded-full bg-[#00ff88] ml-1 shadow-[0_0_6px_#00FF88]"></span>
              </div>
            </div>
            <p class="text-xs text-zinc-400 leading-relaxed">
              La plataforma líder de Inteligencia Artificial para la creación, mezcla analógica y masterizado de ritmos tropicales y urbanos. Audio a 96kHz Lossless y stems listos para directo y estudio.
            </p>
            <div class="flex items-center gap-3 text-xs font-mono text-zinc-500 pt-1">
              <span class="w-2 h-2 rounded-full bg-[#00ff88]"></span>
              <span>Servidores DSP de Baja Latencia Online</span>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <h5 class="font-headline text-sm font-bold text-white uppercase tracking-wider">Producto</h5>
            <ul class="text-xs text-zinc-400 space-y-2">
              <li><a class="hover:text-[#00ff88] transition-colors" href="#prompt-section">Generador IA v4.2</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="#daw-monitor">DAW Studio Online</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="/audio">Separador de Stems</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="/audio">Mastering LUFS DSP</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="/audio">Exportador MIDI</a></li>
            </ul>
          </div>

          <div class="flex flex-col gap-3">
            <h5 class="font-headline text-sm font-bold text-white uppercase tracking-wider">Géneros</h5>
            <ul class="text-xs text-zinc-400 space-y-2">
              <li><a class="hover:text-[#00ff88] transition-colors" href="#catalogo-generos">Salsa Brava &amp; Timba</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="#catalogo-generos">Bachata Sensual</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="#catalogo-generos">Reggaetón 2025</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="#catalogo-generos">Dembow Dominicano</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="#catalogo-generos">Cumbia Sonidera</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="#catalogo-generos">Merengue Mambo</a></li>
            </ul>
          </div>

          <div class="flex flex-col gap-3">
            <h5 class="font-headline text-sm font-bold text-white uppercase tracking-wider">Compañía &amp; Legal</h5>
            <ul class="text-xs text-zinc-400 space-y-2">
              <li><a class="hover:text-[#00ff88] transition-colors" href="/pricing">Planes &amp; Precios</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="/terms">Términos de Servicio</a></li>
              <li><a class="hover:text-[#00ff88] transition-colors" href="/privacy">Privacidad de Datos</a></li>
            </ul>
          </div>
        </div>

        <!-- DESKTOP BOTTOM BAR -->
        <div class="hidden md:flex items-center justify-between pt-6 text-xs text-zinc-500 font-mono">
          <div>
            <span>© {new Date().getFullYear()} QAMUZ AI AUDIO TECH INC. Todos los derechos reservados.</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-zinc-400">Audio Clock: 96,000 Hz</span>
            <span>•</span>
            <span class="text-zinc-400">Status: Operacional</span>
            <span>•</span>
            <div class="flex items-center gap-1.5 bg-[#14151B] px-2 py-0.5 rounded border border-white/5 text-zinc-300">
              <span>🌐</span>
              <span>{lang === 'es' ? 'Español (Latam)' : 'English (US)'}</span>
            </div>
          </div>
        </div>

        <!-- MOBILE FOOTER -->
        <div class="flex md:hidden flex-col items-center text-center gap-2">
          <div class="flex items-center gap-2">
            <div class="q-symbol-container scale-90">
              <div class="q-ring"></div>
              <div class="q-slash"></div>
            </div>
            <span class="font-headline font-bold text-sm tracking-wider text-white">QAMUZ</span>
          </div>
          <p class="text-[11px] text-zinc-500">IA Especializada en Ritmos Tropicales &amp; Urbanos • 96kHz Clock</p>
          <div class="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
            <a class="hover:text-[#00ff88]" href="/terms">Términos</a>
            <span>•</span>
            <a class="hover:text-[#00ff88]" href="/privacy">Privacidad</a>
            <span>•</span>
            <a class="hover:text-[#00ff88]" href="/audio">Stems &amp; MIDI</a>
          </div>
          <span class="text-[10px] font-mono text-zinc-600 mt-2">© {new Date().getFullYear()} QAMUZ AI AUDIO TECH INC.</span>
        </div>
      </div>
    </footer>
  </main>

  <!-- Barra Inferior de Navegación Limpia y Compacta (Mobile Only) -->
  <nav class="fixed bottom-0 w-full z-40 pb-safe bg-[#0a0b0e]/95 backdrop-blur-xl border-t border-white/10 md:hidden">
    <div class="flex justify-around items-center h-14 px-3" id="bottom-nav-bar">
      <a class="flex items-center justify-center w-12 h-10 rounded-xl text-[#00ff88] hover:bg-white/5 active:scale-90 transition-all group" href="/" title="Inicio">
        <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">home</span>
      </a>
      <a class="flex items-center justify-center w-12 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all group" href="#prompt-section" title="DAW Studio">
        <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">graphic_eq</span>
      </a>
      <a class="flex items-center justify-center w-12 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all group" href="#catalogo-generos" title="Géneros">
        <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">library_music</span>
      </a>
      <a class="flex items-center justify-center w-12 h-10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all group" href="#planes-section" title="Planes">
        <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">diamond</span>
      </a>
      <button
        type="button"
        class="flex items-center justify-center w-12 h-10 rounded-xl text-zinc-400 hover:text-[#00ff88] hover:bg-white/5 active:scale-90 transition-all group cursor-pointer"
        onclick={toggleDrawer}
        title="Abrir Menú Completo"
      >
        <span class="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">widgets</span>
      </button>
    </div>
  </nav>
</div>

<style>
  /* Estilos del isotipo Q con trazo cian/azul y aro plateado */
  .q-symbol-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
  }
  .q-ring {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2.2px solid #E2E8F0;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.25), inset 0 0 4px rgba(255, 255, 255, 0.15);
    position: relative;
  }
  .q-slash {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 9px;
    height: 2.8px;
    background: linear-gradient(90deg, #00daf3, #00FF88);
    border-radius: 2px;
    transform: rotate(42deg);
    box-shadow: 0 0 7px rgba(0, 218, 243, 0.8);
  }

  .font-headline {
    font-family: 'Space Grotesk', sans-serif;
  }
</style>
