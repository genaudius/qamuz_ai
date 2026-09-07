/**
 * GenAudius music capability map — parity target vs Kie/Suno tool surface.
 * `native` = implemented on our stack (local ACE-Step / GenAudius + shared services).
 * `provider` = available via external provider bridge when configured.
 * `partial` = works with limitations.
 * `planned` = roadmap item to bring in-house.
 */
export type CapabilityStatus = 'native' | 'provider' | 'partial' | 'planned';

export type MusicCapability = {
	id: string;
	label: string;
	status: CapabilityStatus;
	/** How GenAudius covers it today */
	backend: string;
	notes?: string;
};

export const GENAUDIUS_MUSIC_CAPABILITIES: MusicCapability[] = [
	{
		id: 'generate',
		label: 'Generate music',
		status: 'native',
		backend: 'GenAudius :42003 / MusicGPT / Suno bridge',
		notes: 'Primary path is local GenAudius when local_music_enabled.'
	},
	{
		id: 'timestamped-lyrics',
		label: 'Karaoke / vocal-aligned lyrics',
		status: 'native',
		backend: 'align-lyrics cascade (Kie → ElevenLabs Scribe STT → structure)',
		notes: 'POST /api/music-tools { action: "align-lyrics" }'
	},
	{
		id: 'generate-lyrics',
		label: 'Generate lyrics',
		status: 'provider',
		backend: 'Kie /lyrics via music-tools',
		notes: 'action: generate-lyrics'
	},
	{
		id: 'separate-vocals',
		label: 'Stem / vocal separation',
		status: 'provider',
		backend: 'Kie vocal-removal + Studio open-stems',
		notes: 'action: stems'
	},
	{
		id: 'extend',
		label: 'Extend track',
		status: 'provider',
		backend: 'Kie /generate/extend',
		notes: 'Requires Suno audioId; action: extend'
	},
	{
		id: 'cover-generate',
		label: 'Cover / style transfer',
		status: 'provider',
		backend: 'Kie /generate/upload-cover',
		notes: 'Works from any musicId URL; action: cover'
	},
	{
		id: 'add-vocals',
		label: 'Add vocals to instrumental',
		status: 'provider',
		backend: 'Kie /generate/add-vocals',
		notes: 'action: add-vocals'
	},
	{
		id: 'add-instrumental',
		label: 'Add instrumental',
		status: 'provider',
		backend: 'Kie /generate/add-instrumental',
		notes: 'action: add-instrumental'
	},
	{
		id: 'replace-section',
		label: 'Replace section',
		status: 'provider',
		backend: 'Kie /generate/replace-section',
		notes: 'Requires Kie taskId+audioId; action: replace-section'
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
		status: 'provider',
		backend: 'Kie /midi/generate after stems',
		notes: 'action: midi (needs stem taskId)'
	},
	{
		id: 'mashup',
		label: 'Mashup',
		status: 'provider',
		backend: 'Kie /generate/mashup',
		notes: 'action: mashup with musicIdA/B'
	},
	{
		id: 'boost-music-style',
		label: 'Boost / refine style',
		status: 'native',
		backend: 'Kie /style/generate with GenAudius soft fallback',
		notes: 'action: boost-style'
	},
	{
		id: 'recovery-audio',
		label: 'Recover failed audio',
		status: 'provider',
		backend: '/api/music-tools/recovery'
	},
	{
		id: 'convert-to-wav',
		label: 'Convert to WAV',
		status: 'native',
		backend: 'ffmpeg local OR Kie /wav/generate',
		notes: 'action: wav'
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
		status: 'provider',
		backend: 'Kie extend + cover upload paths'
	},
	{
		id: 'upload-and-cover-audio',
		label: 'Upload & cover',
		status: 'provider',
		backend: 'Kie upload-cover'
	},
	{
		id: 'music-catalog',
		label: 'Genre / style catalog',
		status: 'native',
		backend: 'GenAudius /api/music-catalog',
		notes: 'action: catalog'
	},
	{
		id: 'mixing-tools',
		label: 'Mixing helpers',
		status: 'native',
		backend: 'GenAudius /api/mixing-tools',
		notes: 'action: mixing-tools'
	}
];

export function capabilitiesByStatus(status: CapabilityStatus): MusicCapability[] {
	return GENAUDIUS_MUSIC_CAPABILITIES.filter((item) => item.status === status);
}
