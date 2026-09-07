<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { appNotice, type NoticeTone } from "$lib/stores/app-notice.svelte.js";
  import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
  import Info from "@lucide/svelte/icons/info";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import ShieldAlert from "@lucide/svelte/icons/shield-alert";

  const toneIcon: Record<NoticeTone, typeof Info> = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: ShieldAlert,
  };

  const toneRing: Record<NoticeTone, string> = {
    info: "from-cyan-400/25 to-transparent text-cyan-300",
    success: "from-emerald-400/25 to-transparent text-emerald-300",
    warning: "from-amber-400/30 to-transparent text-amber-300",
    danger: "from-rose-400/30 to-transparent text-rose-300",
  };

  function onKey(event: KeyboardEvent) {
    if (!appNotice.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      appNotice.settle(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      appNotice.settle(true);
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if appNotice.open && appNotice.request}
  {@const req = appNotice.request}
  {@const tone = req.tone ?? "info"}
  {@const Icon = toneIcon[tone]}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[400] flex items-center justify-center p-4"
    transition:fade={{ duration: 160 }}
    onclick={() => appNotice.settle(false)}
  >
    <div class="absolute inset-0 bg-black/55 backdrop-blur-md"></div>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#141416]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      transition:scale={{ duration: 180, start: 0.96 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-notice-title"
      onclick={(e) => e.stopPropagation()}
    >
      <div class={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${toneRing[tone]}`}></div>
      <div class="relative p-7 pt-8">
        <div
          class={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 ${toneRing[tone].split(" ").pop()}`}
        >
          <Icon class="h-6 w-6" />
        </div>
        <h2 id="app-notice-title" class="text-xl font-semibold tracking-tight text-white">
          {req.title}
        </h2>
        {#if req.description}
          <p class="mt-2 text-sm leading-relaxed text-white/65">
            {req.description}
          </p>
        {/if}
        <div class="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {#if req.showCancel !== false && req.cancelLabel !== null}
            <button
              type="button"
              class="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
              onclick={() => appNotice.settle(false)}
            >
              {req.cancelLabel || "Cancelar"}
            </button>
          {/if}
          <button
            type="button"
            class={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tone === "danger"
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : tone === "warning"
                  ? "bg-amber-400 text-black hover:bg-amber-300"
                  : tone === "success"
                    ? "bg-emerald-400 text-black hover:bg-emerald-300"
                    : "bg-[#3ae0d5] text-black hover:bg-[#5aeadf]"
            }`}
            onclick={() => appNotice.settle(true)}
          >
            {req.confirmLabel || "Continuar"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
