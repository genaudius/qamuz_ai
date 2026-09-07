<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import { musicState as sharedMusicState } from "$lib/stores/music-state.js";
  import { HomeIcon, AudioLinesIcon } from "$lib/icons/index.js";
  import LibraryIcon from "@lucide/svelte/icons/library";
  import PanelsTopLeftIcon from "@lucide/svelte/icons/panels-top-left";
  import MenuIcon from "@lucide/svelte/icons/menu";

  const musicState =
    getContext<GlobalMusicState>("musicState") ?? sharedMusicState;
  const sidebar = useSidebar();

  const path = $derived(page.url.pathname);

  onMount(() => {
    // Always start with the drawer closed on the app shell.
    sidebar.setOpenMobile(false);
  });

  function isActive(href: string): boolean {
    if (href === "/") return path === "/";
    return path === href || path.startsWith(`${href}/`);
  }

  function goCreate() {
    musicState.activeAudioMode = "music";
    musicState.musicSubMode = "easy";
    musicState.showLibrary = false;
    void goto("/audio");
  }
</script>

<nav
  class="fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#0f0f0f]/98 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden
    {musicState.isExpanded && musicState.currentTrack ? 'hidden' : 'flex'}"
  aria-label="Navegación principal"
>
  <div class="grid h-16 w-full grid-cols-5 items-stretch">
    <button
      type="button"
      class="nav-item {isActive('/') ? 'active' : ''}"
      aria-label="Home"
      aria-current={isActive('/') ? 'page' : undefined}
      onclick={() => goto('/')}
    >
      <HomeIcon class="h-6 w-6" />
      <span>Home</span>
    </button>

    <button
      type="button"
      class="nav-item {isActive('/audio') ? 'active' : ''}"
      aria-label="Create Music"
      aria-current={isActive('/audio') ? 'page' : undefined}
      onclick={goCreate}
    >
      <AudioLinesIcon class="h-6 w-6" />
      <span>Create</span>
    </button>

    <button
      type="button"
      class="nav-item {isActive('/library') ? 'active' : ''}"
      aria-label="Library"
      aria-current={isActive('/library') ? 'page' : undefined}
      onclick={() => goto('/library')}
    >
      <LibraryIcon class="h-6 w-6" />
      <span>Library</span>
    </button>

    <button
      type="button"
      class="nav-item {isActive('/studio') ? 'active' : ''}"
      aria-label="Studio"
      aria-current={isActive('/studio') ? 'page' : undefined}
      onclick={() => goto('/studio')}
    >
      <PanelsTopLeftIcon class="h-6 w-6" />
      <span>Studio</span>
    </button>

    <button
      type="button"
      class="nav-item"
      aria-label="Más opciones"
      onclick={() => sidebar.setOpenMobile(true)}
    >
      <MenuIcon class="h-6 w-6" />
      <span>Más</span>
    </button>
  </div>
</nav>

<style>
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 0;
    padding: 8px 4px;
    color: #9ca3af;
    background: transparent;
    border: none;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .nav-item :global(svg) {
    flex-shrink: 0;
  }

  .nav-item span {
    line-height: 1;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-item.active {
    color: #3ae0d5;
  }

  .nav-item:active {
    opacity: 0.75;
  }
</style>
