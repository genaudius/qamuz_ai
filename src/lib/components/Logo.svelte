<script lang="ts">
  import { getContext } from "svelte";
  import type { SettingsState } from "$lib/stores/settings.svelte.js";

  // Props
  let {
    class: className = "",
    alt = "App Logo",
    fallbackSrc = "/branding/logos/default-dark-logo.png",
  }: {
    class?: string;
    alt?: string;
    fallbackSrc?: string;
  } = $props();

  // Get settings from context (provided by layout)
  const settingsState = getContext<SettingsState>("settings");

  // Get logo dimensions from settings
  const logoWidth = $derived(() => settingsState?.logoWidth ?? "170");
  const logoHeight = $derived(() => settingsState?.logoHeight ?? "27");

  // Compute final CSS classes and inline styles
  const logoStyles = $derived(
    () => `width: ${logoWidth()}px; height: ${logoHeight()}px;`
  );
  const logoClasses = $derived(() =>
    `object-contain rounded-lg ${className}`.trim()
  );

  // Logo URLs
  const darkLogoUrl = $derived(settingsState?.logoUrlDark || fallbackSrc);
  const lightLogoUrl = $derived(settingsState?.logoUrlLight || fallbackSrc);

  // Error handling state
  let imageError = $state(false);
  let isLoading = $state(true);

  function handleImageLoad() {
    isLoading = false;
  }

  function handleImageError() {
    imageError = true;
    isLoading = false;
  }

  // Final image sources - use fallback if there's an error
  const finalDarkSrc = $derived(imageError ? fallbackSrc : darkLogoUrl);
  const finalLightSrc = $derived(imageError ? fallbackSrc : lightLogoUrl);
</script>

<div class="relative flex items-center h-full">
  <!-- Light mode logo -->
  <img
    src={finalLightSrc}
    {alt}
    style={logoStyles()}
    class={`${logoClasses()} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-200 dark:hidden`}
    onload={handleImageLoad}
    onerror={handleImageError}
  />
  
  <!-- Dark mode logo -->
  <img
    src={finalDarkSrc}
    {alt}
    style={logoStyles()}
    class={`${logoClasses()} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-200 hidden dark:block`}
    onload={handleImageLoad}
    onerror={handleImageError}
  />

  <!-- Loading placeholder - positioned absolutely to match image exactly -->
  {#if isLoading}
    <div
      style={logoStyles()}
      class={`absolute inset-0 bg-muted animate-pulse ${logoClasses()}`}
      aria-label="Loading logo"
    >
      <div class="w-full h-full bg-muted-foreground/20 rounded-lg"></div>
    </div>
  {/if}
</div>
