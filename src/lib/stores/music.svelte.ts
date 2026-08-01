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
    
    audioElement = $state<HTMLAudioElement | null>(null);
    
    async playTrack(track: MusicTrack) {
        this.currentTrack = track;
        this.isPlaying = true;
        this.isExpanded = true; // Auto-expand right sidebar when playing starts
        
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
        this.isPublishModalOpen = !this.isPublishModalOpen;
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
        if (this.audioElement) {
            this.audioElement.currentTime = time;
            this.currentTime = time;
        }
    }
}
