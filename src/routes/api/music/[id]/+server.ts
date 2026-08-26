import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { storageService } from '$lib/server/storage.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

// Get music by ID (secure with authentication and authorization)
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
		// Check authentication
		const session = await locals.auth();
		if (!session?.user?.id) {
			throw error(401, 'Authentication required');
		}

		const musicId = params.id;

		if (!musicId) {
			throw error(400, 'Music ID is required');
		}

		// Validate music ID format (UUID format for database IDs)
		if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(musicId)) {
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

		// Check authorization - user can only access their own music
		if (musicRecord.userId !== session.user.id) {
			throw error(403, 'Access denied - you can only access your own music');
		}

		// Handle cloud storage files with presigned URLs
		if (musicRecord.storageLocation === 'r2' && musicRecord.cloudPath) {
			const presignedUrl = await storageService.getUrl(musicRecord.cloudPath);

			// Redirect to presigned URL for direct R2 access
			return new Response(null, {
				status: 302,
				headers: {
					'Location': presignedUrl,
					'Cache-Control': 'private, max-age=300' // 5 minutes cache for redirect
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
						'Cache-Control': 'private, max-age=3600'
					}
				});
			}

			return new Response(body, {
				headers: {
					'Content-Type': contentType,
					'Accept-Ranges': 'bytes',
					'Cache-Control': 'private, max-age=3600',
					'Content-Length': size.toString()
				}
			});
		} catch (storageError) {
			console.error('Storage retrieval error:', storageError);
			throw error(404, 'Music file not found in storage');
		}
	} catch (err) {
		console.error('Music retrieval error:', err);
		if (err instanceof Error && 'status' in err) {
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
		if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(musicId)) {
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

		// Check authorization - user can only delete their own music
		if (musicRecord.userId !== session.user.id) {
			throw error(403, 'Access denied - you can only delete your own music');
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
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to delete music');
	}
};
