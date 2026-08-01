import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { storageService } from '$lib/server/storage.js';
import { randomUUID } from 'crypto';
import path from 'path';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check authentication
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

        // Only allow audio files
        if (!file.type.startsWith('audio/')) {
            return json({ error: 'Only audio files are allowed' }, { status: 400 });
        }

		// Read file buffer
		const buffer = Buffer.from(await file.arrayBuffer());
		
		// Generate unique filename
		const extension = path.extname(file.name) || '.mp3';
		const filename = `${randomUUID()}${extension}`;

		// Upload to storage
		const result = await storageService.upload({
			buffer,
			mimeType: file.type,
			filename
		}, session.user.id, 'audio', 'uploaded');

		// Get URL
		const url = await storageService.getUrl(result.path);

		return json({
			url,
			path: result.path,
			filename: file.name
		});
	} catch (error: any) {
		console.error('Audio upload error:', error);
		return json({ error: error.message || 'Error uploading file' }, { status: 500 });
	}
};
