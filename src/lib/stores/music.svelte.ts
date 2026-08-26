export interface MusicTrack {
    id: string;
    url: string;
    title: string;
    artist?: string;
    imageUrl?: string;
    videoUrl?: string;
    lyrics?: string;
    durationMs: number;
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
    
    isExpanded = $state<boolean>(false); // Now Playing view visibility
    isPublishModalOpen = $state<boolean>(false);
    publishTarget = $state<MusicTrack | null>(null);
    
    audioElement = $state<HTMLAudioElement | null>(null);
    
    async playTrack(track: MusicTrack) {
        const isSameTrack = this.currentTrack?.id === track.id && this.currentTrack?.url === track.url;
        this.currentTrack = track;
        this.isPlaying = true;
        this.isExpanded = true; // Auto-expand right sidebar when playing starts
        if (!isSameTrack) {
            this.currentTime = 0;
            this.duration = Number.isFinite(track.durationMs) && track.durationMs > 0
                ? track.durationMs / 1000
                : 0;
        }

        // Ensure playback starts immediately after Svelte DOM update
        import('svelte').then(({ tick }) => {
            tick().then(() => {
                if (this.audioElement && this.audioElement.paused) {
                    this.audioElement.play().catch(e => {
                        console.error("Playback failed:", e);
                        this.isPlaying = false;
                    });
                }
            });
        });
    }
    
    togglePlay() {
        if (!this.currentTrack) return;
        this.isPlaying = !this.isPlaying;
        if (this.audioElement) {
            if (this.isPlaying) {
                this.audioElement.play();
            } else {
                this.audioElement.pause();
            }
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
    
    closePlayer() {
        this.currentTrack = null;
        this.isPlaying = false;
        this.isExpanded = false;
        if (this.audioElement) {
            this.audioElement.pause();
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
