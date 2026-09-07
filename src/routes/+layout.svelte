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
  import { musicState } from "$lib/stores/music-state.js";
  import GlobalMusicPlayer from "$lib/components/GlobalMusicPlayer.svelte";
  import NowPlayingView from "$lib/components/NowPlayingView.svelte";
  import MobileBottomNav from "$lib/components/MobileBottomNav.svelte";
  import MobileMusicStage from "$lib/components/MobileMusicStage.svelte";
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

  // Provide chat state, session, settings, and shared music state
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
      <div class="flex-1 min-w-0 overflow-auto {musicState.currentTrack ? 'pb-44 lg:pb-28' : 'pb-20 lg:pb-0'}">
        {#if isNavigatingToTrackedPage}
          {@render pageTransitionLoader()}
        {:else}
          {@render children()}
        {/if}
      </div>
    </div>
    
    <!-- Now Playing: desktop right rail; mobile immersive short stage -->
    {#if musicState.currentTrack}
      <div class="hidden lg:contents">
        {#if musicState.isExpanded}
          <aside
            class="fixed z-40 border-border/50 bg-background/95 backdrop-blur-md transform transition-transform duration-300
              inset-y-0 right-0 top-0 bottom-28 w-[350px] border-l
              {musicState.isExpanded ? 'translate-x-0' : 'translate-x-full'}"
          >
            <NowPlayingView />
          </aside>
        {/if}
      </div>
      {#if musicState.isExpanded}
        <div class="lg:hidden">
          <MobileMusicStage />
        </div>
      {/if}
      <GlobalMusicPlayer />
    {/if}

    <MobileBottomNav />
  </Sidebar.Provider>
{/if}

<Toaster position="top-center" />
<OnboardingModal />
