import { toast } from "svelte-sonner";
import * as m from "$lib/../paraglide/messages.js";

/**
 * Music history item interface for generated music
 */
export interface MusicHistoryItem {
  id: string;
  prompt: string;
  model: string;
  durationMs: number;
  isInstrumental: boolean;
  createdAt: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface MusicFeedItem {
  id: string;
  type: 'user' | 'ai';
  content?: string;
  status?: 'queued' | 'generating' | 'completed' | 'error';
  jobId?: string;
  track?: {
    id: string;
    title: string;
    url: string;
    imageUrl?: string;
    videoUrl?: string;
    lyrics?: string;
    durationMs?: number;
    createdAt?: string;
  };
}

export interface PendingLibrarySong {
  id: string;
  jobId: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  isInstrumental: boolean;
  status: 'queued' | 'generating' | 'completed' | 'error';
}

/**
 * MusicState - Music generation state management class
 *
 * Encapsulates all music-related state and methods for the /audio page.
 * Uses Svelte 5 runes for reactive state management.
 */
export class MusicState {
  // Constants (reference to imported constants)
  readonly models = [
    { id: 'suno-v5.5', name: 'Qamuz Music Pro' },
    { id: 'suno-v5', name: 'Qamuz Music Plus' },
    { id: 'suno-v4.5', name: 'Qamuz Music' },
    { id: 'musicgpt-v1', name: 'Qamuz Music Studio' }
  ];

  // Model Selection
  selectedModel = $state<string>("suno-v5.5");

  // Input Settings
  inputPrompt = $state<string>("");
  durationSeconds = $state<number | null>(210); // Default full song: 3:30
  forceInstrumental = $state<boolean>(false);
  vocalGender = $state<'male' | 'female' | 'duet'>('female');
  agreedTerms = $state<boolean>(false);
  
  // Reference Audio Settings
  referenceAudioUrl = $state<string | null>(null);
  referenceAudioName = $state<string | null>(null);

  // Generation State
  isGenerating = $state<boolean>(false);
  errorMessage = $state<string | null>(null);
  pendingJobId = $state<string | null>(null);

  private readonly pendingJobStorageKey = 'qamuz:music-generation:pending-job';
  pendingLibrarySongs = $state<PendingLibrarySong[]>([]);

  // Conversational Feed State
  feed = $state<MusicFeedItem[]>([]);

  // Derived values
  get selectedModelName() {
    return (
      this.models.find((m) => m.id === this.selectedModel)?.name ||
      "Select a model"
    );
  }

  get durationMilliseconds() {
    return this.durationSeconds !== null ? this.durationSeconds * 1000 : null;
  }

  get durationDisplay(): string {
    return this.durationSeconds !== null ? `${this.durationSeconds}s` : 'Auto';
  }

  get promptCharacterCount() {
    return this.inputPrompt.length;
  }

  get isPromptTooLong() {
    return this.inputPrompt.length > 4100;
  }

  // ==================== Core Music Methods ====================

