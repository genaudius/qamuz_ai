-- Karaoke-accurate lyric timings (seconds) from Suno/Kie alignment.
ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "alignedLyrics" json;
