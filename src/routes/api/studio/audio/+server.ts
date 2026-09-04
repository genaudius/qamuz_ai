import { json, type RequestHandler } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import path from 'path';
import { db } from '$lib/server/db/index.js';
import { audio } from '$lib/server/db/schema.js';
import { storageService } from '$lib/server/storage.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	const userId = session?.user?.id;
	if (!userId) return json({ error: 'Authentication required' }, { status: 401 });
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File) || !file.type.startsWith('audio/')) return json({ error: 'Audio file required' }, { status: 400 });
	const id = randomUUID();
	const extension = path.extname(file.name) || '.wav';
	const storedName = `${id}${extension}`;
	const stored = await storageService.upload({ buffer: Buffer.from(await file.arrayBuffer()), mimeType: file.type, filename: storedName }, userId, 'audio', 'uploaded');
	await db.insert(audio).values({
		id,
		filename: file.name,
		userId,
		mimeType: file.type,
		fileSize: file.size,
		text: 'Imported in QAMUZ Studio',
		model: 'studio-import',
		voiceId: 'original',
		storageLocation: stored.storageLocation,
		cloudPath: stored.path,
	});
	return json({ id, url: `/api/audio/${id}`, filename: file.name });
};
