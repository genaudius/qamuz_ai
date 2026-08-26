<script lang="ts">
  import { getContext } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import X from "@lucide/svelte/icons/x";
  import UploadCloud from "@lucide/svelte/icons/upload";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import ZoomIn from "@lucide/svelte/icons/zoom-in";
  import ZoomOut from "@lucide/svelte/icons/zoom-out";
  import * as Button from "$lib/components/ui/button/index.js";
  import { fade, scale } from "svelte/transition";

  const musicState = getContext<GlobalMusicState>("musicState");

  let title = $state("");
  let genre = $state("");
  let tagsInput = $state("");
  let zoomLevel = $state(50);
  let isSubmitting = $state(false);
  let submitError = $state("");
  let submitSuccess = $state("");

  const publishTrack = $derived(musicState.publishTarget || musicState.currentTrack);

  // Set initial title from the selected track
  $effect(() => {
    if (musicState.isPublishModalOpen && publishTrack) {
      title = publishTrack.title || "";
      genre = "";
      tagsInput = "";
      submitError = "";
      submitSuccess = "";
    }
  });

  function close() {
    musicState.isPublishModalOpen = false;
  }

  async function handlePublish() {
    if (!publishTrack?.id) {
      submitError = "Could not determine the selected track.";
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      submitError = "Please provide a title before publishing.";
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 12);

    submitError = "";
    submitSuccess = "";
    isSubmitting = true;

    try {
      const response = await fetch(`/api/music/${publishTrack.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          genre: genre.trim() || null,
          tags,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        submitError = payload?.error || "Failed to publish track.";
        return;
      }

      submitSuccess = "Published successfully!";

      if (musicState.currentTrack?.id === publishTrack.id) {
        musicState.currentTrack.title = trimmedTitle;
      }
      if (musicState.publishTarget?.id === publishTrack.id) {
        musicState.publishTarget.title = trimmedTitle;
      }

      setTimeout(() => {
        close();
      }, 500);
    } catch (error) {
      console.error("Publish failed:", error);
      submitError = "Network error while publishing track.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if musicState.isPublishModalOpen}
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
      class="bg-[#1a1a1a] rounded-2xl w-full max-w-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Close button -->
      <button
        class="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors"
        onclick={close}
      >
        <X class="h-5 w-5" />
      </button>

      <!-- Header -->
      <div class="p-8 pb-4">
        <h2 class="text-2xl font-bold text-white tracking-tight mb-2">
          Publish
        </h2>
        <p class="text-[#a0a0a0] text-sm font-medium">
          Publishing allows others to use your work as reference for similar
          songs
        </p>
      </div>

      <div class="px-8 py-4 flex flex-col gap-6">
        {#if submitError}
          <div class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {submitError}
          </div>
        {/if}

        {#if submitSuccess}
          <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {submitSuccess}
          </div>
        {/if}

        <!-- Song title field -->
        <div class="flex flex-col gap-2">
          <label for="songTitle" class="text-white text-sm font-semibold"
            >Song title</label
          >
          <div class="relative flex items-center">
            <input
              id="songTitle"
              type="text"
              bind:value={title}
              maxlength="50"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-3 px-4 text-white text-sm transition-colors"
            />
            <span class="absolute right-4 text-xs font-mono text-[#666]">
              {title.length} / 50
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label for="songGenre" class="text-white text-sm font-semibold"
              >Genre</label
            >
            <input
              id="songGenre"
              type="text"
              bind:value={genre}
              maxlength="40"
              placeholder="e.g. Bachata"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-3 px-4 text-white text-sm transition-colors"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="songTags" class="text-white text-sm font-semibold"
              >Tags</label
            >
            <input
              id="songTags"
              type="text"
              bind:value={tagsInput}
              maxlength="180"
              placeholder="romantic, guitar, tropical"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-3 px-4 text-white text-sm transition-colors"
            />
            <p class="text-xs text-[#8a8a8a]">Comma separated, up to 12 tags.</p>
          </div>
        </div>

        <!-- Song cover field -->
        <div class="flex flex-col gap-2">
          <span class="text-white text-sm font-semibold">Song cover</span>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Left: Cover preview and zoom -->
            <div class="flex flex-col gap-3">
              <div
                class="aspect-square rounded-2xl overflow-hidden bg-black relative border border-[#333]"
              >
                {#if publishTrack?.imageUrl}
                  <img
                    src={publishTrack.imageUrl}
                    alt="Cover preview"
                    class="w-full h-full object-cover"
                    style="transform: scale({1 + zoomLevel / 100});"
                  />
                {:else}
                  <div
                    class="w-full h-full flex items-center justify-center text-[#666]"
                  >
                    No Cover
                  </div>
                {/if}
              </div>

              <!-- Zoom slider -->
              <div class="flex items-center gap-3 text-[#a0a0a0]">
                <ZoomOut class="h-4 w-4 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  bind:value={zoomLevel}
                  class="w-full h-1 bg-[#333] rounded-full appearance-none outline-none accent-[#a0a0a0]
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                />
                <ZoomIn class="h-4 w-4 shrink-0" />
              </div>
            </div>

            <!-- Right: Cover actions -->
            <div class="flex flex-col gap-3 justify-start">
              <button
                class="flex items-center gap-4 bg-transparent border border-[#333] hover:border-[#555] rounded-2xl p-4 transition-colors text-left group"
              >
                <div
                  class="h-10 w-10 rounded-full bg-[#252525] group-hover:bg-[#333] flex items-center justify-center shrink-0 transition-colors"
                >
                  <UploadCloud class="h-5 w-5 text-white" />
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-sm font-semibold"
                    >Upload Cover Art</span
                  >
                  <span class="text-[#a0a0a0] text-xs"
                    >JPG or PNG, up to 5MB</span
                  >
                </div>
              </button>

              <button
                class="flex items-center gap-4 bg-transparent border border-[#333] hover:border-[#555] rounded-2xl p-4 transition-colors text-left group"
              >
                <div
                  class="h-10 w-10 rounded-full bg-[#1b4b47] flex items-center justify-center shrink-0"
                >
                  <Sparkles class="h-5 w-5 text-[#3ae0d5]" />
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-sm font-semibold"
                    >Generate with AI</span
                  >
                  <span class="text-[#a0a0a0] text-xs"
                    >Create a cover from a prompt</span
                  >
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer / Publish Action -->
      <div class="p-8 pt-4">
        <button
          onclick={handlePublish}
          disabled={isSubmitting}
          class="w-full bg-[#3ae0d5] hover:bg-[#3ae0d5]/90 text-black font-bold text-base py-3.5 rounded-xl transition-all shadow-md transform hover:scale-[1.01] active:scale-95"
        >
          {isSubmitting ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  </div>
{/if}
