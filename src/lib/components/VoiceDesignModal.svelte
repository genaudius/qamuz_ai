<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import Play from "@lucide/svelte/icons/play";
  import Square from "@lucide/svelte/icons/square";
  import Save from "@lucide/svelte/icons/save";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import { fade, scale } from "svelte/transition";
  import { toast } from "svelte-sonner";

  let { isOpen = $bindable(false), onVoiceCreated } = $props<{
    isOpen: boolean;
    onVoiceCreated?: (voiceId: string, name: string) => void;
  }>();

  let gender = $state<"male" | "female">("female");
  let age = $state<"young" | "middle_aged" | "old">("young");
  let accent = $state<string>("american");
  let accentStrength = $state<number>(1.0);
  let text = $state<string>("First we thought the PC was a calculator. Then we found out how to turn numbers into letters and we thought it was a typewriter.");
  
  let voiceName = $state<string>("");
  let voiceDescription = $state<string>("");

  let isGenerating = $state(false);
  let isSaving = $state(false);
  let generatedVoiceId = $state<string | null>(null);
  let audioData = $state<string | null>(null);
  
  let audioPlayer = $state<HTMLAudioElement | null>(null);
  let isPlaying = $state(false);

  function close() {
    isOpen = false;
    resetState();
  }

  function resetState() {
    isGenerating = false;
    isSaving = false;
    generatedVoiceId = null;
    audioData = null;
    isPlaying = false;
    if (audioPlayer) {
      audioPlayer.pause();
    }
  }

  async function handleGenerate() {
    if (!text.trim()) {
      toast.error("Please enter some text for the preview");
      return;
    }
    if (!accent.trim()) {
      toast.error("Please specify an accent");
      return;
    }

    isGenerating = true;
    generatedVoiceId = null;
    audioData = null;
    
    try {
      const response = await fetch('/api/audio/voice-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          gender,
          age,
          accent,
          accentStrength,
          text
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate voice');
      }

      generatedVoiceId = data.generatedVoiceId;
      audioData = `data:${data.mimeType};base64,${data.audioData}`;
      
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      isGenerating = false;
    }
  }

  async function handleSave() {
    if (!generatedVoiceId) return;
    if (!voiceName.trim()) {
      toast.error("Please enter a name for your voice");
      return;
    }

    isSaving = true;
    try {
      const response = await fetch('/api/audio/voice-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          generatedVoiceId,
          voiceName,
          voiceDescription
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save voice');
      }

      toast.success("Voice created successfully!");
      if (onVoiceCreated) {
        onVoiceCreated(data.voiceId, voiceName);
      }
      close();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      isSaving = false;
    }
  }

  function togglePlay() {
    if (!audioPlayer || !audioData) return;
    
    if (isPlaying) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      isPlaying = false;
    } else {
      audioPlayer.play();
      isPlaying = true;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    onclick={close}
  >
    <div
      class="bg-[#181818] rounded-2xl w-full max-w-2xl shadow-2xl border border-white/5 overflow-hidden flex flex-col relative max-h-[90vh]"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div class="flex items-start justify-between p-6 pb-4 border-b border-white/5 shrink-0">
        <div>
          <h2 class="text-xl font-bold text-foreground tracking-tight">Design New Voice</h2>
          <p class="text-sm text-muted-foreground mt-1">Create a unique voice by defining its characteristics.</p>
        </div>
        <button
          class="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          onclick={close}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
        <!-- Gender & Age -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Gender</label>
            <select
              bind:value={gender}
              class="w-full bg-[#282828] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Age</label>
            <select
              bind:value={age}
              class="w-full bg-[#282828] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
            >
              <option value="young">Young</option>
              <option value="middle_aged">Middle Aged</option>
              <option value="old">Old</option>
            </select>
          </div>
        </div>

        <!-- Accent -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Accent</label>
          <input
            type="text"
            bind:value={accent}
            placeholder="e.g. American, British, Australian"
            class="w-full bg-[#282828] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
          />
        </div>

        <!-- Accent Strength -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-sm font-medium text-foreground">Accent Strength</label>
            <span class="text-xs text-muted-foreground">{Math.round(accentStrength * 100)}%</span>
          </div>
          <input
            type="range"
            bind:value={accentStrength}
            min="0.1"
            max="2.0"
            step="0.1"
            class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        <!-- Preview Text -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">Preview Text</label>
          <textarea
            bind:value={text}
            rows="3"
            class="w-full bg-[#282828] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500/50 transition-colors resize-none"
            placeholder="Text to generate preview audio..."
          ></textarea>
        </div>

        <!-- Generate Button -->
        <button
          class="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          onclick={handleGenerate}
          disabled={isGenerating}
        >
          {#if isGenerating}
            <Loader2 class="w-4 h-4 animate-spin" />
            Generating Preview...
          {:else}
            Generate Preview
          {/if}
        </button>

        {#if generatedVoiceId && audioData}
          <div class="pt-6 border-t border-white/5 space-y-4" transition:fade>
            <div class="flex items-center gap-4 bg-[#282828] p-4 rounded-xl border border-white/5">
              <button
                class="w-10 h-10 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center hover:bg-teal-500/30 transition-colors shrink-0"
                onclick={togglePlay}
              >
                {#if isPlaying}
                  <Square class="w-4 h-4" />
                {:else}
                  <Play class="w-4 h-4 ml-0.5" />
                {/if}
              </button>
              <div class="flex-1">
                <div class="text-sm font-medium">Generated Voice Preview</div>
                <div class="text-xs text-muted-foreground">Listen to the voice before saving</div>
              </div>
              <audio
                bind:this={audioPlayer}
                src={audioData}
                onended={() => isPlaying = false}
                class="hidden"
              ></audio>
            </div>

            <!-- Save Section -->
            <div class="space-y-4 bg-teal-950/10 p-4 rounded-xl border border-teal-500/20">
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Voice Name</label>
                <input
                  type="text"
                  bind:value={voiceName}
                  placeholder="Give your new voice a name..."
                  class="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Description (Optional)</label>
                <input
                  type="text"
                  bind:value={voiceDescription}
                  placeholder="e.g. A calm, authoritative British male voice"
                  class="w-full bg-[#181818] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>
              <button
                class="w-full bg-white text-black font-medium py-2.5 rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                onclick={handleSave}
                disabled={isSaving}
              >
                {#if isSaving}
                  <Loader2 class="w-4 h-4 animate-spin" />
                  Saving Voice...
                {:else}
                  <Save class="w-4 h-4" />
                  Save as Custom Voice
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
