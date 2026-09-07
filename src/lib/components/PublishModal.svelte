<script lang="ts">
  import { getContext } from "svelte";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  import { musicState as sharedMusicState } from "$lib/stores/music-state.js";
  import { appNotice } from "$lib/stores/app-notice.svelte.js";
  import { notice } from "$lib/ui/notice.js";
  import X from "@lucide/svelte/icons/x";
  import UploadCloud from "@lucide/svelte/icons/upload";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import ZoomIn from "@lucide/svelte/icons/zoom-in";
  import ZoomOut from "@lucide/svelte/icons/zoom-out";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import { fade, scale } from "svelte/transition";

  const musicState = getContext<GlobalMusicState>("musicState") ?? sharedMusicState;
  let title = $state("");
  let genre = $state("");
  let tagsInput = $state("");
  let zoomLevel = $state(50);
  let isSubmitting = $state(false);
  let submitError = $state("");
  let submitSuccess = $state("");
  let alreadyPublic = $state(false);
  let checkingStatus = $state(false);

  const publishTrack = $derived(musicState.publishTarget || musicState.currentTrack);

  async function refreshPublishStatus() {
    if (!publishTrack?.id) {
      alreadyPublic = false;
      return;
    }
    if (typeof publishTrack.isPublic === "boolean") {
      alreadyPublic = publishTrack.isPublic;
      return;
    }
    checkingStatus = true;
    try {
      const response = await fetch(`/api/music/${publishTrack.id}/info`);
      if (response.ok) {
        const info = await response.json();
        alreadyPublic = Boolean(info?.isPublic);
        if (publishTrack.id) {
          musicState.markTrackPublic(publishTrack.id, alreadyPublic);
        }
      }
    } catch {
      // Keep modal usable even if status check fails.
    } finally {
      checkingStatus = false;
    }
  }

  $effect(() => {
    if (musicState.isPublishModalOpen && publishTrack) {
      title = publishTrack.title || "";
      genre = publishTrack.genre || "";
      tagsInput = (publishTrack.tags || []).join(", ");
      submitError = "";
      submitSuccess = "";
      void refreshPublishStatus().then(async () => {
        if (!musicState.isPublishModalOpen) return;
        if (alreadyPublic) {
          notice.warning(
            "Esta canción ya está publicada",
            "Está visible en el feed. Puedes actualizar título/tags o despublicarla."
          );
        }
      });
    }
  });

  function close() {
    musicState.isPublishModalOpen = false;
  }

  async function handleUnpublish() {
    if (!publishTrack?.id || isSubmitting) return;
    const ok = await appNotice.confirm({
      title: "¿Despublicar esta canción?",
      description: "Dejará de aparecer en el feed público. Podrás publicarla otra vez cuando quieras.",
      tone: "warning",
      confirmLabel: "Despublicar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;

    isSubmitting = true;
    submitError = "";
    try {
      const response = await fetch(`/api/music/${publishTrack.id}/publish`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        submitError = payload?.error || "No pude despublicar la canción.";
        notice.error("No se pudo despublicar", submitError);
        return;
      }
      alreadyPublic = false;
      musicState.markTrackPublic(publishTrack.id, false);
      notice.success("Canción despublicada", "Ya no aparece en el feed público.");
      close();
    } catch {
      submitError = "Error de red al despublicar.";
      notice.error("Error de red", submitError);
    } finally {
      isSubmitting = false;
    }
  }

  async function handlePublish() {
    if (!publishTrack?.id) {
      submitError = "No pude identificar la canción.";
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      submitError = "Escribe un título antes de publicar.";
      return;
    }

    if (alreadyPublic) {
      const update = await appNotice.confirm({
        title: "Esta canción ya está publicada",
        description:
          "Ya está en el feed público. ¿Quieres actualizar el título, género o tags?",
        tone: "warning",
        confirmLabel: "Actualizar publicación",
        cancelLabel: "Cancelar",
      });
      if (!update) return;
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
        submitError = payload?.error || "No pude publicar la canción.";
        notice.error("Publicación fallida", submitError);
        return;
      }

      const wasPublic = alreadyPublic;
      alreadyPublic = true;
      musicState.markTrackPublic(publishTrack.id, true);
      if (musicState.currentTrack?.id === publishTrack.id) {
        musicState.currentTrack.title = trimmedTitle;
        musicState.currentTrack.genre = genre.trim() || null;
        musicState.currentTrack.tags = tags;
      }
      if (musicState.publishTarget?.id === publishTrack.id) {
        musicState.publishTarget.title = trimmedTitle;
        musicState.publishTarget.genre = genre.trim() || null;
        musicState.publishTarget.tags = tags;
      }

      notice.success(
        wasPublic ? "Publicación actualizada" : "Canción publicada",
        `“${trimmedTitle}” ya está en el feed.`
      );
      submitSuccess = "Listo";
      setTimeout(() => close(), 450);
    } catch (error) {
      console.error("Publish failed:", error);
      submitError = "Error de red al publicar.";
      notice.error("Error de red", submitError);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if musicState.isPublishModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    onclick={close}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-[#1a1a1a] rounded-2xl w-full max-w-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <button
        class="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors"
        onclick={close}
      >
        <X class="h-5 w-5" />
      </button>

      <div class="p-8 pb-4">
        <h2 class="text-2xl font-bold text-white tracking-tight mb-2">
          {alreadyPublic ? "Publicación" : "Publicar"}
        </h2>
        <p class="text-[#a0a0a0] text-sm font-medium">
          {alreadyPublic
            ? "Esta canción ya está publicada. Puedes actualizar los datos o despublicarla."
            : "Al publicar, otras personas pueden descubrir tu canción en el feed."}
        </p>
      </div>

      <div class="px-8 py-4 flex flex-col gap-6">
        {#if alreadyPublic}
          <div
            class="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
          >
            <BadgeCheck class="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p class="font-semibold text-amber-50">Ya publicada</p>
              <p class="mt-0.5 text-amber-100/75">
                {checkingStatus
                  ? "Comprobando estado…"
                  : "Visible en el feed público de QAMUZ."}
              </p>
            </div>
          </div>
        {/if}

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

        <div class="flex flex-col gap-2">
          <label for="songTitle" class="text-white text-sm font-semibold">Título</label>
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
            <label for="songGenre" class="text-white text-sm font-semibold">Género</label>
            <input
              id="songGenre"
              type="text"
              bind:value={genre}
              maxlength="40"
              placeholder="ej. Bachata"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-3 px-4 text-white text-sm transition-colors"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="songTags" class="text-white text-sm font-semibold">Tags</label>
            <input
              id="songTags"
              type="text"
              bind:value={tagsInput}
              maxlength="180"
              placeholder="romántica, guitarra, tropical"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-3 px-4 text-white text-sm transition-colors"
            />
            <p class="text-xs text-[#8a8a8a]">Separados por coma, hasta 12.</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-white text-sm font-semibold">Portada</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-3">
              <div class="aspect-square rounded-2xl overflow-hidden bg-black relative border border-[#333]">
                {#if publishTrack?.imageUrl}
                  <img
                    src={publishTrack.imageUrl}
                    alt="Cover preview"
                    class="w-full h-full object-cover"
                    style="transform: scale({1 + zoomLevel / 100});"
                  />
                {:else}
                  <div class="w-full h-full flex items-center justify-center text-[#666]">Sin portada</div>
                {/if}
              </div>
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

            <div class="flex flex-col gap-3 justify-start">
              <button
                type="button"
                class="flex items-center gap-4 bg-transparent border border-[#333] hover:border-[#555] rounded-2xl p-4 transition-colors text-left group"
              >
                <div
                  class="h-10 w-10 rounded-full bg-[#252525] group-hover:bg-[#333] flex items-center justify-center shrink-0 transition-colors"
                >
                  <UploadCloud class="h-5 w-5 text-white" />
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-sm font-semibold">Subir portada</span>
                  <span class="text-[#a0a0a0] text-xs">JPG o PNG, hasta 5MB</span>
                </div>
              </button>

              <button
                type="button"
                class="flex items-center gap-4 bg-transparent border border-[#333] hover:border-[#555] rounded-2xl p-4 transition-colors text-left group"
              >
                <div class="h-10 w-10 rounded-full bg-[#1b4b47] flex items-center justify-center shrink-0">
                  <Sparkles class="h-5 w-5 text-[#3ae0d5]" />
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-sm font-semibold">Generar con IA</span>
                  <span class="text-[#a0a0a0] text-xs">Portada desde un prompt</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="p-8 pt-4 flex flex-col gap-2">
        <button
          onclick={handlePublish}
          disabled={isSubmitting}
          class="w-full bg-[#3ae0d5] hover:bg-[#3ae0d5]/90 text-black font-bold text-base py-3.5 rounded-xl transition-all shadow-md transform hover:scale-[1.01] active:scale-95 disabled:opacity-60"
        >
          {#if isSubmitting}
            Guardando…
          {:else if alreadyPublic}
            Actualizar publicación
          {:else}
            Publicar
          {/if}
        </button>
        {#if alreadyPublic}
          <button
            type="button"
            onclick={handleUnpublish}
            disabled={isSubmitting}
            class="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-60"
          >
            Despublicar
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
