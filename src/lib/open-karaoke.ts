import { goto } from "$app/navigation";
import type { GlobalMusicState, MusicTrack } from "$lib/stores/music.svelte.js";

type KaraokeSong = {
  id: string;
  title?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  lyrics?: string | null;
  durationMs?: number;
  isPublic?: boolean;
  artist?: string;
};

/** Navigate to the dedicated karaoke page (no sidebar overlay). */
export async function openKaraokePage(
  musicState: GlobalMusicState,
  song?: KaraokeSong | null
) {
  const id = song?.id || musicState.currentTrack?.id;
  if (!id || String(id).startsWith("pending-")) return;

  if (musicState.currentTrack?.id !== id && song) {
    const track: MusicTrack = {
      id,
      url: `/api/music/${id}`,
      title: song.title || "Generated Track",
      imageUrl: song.imageUrl || undefined,
      videoUrl: song.videoUrl || undefined,
      lyrics: song.lyrics || undefined,
      durationMs: song.durationMs || 0,
      isPublic: song.isPublic,
      artist: song.artist
    };
    musicState.currentTrack = track;
    musicState.currentTime = 0;
    musicState.duration =
      Number.isFinite(track.durationMs) && track.durationMs > 0
        ? track.durationMs / 1000
        : 0;
  }

  musicState.isExpanded = false;
  await goto(`/karaoke/${id}`);
}
