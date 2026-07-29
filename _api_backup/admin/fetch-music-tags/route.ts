import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminSettingsService } from '$lib/server/admin-settings';
import { settingsStore } from '$lib/server/settings-store';
import { isDemoModeEnabled } from '$lib/constants/demo-mode.js';

export const POST: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    if (isDemoModeEnabled()) {
      return json({ error: 'Disabled in demo mode' }, { status: 403 });
    }

    // 1. Get API Keys
    const settings = await settingsStore.getSettings();
    const spotifyClientId = settings.spotifyClientId;
    const spotifyClientSecret = settings.spotifyClientSecret;
    const lastfmApiKey = settings.lastfmApiKey;

    if (!spotifyClientId || !spotifyClientSecret || !lastfmApiKey) {
      return json({ error: 'Missing API keys. Please configure them in Settings > Music APIs.' }, { status: 400 });
    }

    // 2. Fetch Spotify Genres
    let spotifyGenres: string[] = [];
    try {
      // Get Spotify Access Token (Client Credentials Flow)
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(spotifyClientId + ':' + spotifyClientSecret).toString('base64')
        },
        body: 'grant_type=client_credentials'
      });
      
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) {
        // Fetch Available Genre Seeds
        const genresRes = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
          headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
        });
        const genresData = await genresRes.json();
        if (genresData.genres) {
          spotifyGenres = genresData.genres;
        }
      }
    } catch (e) {
      console.error('Error fetching Spotify genres:', e);
    }

    // 3. Fetch Last.fm Top Tags
    let lastfmTags: string[] = [];
    try {
      const tagsRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=tag.getTopTags&api_key=${lastfmApiKey}&format=json`);
      const tagsData = await tagsRes.json();
      if (tagsData?.toptags?.tag) {
        // Map and limit to top 100 tags
        lastfmTags = tagsData.toptags.tag.slice(0, 100).map((t: any) => t.name);
      }
    } catch (e) {
      console.error('Error fetching Last.fm tags:', e);
    }

    if (spotifyGenres.length === 0 && lastfmTags.length === 0) {
      return json({ error: 'Failed to fetch tags from both APIs.' }, { status: 500 });
    }

    // 4. Save to Database
    const musicTags = {
      genres: spotifyGenres,
      tags: lastfmTags
    };
    
    await adminSettingsService.setSetting(
      'music_tags_cache',
      JSON.stringify(musicTags),
      'music_apis',
      'Cached JSON array of genres from Spotify and tags from LastFM'
    );

    // 5. Refresh cache
    settingsStore.clearCache();

    return json({
      success: true,
      genresCount: spotifyGenres.length,
      tagsCount: lastfmTags.length
    });
  } catch (error) {
    console.error('Failed to fetch music tags:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
