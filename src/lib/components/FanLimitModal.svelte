<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { fanLimitState } from "$lib/stores/fan-limit.svelte.js";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Music2 from "@lucide/svelte/icons/music-2";
  import Users from "@lucide/svelte/icons/users";
  import Check from "@lucide/svelte/icons/check";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import { goto } from "$app/navigation";

  let isRedirecting = $state(false);

  async function handleSubscribe() {
    isRedirecting = true;
    fanLimitState.closeModal();
    // Redirect to pricing page with fan plan pre-selected or billing
    await goto("/pricing?plan=fan_unlimited");
  }
</script>

<Dialog.Root bind:open={fanLimitState.isOpen}>
  <Dialog.Content class="sm:max-w-[480px] border-amber-500/20 bg-[#121318] text-white shadow-2xl p-0 overflow-hidden">
    <!-- Header banner with gradient -->
    <div class="relative bg-gradient-to-br from-amber-600/30 via-purple-600/20 to-black/60 p-6 pb-5 border-b border-white/5">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold mb-3">
        <Sparkles class="w-3.5 h-3.5" />
        <span>Límite Gratuito Alcanzado</span>
      </div>
      <h2 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        Membresía Fan Ilimitado
      </h2>
      <p class="text-xs text-white/70 mt-1.5 leading-relaxed">
        {fanLimitState.message}
      </p>
    </div>

    <!-- Pricing highlight & features -->
    <div class="p-6 space-y-5">
      <div class="flex items-baseline justify-between bg-white/[0.03] border border-white/10 rounded-2xl p-4">
        <div>
          <span class="text-xs font-medium uppercase tracking-wider text-amber-400">Pase Fan VIP</span>
          <p class="text-2xl font-black text-white mt-0.5">
            ${fanLimitState.price} <span class="text-xs font-normal text-white/50">USD / mes</span>
          </p>
        </div>
        <span class="text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg">
          Cancela cuando quieras
        </span>
      </div>

      <div class="space-y-2.5 text-xs text-white/80">
        <div class="flex items-center gap-2.5">
          <div class="h-5 w-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Check class="w-3.5 h-3.5" />
          </div>
          <span>Sigue a <strong>todos los artistas que quieras</strong> sin tope de 5</span>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="h-5 w-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Check class="w-3.5 h-3.5" />
          </div>
          <span>Guarda y organiza canciones en playlists ilimitadas</span>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="h-5 w-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Check class="w-3.5 h-3.5" />
          </div>
          <span>Acceso prioritario a lanzamientos exclusivos y karaoke en vivo</span>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="h-5 w-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck class="w-3.5 h-3.5" />
          </div>
          <span>Apoyo directo a los músicos y productores de QAMUZ</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-6 pt-0 flex flex-col gap-2.5">
      <Button
        type="button"
        class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-sm h-11 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        disabled={isRedirecting}
        onclick={handleSubscribe}
      >
        {#if isRedirecting}
          <span>Redirigiendo...</span>
        {:else}
          <span>Obtener Fan Ilimitado por $8/mes</span>
        {/if}
      </Button>
      <button
        type="button"
        class="text-xs text-white/40 hover:text-white transition-colors text-center py-1 cursor-pointer"
        onclick={() => fanLimitState.closeModal()}
      >
        Tal vez más tarde
      </button>
    </div>
  </Dialog.Content>
</Dialog.Root>
