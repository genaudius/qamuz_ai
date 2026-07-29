import { db } from './index.ts';
import { songs, users, favorites } from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';

export async function saveSongToDb(songData: {
  songId: string;
  userId?: number | null;
  title: string;
  artist: string;
  album?: string;
  genre: string;
  bpm?: number;
  key?: string;
  lyrics?: any;
  fullLyricsText?: string;
  coverUrl?: string;
  audioUrl: string;
  synthData?: any;
  duration?: number;
}) {
  try {
    const existing = await db.select().from(songs).where(eq(songs.songId, songData.songId));
    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db.insert(songs).values({
      songId: songData.songId,
      userId: songData.userId || null,
      title: songData.title,
      artist: songData.artist,
      album: songData.album || 'Qamuz Studio',
      genre: songData.genre,
      bpm: songData.bpm || 120,
      key: songData.key || 'C minor',
      lyrics: songData.lyrics,
      fullLyricsText: songData.fullLyricsText,
      coverUrl: songData.coverUrl,
      audioUrl: songData.audioUrl,
      synthData: songData.synthData,
      duration: songData.duration || 180,
    }).returning();

    return inserted[0];
  } catch (error) {
    console.error("Error saving song to database:", error);
    throw new Error("Failed to save song to database", { cause: error });
  }
}

export async function getAllSongsFromDb(limitCount = 50) {
  try {
    const result = await db.select().from(songs).orderBy(desc(songs.createdAt)).limit(limitCount);
    return result;
  } catch (error) {
    console.error("Error fetching songs from database:", error);
    throw new Error("Failed to fetch songs from database", { cause: error });
  }
}

export async function getUserSongsFromDb(userId: number) {
  try {
    const result = await db.select().from(songs).where(eq(songs.userId, userId)).orderBy(desc(songs.createdAt));
    return result;
  } catch (error) {
    console.error("Error fetching user songs from database:", error);
    throw new Error("Failed to fetch user songs from database", { cause: error });
  }
}
