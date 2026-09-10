<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { getContext } from "svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import SpotifyHome from "$lib/components/views/SpotifyHome.svelte";
  import ModernLanding from "$lib/components/landing/ModernLanding.svelte";
  import type { SettingsState } from "$lib/stores/settings.svelte.js";

  // Get settings from context (provided by layout)
  const settingsState = getContext<SettingsState>("settings");

  // Get session from context (provided by layout)
  const getSession = getContext<() => App.Session | null>("session");
  const session = $derived(getSession?.() || null);
</script>

<svelte:head>
  <title>QAMUZ AI - Música Tropical & Urbana</title>
  <meta name="description" content="Plataforma de Inteligencia Artificial para creación, mezcla analógica y masterizado de ritmos tropicales y urbanos. Audio a 96kHz Lossless y Stems listos para directo y estudio." />
  <meta
    name="keywords"
    content="QAMUZ, Salsa, Bachata, Reggaetón, Merengue, Dembow, Cumbia, Música Latina, IA, Stems, WAV 96kHz"
  />
  <meta property="og:title" content="QAMUZ AI - Música Tropical & Urbana" />
  <meta property="og:description" content="Genera salsa, bachata, reggaetón, dembow y más con tecnología de última generación." />
  <meta property="og:type" content="website" />
</svelte:head>

{#if session?.user}
  {#if page.url.searchParams.get("artistProfile") === "missing"}
    <div class="border-b border-amber-500/20 bg-amber-500/8">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-amber-100 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
      >
        <div>
          <p class="font-semibold text-amber-200">
            Your artist profile is not set up yet.
          </p>
          <p class="text-amber-100/80">
            We could not find an artist profile linked to your account. Finish
            your profile setup first, then open your artist page again.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <Button
            href={resolve("/settings/profile")}
            class="cursor-pointer rounded-full bg-white text-black hover:bg-gray-200"
          >
            Open Profile Settings
          </Button>
          <Button
            variant="outline"
            href={resolve("/artist")}
            class="cursor-pointer rounded-full border-amber-200/30 text-amber-100 hover:bg-amber-200/10"
          >
            Retry Artist Profile
          </Button>
        </div>
      </div>
    </div>
  {/if}
  <SpotifyHome />
{:else}
  <ModernLanding />
{/if}
