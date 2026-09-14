/**
 * Server-side persistence for full QAMUZ Studio sessions (DAW).
 *
 * A session stores a project document (project.json + training captions) plus
 * a set of WAV stems/audio files. It is persisted through the shared
 * storageService (R2 in prod, local fallback in dev) under a per-user, per-session
 * namespace. A small manifest tracks which audio fileIds belong to the session
 * so the client can list them.
 *
 * Layout (relative to the storage provider root):
 *   {userId}/audio/generated/studio-session__{slug}__project.json
 *   {userId}/audio/generated/studio-session__{slug}__manifest.json
 *   {userId}/audio/generated/studio-session__{slug}__audio__{fileId}.wav
 */

import { storageService } from '$lib/server/storage.js';

const PREFIX = 'studio-session__';

/** Filesystem/object-key safe slug for a session name (kept reversible-ish for logs). */
function slugifySession(name: string): string {
	const trimmed = (name || 'session').trim().slice(0, 120);
	const slug = trimmed.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
	return slug || 'session';
}

/** Sanitize an audio fileId so it cannot escape the session namespace. */
function safeFileId(fileId: string): string {
	return (fileId || '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 200);
}

function projectFilename(slug: string): string {
	return `${PREFIX}${slug}__project.json`;
}

function manifestFilename(slug: string): string {
	return `${PREFIX}${slug}__manifest.json`;
}

function audioFilename(slug: string, fileId: string): string {
	return `${PREFIX}${slug}__audio__${fileId}.wav`;
}

/** Path as produced by storageService.generateFilePath for the audio namespace. */
function keyFor(userId: string, filename: string): string {
	return storageService.generateFilePath(userId, 'audio', filename, 'generated');
}

interface SessionManifest {
	name: string;
	audioFileIds: string[];
	updatedAt: string;
}

async function readManifest(userId: string, slug: string): Promise<SessionManifest | null> {
	const key = keyFor(userId, manifestFilename(slug));
	try {
		if (!(await storageService.exists(key))) return null;
		const buffer = await storageService.download(key);
		return JSON.parse(buffer.toString('utf-8')) as SessionManifest;
	} catch {
		return null;
	}
}

async function writeManifest(userId: string, slug: string, manifest: SessionManifest): Promise<void> {
	await storageService.upload(
		{
			buffer: Buffer.from(JSON.stringify(manifest), 'utf-8'),
			mimeType: 'application/json',
			filename: manifestFilename(slug)
		},
		userId,
		'audio',
		'generated'
	);
}

export interface StudioProjectPayload {
	name: string;
	projectJson: string;
	trainingJson?: string;
}

/** Persist (create or overwrite) the project document for a session. */
export async function saveSessionProject(userId: string, name: string, payload: StudioProjectPayload): Promise<void> {
	const slug = slugifySession(name);
	const doc = JSON.stringify({
		name: payload.name || name,
		projectJson: payload.projectJson,
		trainingJson: payload.trainingJson ?? '',
		updatedAt: new Date().toISOString()
	});
	await storageService.upload(
		{
			buffer: Buffer.from(doc, 'utf-8'),
			mimeType: 'application/json',
			filename: projectFilename(slug)
		},
		userId,
		'audio',
		'generated'
	);
	// Ensure a manifest exists so listing works even before any audio is saved.
	if (!(await readManifest(userId, slug))) {
		await writeManifest(userId, slug, { name: payload.name || name, audioFileIds: [], updatedAt: new Date().toISOString() });
	}
}

/** Read the stored project document. Returns null if the session is unknown. */
export async function loadSessionProject(userId: string, name: string): Promise<{ projectJson: string; trainingJson: string } | null> {
	const slug = slugifySession(name);
	const key = keyFor(userId, projectFilename(slug));
	try {
		if (!(await storageService.exists(key))) return null;
		const buffer = await storageService.download(key);
		const parsed = JSON.parse(buffer.toString('utf-8')) as { projectJson?: string; trainingJson?: string };
		if (!parsed.projectJson) return null;
		return { projectJson: parsed.projectJson, trainingJson: parsed.trainingJson ?? '' };
	} catch {
		return null;
	}
}

/** Store one audio file (WAV) for a session and record it in the manifest. */
export async function saveSessionAudio(userId: string, name: string, fileId: string, bytes: Buffer): Promise<void> {
	const slug = slugifySession(name);
	const safeId = safeFileId(fileId);
	if (!safeId) throw new Error('Invalid audio fileId');

	await storageService.upload(
		{
			buffer: bytes,
			mimeType: 'audio/wav',
			filename: audioFilename(slug, safeId)
		},
		userId,
		'audio',
		'generated'
	);

	const manifest = (await readManifest(userId, slug)) ?? { name, audioFileIds: [], updatedAt: new Date().toISOString() };
	if (!manifest.audioFileIds.includes(safeId)) {
		manifest.audioFileIds.push(safeId);
	}
	manifest.updatedAt = new Date().toISOString();
	await writeManifest(userId, slug, manifest);
}

/** List the audio fileIds stored for a session. */
export async function listSessionAudio(userId: string, name: string): Promise<{ fileId: string }[]> {
	const slug = slugifySession(name);
	const manifest = await readManifest(userId, slug);
	if (!manifest) return [];
	return manifest.audioFileIds.map((fileId) => ({ fileId }));
}

/** Download one audio file for a session. Returns null if missing. */
export async function loadSessionAudio(userId: string, name: string, fileId: string): Promise<Buffer | null> {
	const slug = slugifySession(name);
	const safeId = safeFileId(fileId);
	if (!safeId) return null;
	const key = keyFor(userId, audioFilename(slug, safeId));
	try {
		if (!(await storageService.exists(key))) return null;
		return await storageService.download(key);
	} catch {
		return null;
	}
}
