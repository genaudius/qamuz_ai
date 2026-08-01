import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { adminSettingsService, getMusicApiSettings } from '$lib/server/admin-settings.js';
import { settingsStore } from '$lib/server/settings-store.js';
import { isDemoModeEnabled, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

export const load: PageServerLoad = async () => {
  const settings = await getMusicApiSettings();

  return {
    settings: {
      spotifyClientId: settings.spotify_client_id || '',
      spotifyClientSecret: settings.spotify_client_secret || '',
      lastfmApiKey: settings.lastfm_api_key || '',
      shazamApiKey: settings.shazam_api_key || '',
      cachedGenres: settings.cached_genres || '[]',
      cachedTags: settings.cached_tags || '[]',
      lastSyncAt: settings.last_sync_at || '',
    },
    isDemoMode: isDemoModeEnabled(),
  };
};

export const actions: Actions = {
  update: async ({ request }) => {
    if (isDemoModeEnabled()) {
      return fail(403, { error: DEMO_MODE_MESSAGES.ADMIN_SAVE_DISABLED });
    }

    const formData = await request.formData();

    const spotifyClientId = formData.get('spotifyClientId')?.toString().trim() || '';
    const spotifyClientSecret = formData.get('spotifyClientSecret')?.toString().trim() || '';
    const lastfmApiKey = formData.get('lastfmApiKey')?.toString().trim() || '';
    const shazamApiKey = formData.get('shazamApiKey')?.toString().trim() || '';

    if (spotifyClientSecret && !spotifyClientId) {
      return fail(400, {
        error: 'Spotify Client ID is required when Spotify Client Secret is provided.',
      });
    }

    const settings = await getMusicApiSettings();
    const updates: Array<{ key: string; value: string; category: string; description?: string }> = [];

    const maybeSet = (key: string, value: string, current: string | undefined, description: string) => {
      if (value && value !== (current || '')) {
        updates.push({ key, value, category: 'music_apis', description });
      }
    };

    maybeSet('spotify_client_id', spotifyClientId, settings.spotify_client_id, 'Spotify Client ID for catalog/discovery');
    maybeSet('spotify_client_secret', spotifyClientSecret, settings.spotify_client_secret, 'Spotify Client Secret for catalog/discovery (encrypted)');
    maybeSet('lastfm_api_key', lastfmApiKey, settings.lastfm_api_key, 'Last.fm API key for top tag enrichment (encrypted)');
    maybeSet('shazam_api_key', shazamApiKey, settings.shazam_api_key, 'Shazam API key for future enrichment (encrypted)');

    if (updates.length > 0) {
      await adminSettingsService.setSettings(updates);
      settingsStore.clearCache();
    }

    return { success: true };
  },
};
