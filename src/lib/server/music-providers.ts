import { adminSettingsService } from '$lib/server/admin-settings.js';

interface MusicProviderSettings {
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  lastfmApiKey?: string;
  shazamApiKey?: string;
}

async function getMusicProviderSettings(): Promise<MusicProviderSettings> {
  const settings = await adminSettingsService.getSettingsByCategory('music_apis');
  return {
    spotifyClientId: settings.spotify_client_id,
    spotifyClientSecret: settings.spotify_client_secret,
    lastfmApiKey: settings.lastfm_api_key,
    shazamApiKey: settings.shazam_api_key,
  };
}

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string | null> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as { access_token?: string };
  return payload.access_token || null;
}

export async function fetchSpotifyGenres(limit = 20): Promise<string[]> {
  const settings = await getMusicProviderSettings();

  if (!settings.spotifyClientId || !settings.spotifyClientSecret) {
    return [];
  }

  try {
    const token = await getSpotifyToken(settings.spotifyClientId, settings.spotifyClientSecret);
    if (!token) {
      return [];
    }

    const response = await fetch(`https://api.spotify.com/v1/recommendations/available-genre-seeds?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json() as { genres?: string[] };
    return Array.isArray(payload.genres) ? payload.genres : [];
  } catch (error) {
    console.error('Spotify genres fetch error:', error);
    return [];
  }
}

export async function fetchLastFmTopTags(limit = 30): Promise<string[]> {
  const settings = await getMusicProviderSettings();

  if (!settings.lastfmApiKey) {
    return [];
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=tag.getTopTags&api_key=${encodeURIComponent(settings.lastfmApiKey)}&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const payload = await response.json() as {
      toptags?: { tag?: Array<{ name?: string }> };
    };

    const tags = payload.toptags?.tag || [];
    return tags
      .map((entry) => (entry.name || '').trim())
      .filter((value) => value.length > 0)
      .slice(0, limit);
  } catch (error) {
    console.error('Last.fm top tags fetch error:', error);
    return [];
  }
}

export async function fetchShazamTagsPlaceholder(): Promise<string[]> {
  const settings = await getMusicProviderSettings();

  if (!settings.shazamApiKey) {
    return [];
  }

  // Placeholder only: this app does not yet integrate with an official Shazam metadata endpoint.
  return ['viral', 'discovery', 'charts'];
}

export async function syncDiscoveryTagsFromProviders(): Promise<{ genres: string[]; tags: string[] }> {
  const [spotifyGenres, lastfmTags, shazamTags] = await Promise.all([
    fetchSpotifyGenres(),
    fetchLastFmTopTags(),
    fetchShazamTagsPlaceholder(),
  ]);

  const normalizedGenres = Array.from(
    new Set(
      spotifyGenres
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  );

  const normalizedTags = Array.from(
    new Set(
      [...lastfmTags, ...shazamTags]
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  );

  return {
    genres: normalizedGenres,
    tags: normalizedTags,
  };
}
