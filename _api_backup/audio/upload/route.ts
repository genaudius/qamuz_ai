import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { storageService } from '$lib/server/storage.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { enforceFileUploadRateLimit } from '$lib/server/file-upload-rate-limiting.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) {
			throw error(401, 'Unauthorized');
		}

		if (isDemoModeRestricted(!!session?.user?.id)) {
			throw error(403, DEMO_MODE_MESSAGES.GENERAL_RESTRICTION);
		}

		enforceFileUploadRateLimit('audioGeneration', session.user.id);

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file || !(file instanceof File)) {
			throw error(400, 'Audio file is required');
		}

		const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/x-m4a'];
		if (!allowedTypes.includes(file.type)) {
			throw error(400, 'Unsupported audio type. Please upload MP3 or WAV.');
		}

		// 15MB limit
		if (file.size > 15 * 1024 * 1024) {
			throw error(400, 'File too large (max 15MB)');
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		
		const extension = file.name.split('.').pop()?.toLowerCase() || 'mp3';
		const generatedFilename = storageService.generateFilename(`upload.${extension}`);
		
		const storageResult = await storageService.upload(
			{
				buffer,
				mimeType: file.type,
				filename: generatedFilename
			},
			session.user.id,
			'audio',
			'uploaded'
		);

		const audioUrl = await storageService.getUrl(storageResult.path);

		return json({
			url: audioUrl,
			mimeType: file.type,
			size: file.size
		});
	} catch (err) {
		console.error('Audio upload error:', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to upload audio');
	}
};
