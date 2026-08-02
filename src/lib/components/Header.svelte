<script lang="ts">
  import { goto, preloadData } from "$app/navigation";
  import { getContext } from "svelte";
  import { page } from "$app/state";
  import PanelRightOpen from "@lucide/svelte/icons/panel-right-open";

  // UI Components
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import ThemeToggle from "$lib/components/theme-toggle.svelte";

  // Icons
  import {
    SettingsIcon,
    UpgradeIcon,
    ExternalLinkIcon,
    HomeIcon,
    Music2Icon,
  } from "$lib/icons/index.js";

  import * as m from "$lib/../paraglide/messages.js";
  import { SETTINGS_DEFAULT_PATH } from "$lib/constants/navigation-loading.js";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";

  // Get props from parent
  let { data, showSidebarTrigger = true } = $props();

  // Get session from context (provided by layout)
  const getSession = getContext<() => App.Session | null>("session");
  const session = $derived(getSession?.());
  
  const musicState = getContext<GlobalMusicState>("musicState");

  // Get page title based on current route
  const pageTitle = $derived(() => {
    const pathname = page.url.pathname;

    // Check for chat pages first (dynamic routes)
    if (pathname.startsWith("/chat/")) {
      return m["nav.chat"]();
    }

    // Map routes to i18n keys
    const routeTitles: Record<string, () => string> = {
      "/newchat": () => m["nav.new_chat"](),
      "/audio": () => m["nav.audio"](),
      "/image-video": () => m["nav.image_video"](),
      "/settings": () => m["settings.title"](),
    };

    // Check for settings sub-pages
    if (pathname.startsWith("/settings")) {
      return m["settings.title"]();
    }

    // Check for projects pages
    if (pathname.startsWith("/projects")) {
      return m["nav.projects"]();
    }

    return routeTitles[pathname]?.() || "";
  });

  function warmRoute(path: string) {
    void preloadData(path);
  }
</script>

<!-- Header with Sidebar Trigger, Page Title, Auth Controls and Theme Toggle -->
<header class="border-b px-4 py-2.5 flex items-center justify-between">
  <div class="flex items-center gap-3">
    {#if showSidebarTrigger}
      <Sidebar.Trigger class="cursor-pointer" />
    {:else}
      <!-- Home button for pages without sidebar -->
      <Button
        variant="ghost"
        size="icon-sm"
        onclick={() => goto("/newchat")}
        onmouseenter={() => warmRoute("/newchat")}
        ontouchstart={() => warmRoute("/newchat")}
        class="cursor-pointer"
        title="Go to chat"
      >
        <HomeIcon class="w-4 h-4" />
      </Button>
    {/if}

    <!-- Page Title or Music Toggles -->
    {#if page.url.pathname === '/audio' && musicState?.activeAudioMode === 'music'}
      <div class="flex items-center gap-1 bg-muted/30 p-0.5 rounded-md text-sm ml-1">
        <button
          type="button"
          class="px-2.5 py-1 rounded-md transition-colors {musicState.musicSubMode === 'easy' ? 'bg-background shadow-sm text-foreground font-medium border' : 'text-muted-foreground hover:text-foreground border border-transparent'}"
          onclick={() => musicState.musicSubMode = 'easy'}
        >
          Easy
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-md transition-colors {musicState.musicSubMode === 'custom' ? 'bg-background shadow-sm text-foreground font-medium border' : 'text-muted-foreground hover:text-foreground border border-transparent'}"
          onclick={() => musicState.musicSubMode = 'custom'}
        >
          Custom
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-md transition-colors {musicState.musicSubMode === 'soundtrack' ? 'bg-background shadow-sm text-foreground font-medium border' : 'text-muted-foreground hover:text-foreground border border-transparent'}"
          onclick={() => musicState.musicSubMode = 'soundtrack'}
        >
          Soundtrack
        </button>
      </div>
    {:else if pageTitle()}
      <h1 class="text-md text-muted-foreground">
        {pageTitle()}
      </h1>
    {/if}
  </div>

  <div class="flex items-center gap-3">
    <!-- Library Toggle Button (Right Side) -->
    {#if page.url.pathname === '/audio' && musicState?.activeAudioMode === 'music' && !musicState?.showLibrary}
      <Button
        variant="outline"
        size="sm"
        onclick={() => musicState.showLibrary = true}
        class="cursor-pointer gap-2"
      >
        Library 
        <PanelRightOpen class="w-4 h-4" />
      </Button>
    {/if}

    <!-- Admin Dashboard button -->
    {#if session?.user?.isAdmin}
      <Button
        variant="outline"
        size="sm"
        onclick={() => window.open("/admin", "_blank", "noopener,noreferrer")}
        onmouseenter={() => warmRoute("/admin")}
        ontouchstart={() => warmRoute("/admin")}
        class="cursor-pointer"
      >
        <ExternalLinkIcon class="w-4 h-4" />
        Admin Dashboard
      </Button>
    {/if}

    {#if session?.user}
      <Button
        variant="outline"
        size="sm"
        onclick={() => goto("/artist")}
        onmouseenter={() => warmRoute("/artist")}
        ontouchstart={() => warmRoute("/artist")}
        class="cursor-pointer"
      >
        <Music2Icon class="w-4 h-4" />
        My Artist Profile
      </Button>
      {#if session.user.planTier === "free"}
        <Button
          variant="outline"
          size="sm"
          onclick={() => goto("/pricing")}
          onmouseenter={() => warmRoute("/pricing")}
          ontouchstart={() => warmRoute("/pricing")}
          class="cursor-pointer"
        >
          <UpgradeIcon class="w-4 h-4" />
          {m["auth.upgrade_plan"]()}
        </Button>
      {/if}
      <SettingsIcon
        class="cursor-pointer w-4 h-4"
        onclick={() => goto(SETTINGS_DEFAULT_PATH)}
        onmouseenter={() => warmRoute(SETTINGS_DEFAULT_PATH)}
        ontouchstart={() => warmRoute(SETTINGS_DEFAULT_PATH)}
      />
    {:else}
      <Button
        variant="outline"
        size="sm"
        onclick={() => goto("/register")}
        class="cursor-pointer"
      >
        {m["auth.sign_up"]()}
      </Button>
    {/if}
    <ThemeToggle />
  </div>
</header>
