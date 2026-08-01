<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import UploadCloud from "@lucide/svelte/icons/upload-cloud";
  import Link from "@lucide/svelte/icons/link";
  import MusicIcon from "@lucide/svelte/icons/music";
  import { fade, scale } from "svelte/transition";
  import { toast } from "svelte-sonner";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import type { MusicState } from "../../routes/audio/music.svelte";

  let { isOpen = $bindable(false), musicState } = $props<{
    isOpen: boolean;
    musicState: MusicState;
  }>();

  let activeTab = $state<"upload" | "library">("upload");
  let fileInput = $state<HTMLInputElement | null>(null);
  let isUploading = $state(false);
  let youtubeUrl = $state("");

  function close() {
    isOpen = false;
  }

  function triggerFileInput() {
    if (fileInput) {
      fileInput.click();
    }
  }

  async function handleFileUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be smaller than 10MB");
      return;
    }

    isUploading = true;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/audio/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      musicState.referenceAudioUrl = data.url;
      musicState.referenceAudioName = data.filename;
      toast.success("Reference audio uploaded successfully");
      close();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      isUploading = false;
      if (fileInput) fileInput.value = "";
    }
  }

  function setYoutubeReference() {
    if (!youtubeUrl) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    musicState.referenceAudioUrl = youtubeUrl;
    musicState.referenceAudioName = "YouTube Reference";
    toast.success("YouTube reference set");
    close();
  }

  function clearReference() {
    musicState.referenceAudioUrl = null;
    musicState.referenceAudioName = null;
    toast.success("Reference cleared");
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    onclick={close}
  >
    <!-- Modal Container -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-[#181818] rounded-2xl w-full max-w-[600px] shadow-2xl border border-white/5 overflow-hidden flex flex-col relative min-h-[600px]"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div class="flex items-start justify-between p-6 pb-4">
        <div>
          <h2 class="text-2xl font-bold text-foreground tracking-tight">{m["audio.reference_title"]()}</h2>
          <p class="text-sm text-muted-foreground mt-1">{m["audio.reference_subtitle"]()}</p>
        </div>
        <button
          class="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          onclick={close}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      {#if musicState.referenceAudioUrl}
        <div class="px-6 py-4 mx-6 mb-4 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
              <MusicIcon class="w-5 h-5" />
            </div>
            <div>
              <p class="text-sm font-medium text-teal-400">Current Reference</p>
              <p class="text-xs text-muted-foreground truncate max-w-[300px]">{musicState.referenceAudioName}</p>
            </div>
          </div>
          <button 
            class="text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            onclick={clearReference}
          >
            Clear
          </button>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="px-6 flex gap-4 mt-2">
        <input 
          type="file" 
          accept="audio/*" 
          class="hidden" 
          bind:this={fileInput}
          onchange={handleFileUpload}
        />
        <!-- Upload Audio Button -->
        <button 
          class="flex-1 bg-[#282828] hover:bg-[#333] transition-colors rounded-xl border border-white/5 flex flex-col items-center justify-center py-8 relative group"
          onclick={triggerFileInput}
          disabled={isUploading}
        >
          <div class="absolute top-3 right-3 bg-teal-600/20 text-teal-500 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-600/30">
            Pro
          </div>
          {#if isUploading}
            <Loader2 class="w-6 h-6 text-teal-500 animate-spin mb-3" />
            <span class="font-medium text-teal-500">Uploading...</span>
          {:else}
            <UploadCloud class="w-6 h-6 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
            <span class="font-medium">{m["audio.reference_upload"]()}</span>
          {/if}
        </button>
        
        <!-- YouTube Link Button -->
        <div class="flex-1 bg-[#282828] rounded-xl border border-white/5 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div class="absolute top-3 right-3 bg-emerald-500/20 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 z-10">
            1 Free
          </div>
          <Link class="w-5 h-5 text-muted-foreground mb-2" />
          <span class="font-medium text-sm mb-2">{m["audio.reference_youtube"]()}</span>
          <div class="flex w-full gap-2 mt-1">
            <input 
              type="text" 
              bind:value={youtubeUrl} 
              placeholder="https://youtube.com/..." 
              class="w-full bg-[#181818] border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-500/50 transition-colors"
            />
            <button 
              class="bg-teal-600 hover:bg-teal-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              onclick={setYoutubeReference}
            >
              Set
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="px-6 mt-8 flex gap-2 border-b border-white/5 pb-0">
        <button
          class="px-5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 {activeTab === 'upload' ? 'border-teal-500 text-foreground bg-white/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'}"
          onclick={() => activeTab = "upload"}
        >
          {m["audio.reference_tab_upload"]()}
        </button>
        <button
          class="px-5 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 {activeTab === 'library' ? 'border-teal-500 text-foreground bg-white/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5'}"
          onclick={() => activeTab = "library"}
        >
          {m["audio.reference_tab_library"]()}
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 p-6 overflow-y-auto">
        {#if activeTab === "upload"}
          <!-- Recent Uploads List -->
          <div class="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-[#282828] rounded-md flex items-center justify-center">
                <MusicIcon class="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h4 class="font-medium text-sm group-hover:text-teal-400 transition-colors">El Arete Secreto</h4>
                <p class="text-xs text-muted-foreground font-mono">00:30</p>
              </div>
            </div>
            <!-- Edit icon (hidden by default, shown on hover/active) -->
            <button aria-label="Edit item" class="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            </button>
          </div>
        {:else}
          <div class="h-full flex items-center justify-center text-muted-foreground text-sm">
            Library is empty
          </div>
        {/if}
      </div>

      <!-- Footer Disclaimer -->
      <div class="p-6 pt-4 text-center mt-auto border-t border-white/5">
        <p class="text-[11px] text-muted-foreground max-w-sm mx-auto">
          {m["audio.reference_disclaimer"]().replace('Disclaimer', '')} 
          <!-- Assuming the translator wants 'Disclaimer' as a link. This is a bit tricky with raw translation strings. -->
          <a href="/disclaimer" class="underline hover:text-foreground">Disclaimer</a>
          {m["audio.reference_disclaimer"]().includes('Disclaimer') ? '' : ''}
        </p>
      </div>
    </div>
  </div>
{/if}
