export interface MusicTrack {
    id: string;
    url: string;
    title: string;
    artist?: string;
    imageUrl?: string;
    videoUrl?: string;
    lyrics?: string;
    /** Karaoke-accurate timings in seconds when available. */
    timedLyrics?: Array<{ text: string; start: number; end?: number; section?: string }>;
    durationMs: number;
    genre?: string | null;
    tags?: string[];
    /** Published to the public feed. */
    isPublic?: boolean;
}

export class GlobalMusicState {
    currentTrack = $state<MusicTrack | null>(null);
    queue = $state<MusicTrack[]>([]);
    
    // Page state to share with Header
    activeAudioMode = $state<"tts" | "stt" | "voice_changer" | "music" | "sound_effects">("music");
    musicSubMode = $state<"easy" | "custom" | "soundtrack">("easy");
    showLibrary = $state<boolean>(false);
    
    isPlaying = $state<boolean>(false);
    currentTime = $state<number>(0);
    duration = $state<number>(0);
    volume = $state<number>(1);
    
    isExpanded = $state<boolean>(false); // Now Playing / immersive stage
    /** Desktop fullscreen karaoke (large lyrics + comments sheet). */
    isKaraokeOpen = $state<boolean>(false);
    isPublishModalOpen = $state<boolean>(false);
    publishTarget = $state<MusicTrack | null>(null);
    
    audioElement = $state<HTMLAudioElement | null>(null);
    
    async playTrack(track: MusicTrack) {
        const url = (track.url || "").trim();
        if (!url) {
            console.error("Playback failed: missing track url", track.id);
            return;
        }

        let normalized: MusicTrack = { ...track, url };
        // Enrich lyrics / video / tags when callers only pass basic fields.
        if (!normalized.lyrics || !normalized.videoUrl || !normalized.tags || !normalized.genre || !normalized.timedLyrics?.length) {
            try {
                const infoRes = await fetch(`/api/music/${normalized.id}/info`);
                if (infoRes.ok) {
                    const info = await infoRes.json();
                    normalized = {
                        ...normalized,
                        title: normalized.title || info.title,
                        artist: normalized.artist || info.artist,
                        imageUrl: normalized.imageUrl || info.imageUrl || undefined,
                        videoUrl: normalized.videoUrl || info.videoUrl || undefined,
                        lyrics: normalized.lyrics || info.lyrics || undefined,
                        timedLyrics: normalized.timedLyrics?.length
                            ? normalized.timedLyrics
                            : Array.isArray(info.timedLyrics) ? info.timedLyrics : [],
                        durationMs: normalized.durationMs || info.durationMs || 0,
                        genre: normalized.genre ?? info.genre ?? null,
                        tags: normalized.tags?.length ? normalized.tags : info.tags || [],
                        isPublic: typeof info.isPublic === 'boolean' ? info.isPublic : normalized.isPublic
                    };
                }
            } catch {
                // Playback still works without metadata.
            }
        }

        const isSameTrack =
            this.currentTrack?.id === normalized.id && this.currentTrack?.url === normalized.url;
        this.currentTrack = normalized;
        this.isPlaying = true;
        // Desktop: side panel. Mobile: immersive short stage.
        this.isExpanded = true;
        if (!isSameTrack) {
            this.currentTime = 0;
            this.duration = Number.isFinite(normalized.durationMs) && normalized.durationMs > 0
                ? normalized.durationMs / 1000
                : 0;
        }

        // Ensure playback starts immediately after Svelte DOM update
        const { tick } = await import("svelte");
        await tick();
        const audio = this.audioElement;
        if (!audio) return;

        if (!isSameTrack || audio.src !== new URL(normalized.url, window.location.origin).href) {
            audio.src = normalized.url;
            audio.load();
        }

        try {
            await audio.play();
            this.isPlaying = true;
        } catch (e) {
            console.error("Playback failed:", e);
            this.isPlaying = false;
        }
    }
    
    async togglePlay() {
        if (!this.currentTrack) return;
        const audio = this.audioElement;
        if (!audio) {
            this.isPlaying = !this.isPlaying;
            return;
        }

        if (this.isPlaying) {
            audio.pause();
            this.isPlaying = false;
            return;
        }

        try {
            await audio.play();
            this.isPlaying = true;
        } catch (e) {
            console.error("Playback failed:", e);
            this.isPlaying = false;
        }
    }
    
    toggleExpanded() {
        if (!this.currentTrack) return;
        this.isExpanded = !this.isExpanded;
        if (!this.isExpanded) this.isKaraokeOpen = false;
    }

    openKaraoke() {
        if (!this.currentTrack) return;
        this.isExpanded = true;
        this.isKaraokeOpen = true;
    }

    closeKaraoke() {
        this.isKaraokeOpen = false;
    }

    togglePublishModal() {
        if (!this.isPublishModalOpen) {
            this.publishTarget = this.currentTrack;
        }
        this.isPublishModalOpen = !this.isPublishModalOpen;
    }

    openPublishModal(track?: MusicTrack | null) {
        this.publishTarget = track ?? this.currentTrack;
        this.isPublishModalOpen = true;
    }

    markTrackPublic(trackId: string, isPublic: boolean) {
        if (this.currentTrack?.id === trackId) {
            this.currentTrack = { ...this.currentTrack, isPublic };
        }
        if (this.publishTarget?.id === trackId) {
            this.publishTarget = { ...this.publishTarget, isPublic };
        }
        this.queue = this.queue.map((item) =>
            item.id === trackId ? { ...item, isPublic } : item
        );
    }
    
    closePlayer() {
        this.currentTrack = null;
        this.isPlaying = false;
        this.isExpanded = false;
        this.isKaraokeOpen = false;
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.removeAttribute("src");
            this.audioElement.load();
        }
    }
    
    setVolume(val: number) {
        this.volume = val;
        if (this.audioElement) {
            this.audioElement.volume = val;
        }
    }
    
    seek(time: number) {
        const duration = Number.isFinite(this.duration) && this.duration > 0
            ? this.duration
            : (Number.isFinite(this.audioElement?.duration) ? this.audioElement!.duration : 0);
        const next = Math.min(Math.max(0, time), duration > 0 ? duration : time);
        this.currentTime = next;
        if (this.audioElement && Number.isFinite(next)) {
            this.audioElement.currentTime = next;
        }
    }
}
