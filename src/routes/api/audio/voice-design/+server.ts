import { json } from '@sveltejs/kit';
import { generateVoiceDesign, createDesignedVoice } from '$lib/ai/providers/elevenlabs';
import type { VoiceDesignParams } from '$lib/ai/types';

export async function POST({ request, locals }) {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();
		const action = data.action;

		if (action === 'generate') {
			const params: VoiceDesignParams = {
				text: data.text,
				gender: data.gender,
				age: data.age,
				accent: data.accent,
				accentStrength: data.accentStrength || 1.0
			};
			
			const response = await generateVoiceDesign(params);
			return json(response);
		} else if (action === 'create') {
			if (!data.generatedVoiceId || !data.voiceName) {
				return json({ error: 'Missing required fields' }, { status: 400 });
			}
			
			const response = await createDesignedVoice(
				data.voiceName,
				data.voiceDescription || '',
				data.generatedVoiceId
			);
			
			return json(response);
		} else {
			return json({ error: 'Invalid action' }, { status: 400 });
		}
	} catch (error: any) {
		console.error('Voice design API error:', error);
		return json({ error: error.message || 'Failed to process voice design request' }, { status: 500 });
	}
}
