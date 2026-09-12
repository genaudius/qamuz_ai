import { error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { storageService } from '$lib/server/storage.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { canStreamMusic, isMusicUuid, mediaCacheControl } from '$lib/server/media-access.js';

// Stream a track: owner always, anyone if the track is published.
function parseByteRange(header: string | null, size: number): { start: number; end: number } | null {
	if (!header) return null;
	const match = header.match(/^bytes=(\d*)-(\d*)$/i);
	if (!match) return null;
	const hasStart = match[1] !== '';
	const hasEnd = match[2] !== '';
	if (!hasStart && !hasEnd) return null;
	let start = hasStart ? Number(match[1]) : size - Number(match[2]);
	let end = hasEnd ? Number(match[2]) : size - 1;
	if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
	start = Math.max(0, start);
	end = Math.min(size - 1, end);
	if (start > end) return null;
	return { start, end };
}

export const GET: RequestHandler = async ({ params, locals, request }) => {
	try {
		const session = await locals.auth();
		const musicId = params.id;

		if (!musicId) {
			throw error(400, 'Music ID is required');
		}

		if (!isMusicUuid(musicId)) {
			throw error(400, 'Invalid music ID format');
		}

		const [musicRecord] = await db
			.select()
			.from(music)
			.where(eq(music.id, musicId));

		if (!musicRecord) {
			throw error(404, 'Music not found');
		}

		const isAdmin = Boolean((session?.user as any)?.isAdmin || session?.user?.role === 'admin');
		if (!canStreamMusic(musicRecord, session?.user?.id, isAdmin)) {
			throw error(session?.user?.id ? 403 : 401, session?.user?.id
				? 'Access denied - this track is private'
				: 'Authentication required');
		}

		const cacheControl = mediaCacheControl(musicRecord.isPublic);
		if (musicRecord.isPublic && !request.headers.get('range')) {
			await db
				.update(music)
				.set({ playsCount: sql`${music.playsCount} + 1` })
				.where(eq(music.id, musicId));
		}

		// Detect Studio proxy requests (embedded iframe or BFF) that cannot follow
		// cross-origin redirects due to CORS restrictions on the CDN.
		const isStudioProxy = request.headers.has('x-studio-proxy') || request.headers.has('x-studio-stream');

		// Handle cloud storage files with presigned URLs
		if (musicRecord.storageLocation === 'r2' && musicRecord.cloudPath) {
			const presignedUrl = await storageService.getUrl(musicRecord.cloudPath);

			if (isStudioProxy) {
				// Stream bytes server-side for studio to avoid CORS issues with R2 CDN
				const r2Res = await fetch(presignedUrl);
				if (!r2Res.ok) throw error(502, 'Could not fetch audio from storage');
				const contentType = r2Res.headers.get('content-type') || musicRecord.mimeType || 'audio/mpeg';
				return new Response(r2Res.body, {
					status: 200,
					headers: {
						'Content-Type': contentType,
						'Content-Length': r2Res.headers.get('content-length') || '',
						'Cache-Control': 'private, max-age=300',
						'Access-Control-Allow-Origin': '*'
					}
				});
			}

			// Redirect to presigned URL for direct R2 access (browser players, etc.)
			return new Response(null, {
				status: 302,
				headers: {
					'Location': presignedUrl,
					'Cache-Control': musicRecord.isPublic ? 'public, max-age=300' : 'private, max-age=300'
				}
			});
		}

		// Handle Kie external CDN links
		if (musicRecord.storageLocation === 'kie' && musicRecord.cloudPath) {
			if (isStudioProxy) {
				// Stream bytes server-side for studio to avoid CORS issues
				const kieRes = await fetch(musicRecord.cloudPath);
				if (!kieRes.ok) throw error(502, 'Could not fetch audio from CDN');
				const contentType = kieRes.headers.get('content-type') || 'audio/mpeg';
				return new Response(kieRes.body, {
					status: 200,
					headers: {
						'Content-Type': contentType,
						'Content-Length': kieRes.headers.get('content-length') || '',
						'Cache-Control': 'public, max-age=3600',
						'Access-Control-Allow-Origin': '*'
					}
				});
			}
			return new Response(null, {
				status: 302,
				headers: {
					'Location': musicRecord.cloudPath,
					'Cache-Control': 'public, max-age=3600'
				}
			});
		}

		// Handle local files - use cloudPath stored in database
		if (!musicRecord.cloudPath) {
			throw error(404, 'Music file path not found');
		}

		const storagePath = musicRecord.cloudPath;

		try {
			const musicData = await storageService.download(storagePath);
			const body = new Uint8Array(musicData);
			const size = body.byteLength;
			const range = parseByteRange(request.headers.get('range'), size);
			const contentType = musicRecord.mimeType || 'audio/mpeg';

			if (range) {
				const sliced = body.subarray(range.start, range.end + 1);
				return new Response(sliced, {
					status: 206,
					headers: {
						'Content-Type': contentType,
						'Accept-Ranges': 'bytes',
						'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
						'Content-Length': sliced.byteLength.toString(),
						'Cache-Control': cacheControl
					}
				});
			}

			return new Response(body, {
				headers: {
					'Content-Type': contentType,
					'Accept-Ranges': 'bytes',
					'Cache-Control': cacheControl,
					'Content-Length': size.toString()
				}
			});
		} catch (storageError) {
			console.error('Storage retrieval error:', storageError);
			throw error(404, 'Music file not found in storage');
		}
	} catch (err) {
		console.error('Music retrieval error:', err);
		if (isHttpError(err)) {
			throw err;
		}
		throw error(500, 'Failed to retrieve music');
	}
};

// Delete music by ID (secure with authentication and authorization)
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Check authentication
		const session = await locals.auth();
		if (!session?.user?.id) {
			throw error(401, 'Authentication required');
		}

		// Check demo mode restrictions
		if (isDemoModeRestricted(!!session?.user?.id)) {
			throw error(403, DEMO_MODE_MESSAGES.GENERAL_RESTRICTION);
		}

		const musicId = params.id;

		if (!musicId) {
			throw error(400, 'Music ID is required');
		}

		// Validate music ID format (UUID format for database IDs)
		if (!isMusicUuid(musicId)) {
			throw error(400, 'Invalid music ID format');
		}

		// Query database to get music metadata and verify ownership
		const [musicRecord] = await db
			.select()
			.from(music)
			.where(eq(music.id, musicId));

		if (!musicRecord) {
			throw error(404, 'Music not found');
		}

		// Check authorization - user can only delete their own music (or admin)
		const isOwner = musicRecord.userId === session.user.id || session.user.role === 'admin';
		if (!isOwner) {
			throw error(403, 'No tienes permiso para eliminar canciones de otros artistas');
		}

		// Delete from storage if cloudPath exists
		if (musicRecord.cloudPath) {
			try {
				await storageService.delete(musicRecord.cloudPath);
			} catch (storageError) {
				console.error('Storage deletion error:', storageError);
				// Continue with database deletion even if storage deletion fails
			}
		}

		// Delete from database
		await db.delete(music).where(eq(music.id, musicId));

		return new Response(JSON.stringify({ success: true, message: 'Music deleted successfully' }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (err) {
		console.error('Music deletion error:', err);
		if (isHttpError(err)) {
			throw err;
		}
		throw error(500, 'Failed to delete music');
	}
};