  /**
   * Generate music from input prompt
   */
  async handleGenerate() {
    if (!this.inputPrompt.trim()) return;
    if (this.isPromptTooLong) return;

    const currentPrompt = this.inputPrompt.trim();
    
    // Add User Message to Feed
    const userMsgId = Date.now().toString() + '-user';
    this.feed.push({
      id: userMsgId,
      type: 'user',
      content: currentPrompt
    });

    // Add initial AI Message to Feed
    const aiMsgId = Date.now().toString() + '-ai';
    this.feed.push({
      id: aiMsgId,
      type: 'ai',
      status: 'queued'
    });

    this.isGenerating = true;
    this.errorMessage = null;
    this.inputPrompt = ""; // Clear input immediately for better UX

    try {
      const response = await fetch("/api/music-generation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          modelId: this.selectedModel,
          forceInstrumental: this.forceInstrumental,
          vocalGender: this.vocalGender,
          outputFormat: "mp3_44100_128",
          musicLengthMs: this.durationMilliseconds,
          referenceAudioUrl: this.referenceAudioUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate music");
      }

      if (!data.jobId) {
        throw new Error('Music job was not created');
      }

      this.pendingJobId = data.jobId;
      this.persistPendingJob(data.jobId);
      this.addPendingLibrarySong(data.jobId, currentPrompt);

      const aiMsgIndex = this.feed.findIndex(item => item.id === aiMsgId);
      if (aiMsgIndex !== -1) {
        const updatedFeed = [...this.feed];
        updatedFeed[aiMsgIndex] = {
          ...updatedFeed[aiMsgIndex],
          status: 'generating',
          content: data.analysisText || 'Your track is generating in the background.'
        };
        this.feed = updatedFeed;
      }

      await this.waitForPendingJob(data.jobId, aiMsgId);

      toast.success("Music generated successfully!");
    } catch (error) {
      console.error("Music generation error:", error);
      this.errorMessage = error instanceof Error ? error.message : "Failed to generate music";
      
      // Update AI Message with error
      const aiMsgIndex = this.feed.findIndex(item => item.id === aiMsgId);
      if (aiMsgIndex !== -1) {
        const updatedFeed = [...this.feed];
        updatedFeed[aiMsgIndex] = {
          ...updatedFeed[aiMsgIndex],
          status: 'error',
          content: this.errorMessage
        };
        this.feed = updatedFeed;
      }
    } finally {
      this.isGenerating = false;
      this.pendingJobId = null;
      this.clearPendingJob();
    }
  }

  async resumePendingGeneration() {
    if (this.isGenerating) return;

    const pendingJobId = this.getPendingJobId();
    if (!pendingJobId) return;

    this.pendingJobId = pendingJobId;
    this.isGenerating = true;
    this.addPendingLibrarySong(pendingJobId, 'Pending music generation', 'generating');

    try {
      const response = await fetch(`/api/music-generation?jobId=${encodeURIComponent(pendingJobId)}`);
      if (!response.ok) {
        throw new Error('Unable to resume pending music job');
      }

      const data = await response.json();
      const aiMsgId = `${pendingJobId}-resume`;
      const prompt = data.payload?.prompt || 'Pending music generation';

      const existingIndex = this.feed.findIndex((item) => item.jobId === pendingJobId);
      if (existingIndex === -1) {
        this.feed = [
          ...this.feed,
          { id: `${pendingJobId}-user`, type: 'user', content: prompt },
          { id: aiMsgId, type: 'ai', status: data.status === 'completed' ? 'completed' : 'generating', jobId: pendingJobId, content: 'Resuming your track generation...' }
        ];
      }

      if (data.status === 'completed' && data.result) {
        await this.applyCompletedJob(pendingJobId, aiMsgId, data.result);
        return;
      }

      if (data.status === 'failed') {
        this.setJobFailed(aiMsgId, m["audio.music_generation_unavailable_description"]());
        return;
      }

      await this.waitForPendingJob(pendingJobId, aiMsgId);
    } catch (error) {
      console.error('Failed to resume pending music generation:', error);
      this.pendingJobId = null;
      this.clearPendingJob();
      this.isGenerating = false;
    }
  }

  private persistPendingJob(jobId: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.pendingJobStorageKey, jobId);
  }

  private getPendingJobId(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(this.pendingJobStorageKey);
  }

