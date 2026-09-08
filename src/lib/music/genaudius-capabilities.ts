/**
 * GenAudius music capability map — parity target vs former Kie tool surface.
 * Policy: Kie = Generate Music only. Everything else is native / OpenRouter / planned.
 */
export type CapabilityStatus = 'native' | 'provider' | 'partial' | 'planned';

export type MusicCapability = {
	id: string;
	label: string;
	status: CapabilityStatus;
	/** How GenAudius / SaaS covers it today */
	backend: string;
	notes?: string;
};

export const GENAUDIUS_MUSIC_CAPABILITIES: MusicCapability[] = [
	{
		id: 'generate',
		label: 'Generate music',
		status: 'native',
		backend: 'GenAudius workers + Kie Suno generate-only for Pro models',
		notes: 'KIE_MUSIC_GENERATE_ONLY=true (default).'
	},
	{
		id: 'timestamped-lyrics',
		label: 'Karaoke / vocal-aligned lyrics',
		status: 'native',
		backend: 'GenAudius /api/align-lyrics → local charsiu fallback → structure',
		notes: 'No Kie timestamped-lyrics spend.'
	},
	{
		id: 'generate-lyrics',
		label: 'Generate lyrics',
		status: 'native',
		backend: 'OpenRouter (SaaS)',
		notes: 'action: generate-lyrics'
	},
	{
		id: 'separate-vocals',
		label: 'Stem / vocal separation',
		status: 'partial',
		backend: 'GenAudius /api/stems (Demucs when installed)',
		notes: '501 until demucs is on the worker image'
	},
	{
		id: 'extend',
		label: 'Extend track',
		status: 'planned',
		backend: 'GenAudius reference-audio conditioning',
		notes: 'Former Kie extend — blocked'
	},
	{
		id: 'cover-generate',
		label: 'Cover / style transfer',
		status: 'planned',
		backend: 'GenAudius reference-audio conditioning',
		notes: 'Former Kie upload-cover — blocked'
	},
	{
		id: 'add-vocals',
		label: 'Add vocals to instrumental',
		status: 'planned',
		backend: 'GenAudius',
		notes: 'Blocked (was Kie)'
	},
	{
		id: 'add-instrumental',
		label: 'Add instrumental',
		status: 'planned',
		backend: 'GenAudius',
		notes: 'Blocked (was Kie)'
	},
	{
		id: 'replace-section',
		label: 'Replace section',
		status: 'planned',
		backend: 'GenAudius',
		notes: 'Blocked (was Kie)'
	},
	{
		id: 'generate-persona',
		label: 'Artist persona / voice identity',
		status: 'partial',
		backend: 'GenAudius /api/voices catalog',
		notes: 'Catalog exposed; persona training still planned'
	},
	{
		id: 'generate-voice',
		label: 'Generate singing voice',
		status: 'partial',
		backend: 'ElevenLabs + GenAudius vocalType',
		notes: 'Speech/STS + local vocal gender; singing-specific WIP'
	},
	{
		id: 'create-music-video',
		label: 'Music / lyrics video',
		status: 'partial',
		backend: 'music-video routes + local image/video'
	},
	{
		id: 'generate-midi-from-audio',
		label: 'Audio → MIDI',
		status: 'partial',
		backend: 'GenAudius /api/midi (basic-pitch when installed)',
		notes: '501 until basic-pitch is on the worker image'
	},
	{
		id: 'mashup',
		label: 'Mashup',
		status: 'planned',
		backend: 'GenAudius',
		notes: 'Blocked (was Kie)'
	},
	{
		id: 'boost-music-style',
		label: 'Boost / refine style',
		status: 'native',
		backend: 'OpenRouter with local string fallback',
		notes: 'action: boost-style'
	},
	{
		id: 'recovery-audio',
		label: 'Recover failed audio',
		status: 'planned',
		backend: 'Disabled under Kie generate-only'
	},
	{
		id: 'convert-to-wav',
		label: 'Convert to WAV',
		status: 'native',
		backend: 'GenAudius /api/convert/wav (ffmpeg on worker)',
		notes: 'Not on Vercel Node — worker only'
	},
	{
		id: 'sounds',
		label: 'Sound effects',
		status: 'native',
		backend: 'ElevenLabs SFX + local'
	},
	{
		id: 'upload-and-extend-audio',
		label: 'Upload & extend',
		status: 'planned',
		backend: 'GenAudius',
		notes: 'Blocked (was Kie)'
	},
	{
		id: 'upload-and-cover-audio',
		label: 'Upload & cover',
		status: 'planned',
		backend: 'GenAudius',
		notes: 'Blocked (was Kie)'
	},
	{
		id: 'music-catalog',
		label: 'Genre / style catalog',
		status: 'native',
		backend: 'GenAudius /api/music-catalog',
		notes: 'action: catalog'
	}
];
