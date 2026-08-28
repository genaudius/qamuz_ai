<script lang="ts">
  import "../app.css";
  import { afterNavigate, invalidateAll } from "$app/navigation";
  import { onMount, setContext } from "svelte";
  import { navigating, page } from "$app/state";
  import { ModeWatcher } from "mode-watcher";
  import { Toaster } from "$lib/components/ui/sonner";
  import { getLocale } from "../paraglide/runtime.js";
  import { LoaderIcon } from "$lib/icons/index.js";
  import { isNavigationLoadingPath } from "$lib/constants/navigation-loading.js";

  // UI Components
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  // Shared components
  import ChatSidebar from "$lib/components/ChatSidebar.svelte";
  import Header from "$lib/components/Header.svelte";
  import Favicon from "$lib/components/Favicon.svelte";
  import { ChatState } from "$lib/components/chat-state.svelte.js";
  import { SettingsState } from "$lib/stores/settings.svelte.js";
  import { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import GlobalMusicPlayer from "$lib/components/GlobalMusicPlayer.svelte";
  import NowPlayingView from "$lib/components/NowPlayingView.svelte";
  import OnboardingModal from "$lib/components/OnboardingModal.svelte";

  let { children, data } = $props();

  // Extract settings from data and create settings state
  const settingsState = (() => {
    const state = new SettingsState();
    if (data.settings) {
      state.setSettings(data.settings);
    }
    return state;
  })();

  const layoutPathname = $derived.by(() => {
    const navigationPath = navigating.to?.url.pathname;

    if (navigationPath && isNavigationLoadingPath(navigationPath)) {
      return navigationPath;
    }

    return page.url.pathname;
  });

  const isNavigatingToTrackedPage = $derived.by(() => {
    const fromPath = navigating.from?.url.pathname;
    const navigationPath = navigating.to?.url.pathname;

    if (!navigationPath || !isNavigationLoadingPath(navigationPath)) {
      return false;
    }

    if (navigationPath.startsWith("/admin")) {
      return false;
    }

    if (navigationPath === "/projects") {
      return false;
    }

    if (
      fromPath?.startsWith("/projects") &&
      navigationPath.startsWith("/projects")
    ) {
      return false;
    }

    if (
      fromPath?.startsWith("/settings") &&
      navigationPath.startsWith("/settings")
    ) {
      return false;
    }

    return navigationPath !== fromPath;
  });

  // Keep session reactive to layout data updates
  const currentSession = $derived(data.session);

  const isStandalonePage = $derived(
    (layoutPathname === "/" && !currentSession?.user) ||
      layoutPathname === "/login" ||
      layoutPathname === "/register" ||
      layoutPathname === "/pricing" ||
      layoutPathname === "/terms" ||
      layoutPathname === "/privacy" ||
      layoutPathname.startsWith("/admin") ||
      layoutPathname.startsWith("/studio") ||
      layoutPathname === "/reset-password" ||
      layoutPathname.startsWith("/reset-password/") ||
      layoutPathname === "/verify-email" ||
      layoutPathname.startsWith("/verify-email/"),
  );

  // Check if current route should have header but no sidebar
  const isHeaderOnlyPage = $derived(layoutPathname === "/image-video");

  // Create global chat state that persists across route changes
  const chatState = new ChatState();

  // Create global music state
  const musicState = new GlobalMusicState();

  // Provide chat state, session, and settings to all child components via context
  setContext("chatState", chatState);
  setContext("musicState", musicState);
  setContext("session", () => currentSession);
  setContext("settings", settingsState);

  // Set up chat state to react to session changes
  chatState.setupSessionReactivity(() => currentSession);

  function updateDocumentDirection() {
    const locale = getLocale();
    const isRTL = locale === "ar";
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }

  function refreshAfterOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("code") || urlParams.get("state")) {
      window.history.replaceState({}, "", window.location.pathname);
      void invalidateAll();
    }
  }

  function syncSettingsFromData() {
    if (data.settings) {
      settingsState.setSettings(data.settings);
    }
  }

  onMount(() => {
    syncSettingsFromData();
    refreshAfterOAuthCallback();
    updateDocumentDirection();

    return afterNavigate(() => {
      syncSettingsFromData();
      updateDocumentDirection();
    });
  });
</script>

{#snippet pageTransitionLoader()}
  <div
    class="flex h-full min-h-[16rem] w-full items-center justify-center"
    aria-live="polite"
  >
    <div
      class="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/80 px-3 py-2 text-md text-muted-foreground"
    >
      <LoaderIcon class="h-4 w-4 animate-spin" />
      Loading...
    </div>
  </div>
{/snippet}

<ModeWatcher
  defaultMode={(data.adminDefaults?.theme as
    | "system"
    | "dark"
    | "light"
    | undefined) || "dark"}
  disableTransitions={false}
/>

<!-- Global Favicon Management -->
<Favicon />

{#if isStandalonePage}
  <!-- Standalone pages without header or sidebar (auth, pricing, landing) -->
  {#if isNavigatingToTrackedPage}
    {@render pageTransitionLoader()}
  {:else}
    {@render children()}
  {/if}
{:else if isHeaderOnlyPage}
  <!-- Pages with header but no sidebar (image-video) -->
  <Tooltip.Provider>
    <div class="flex flex-col h-screen w-full min-w-0">
      <Header {data} showSidebarTrigger={false} />
      <div class="flex-1 min-w-0 overflow-auto">
        {#if isNavigatingToTrackedPage}
          {@render pageTransitionLoader()}
        {:else}
          {@render children()}
        {/if}
      </div>
    </div>
  </Tooltip.Provider>
{:else}
  <!-- Main app with sidebar and header -->
  <Sidebar.Provider>
    <!-- Global Sidebar that persists across routes -->
    <ChatSidebar {chatState} />

    <!-- Main content area with header -->
    <div class="relative flex flex-col h-screen w-full min-w-0 transition-all duration-300 {musicState.isExpanded ? 'lg:mr-[350px]' : ''}">
      <!-- Global Header -->
      <Header {data} />

      <!-- Page content area -->
      <div class="flex-1 min-w-0 overflow-auto {musicState.currentTrack ? 'pb-20' : ''}">
        {#if isNavigatingToTrackedPage}
          {@render pageTransitionLoader()}
        {:else}
          {@render children()}
        {/if}
      </div>
    </div>
    
    <!-- Right Sidebar Now Playing -->
    {#if musicState.currentTrack}
      <aside class="fixed top-0 right-0 w-[350px] border-l border-border/50 bg-background/95 backdrop-blur-md transform transition-transform duration-300 z-30 {musicState.isExpanded ? 'translate-x-0' : 'translate-x-full'} {musicState.currentTrack ? 'bottom-20' : 'bottom-0'}">
        <NowPlayingView />
      </aside>
    {/if}
  </Sidebar.Provider>
{/if}

<GlobalMusicPlayer />

<Toaster position="top-center" />
<OnboardingModal />
