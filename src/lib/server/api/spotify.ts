// src/lib/server/api/spotify.ts
// Simple wrapper for Spotify API (client credentials flow)
// Uses env variables SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET

import { env } from '$env/dynamic/private';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.token;
  }
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify API credentials not configured');
  }
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Spotify token request failed: ${resp.status} ${txt}`);
  }
  const data: SpotifyTokenResponse = await resp.json();
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

export async function getGenres(): Promise<string[]> {
  const token = await getAccessToken();
  const resp = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resp.ok) {
    throw new Error('Failed to fetch Spotify genres');
  }
  const json = await resp.json();
  return json.genres as string[];
}

export async function getRecommendations(options: {
  seedGenres?: string[];
  seedArtists?: string[];
  limit?: number;
}): Promise<any> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ limit: `${options.limit ?? 10}` });
  if (options.seedGenres) params.append('seed_genres', options.seedGenres.join(','));
  if (options.seedArtists) params.append('seed_artists', options.seedArtists.join(','));
  const url = `https://api.spotify.com/v1/recommendations?${params.toString()}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) {
    throw new Error('Failed to fetch Spotify recommendations');
  }
  return await resp.json();
}

// Additional helper functions (e.g., getArtistInfo) can be added as needed.
