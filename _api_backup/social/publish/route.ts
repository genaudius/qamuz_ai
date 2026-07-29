import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { socialAccounts, videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { SocialPlatform } from '$lib/server/db/schema.js';

// POST /api/social/publish
// Body: { projectId, platform, title, description, tags, privacy }
export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const body = await request.json() as {
		projectId: string;
		platform: SocialPlatform;
		title: string;
		description?: string;
		tags?: string[];
		privacy?: 'public' | 'private' | 'unlisted';
	};

	const { projectId, platform, title, description = '', tags = [], privacy = 'public' } = body;

	// Load project
	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, projectId), eq(videoProjects.userId, session.user.id)));
	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	// Load social account
	const [account] = await db.select().from(socialAccounts)
		.where(and(eq(socialAccounts.userId, session.user.id), eq(socialAccounts.platform, platform)));
	if (!account) return json({ error: `${platform} account not connected` }, { status: 400 });

	// Get the final video URL (use first done clip if no finalVideoUrl)
	const clips = (project.clips as { clipUrl?: string; clipStatus?: string }[]) ?? [];
	const firstClip = clips.find(c => c.clipStatus === 'done' && c.clipUrl);
	const videoUrl = project.finalVideoUrl ?? firstClip?.clipUrl;
	if (!videoUrl) return json({ error: 'No video ready to publish' }, { status: 400 });

	try {
		switch (platform) {
			case 'youtube':
				return await publishToYoutube({ account, videoUrl, title, description, tags, privacy });

			case 'tiktok':
				return json({ error: 'TikTok publishing requires TikTok for Business API setup in Admin Settings' }, { status: 501 });

			case 'instagram':
			case 'facebook':
				return json({ error: 'Meta (Instagram/Facebook) publishing requires Meta Business API setup in Admin Settings' }, { status: 501 });

			case 'twitter':
				return json({ error: 'Twitter/X publishing requires Twitter API v2 setup in Admin Settings' }, { status: 501 });

			default:
				return json({ error: 'Unsupported platform' }, { status: 400 });
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};

async function publishToYoutube(opts: {
	account: { accessToken: string; refreshToken?: string | null };
	videoUrl: string;
	title: string;
	description: string;
	tags: string[];
	privacy: string;
}) {
	// Download the video content from internal URL
	const videoRes = await fetch(opts.videoUrl);
	if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
	const videoBuffer = await videoRes.arrayBuffer();

	// Step 1: Initialize resumable upload
	const initRes = await fetch(
		'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${opts.account.accessToken}`,
				'Content-Type': 'application/json',
				'X-Upload-Content-Type': 'video/mp4',
				'X-Upload-Content-Length': String(videoBuffer.byteLength),
			},
			body: JSON.stringify({
				snippet: {
					title: opts.title,
					description: opts.description,
					tags: opts.tags,
					categoryId: '10', // Music
				},
				status: {
					privacyStatus: opts.privacy,
					selfDeclaredMadeForKids: false,
				},
			}),
		}
	);

	if (!initRes.ok) {
		const errBody = await initRes.text();
		throw new Error(`YouTube upload init failed: ${initRes.status} ${errBody}`);
	}

	const uploadUrl = initRes.headers.get('Location');
	if (!uploadUrl) throw new Error('YouTube did not return an upload URL');

	// Step 2: Upload the actual video bytes
	const uploadRes = await fetch(uploadUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': 'video/mp4',
			'Content-Length': String(videoBuffer.byteLength),
		},
		body: videoBuffer,
	});

	if (!uploadRes.ok) {
		const errBody = await uploadRes.text();
		throw new Error(`YouTube upload failed: ${uploadRes.status} ${errBody}`);
	}

	const data = await uploadRes.json() as { id?: string; status?: { uploadStatus?: string } };
	const videoId = data.id;

	return json({
		ok: true,
		platform: 'youtube',
		videoId,
		url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
	});
}
