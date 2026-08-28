import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import type { VideoGenerationParams } from '$lib/ai/types.js';
import { getModelProvider } from '$lib/ai/index.js';
import { generateLocalVideo, getLocalVideoConfig } from '$lib/ai/providers/local-maestro.js';
import { UsageTrackingService, UsageLimitError } from '$lib/server/usage-tracking.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { getGenerationRateLimitPayload } from '$lib/server/file-upload-rate-limiting.js';
import {
	MV_BACKGROUNDS,
	MV_CHARACTERS,
	buildMusicVideoPrompt,
	resolvePresetImage,
	resolvePresetName,
	type MusicVideoKind,
	type MusicVideoMode,
	type MusicVideoRatio
} from '$lib/music-video/presets.js';

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function isUsableImageUrl(url?: string | null): url is string {
	if (!url || url.startsWith('data:')) return false;
	return url.startsWith('/api/images/') || url.startsWith('http://') || url.startsWith('https://');
}

function absoluteImageUrl(url: string, origin: string): string {
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}
		if (isDemoModeRestricted(!!session.user.id)) {
			return json({ error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION }, { status: 403 });
		}

		const rateLimited = getGenerationRateLimitPayload('musicVideoGeneration', session.user.id);
		if (rateLimited) {
			return json(rateLimited, { status: 429 });
		}

		const body = (await request.json()) as {
			musicId?: string;
			videoType?: MusicVideoKind;
			is30sViralHook?: boolean;
			characterId?: string | null;
			noCharacter?: boolean;
			backgroundId?: string | null;
			randomBackground?: boolean;
			style?: string;
			vibeTags?: string[];
			prompt?: string;
			videoGenMode?: MusicVideoMode;
			aspectRatio?: MusicVideoRatio;
		};

		const videoType: MusicVideoKind = body.videoType === 'lyrics-video' ? 'lyrics-video' : 'music-video';
		const videoGenMode: MusicVideoMode = body.videoGenMode === 'storyboard' ? 'storyboard' : 'one-click';
		const aspectRatio: MusicVideoRatio = (['16:9', '9:16', '3:4', '4:3'] as const).includes(
			body.aspectRatio as MusicVideoRatio
		)
			? (body.aspectRatio as MusicVideoRatio)
			: body.is30sViralHook
				? '9:16'
				: '16:9';
		const vibeTags = Array.isArray(body.vibeTags) ? body.vibeTags.map(String).slice(0, 12) : [];
		const musicId = typeof body.musicId === 'string' && UUID_RE.test(body.musicId) ? body.musicId : null;

		try {
			await UsageTrackingService.checkUsageLimit(session.user.id, 'video');
		} catch (error) {
			if (error instanceof UsageLimitError) {
				return json(
					{ error: error.message, type: 'usage_limit_exceeded', remainingQuota: error.remainingQuota },
					{ status: 429 }
				);
			}
			throw error;
		}

		let song: {
			id: string;
			title: string | null;
			prompt: string;
			lyrics: string | null;
			imageUrl: string | null;
		} | null = null;

		if (musicId) {
			const [record] = await db
				.select({
					id: music.id,
					title: music.title,
					prompt: music.prompt,
					lyrics: music.lyrics,
					imageUrl: music.imageUrl,
					userId: music.userId
				})
				.from(music)
				.where(eq(music.id, musicId));
			if (!record || record.userId !== session.user.id) {
				return json({ error: 'Song not found' }, { status: 404 });
			}
			song = record;
		}

		const title = song?.title || song?.prompt || 'QAMUZ track';
		const characterName = body.noCharacter
			? 'Sin personaje'
			: resolvePresetName(MV_CHARACTERS, body.characterId);
		const backgroundName = body.randomBackground
			? 'Random cinematic location'
			: resolvePresetName(MV_BACKGROUNDS, body.backgroundId);
		const style = String(body.style || 'Ink style');

		const prompt = buildMusicVideoPrompt({
			title,
			lyrics: song?.lyrics || song?.prompt,
			extraPrompt: body.prompt,
			videoType,
			is30sViralHook: Boolean(body.is30sViralHook),
			character: characterName,
			background: backgroundName,
			style,
			vibeTags,
			videoGenMode
		});

		const characterImage = body.noCharacter
			? undefined
			: resolvePresetImage(MV_CHARACTERS, body.characterId);
		const backgroundImage = body.randomBackground
			? undefined
			: resolvePresetImage(MV_BACKGROUNDS, body.backgroundId);
		const coverImage = song && isUsableImageUrl(song.imageUrl)
			? absoluteImageUrl(song.imageUrl, url.origin)
			: undefined;
		const startImage =
			(videoType === 'music-video' ? characterImage : undefined) || backgroundImage || coverImage;

		const duration = body.is30sViralHook ? 8 : 5;
		const local = await getLocalVideoConfig();
		const params: VideoGenerationParams = {
			model: local.enabled ? 'qamuz-local-video' : startImage ? 'wan-2.5-i2v-fast' : 'veo-3.1-fast',
			prompt,
			duration,
			resolution: aspectRatio === '9:16' ? '720p' : '720p',
			userId: session.user.id,
			imageUrl: startImage,
			quality: 'medium',
			style
		};

		const response = local.enabled
			? await generateLocalVideo(params)
			: await (async () => {
					const provider = getModelProvider(params.model);
					if (!provider?.generateVideo) {
						throw new Error('No video provider is available. Enable local Maestro video or configure Replicate.');
					}
					return provider.generateVideo(params);
				})();

		const videoUrl = `/api/videos/${response.videoId}`;
		if (musicId) {
			await db
				.update(music)
				.set({ videoUrl })
				.where(and(eq(music.id, musicId), eq(music.userId, session.user.id)));
		}

		UsageTrackingService.trackUsage(session.user.id, 'video').catch(console.error);

		return json({
			videoId: response.videoId,
			url: videoUrl,
			title: `${videoType === 'lyrics-video' ? 'Lyrics' : 'Music'} video: ${title}`,
			prompt,
			style,
			musicId,
			duration: response.duration ?? duration,
			thumbnailUrl: startImage || coverImage || videoUrl
		});
	} catch (error) {
		console.error('Music video generation error:', error);
		return json(
			{ error: 'The music video could not be generated right now. Please try again later.', code: 'generation_unavailable' },
			{ status: 500 }
		);
	}
};
