import { json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
	try {
		const body = await request.json();
		const { prompt, genre, mood, vocalStyle, title, customLyrics } = body;

		// Simulate API processing delay (e.g., 3.5 seconds)
		await new Promise(resolve => setTimeout(resolve, 3500));

		const generatedSong = {
			id: crypto.randomUUID(),
			title: title || `Generación AI - ${genre}`,
			artist: 'Qamuz AI Engine',
			album: 'AI Studio Sessions',
			genre: genre || 'Pop',
			bpm: 120,
			key: 'C Min',
			lyrics: [],
			fullLyricsText: customLyrics || prompt || 'Letras generadas por inteligencia artificial basadas en tu prompt...',
			coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop',
			audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_b8c9103636.mp3?filename=lofi-study-112191.mp3', // Mock track
			duration: 145000,
			createdAt: new Date().toISOString()
		};

		return json({ success: true, song: generatedSong });
	} catch (error) {
		console.error('Error generating song:', error);
		return json({ success: false, error: 'Error interno al generar canción' }, { status: 500 });
	}
}
