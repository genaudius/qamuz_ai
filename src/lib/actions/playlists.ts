'use server';

import { db } from '@/src/lib/server/db/index';
import { playlists, artistProfiles } from '@/src/lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { Playlist, Artist } from '@/src/types/spotify';

export async function getPlaylists(limit = 10): Promise<Playlist[]> {
  try {
    const dbPlaylists = await db.select()
      .from(playlists)
      .orderBy(desc(playlists.createdAt))
      .limit(limit);

    // Map DB playlists to our UI Playlist interface
    // Note: since we aren't joining tracks here, tracks will be empty initially
    return dbPlaylists.map(pl => ({
      id: pl.id,
      title: pl.name,
      description: pl.description || '',
      coverUrl: pl.coverUrl || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&q=80&w=300&h=300',
      isCustom: false,
      tracks: [], // Would need a join with playlistItems + music to populate this
      ownerName: 'Qamuz User',
      createdAt: pl.createdAt?.toISOString()
    }));
  } catch (error) {
    console.error('Failed to fetch playlists:', error);
    return [];
  }
}
