<script lang="ts">
  import type { ActionData, PageData } from './$types';
  import { enhance } from '$app/forms';
  import * as Card from '$lib/components/ui/card/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Label } from '$lib/components/ui/label/index.js';
  import { Music2Icon, RefreshCwIcon } from '$lib/icons/index.js';

  let { data, form }: { data: PageData; form: ActionData | null | undefined } = $props();

  let isSubmitting = $state(false);
  let isSyncing = $state(false);
  let syncMessage = $state('');
  let syncError = $state('');

  let spotifyClientId = $state('');
  let spotifyClientSecret = $state('');
  let lastfmApiKey = $state('');
  let shazamApiKey = $state('');

  $effect(() => {
    const settings = data.settings;
    spotifyClientId = settings.spotifyClientId || '';
    spotifyClientSecret = settings.spotifyClientSecret || '';
    lastfmApiKey = settings.lastfmApiKey || '';
    shazamApiKey = settings.shazamApiKey || '';
  });

  async function syncTags() {
    syncMessage = '';
    syncError = '';
    isSyncing = true;

    try {
      const response = await fetch('/api/admin/music-apis/sync-tags', {
        method: 'POST',
      });

      const payload = await response.json();

      if (!response.ok) {
        syncError = payload?.error || 'Failed to sync tags.';
        return;
      }

      syncMessage = `Synced ${payload.genresCount || 0} genres and ${payload.tagsCount || 0} tags.`;
    } catch {
      syncError = 'Network error while syncing tags.';
    } finally {
      isSyncing = false;
    }
  }
</script>

<svelte:head>
  <title>Music APIs - Admin Settings</title>
</svelte:head>

<div class="space-y-4">
  <div>
    <h1 class="text-xl font-semibold tracking-tight flex items-center gap-2">
      <Music2Icon class="w-6 h-6" />
      Music APIs Configuration
    </h1>
    <p class="text-muted-foreground">
      Configure providers used for discovery genres and trend tagging.
    </p>
  </div>

  <form
    method="POST"
    action="?/update"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
    class="space-y-6"
  >
    {#if form?.error}
      <div class="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
        {form.error}
      </div>
    {/if}

    {#if form?.success}
      <div class="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
        Music API settings updated successfully.
      </div>
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title>Spotify</Card.Title>
        <Card.Description>Genre seeds and catalog metadata.</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-3">
        <div class="space-y-2">
          <Label for="spotifyClientId">Client ID</Label>
          <Input id="spotifyClientId" name="spotifyClientId" bind:value={spotifyClientId} placeholder="Spotify App Client ID" disabled={data.isDemoMode} />
        </div>
        <div class="space-y-2">
          <Label for="spotifyClientSecret">Client Secret</Label>
          <Input id="spotifyClientSecret" name="spotifyClientSecret" type="password" bind:value={spotifyClientSecret} placeholder="Spotify App Client Secret" disabled={data.isDemoMode} />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>Last.fm and Shazam</Card.Title>
        <Card.Description>Top tags and trend enrichment.</Card.Description>
      </Card.Header>
      <Card.Content class="space-y-3">
        <div class="space-y-2">
          <Label for="lastfmApiKey">Last.fm API Key</Label>
          <Input id="lastfmApiKey" name="lastfmApiKey" type="password" bind:value={lastfmApiKey} placeholder="Last.fm API key" disabled={data.isDemoMode} />
        </div>
        <div class="space-y-2">
          <Label for="shazamApiKey">Shazam API Key</Label>
          <Input id="shazamApiKey" name="shazamApiKey" type="password" bind:value={shazamApiKey} placeholder="Shazam API key (placeholder integration)" disabled={data.isDemoMode} />
        </div>
      </Card.Content>
    </Card.Root>

    <div class="flex flex-wrap gap-3">
      <Button type="submit" disabled={isSubmitting || data.isDemoMode}>
        {isSubmitting ? 'Saving...' : 'Save Keys'}
      </Button>

      <Button type="button" variant="outline" onclick={syncTags} disabled={isSyncing || data.isDemoMode}>
        <RefreshCwIcon class={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Genres/Tags'}
      </Button>
    </div>

    {#if syncMessage}
      <div class="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
        {syncMessage}
      </div>
    {/if}

    {#if syncError}
      <div class="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md">
        {syncError}
      </div>
    {/if}
  </form>
</div>
