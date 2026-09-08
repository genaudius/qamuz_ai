import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { isKieGenerateOnly } from '$lib/ai/providers/kie-music.js';

/** Kie audio recovery is disabled while Kie is generate-only. */
export const POST: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
	if (isKieGenerateOnly()) {
		return json(
			{
				error:
					'Kie audio recovery is disabled (generate-only). Re-generate the track or download from library.',
				code: 'kie_generate_only'
			},
			{ status: 403 }
		);
	}
	return json({ error: 'Recovery requires KIE_MUSIC_GENERATE_ONLY=false' }, { status: 403 });
};

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
	return json(
		{ error: 'Kie recovery disabled (generate-only policy)', code: 'kie_generate_only' },
		{ status: 403 }
	);
};
