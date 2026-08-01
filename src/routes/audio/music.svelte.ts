import { toast } from "svelte-sonner";

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
  status?: 'generating' | 'completed' | 'error';
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

/**
 * MusicState - Music generation state management class
 *
 * Encapsulates all music-related state and methods for the /audio page.
 * Uses Svelte 5 runes for reactive state management.
 */
export class MusicState {
  // Constants (reference to imported constants)
  readonly models = [
    { id: 'suno-v5.5', name: 'Suno V5.5' },
    { id: 'suno-v5', name: 'Suno V5' },
    { id: 'suno-v4.5', name: 'Suno V4.5' },
    { id: 'musicgpt-v1', name: 'MusicGPT V1' }
  ];

  // Model Selection
  selectedModel = $state<string>("suno-v5.5");

  // Input Settings
  inputPrompt = $state<string>("");
  durationSeconds = $state<number | null>(null); // null = Auto mode, UI shows seconds, API expects milliseconds
  forceInstrumental = $state<boolean>(false);
  agreedTerms = $state<boolean>(false);
  
  // Reference Audio Settings
  referenceAudioUrl = $state<string | null>(null);
  referenceAudioName = $state<string | null>(null);

  // Generation State
  isGenerating = $state<boolean>(false);
  errorMessage = $state<string | null>(null);

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
      status: 'generating'
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
          outputFormat: "mp3_44100_128",
          musicLengthMs: this.durationMilliseconds,
          referenceAudioUrl: this.referenceAudioUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate music");
      }

      // Update AI Message with generated track
      const aiMsgIndex = this.feed.findIndex(item => item.id === aiMsgId);
      if (aiMsgIndex !== -1) {
        // Create a new array reference for Svelte reactivity
        const updatedFeed = [...this.feed];
        updatedFeed[aiMsgIndex] = {
          ...updatedFeed[aiMsgIndex],
          status: 'completed',
          content: data.analysisText || "Here is your track!",
          track: {
            id: data.musicId,
            title: data.title || "Generated Track",
            url: data.audioUrl,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            lyrics: data.lyrics,
            durationMs: data.durationMs,
            createdAt: new Date().toISOString()
          }
        };
        this.feed = updatedFeed;
      }

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
    }
  }
}
