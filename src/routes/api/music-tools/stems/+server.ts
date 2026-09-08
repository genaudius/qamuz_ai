import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { genAudiusClient } from '$lib/ai/providers/genaudius-client.js';
import { storageService } from '$lib/server/storage.js';

/**
 * Stem separation via GenAudius workers (Demucs). Kie vocal-removal is disabled (generate-only).
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const musicId = typeof body.musicId === 'string' ? body.musicId : undefined;
		if (!musicId) return json({ error: 'musicId is required' }, { status: 400 });

		const [song] = await db
			.select({
				id: music.id,
				cloudPath: music.cloudPath,
				mimeType: music.mimeType
			})
			.from(music)
			.where(and(eq(music.id, musicId), eq(music.userId, session.user.id)))
			.limit(1);
		if (!song?.cloudPath) return json({ error: 'Music not found' }, { status: 404 });

		const buffer = await storageService.download(song.cloudPath);
		const mode =
			typeof body.type === 'string'
				? body.type
				: typeof body.mode === 'string'
					? body.mode
					: 'separate_vocal';

		const result = await genAudiusClient.separateStems({
			audioBase64: buffer.toString('base64'),
			mimeType: song.mimeType || 'audio/mpeg',
			mode
		});

		const stems = [];
		for (const stem of result.stems || []) {
			const uploaded = await storageService.upload(
				{
					buffer: Buffer.from(stem.audioBase64, 'base64'),
					mimeType: stem.mimeType || 'audio/wav',
					filename: `${musicId}-${stem.name}.wav`
				},
				session.user.id,
				'audio',
				'generated'
			);
			stems.push({
				name: stem.name,
				url: `/api/library/file?path=${encodeURIComponent(uploaded.path)}`,
				storagePath: uploaded.path,
				mimeType: stem.mimeType,
				bytes: stem.bytes
			});
		}

		return json({
			source: 'genaudius',
			status: 'completed',
			engine: result.source,
			stems
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Stem separation failed';
		const status = message.includes('not installed') ? 501 : 502;
		return json({ error: message, code: 'genaudius_stems_failed' }, { status });
	}
};

export const GET: RequestHandler = async () => {
	return json({
		source: 'genaudius',
		message: 'Stem jobs complete synchronously via GenAudius. Use POST with musicId.'
	});
};
