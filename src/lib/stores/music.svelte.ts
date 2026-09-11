export interface MusicTrack {
    id: string;
    url: string;
    title: string;
    artist?: string;
    /** Owner user id — artist channel `/artist/[id]`. */
    artistId?: string;
    userId?: string;
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
    likesCount?: number;
    playsCount?: number;
    commentsCount?: number;
}

export class GlobalMusicState {
    currentTrack = $state<MusicTrack | null>(null);
    queue = $state<MusicTrack[]>([]);
    isShuffle = $state<boolean>(false);
    repeatMode = $state<"off" | "all" | "one">("off");
    private playedHistory = $state<string[]>([]);
    
    // Page state to share with Header
    activeAudioMode = $state<"tts" | "stt" | "voice_changer" | "music" | "sound_effects">("music");
    musicSubMode = $state<"easy" | "custom" | "soundtrack">("easy");
    showLibrary = $state<boolean>(false);
    
    isPlaying = $state<boolean>(false);
    currentTime = $state<number>(0);
    duration = $state<number>(0);
    volume = $state<number>(1);
    
    isExpanded = $state<boolean>(false); // Now Playing / immersive stage
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
        // Enrich lyrics / video / tags / social counts when callers only pass basic fields.
        const needsMeta =
            !normalized.lyrics ||
            !normalized.videoUrl ||
            !normalized.tags ||
            !normalized.genre ||
            !normalized.artistId ||
            !normalized.userId ||
            !normalized.timedLyrics?.length ||
            typeof normalized.playsCount !== "number" ||
            typeof normalized.likesCount !== "number";
        if (needsMeta) {
            try {
                const infoRes = await fetch(`/api/music/${normalized.id}/info`);
                if (infoRes.ok) {
                    const info = await infoRes.json();
                    normalized = {
                        ...normalized,
                        title: normalized.title || info.title,
                        artist: normalized.artist || info.artist,
                        artistId: normalized.artistId || info.artistId || info.userId || undefined,
                        userId: normalized.userId || info.userId || info.artistId || undefined,
                        imageUrl: normalized.imageUrl || info.imageUrl || undefined,
                        videoUrl: normalized.videoUrl || info.videoUrl || undefined,
                        lyrics: normalized.lyrics || info.lyrics || undefined,
                        timedLyrics: normalized.timedLyrics?.length
                            ? normalized.timedLyrics
                            : Array.isArray(info.timedLyrics) ? info.timedLyrics : [],
                        durationMs: normalized.durationMs || info.durationMs || 0,
                        genre: normalized.genre ?? info.genre ?? null,
                        tags: normalized.tags?.length ? normalized.tags : info.tags || [],
                        isPublic: typeof info.isPublic === 'boolean' ? info.isPublic : normalized.isPublic,
                        likesCount: Number(info.likesCount ?? normalized.likesCount ?? 0),
                        playsCount: Number(info.playsCount ?? normalized.playsCount ?? 0),
                        commentsCount: Number(info.commentsCount ?? normalized.commentsCount ?? 0)
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
        // Desktop side panel / mobile immersive — skip on dedicated karaoke route.
        if (typeof window === "undefined" || !window.location.pathname.startsWith("/karaoke/")) {
            this.isExpanded = true;
        } else {
            this.isExpanded = false;
        }
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

        const tryPlay = async () => {
            try {
                await audio.play();
                this.isPlaying = true;
            } catch (e) {
                console.error("Playback failed:", e);
                this.isPlaying = false;
            }
        };

        if (audio.readyState >= 2) {
            await tryPlay();
        } else {
            audio.addEventListener("canplay", () => void tryPlay(), { once: true });
            await tryPlay();
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

        const tryPlay = async () => {
            try {
                await audio.play();
                this.isPlaying = true;
            } catch (e) {
                console.error("Playback failed:", e);
                this.isPlaying = false;
            }
        };

        if (audio.readyState >= 2) {
            await tryPlay();
        } else {
            audio.addEventListener("canplay", () => void tryPlay(), { once: true });
            await tryPlay();
        }
    }
    
    toggleExpanded() {
        if (!this.currentTrack) return;
        this.isExpanded = !this.isExpanded;
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

    async nextTrack(autoTrigger = false): Promise<boolean> {
        if (!this.queue.length) {
            if (autoTrigger) this.isPlaying = false;
            return false;
        }

        if (this.repeatMode === "one" && this.currentTrack) {
            this.currentTime = 0;
            if (this.audioElement) {
                this.audioElement.currentTime = 0;
                await this.audioElement.play().catch(console.error);
            }
            this.isPlaying = true;
            return true;
        }

        const currentIndex = this.currentTrack
            ? this.queue.findIndex((t) => t.id === this.currentTrack?.id)
            : -1;

        if (this.isShuffle && this.queue.length > 1) {
            const candidates = this.queue.filter((t) => t.id !== this.currentTrack?.id);
            const unplayed = candidates.filter((t) => !this.playedHistory.includes(t.id));
            const pool = unplayed.length > 0 ? unplayed : candidates;
            const randomIndex = Math.floor(Math.random() * pool.length);
            const chosen = pool[randomIndex];
            if (chosen) {
                this.playedHistory = [...this.playedHistory.slice(-20), chosen.id];
                await this.playTrack(chosen);
                return true;
            }
        }

        let nextIndex = currentIndex + 1;
        if (nextIndex >= this.queue.length) {
            if (this.repeatMode === "all") {
                nextIndex = 0;
            } else {
                if (autoTrigger) {
                    this.isPlaying = false;
                    this.currentTime = 0;
                }
                return false;
            }
        }

        const target = this.queue[nextIndex];
        if (target) {
            this.playedHistory = [...this.playedHistory.slice(-20), target.id];
            await this.playTrack(target);
            return true;
        }
        return false;
    }

    async prevTrack(): Promise<void> {
        if (!this.queue.length) return;

        if (this.currentTime > 3) {
            this.seek(0);
            return;
        }

        const currentIndex = this.currentTrack
            ? this.queue.findIndex((t) => t.id === this.currentTrack?.id)
            : -1;

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.repeatMode === "all" ? this.queue.length - 1 : 0;
        }

        const target = this.queue[prevIndex];
        if (target) {
            this.playedHistory = [...this.playedHistory.slice(-20), target.id];
            await this.playTrack(target);
        }
    }

    toggleShuffle(): boolean {
        this.isShuffle = !this.isShuffle;
        this.playedHistory = this.currentTrack ? [this.currentTrack.id] : [];
        return this.isShuffle;
    }

    toggleRepeat(): "off" | "all" | "one" {
        if (this.repeatMode === "off") this.repeatMode = "all";
        else if (this.repeatMode === "all") this.repeatMode = "one";
        else this.repeatMode = "off";
        return this.repeatMode;
    }

    reorderQueue(newQueue: MusicTrack[]) {
        this.queue = [...newQueue];
    }

    async playQueue(tracks: MusicTrack[], startIndex = 0, shuffle = false) {
        if (!tracks.length) return;
        this.queue = [...tracks];
        this.isShuffle = shuffle;
        if (shuffle && tracks.length > 1) {
            const randomIndex = Math.floor(Math.random() * tracks.length);
            const track = tracks[randomIndex];
            this.playedHistory = [track.id];
            await this.playTrack(track);
        } else {
            const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
            this.playedHistory = [tracks[index].id];
            await this.playTrack(tracks[index]);
        }
    }
}
