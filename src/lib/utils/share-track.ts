import { copyToClipboard } from '$lib/utils/clipboard.js';

export function buildTrackShareUrl(trackId: string): string {
	return `${window.location.origin}/?play=${encodeURIComponent(trackId)}`;
}

export async function shareTrackLink(options: {
	id: string;
	title: string;
}): Promise<'shared' | 'copied' | 'failed'> {
	const shareUrl = buildTrackShareUrl(options.id);
	const shareData = {
		title: options.title,
		text: `Escucha “${options.title}” en QAMUZ`,
		url: shareUrl
	};

	try {
		if (navigator.share) {
			await navigator.share(shareData);
			return 'shared';
		}
	} catch {
		// User cancelled or share failed — fall through to clipboard.
	}

	const copied = await copyToClipboard(shareUrl);
	return copied ? 'copied' : 'failed';
}
