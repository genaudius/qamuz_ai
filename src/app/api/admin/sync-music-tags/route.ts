import { NextResponse } from 'next/server';
import { getAuth } from '@/src/lib/auth';
import { adminSettingsService } from '@/src/lib/server/admin-settings';
import { settingsStore } from '@/src/lib/server/settings-store';

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const spotifyClientId = await settingsStore.getSetting('spotifyClientId');
    const spotifyClientSecret = await settingsStore.getSetting('spotifyClientSecret');
    const lastfmApiKey = await settingsStore.getSetting('lastfmApiKey');

    if (!spotifyClientId || !spotifyClientSecret || !lastfmApiKey) {
      return NextResponse.json({ error: 'Missing API keys for Spotify or Last.fm' }, { status: 400 });
    }

    // 1. Fetch Spotify Genres
    let spotifyGenres: string[] = [];
    try {
      // Get Spotify Access Token
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')
        },
        body: 'grant_type=client_credentials'
      });
      
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        
        // Fetch genre seeds
        const genresRes = await fetch('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (genresRes.ok) {
          const genresData = await genresRes.json();
          spotifyGenres = genresData.genres || [];
        } else {
          console.error('Spotify genres fetch failed:', await genresRes.text());
        }
      } else {
        console.error('Spotify token fetch failed:', await tokenRes.text());
      }
    } catch (error) {
      console.error('Spotify sync error:', error);
    }

    // 2. Fetch Last.fm Tags
    let lastfmTags: string[] = [];
    try {
      const tagsRes = await fetch(`http://ws.audioscrobbler.com/2.0/?method=tag.getTopTags&api_key=${lastfmApiKey}&format=json`);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (tagsData.toptags && tagsData.toptags.tag) {
          lastfmTags = tagsData.toptags.tag.map((t: any) => t.name).slice(0, 250); // Get top 250 tags
        }
      } else {
        console.error('Last.fm fetch failed:', await tagsRes.text());
      }
    } catch (error) {
      console.error('Last.fm sync error:', error);
    }

    if (spotifyGenres.length === 0 && lastfmTags.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch tags from both services. Check your API keys.' }, { status: 500 });
    }

    // Save to settings
    const cacheData = {
      genres: spotifyGenres,
      tags: lastfmTags,
      lastUpdated: new Date().toISOString()
    };
    
    await adminSettingsService.setSetting('music_tags_cache', JSON.stringify(cacheData), 'music_apis');
    // Force refresh cache
    await settingsStore.clearCache();

    return NextResponse.json({ success: true, count: { genres: spotifyGenres.length, tags: lastfmTags.length } });
  } catch (error) {
    console.error('Sync music tags error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

