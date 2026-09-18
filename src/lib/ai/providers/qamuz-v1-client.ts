import { env } from '$env/dynamic/private';

const DEFAULT_BASE_URL = 'http://127.0.0.1:42004';

function baseUrl(): string {
	const raw = env.QAMUZ_V1_URL?.trim() || DEFAULT_BASE_URL;
	const url = new URL(raw);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('QAMUZ_V1_URL must use HTTP or HTTPS');
	}
	return url.toString().replace(/\/$/, '');
}

async function requestJson<T>(path: string, init?: RequestInit, timeoutMs = 900_000): Promise<T> {
	const response = await fetch(`${baseUrl()}${path}`, {
		...init,
		signal: AbortSignal.timeout(timeoutMs)
	});
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`Qamuz v1 request failed (${response.status}): ${body.slice(0, 400)}`);
	}
	return response.json() as Promise<T>;
}

export const qamuzV1Client = {
	async health(): Promise<{ status: string; product: string; stemSeparation: boolean }> {
		return requestJson('/health', undefined, 10_000);
	},

	async separateStems(input: {
		audioBase64: string;
		mimeType?: string;
		stems?: string[];
	}): Promise<{
		source: string;
		stems: Array<{ name: string; mimeType: string; audioBase64: string; bytes: number }>;
		warnings?: string[];
	}> {
		return requestJson('/v1/stems', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(env.QAMUZ_V1_TOKEN ? { Authorization: `Bearer ${env.QAMUZ_V1_TOKEN}` } : {})
			},
			body: JSON.stringify({
				audioBase64: input.audioBase64,
				mimeType: input.mimeType || 'audio/mpeg',
				stems: input.stems || ['vocals', 'drums', 'bass', 'other']
			})
		});
	}
};