  private clearPendingJob() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(this.pendingJobStorageKey);
  }

  private buildPendingArtwork(prompt: string): string {
    const label = (prompt.trim().slice(0, 2) || 'QA').toUpperCase();
    const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Pending music artwork">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1f4d3b" />
            <stop offset="50%" stop-color="#0f1b17" />
            <stop offset="100%" stop-color="#050807" />
          </linearGradient>
          <radialGradient id="glow" cx="30%" cy="20%" r="70%">
            <stop offset="0%" stop-color="#38f08e" stop-opacity="0.75" />
            <stop offset="100%" stop-color="#38f08e" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="512" height="512" rx="48" fill="url(#bg)" />
        <circle cx="170" cy="150" r="160" fill="url(#glow)" />
        <circle cx="360" cy="340" r="190" fill="#ffffff" fill-opacity="0.06" />
        <rect x="130" y="140" width="252" height="252" rx="36" fill="#000" fill-opacity="0.24" stroke="#ffffff" stroke-opacity="0.12" />
        <text x="256" y="286" text-anchor="middle" font-family="Arial, sans-serif" font-size="100" font-weight="700" fill="#ffffff">${safeLabel}</text>
        <text x="256" y="334" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#c8f8df" letter-spacing="2">CREATING</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  private addPendingLibrarySong(jobId: string, prompt: string, status: PendingLibrarySong['status'] = 'queued') {
    const pendingArtwork = this.buildPendingArtwork(prompt);
    const existingIndex = this.pendingLibrarySongs.findIndex((song) => song.jobId === jobId);
    const nextSong: PendingLibrarySong = {
      id: `pending-${jobId}`,
      jobId,
      prompt,
      imageUrl: pendingArtwork,
      createdAt: new Date().toISOString(),
      isInstrumental: this.forceInstrumental,
      status,
    };

    if (existingIndex === -1) {
      this.pendingLibrarySongs = [nextSong, ...this.pendingLibrarySongs];
      return;
    }

    const updated = [...this.pendingLibrarySongs];
    updated[existingIndex] = {
      ...updated[existingIndex],
      ...nextSong,
    };
    this.pendingLibrarySongs = updated;
  }

  private removePendingLibrarySong(jobId: string) {
    this.pendingLibrarySongs = this.pendingLibrarySongs.filter((song) => song.jobId !== jobId);
  }

  private async waitForPendingJob(jobId: string, aiMsgId: string) {
    for (;;) {
      const response = await fetch(`/api/music-generation?jobId=${encodeURIComponent(jobId)}`);
      if (!response.ok) {
        throw new Error('Unable to read music job status');
      }

      const data = await response.json();

      if (data.status === 'completed' && data.result) {
        await this.applyCompletedJob(jobId, aiMsgId, data.result);
        return;
      }

      if (data.status === 'failed') {
        this.setJobFailed(aiMsgId, m["audio.music_generation_unavailable_description"]());
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  private async applyCompletedJob(jobId: string, aiMsgId: string, result: any) {
    const aiMsgIndex = this.feed.findIndex(item => item.id === aiMsgId || item.jobId === jobId);
    if (aiMsgIndex === -1) return;

    const updatedFeed = [...this.feed];
    updatedFeed[aiMsgIndex] = {
      ...updatedFeed[aiMsgIndex],
      status: 'completed',
      content: 'Here is your track!',
      jobId,
      track: {
        id: result.musicId,
        title: result.title || 'Generated Track',
        url: `/api/music/${result.musicId}`,
        imageUrl: result.imageUrl,
        videoUrl: result.videoUrl,
        lyrics: result.lyrics,
        durationMs: result.durationMs,
        createdAt: new Date().toISOString()
      }
    };
    this.feed = updatedFeed;
    this.removePendingLibrarySong(jobId);
    this.pendingLibrarySongs = [
      {
        id: result.musicId,
        jobId,
        prompt: result.prompt || 'Generated Track',
        imageUrl: result.imageUrl || this.buildPendingArtwork(result.prompt || 'Generated Track'),
        createdAt: new Date().toISOString(),
        isInstrumental: Boolean(result.isInstrumental),
        status: 'completed',
      },
      ...this.pendingLibrarySongs,
    ];
    this.pendingJobId = null;
    this.clearPendingJob();
  }

  private setJobFailed(aiMsgId: string, message: string) {
    const aiMsgIndex = this.feed.findIndex(item => item.id === aiMsgId || item.jobId === this.pendingJobId);
    if (aiMsgIndex !== -1) {
      const updatedFeed = [...this.feed];
      updatedFeed[aiMsgIndex] = {
        ...updatedFeed[aiMsgIndex],
        status: 'error',
        content: message
      };
      this.feed = updatedFeed;
    }
    if (this.pendingJobId) {
      this.addPendingLibrarySong(this.pendingJobId, message, 'error');
    }
    this.pendingJobId = null;
    this.clearPendingJob();
  }
}
