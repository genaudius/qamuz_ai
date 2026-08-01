<script lang="ts">
  import { navigating, page } from "$app/state";
  import { goto, preloadData } from "$app/navigation";
  import { resolve } from "$app/paths";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as m from "$lib/../paraglide/messages.js";

  // Import icons
  import {
    UserIcon,
    SettingsIcon,
    CreditCardIcon,
    AnalyticsIcon,
    ShieldIcon,
    LoaderIcon,
  } from "$lib/icons/index.js";

  let { children } = $props();

  // Settings navigation items with icons
  const settingsNav = [
    {
      id: "profile",
      label: m["settings.nav_profile"](),
      path: "/settings/profile",
      icon: UserIcon,
    },
    {
      id: "account",
      label: m["settings.nav_account"](),
      path: "/settings/account",
      icon: SettingsIcon,
    },
    {
      id: "billing",
      label: m["settings.nav_billing"](),
      path: "/settings/billing",
      icon: CreditCardIcon,
    },
    {
      id: "usage",
      label: m["settings.nav_usage"](),
      path: "/settings/usage",
      icon: AnalyticsIcon,
    },
    {
      id: "privacy",
      label: m["settings.nav_privacy"](),
      path: "/settings/privacy",
      icon: ShieldIcon,
    },
  ] as const;

  type SettingsNavPath = (typeof settingsNav)[number]["path"];

  // Get current active nav item based on pathname
  const activeNavItem = $derived.by(() => {
    const currentPath = page.url.pathname;
    return (
      settingsNav.find((item) => currentPath.startsWith(item.path))?.id ||
      "profile"
    );
  });

  function warmRoute(path: SettingsNavPath) {
    void preloadData(resolve(path));
  }

  function navigateTo(path: SettingsNavPath) {
    goto(resolve(path));
  }

  const isNavigatingWithinSettings = $derived.by(() => {
    const fromPath = navigating.from?.url.pathname;
    const toPath = navigating.to?.url.pathname;

    if (!fromPath || !toPath || toPath === fromPath) {
      return false;
    }

    return fromPath.startsWith("/settings") && toPath.startsWith("/settings");
  });
</script>

{#snippet settingsPageTransitionLoader()}
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

<svelte:head>
  <title>{m["settings.page_title"]()}</title>
</svelte:head>

<div class="min-h-screen p-4 sm:p-6">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="cursor-default mb-6 sm:mb-8 space-y-2">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">{m["settings.title"]()}</h1>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
      <!-- Settings Sidebar -->
      <Card.Root class="h-fit py-0 bg-transparent border-none shadow-none">
        <Card.Content class="p-0 md:mr-2">
          <nav
            class="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible space-x-2 md:space-x-0 md:space-y-2 pb-2 md:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {#each settingsNav as navItem (navItem.id)}
              {@const Icon = navItem.icon}
              <button
                class="cursor-pointer whitespace-nowrap flex-shrink-0 md:w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
                navItem.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'}"
                onclick={() => navigateTo(navItem.path)}
                onmouseenter={() => warmRoute(navItem.path)}
                ontouchstart={() => warmRoute(navItem.path)}
              >
                <Icon class="w-4.5 h-4.5" />
                {navItem.label}
              </button>
            {/each}
          </nav>
        </Card.Content>
      </Card.Root>

      <!-- Main Content Area -->
      <div class="min-w-0">
        {#if isNavigatingWithinSettings}
          {@render settingsPageTransitionLoader()}
        {:else}
          {@render children()}
        {/if}
      </div>
    </div>
  </div>
</div>
