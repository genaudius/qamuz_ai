import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { prompt, style, cameraMotion, aspectRatio, songTitle } = body;

		await new Promise(resolve => setTimeout(resolve, 4000));

		const generatedVideo = {
			id: crypto.randomUUID(),
			title: songTitle ? `Video Musical: ${songTitle}` : `Video AI: ${style}`,
			prompt,
			style,
			cameraMotion,
			thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800&auto=format&fit=crop',
			sceneFrames: [
				'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop',
				'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=400&auto=format&fit=crop',
				'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop'
			],
			createdAt: new Date().toISOString(),
			songTitle
		};

		return json({ success: true, video: generatedVideo });
	} catch (error) {
		console.error('Error generating video:', error);
		return json({ success: false, error: 'Error interno al generar video' }, { status: 500 });
	}
}
