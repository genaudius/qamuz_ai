<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import MusicIcon from "@lucide/svelte/icons/music";
  import { fade, scale } from "svelte/transition";
  import * as Button from "$lib/components/ui/button/index.js";
  import * as m from "$lib/../paraglide/messages.js";

  let { isOpen = $bindable(false), onSubmit } = $props<{
    isOpen: boolean;
    onSubmit: (prompt: string) => void;
  }>();

  const genres = [
    "Trap", "Afrobeat", "Boom Bap", "Neo Soul", "Drill", "Lo-Fi", "Rage", "Ambient",
    "Jazz Rap", "Reggaeton", "R&B", "Disco", "Synth Pop", "House", "Pop Rock",
    "Drum & Bass", "Future Bass", "Jersey Club", "Pop", "Amapiano"
  ];

  let selectedGenres = $state<string[]>([]);
  let description = $state("");

  function toggleGenre(genre: string) {
    if (selectedGenres.includes(genre)) {
      selectedGenres = selectedGenres.filter(g => g !== genre);
    } else {
      selectedGenres = [...selectedGenres, genre];
    }
  }

  function handleSubmit() {
    let promptParts = [];
    if (selectedGenres.length > 0) {
      promptParts.push(selectedGenres.join(", ") + " beat");
    }
    if (description.trim()) {
      promptParts.push(description.trim());
    }
    
    onSubmit(promptParts.join(". "));
    isOpen = false;
  }

  function close() {
    isOpen = false;
  }

  // Reset state when opened
  $effect(() => {
    if (isOpen) {
      selectedGenres = [];
      description = "";
    }
  });
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
      class="bg-[#212121] rounded-2xl w-full max-w-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 pb-4">
        <h2 class="text-xl font-bold text-foreground">{m["audio.make_a_beat_title"]()}</h2>
        <button
          class="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          onclick={close}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-2 flex flex-col gap-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
        
        <!-- Reference Button -->
        <button class="w-full border border-dashed border-white/20 rounded-[1rem] py-3.5 flex items-center justify-center text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
          <span class="mr-2 text-xl leading-none font-light mb-0.5">+</span> {m["audio.make_a_beat_reference"]()}
        </button>

        <!-- Genre Selection -->
        <div>
          <h3 class="text-sm font-semibold text-foreground mb-3">{m["audio.make_a_beat_genre"]()}</h3>
          <div class="flex flex-wrap gap-2.5">
            {#each genres as genre}
              <button
                class="px-4 py-1.5 rounded-full text-sm border transition-colors {selectedGenres.includes(genre) ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground'}"
                onclick={() => toggleGenre(genre)}
              >
                {genre}
              </button>
            {/each}
          </div>
        </div>

        <!-- Description -->
        <div class="mb-4">
          <h3 class="text-sm font-semibold text-foreground mb-3">{m["audio.make_a_beat_description"]()}</h3>
          <textarea
            bind:value={description}
            placeholder={m["audio.make_a_beat_placeholder"]()}
            class="w-full bg-transparent border border-white/10 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all min-h-[140px]"
          ></textarea>
        </div>
      </div>

      <!-- Footer / Action -->
      <div class="p-6 pt-2">
        <button
          class="w-full bg-[#359d9e] hover:bg-[#2b8384] text-white font-semibold py-3.5 rounded-[1rem] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={selectedGenres.length === 0 && !description.trim()}
          onclick={handleSubmit}
        >
          <MusicIcon class="w-5 h-5" />
          {m["audio.make_a_beat_btn"]()}
        </button>
      </div>
    </div>
  </div>
{/if}
