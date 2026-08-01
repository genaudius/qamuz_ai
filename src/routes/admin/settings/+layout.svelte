<script lang="ts">
  import { navigating, page } from "$app/state";
  import { preloadData } from "$app/navigation";
  import { resolve } from "$app/paths";
  import * as Card from "$lib/components/ui/card/index.js";

  // Import icons
  import {
    SettingsIcon,
    PaletteIcon,
    CreditCardIcon,
    KeyIcon,
    BrainIcon,
    CloudIcon,
    GemIcon,
    ShieldIcon,
    MailIcon,
    LoaderIcon,
  } from "$lib/icons/index.js";

  let { children, data } = $props();

  // Settings navigation items with icons
  const settingsNav = [
    {
      id: "general",
      label: "General",
      path: "/admin/settings/general",
      href: resolve("/admin/settings/general"),
      icon: SettingsIcon,
    },
    {
      id: "branding",
      label: "Branding",
      path: "/admin/settings/branding",
      href: resolve("/admin/settings/branding"),
      icon: PaletteIcon,
    },
    {
      id: "payment-methods",
      label: "Payment Methods",
      path: "/admin/settings/payment-methods",
      href: resolve("/admin/settings/payment-methods"),
      icon: CreditCardIcon,
    },
    {
      id: "plans",
      label: "Pricing Plans",
      path: "/admin/settings/plans",
      href: resolve("/admin/settings/plans"),
      icon: GemIcon,
    },
    {
      id: "oauth-providers",
      label: "OAuth Providers",
      path: "/admin/settings/oauth-providers",
      href: resolve("/admin/settings/oauth-providers"),
      icon: KeyIcon,
    },
    {
      id: "ai-models",
      label: "AI Models",
      path: "/admin/settings/ai-models",
      href: resolve("/admin/settings/ai-models"),
      icon: BrainIcon,
    },
    {
      id: "cloud-storage",
      label: "Cloud Storage",
      path: "/admin/settings/cloud-storage",
      href: resolve("/admin/settings/cloud-storage"),
      icon: CloudIcon,
    },
    {
      id: "security",
      label: "Security",
      path: "/admin/settings/security",
      href: resolve("/admin/settings/security"),
      icon: ShieldIcon,
    },
    {
      id: "mailing",
      label: "Mailing",
      path: "/admin/settings/mailing",
      href: resolve("/admin/settings/mailing"),
      icon: MailIcon,
    },
  ] as const;

  type SettingsNavPath = (typeof settingsNav)[number]["path"];
  // Get current active nav item based on pathname
  const activeNavItem = $derived.by(() => {
    const currentPath = page.url.pathname;

    // Only return an active item if there's an exact match with a settings subpage
    // Return null when on the main /admin/settings page
    return settingsNav.find((item) => currentPath === item.path)?.id || null;
  });

  const isNavigatingWithinSettings = $derived.by(() => {
    const fromPath = navigating.from?.url.pathname;
    const toPath = navigating.to?.url.pathname;

    if (!fromPath || !toPath || toPath === fromPath) {
      return false;
    }

    return (
      fromPath.startsWith("/admin/settings") &&
      toPath.startsWith("/admin/settings")
    );
  });

  function warmRoute(path: string) {
    void preloadData(path);
  }
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
  <title>Site Settings - {data.settings.siteName}</title>
  <meta name="description" content={data.settings.siteDescription} />
</svelte:head>

<div class="min-h-screen p-6">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="cursor-default mb-8 space-y-2">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Site Settings</h1>
      </div>
    </div>

    <div class="grid md:grid-cols-[240px_1fr]">
      <!-- Settings Sidebar -->
      <Card.Root class="h-fit py-0 mb-4 bg-transparent border-none shadow-none">
        <Card.Content class="p-0 mr-8">
          <nav class="space-y-2">
            <a
              href={resolve("/admin/settings/general")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'general'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() => warmRoute(resolve("/admin/settings/general"))}
              ontouchstart={() => warmRoute(resolve("/admin/settings/general"))}
            >
              <SettingsIcon class="w-4.5 h-4.5" />
              General
            </a>
            <a
              href={resolve("/admin/settings/branding")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'branding'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() =>
                warmRoute(resolve("/admin/settings/branding"))}
              ontouchstart={() =>
                warmRoute(resolve("/admin/settings/branding"))}
            >
              <PaletteIcon class="w-4.5 h-4.5" />
              Branding
            </a>
            <a
              href={resolve("/admin/settings/payment-methods")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'payment-methods'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() =>
                warmRoute(resolve("/admin/settings/payment-methods"))}
              ontouchstart={() =>
                warmRoute(resolve("/admin/settings/payment-methods"))}
            >
              <CreditCardIcon class="w-4.5 h-4.5" />
              Payment Methods
            </a>
            <a
              href={resolve("/admin/settings/plans")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'plans'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() => warmRoute(resolve("/admin/settings/plans"))}
              ontouchstart={() => warmRoute(resolve("/admin/settings/plans"))}
            >
              <GemIcon class="w-4.5 h-4.5" />
              Pricing Plans
            </a>
            <a
              href={resolve("/admin/settings/oauth-providers")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'oauth-providers'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() =>
                warmRoute(resolve("/admin/settings/oauth-providers"))}
              ontouchstart={() =>
                warmRoute(resolve("/admin/settings/oauth-providers"))}
            >
              <KeyIcon class="w-4.5 h-4.5" />
              OAuth Providers
            </a>
            <a
              href={resolve("/admin/settings/ai-models")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'ai-models'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() =>
                warmRoute(resolve("/admin/settings/ai-models"))}
              ontouchstart={() =>
                warmRoute(resolve("/admin/settings/ai-models"))}
            >
              <BrainIcon class="w-4.5 h-4.5" />
              AI Models
            </a>
            <a
              href={resolve("/admin/settings/cloud-storage")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'cloud-storage'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() =>
                warmRoute(resolve("/admin/settings/cloud-storage"))}
              ontouchstart={() =>
                warmRoute(resolve("/admin/settings/cloud-storage"))}
            >
              <CloudIcon class="w-4.5 h-4.5" />
              Cloud Storage
            </a>
            <a
              href={resolve("/admin/settings/security")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'security'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() =>
                warmRoute(resolve("/admin/settings/security"))}
              ontouchstart={() =>
                warmRoute(resolve("/admin/settings/security"))}
            >
              <ShieldIcon class="w-4.5 h-4.5" />
              Security
            </a>
            <a
              href={resolve("/admin/settings/mailing")}
              data-sveltekit-preload-data="tap"
              class="cursor-pointer w-full text-left px-3 py-1.5 text-md rounded-md transition-colors flex items-center gap-3 {activeNavItem ===
              'mailing'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'}"
              onmouseenter={() => warmRoute(resolve("/admin/settings/mailing"))}
              ontouchstart={() => warmRoute(resolve("/admin/settings/mailing"))}
            >
              <MailIcon class="w-4.5 h-4.5" />
              Mailing
            </a>
          </nav>
        </Card.Content>
      </Card.Root>

      <!-- Main Content Area -->
      <div>
        {#if isNavigatingWithinSettings}
          {@render settingsPageTransitionLoader()}
        {:else}
          {@render children()}
        {/if}
      </div>
    </div>
  </div>
</div>
