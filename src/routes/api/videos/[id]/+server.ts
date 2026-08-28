import { error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videos } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { storageService } from '$lib/server/storage.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { canViewVideo, isMusicUuid, mediaCacheControl } from '$lib/server/media-access.js';

// Stream a video: owner always, anyone if linked from a published track.
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const session = await locals.auth();
		const videoId = params.id;

		if (!videoId) {
			throw error(400, 'Video ID is required');
		}

		if (!isMusicUuid(videoId)) {
			throw error(400, 'Invalid video ID format');
		}

		const [videoRecord] = await db
			.select()
			.from(videos)
			.where(eq(videos.id, videoId));

		if (!videoRecord) {
			throw error(404, 'Video not found');
		}

		const allowed = await canViewVideo(videoId, videoRecord.userId, session?.user?.id);
		if (!allowed) {
			throw error(session?.user?.id ? 403 : 401, session?.user?.id
				? 'Access denied - this video is private'
				: 'Authentication required');
		}

		const isPublicVideo = videoRecord.userId !== session?.user?.id;
		const cacheControl = mediaCacheControl(isPublicVideo);

		// Handle cloud storage files with presigned URLs
		if (videoRecord.storageLocation === 'r2' && videoRecord.cloudPath) {
			const presignedUrl = await storageService.getUrl(videoRecord.cloudPath);
			
			// Redirect to presigned URL for direct R2 access
			return new Response(null, {
				status: 302,
				headers: {
					'Location': presignedUrl,
					'Cache-Control': isPublicVideo ? 'public, max-age=300' : 'private, max-age=300'
				}
			});
		}

		// Handle local files - use cloudPath stored in database
		if (!videoRecord.cloudPath) {
			throw error(404, 'Video file path not found');
		}
		
		const storagePath = videoRecord.cloudPath;
		
		try {
			const videoData = await storageService.download(storagePath);

			return new Response(new Uint8Array(videoData), {
				headers: {
					'Content-Type': videoRecord.mimeType,
					'Cache-Control': cacheControl,
					'Content-Length': videoData.length.toString(),
					'Accept-Ranges': 'bytes'
				}
			});
		} catch (storageError) {
			console.error('Storage retrieval error:', storageError);
			throw error(404, 'Video file not found in storage');
		}
	} catch (err) {
		console.error('Video retrieval error:', err);
		if (isHttpError(err)) {
			throw err;
		}
		throw error(500, 'Failed to retrieve video');
	}
};

// Delete video by ID (secure with authentication and authorization)
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

		const videoId = params.id;

		if (!videoId) {
			throw error(400, 'Video ID is required');
		}

		// Validate video ID format (UUID format for database IDs)
		if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(videoId)) {
			throw error(400, 'Invalid video ID format');
		}

		// Query database to get video metadata and verify ownership
		const [videoRecord] = await db
			.select()
			.from(videos)
			.where(eq(videos.id, videoId));

		if (!videoRecord) {
			throw error(404, 'Video not found');
		}

		// Check authorization - user can only delete their own videos
		if (videoRecord.userId !== session.user.id) {
			throw error(403, 'Access denied - you can only delete your own videos');
		}

		// Delete from storage if cloudPath exists
		if (videoRecord.cloudPath) {
			try {
				await storageService.delete(videoRecord.cloudPath);
			} catch (storageError) {
				console.error('Storage deletion error:', storageError);
				// Continue with database deletion even if storage deletion fails
			}
		}

		// Delete from database
		await db.delete(videos).where(eq(videos.id, videoId));

		return new Response(JSON.stringify({ success: true, message: 'Video deleted successfully' }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (err) {
		console.error('Video deletion error:', err);
		if (isHttpError(err)) {
			throw err;
		}
		throw error(500, 'Failed to delete video');
	}
};