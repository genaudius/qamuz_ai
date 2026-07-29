import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { prompt, style, aspectRatio, category } = body;

		await new Promise(resolve => setTimeout(resolve, 3000));

		const generatedImage = {
			id: crypto.randomUUID(),
			title: `Arte AI: ${category}`,
			prompt,
			style,
			category,
			aspectRatio,
			imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
			createdAt: new Date().toISOString()
		};

		return json({ success: true, image: generatedImage });
	} catch (error) {
		console.error('Error generating image:', error);
		return json({ success: false, error: 'Error interno al generar imagen' }, { status: 500 });
	}
}
