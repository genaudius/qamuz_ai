'use server';

import { db } from '@/src/lib/server/db/index';
import { music, artistProfiles, playlists, playlistItems } from '@/src/lib/server/db/schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import type { Track, Artist, Album, Playlist } from '@/src/types/spotify';

// Helper to map DB music record to Track
function mapDbMusicToTrack(item: any, artistName = 'Unknown Artist'): Track {
  return {
    id: item.id,
    title: item.title || item.prompt || 'Untitled',
    artist: artistName,
    artistId: item.userId || 'unknown-artist-id',
    album: 'Generated Single',
    albumId: 'generated-album-id',
    coverUrl: item.coverUrl || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&q=80&w=300&h=300',
    audioUrl: `/api/music/${item.id}`,
    duration: Math.floor((item.durationMs || 180000) / 1000),
    genre: item.model || 'AI Generated',
    addedAt: item.createdAt?.toISOString() || new Date().toISOString()
  };
}

export async function getLatestTracks(limit = 10): Promise<Track[]> {
  try {
    const latestMusic = await db.select()
      .from(music)
      .orderBy(desc(music.createdAt))
      .limit(limit);

    // In a real app we would join with users/artists to get the artist name
    return latestMusic.map(m => mapDbMusicToTrack(m));
  } catch (error) {
    console.error('Failed to get latest tracks:', error);
    return [];
  }
}

export async function getFeaturedArtists(limit = 5): Promise<Artist[]> {
  try {
    // For now we'll just return mock artists if no artists in DB, 
    // but we can query artistProfiles
    const dbArtists = await db.select()
      .from(artistProfiles)
      .orderBy(desc(artistProfiles.createdAt))
      .limit(limit);

    if (dbArtists.length === 0) {
      return [];
    }

    return dbArtists.map(a => ({
      id: a.id,
      name: a.displayName || 'Unknown Artist',
      avatarUrl: 'https://images.unsplash.com/photo-1516280440502-6c6a7e089679?auto=format&fit=crop&q=80&w=300&h=300', // Need avatarUrl from users join or profile
      bannerUrl: a.bannerUrl || 'https://images.unsplash.com/photo-1493225457124-a1a2a5e56d4c?auto=format&fit=crop&q=80&w=1200&h=400',
      verified: a.isVerified || false,
      monthlyListeners: 0,
      bio: a.bio || '',
      topTracks: [],
      albums: []
    }));
  } catch (error) {
    console.error('Failed to get featured artists:', error);
    return [];
  }
}
