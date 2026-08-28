import type { PageServerLoad } from './$types';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { isDemoModeEnabled } from '$lib/constants/demo-mode.js';

export type MusicVideoSong = {
	id: string;
	title: string;
	prompt: string;
	genre: string | null;
	imageUrl: string | null;
	lyrics: string | null;
	videoUrl: string | null;
	durationMs: number | null;
	isInstrumental: boolean;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();
	const requestedId = url.searchParams.get('song');

	let songs: MusicVideoSong[] = [];
	if (session?.user?.id) {
		const rows = await db
			.select({
				id: music.id,
				title: music.title,
				prompt: music.prompt,
				genre: music.genre,
				imageUrl: music.imageUrl,
				lyrics: music.lyrics,
				videoUrl: music.videoUrl,
				durationMs: music.durationMs,
				isInstrumental: music.isInstrumental
			})
			.from(music)
			.where(eq(music.userId, session.user.id))
			.orderBy(desc(music.createdAt))
			.limit(80);

		songs = rows.map((row) => ({
			...row,
			title: row.title || row.prompt || 'Untitled track'
		}));
	}

	const selectedSong = requestedId ? songs.find((song) => song.id === requestedId) ?? null : songs[0] ?? null;

	return {
		session,
		isDemoMode: isDemoModeEnabled(),
		songs,
		selectedSongId: selectedSong?.id ?? null
	};
};
