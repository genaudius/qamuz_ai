import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';

export const MUSIC_UUID_RE =
	/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function isMusicUuid(id: string): boolean {
	return MUSIC_UUID_RE.test(id);
}

export function canStreamMusic(
	record: { userId: string; isPublic: boolean },
	viewerId?: string | null
): boolean {
	if (record.isPublic) return true;
	return Boolean(viewerId && viewerId === record.userId);
}

export async function canViewVideo(
	videoId: string,
	videoUserId: string,
	viewerId?: string | null
): Promise<boolean> {
	if (viewerId && viewerId === videoUserId) return true;
	const [publicTrack] = await db
		.select({ id: music.id })
		.from(music)
		.where(and(eq(music.videoUrl, `/api/videos/${videoId}`), eq(music.isPublic, true)))
		.limit(1);
	return Boolean(publicTrack);
}

export function mediaCacheControl(isPublic: boolean): string {
	return isPublic ? 'public, max-age=3600' : 'private, max-age=3600';
}
