import { NextResponse, type NextRequest } from 'next/server';
import { sunoProvider, sunoSubmitTask, sunoCheckStatus } from '@/src/lib/ai/providers/suno';

import { UsageTrackingService, UsageLimitError } from '@/src/lib/server/usage-tracking';
import { saveMusicAndGetId } from '@/src/lib/ai/utils';
import { db } from '@/src/lib/server/db/index';
import { music } from '@/src/lib/server/db/schema';
import { and, eq, gte } from 'drizzle-orm';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '@/src/lib/constants/demo-mode';
import { getAuth } from '@/src/lib/auth';

const VALID_SUNO_MODELS = ['suno-v3.5', 'suno-v4', 'suno-v4.5', 'suno-v4.5-plus', 'suno-v4.5-all', 'suno-v5', 'suno-v5.5', 'suno-v7.5'];

export async function POST(request: NextRequest) {
	try {
		const auth = await getAuth();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
		}

		if (isDemoModeRestricted(!!session?.user?.id)) {
			return NextResponse.json({
				error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION,
				type: 'demo_mode_restricted'
			}, { status: 403 });
		}

		const body = await request.json();
		const {
			prompt,
			musicLengthMs,
			modelId = 'music_v1',
			forceInstrumental = false,
			outputFormat = 'mp3_44100_128',
			customMode = false,
			style,
			title,
			vocalGender,
		} = body;

		if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
			return NextResponse.json({ error: 'Prompt is required and must be a non-empty string' }, { status: 400 });
		}
		if (prompt.length > 4100) {
			return NextResponse.json({ error: 'Prompt exceeds maximum length of 4100 characters' }, { status: 400 });
		}

		let internalModelId = modelId;
		let isSunoModel = false;

		if (modelId === 'music_v1' || modelId === 'music_v3') {
			// All UI options force to Suno now
			isSunoModel = true;
			internalModelId = 'suno-v7.5';
		} else {
			// Legacy support
			isSunoModel = VALID_SUNO_MODELS.includes(modelId);
			if (!isSunoModel) {
				return NextResponse.json({ error: `Invalid model ID for music generation. Expected one of: music_v1, or legacy IDs.` }, { status: 400 });
			}
		}

		if (!isSunoModel && musicLengthMs != null) {
			const durationMs = Number(musicLengthMs);
			if (isNaN(durationMs) || durationMs < 3000 || durationMs > 300000) {
				return NextResponse.json({ error: 'Music duration must be between 3 seconds (3000ms) and 5 minutes (300000ms)' }, { status: 400 });
			}
		}

		try {
			const cost = UsageTrackingService.calculateCost('music');
			await UsageTrackingService.checkUsageLimit(session.user.id, cost);
		} catch (error) {
			if (error instanceof UsageLimitError) {
				return NextResponse.json({
					error: error.message,
					type: 'usage_limit_exceeded',
					remainingQuota: error.remainingQuota
				}, { status: 429 });
			}
			throw error;
		}

		// ── Suno: submit only, return taskId immediately ──────────────────────────
		if (isSunoModel) {
			const origin = request.headers.get('origin') || new URL(request.url).origin;
			const taskId = await sunoSubmitTask({
				prompt: prompt.trim(),
				modelId: internalModelId,
				forceInstrumental: Boolean(forceInstrumental),
				customMode: Boolean(customMode),
				style,
				title,
				callBackUrl: `${origin}/api/suno-callback`,
			});

			const userId = session.user.id;

			// BACKGROUND POLL & SAVE
			(async () => {
				const MAX_WAIT = 600_000; // 10 mins
				const deadline = Date.now() + MAX_WAIT;
				let track = null;

				while (Date.now() < deadline) {
					try {
						const result = await sunoCheckStatus(taskId);
						if (result.status === 'done') { track = result.track; break; }
						if (result.status === 'error') {
							try {
								const { createNotification } = await import('@/src/lib/server/notifications');
								await createNotification(userId, 'Generation Failed', `Your Suno generation "${prompt.substring(0, 30)}..." failed to complete.`, 'system');
							} catch (err) {}
							return;
						}
					} catch (e) {
						// ignore poll error and try again
					}
					await new Promise(r => setTimeout(r, 10000));
				}

				if (!track) return; // timed out

				try {
					const titleToCheck = track.title || taskId;
					const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

					const existing = await db.select().from(music).where(
						and(
							eq(music.userId, userId),
							eq(music.prompt, titleToCheck),
							gte(music.createdAt, tenMinutesAgo)
						)
					).limit(1);

					if (existing.length === 0) {
						// Not saved by frontend, save it in the background
						const audioRes = await fetch(track.audioUrl);
						if (audioRes.ok) {
							const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
							const durationMs = Math.round((track.duration || 0) * 1000);
							await saveMusicAndGetId(
								audioBuffer,
								'audio/mpeg',
								userId,
								titleToCheck,
								'suno',
								durationMs,
								false,
								undefined,
								track.imageUrl
							);
						}
					}
				} catch (e) {
					console.error('Background saving error:', e);
				}
			})();

			return NextResponse.json({ taskId, provider: 'suno' });
		}

		return NextResponse.json({ error: `Invalid provider selected.` }, { status: 400 });

	} catch (error) {
		console.error('Music generation API error:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	const auth = await getAuth();
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

	const { searchParams } = new URL(request.url);
	const taskId = searchParams.get('taskId');
	const provider = searchParams.get('provider') || 'suno';
	const promptQuery = searchParams.get('prompt') || '';
	if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

	try {
		let result;
		if (provider === 'suno') {
			result = await sunoCheckStatus(taskId);
		} else {
			return NextResponse.json({ error: 'Legacy generation engines are no longer supported.' }, { status: 400 });
		}

		if (result.status === 'done' && result.track) {
			// Download audio, save to DB, return full response
			const audioRes = await fetch(result.track.audioUrl);
			if (!audioRes.ok) throw new Error(`Failed to download audio: ${audioRes.status}`);
			const arrayBuffer = await audioRes.arrayBuffer();
			const audioBuffer = Buffer.from(arrayBuffer);
			const durationMs = Math.round((result.track.duration || 0) * 1000);

			const musicId = await saveMusicAndGetId(
				audioBuffer,
				'audio/mpeg',
				session.user.id,
				result.track.title || promptQuery || taskId,
				provider,
				durationMs,
				false,
				undefined,
				result.track.imageUrl
			);

			const cost = UsageTrackingService.calculateCost('music');
			UsageTrackingService.trackUsage(session.user.id, cost).catch(console.error);

			return NextResponse.json({
				status: 'done',
				audioUrl: `/api/music/${musicId}`,
				mimeType: 'audio/mpeg',
				title: result.track.title || taskId,
				durationMs,
				coverUrl: result.track.imageUrl,
				tags: result.track.tags,
				musicId,
			});
		}

		if (result.status === 'error') {
			return NextResponse.json({ status: 'error', error: result.errorMessage || 'Generation failed' });
		}

		return NextResponse.json({ status: 'pending' });

	} catch (error) {
		console.error(`${provider} status check error:`, error);
		return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'Status check failed' });
	}
}
