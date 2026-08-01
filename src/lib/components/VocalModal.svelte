<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import UserPlus from "@lucide/svelte/icons/user-plus";
  import { fade, scale } from "svelte/transition";
  import * as m from "$lib/../paraglide/messages.js";
  import { ELEVENLABS_VOICES } from "$lib/constants/elevenlabs.js";
  import type { ElevenLabsVoice } from "$lib/constants/elevenlabs.js";
  import VoiceDesignModal from "./VoiceDesignModal.svelte";
  import { toast } from "svelte-sonner";

  let { isOpen = $bindable(false), selectedVoice = $bindable(null) } = $props<{
    isOpen: boolean;
    selectedVoice?: ElevenLabsVoice | null;
  }>();

  let activeTab = $state<"mine" | "official" | "liked">("official");
  let isDesignModalOpen = $state(false);
  
  // Custom characters added by the user in this session
  let customCharacters = $state<ElevenLabsVoice[]>([]);

  function close() {
    isOpen = false;
  }

  // Characters mapped from ElevenLabs voices
  const characters = $derived([...customCharacters, ...ELEVENLABS_VOICES].map(voice => {
    // simple hash to pick a stable random avatar
    const hash = voice.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const imgId = Math.abs(hash) % 70; // pravatar has ~70 images
    return {
      ...voice,
      image: `https://i.pravatar.cc/400?img=${imgId}`
    }
  }));

  function selectVoice(char: typeof characters[0]) {
    selectedVoice = char;
    close();
  }

  function handleVoiceCreated(voiceId: string, name: string) {
    customCharacters.push({
      id: voiceId,
      name: name,
      description: "Custom designed voice",
      preview_url: ""
    } as unknown as ElevenLabsVoice);
    activeTab = "mine";
  }
</script>

<VoiceDesignModal 
  bind:isOpen={isDesignModalOpen}
  onVoiceCreated={handleVoiceCreated}
/>

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
      class="bg-[#181818] rounded-2xl w-full max-w-3xl shadow-2xl border border-white/5 overflow-hidden flex flex-col relative h-[80vh]"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div class="flex items-start justify-between p-6 pb-4 shrink-0">
        <div>
          <h2 class="text-2xl font-bold text-foreground tracking-tight">{m["audio.vocal_title"]()}</h2>
          <p class="text-sm text-muted-foreground mt-1">{m["audio.vocal_subtitle"]()}</p>
        </div>
        <button
          class="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          onclick={close}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Action Button -->
      <div class="px-6 shrink-0">
        <button 
          class="w-full bg-[#1e2928] hover:bg-[#253231] transition-colors rounded-xl border border-teal-500/20 border-dashed py-4 px-6 flex items-center justify-between group"
          onclick={() => isDesignModalOpen = true}
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400">
              <UserPlus class="w-4 h-4" />
            </div>
            <span class="text-teal-400 font-medium text-sm group-hover:text-teal-300 transition-colors">{m["audio.vocal_create_new"]()}</span>
          </div>
          <div class="bg-teal-500/20 text-teal-400 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/30">
            Premier
          </div>
        </button>
      </div>

      <!-- Tabs -->
      <div class="px-6 mt-6 flex gap-6 border-b border-white/5 pb-0 shrink-0">
        <button
          class="pb-2 text-sm font-semibold transition-colors border-b-2 {activeTab === 'mine' ? 'border-teal-400 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
          onclick={() => activeTab = "mine"}
        >
          {m["audio.vocal_tab_mine"]()}
        </button>
        <button
          class="pb-2 text-sm font-semibold transition-colors border-b-2 {activeTab === 'official' ? 'border-teal-400 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
          onclick={() => activeTab = "official"}
        >
          {m["audio.vocal_tab_official"]()}
        </button>
        <button
          class="pb-2 text-sm font-semibold transition-colors border-b-2 {activeTab === 'liked' ? 'border-teal-400 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
          onclick={() => activeTab = "liked"}
        >
          {m["audio.vocal_tab_liked"]()}
        </button>
      </div>

      <!-- Content Grid -->
      <div class="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {#if activeTab === "official"}
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {#each characters as char}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div 
                class="relative rounded-2xl overflow-hidden aspect-[3/4] group cursor-pointer border border-white/5 hover:border-teal-500/50 transition-colors {selectedVoice?.id === char.id ? 'ring-2 ring-teal-500' : ''}"
                onclick={() => selectVoice(char)}
              >
                <!-- Image -->
                <img src={char.image} alt={char.name} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                
                <!-- Gradient Overlay -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                
                <!-- Info -->
                <div class="absolute bottom-0 left-0 p-4 w-full">
                  <h3 class="text-white font-bold text-lg leading-tight">{char.name}</h3>
                  <p class="text-white/60 text-xs mt-1 line-clamp-2" title={char.description}>{char.description}</p>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="h-full flex items-center justify-center text-muted-foreground text-sm">
            No characters found in {activeTab}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
