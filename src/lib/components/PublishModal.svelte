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
    class="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    transition:fade={{ duration: 200 }}
    onclick={close}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bg-[#1a1a1a] rounded-2xl w-full max-w-xl shadow-2xl border border-white/10 max-h-[92dvh] sm:max-h-[88vh] overflow-hidden flex flex-col relative"
      onclick={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <button
        class="absolute top-4 right-4 sm:top-6 sm:right-6 text-muted-foreground hover:text-white transition-colors z-20 p-1.5 rounded-full hover:bg-white/10"
        onclick={close}
        aria-label="Cerrar modal"
      >
        <X class="h-5 w-5" />
      </button>

      <div class="p-4 sm:p-7 pb-2 sm:pb-3 shrink-0 border-b border-white/5 pr-12">
        <h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight mb-1">
          {alreadyPublic ? "Publicación" : "Publicar"}
        </h2>
        <p class="text-[#a0a0a0] text-xs sm:text-sm font-medium">
          {alreadyPublic
            ? "Esta canción ya está publicada. Puedes actualizar los datos o despublicarla."
            : "Al publicar, otras personas pueden descubrir tu canción en el feed."}
        </p>
      </div>

      <div class="overflow-y-auto flex-1 p-4 sm:px-7 sm:py-5 flex flex-col gap-4 sm:gap-5">
        {#if alreadyPublic}
          <div
            class="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-2.5 text-xs sm:text-sm text-amber-100"
          >
            <BadgeCheck class="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p class="font-semibold text-amber-50">Ya publicada</p>
              <p class="mt-0.5 text-amber-100/75 text-xs">
                {checkingStatus
                  ? "Comprobando estado…"
                  : "Visible en el feed público de QAMUZ."}
              </p>
            </div>
          </div>
        {/if}

        {#if submitError}
          <div class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs sm:text-sm text-red-300">
            {submitError}
          </div>
        {/if}

        {#if submitSuccess}
          <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs sm:text-sm text-emerald-300">
            {submitSuccess}
          </div>
        {/if}

        <div class="flex flex-col gap-1.5">
          <label for="songTitle" class="text-white text-xs sm:text-sm font-semibold">Título</label>
          <div class="relative flex items-center">
            <input
              id="songTitle"
              type="text"
              bind:value={title}
              maxlength="50"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-2.5 px-3.5 text-white text-sm transition-colors pr-14"
            />
            <span class="absolute right-3.5 text-[11px] font-mono text-[#666]">
              {title.length} / 50
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="songGenre" class="text-white text-xs sm:text-sm font-semibold">Género</label>
            <input
              id="songGenre"
              type="text"
              bind:value={genre}
              maxlength="40"
              placeholder="ej. Bachata"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-2.5 px-3.5 text-white text-sm transition-colors"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="songTags" class="text-white text-xs sm:text-sm font-semibold">Tags</label>
            <input
              id="songTags"
              type="text"
              bind:value={tagsInput}
              maxlength="180"
              placeholder="romántica, guitarra, tropical"
              class="w-full bg-transparent border border-[#333] hover:border-[#555] focus:border-[#3ae0d5] focus:outline-none rounded-xl py-2.5 px-3.5 text-white text-sm transition-colors"
            />
            <p class="text-[11px] text-[#8a8a8a]">Separados por coma, hasta 12.</p>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-white text-xs sm:text-sm font-semibold">Portada</span>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center">
            <div class="flex flex-col gap-2.5">
              <div class="w-32 h-32 sm:w-full sm:aspect-square mx-auto sm:mx-0 rounded-2xl overflow-hidden bg-black relative border border-[#333] shadow-inner">
                {#if publishTrack?.imageUrl}
                  <img
                    src={publishTrack.imageUrl}
                    alt="Cover preview"
                    class="w-full h-full object-cover"
                    style="transform: scale({1 + zoomLevel / 100});"
                  />
                {:else}
                  <div class="w-full h-full flex items-center justify-center text-xs text-[#666]">Sin portada</div>
                {/if}
              </div>
              <div class="flex items-center gap-2.5 text-[#a0a0a0] px-1">
                <ZoomOut class="h-3.5 w-3.5 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  bind:value={zoomLevel}
                  class="w-full h-1 bg-[#333] rounded-full appearance-none outline-none accent-[#3ae0d5] cursor-pointer"
                />
                <ZoomIn class="h-3.5 w-3.5 shrink-0" />
              </div>
            </div>

            <div class="flex flex-col gap-2.5 justify-start">
              <button
                type="button"
                class="flex items-center gap-3 bg-transparent border border-[#333] hover:border-[#555] rounded-xl p-3 transition-colors text-left group cursor-pointer"
              >
                <div
                  class="h-9 w-9 rounded-full bg-[#252525] group-hover:bg-[#333] flex items-center justify-center shrink-0 transition-colors"
                >
                  <UploadCloud class="h-4.5 w-4.5 text-white" />
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-xs sm:text-sm font-semibold">Subir portada</span>
                  <span class="text-[#a0a0a0] text-[11px]">JPG o PNG, hasta 5MB</span>
                </div>
              </button>

              <button
                type="button"
                class="flex items-center gap-3 bg-transparent border border-[#333] hover:border-[#555] rounded-xl p-3 transition-colors text-left group cursor-pointer"
              >
                <div class="h-9 w-9 rounded-full bg-[#1b4b47] flex items-center justify-center shrink-0">
                  <Sparkles class="h-4.5 w-4.5 text-[#3ae0d5]" />
                </div>
                <div class="flex flex-col">
                  <span class="text-white text-xs sm:text-sm font-semibold">Generar con IA</span>
                  <span class="text-[#a0a0a0] text-[11px]">Portada desde un prompt</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 sm:p-6 border-t border-white/10 bg-[#1a1a1a] shrink-0 sticky bottom-0 z-10 flex flex-col gap-2 shadow-2xl">
        <button
          onclick={handlePublish}
          disabled={isSubmitting}
          class="w-full bg-[#3ae0d5] hover:bg-[#3ae0d5]/90 text-black font-extrabold text-sm sm:text-base py-3 rounded-xl transition-all shadow-md transform hover:scale-[1.01] active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {#if isSubmitting}
            Guardando…
          {:else if alreadyPublic}
            Actualizar publicación
          {:else}
            Publicar canción
          {/if}
        </button>
        {#if alreadyPublic}
          <button
            type="button"
            onclick={handleUnpublish}
            disabled={isSubmitting}
            class="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs sm:text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-60 cursor-pointer"
          >
            Despublicar
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
