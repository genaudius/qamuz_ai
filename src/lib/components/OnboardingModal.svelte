<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { getContext } from "svelte";
  import { Mic2, Sliders, Headphones, CheckCircle2, ShieldCheck, Sparkles, AlertCircle } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  const sessionCtx = getContext<() => any>("session");
  const session = $derived(sessionCtx?.());
  
  let open = $state(false);
  let userType = $state<"artist" | "producer" | "fan">("fan");
  let fullName = $state("");
  let username = $state("");
  let artistName = $state("");
  let portfolioUrl = $state("");
  let requestVerification = $state(true);
  let agreedTerms = $state(false);
  let isSubmitting = $state(false);
  let errorMessage = $state("");

  $effect(() => {
    const user = session?.user;
    if (user) {
      // Check if userType or professionalRole is missing/uninitialized
      const needsOnboarding = !user.userType && (user.professionalRole === null || user.professionalRole === undefined);
      if (needsOnboarding) {
        open = true;
        if (!fullName && user.name) fullName = user.name;
        if (!username && user.username) username = user.username;
        if (!username && user.email) username = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
      } else {
        open = false;
      }
    } else {
      open = false;
    }
  });

  async function handleSubmit() {
    errorMessage = "";
    if (!agreedTerms) {
      errorMessage = "Debes aceptar los términos y condiciones.";
      return;
    }

    if (userType === "artist" && !artistName.trim()) {
      errorMessage = "Por favor ingresa tu Nombre Artístico.";
      return;
    }

    if (userType === "producer" && !artistName.trim()) {
      errorMessage = "Por favor ingresa tu Nombre de Productor.";
      return;
    }

    isSubmitting = true;
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim().replace(/^@+/, ""),
          userType,
          artistName: artistName.trim(),
          portfolioUrl: portfolioUrl.trim(),
          requestVerification: (userType === "artist" || userType === "producer") ? requestVerification : false
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        errorMessage = data.error || "No se pudo guardar la configuración.";
        isSubmitting = false;
        return;
      }

      toast.success("¡Perfil configurado con éxito!");
      open = false;
      window.location.reload();
    } catch (e: any) {
      console.error("Onboarding error:", e);
      errorMessage = "Ocurrió un error inesperado. Intenta de nuevo.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog.Root bind:open={open}>
  <Dialog.Content class="sm:max-w-[560px] max-h-[92vh] overflow-y-auto bg-neutral-950/95 border-neutral-800 text-neutral-100 shadow-2xl backdrop-blur-xl p-6">
    <Dialog.Header class="space-y-2 text-left">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary w-fit">
        <Sparkles class="w-3.5 h-3.5" />
        <span>Bienvenido a QAMUZ AI</span>
      </div>
      <Dialog.Title class="text-2xl font-bold tracking-tight text-white">
        Identifícate en la Plataforma
      </Dialog.Title>
      <Dialog.Description class="text-sm text-neutral-400">
        Cuéntanos cómo vas a participar en la comunidad de música con inteligencia artificial para personalizar tu experiencia.
      </Dialog.Description>
    </Dialog.Header>

    {#if errorMessage}
      <div class="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs mt-2">
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <!-- Selector de Rol -->
    <div class="space-y-3 pt-3">
      <Label class="text-xs font-semibold uppercase tracking-wider text-neutral-400">
        ¿Cuál es tu rol principal?
      </Label>
      <div class="grid grid-cols-3 gap-2.5">
        <!-- Artista -->
        <button
          type="button"
          onclick={() => (userType = "artist")}
          class="flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer relative {userType === 'artist' ? 'bg-primary/15 border-primary text-white shadow-lg shadow-primary/20' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'}"
        >
          <Mic2 class="w-6 h-6 mb-2 {userType === 'artist' ? 'text-primary' : 'text-neutral-400'}" />
          <span class="text-xs font-bold leading-tight">Artista</span>
          <span class="text-[10px] text-neutral-400 mt-0.5">Crear & Publicar</span>
        </button>

        <!-- Productor -->
        <button
          type="button"
          onclick={() => (userType = "producer")}
          class="flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer relative {userType === 'producer' ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'}"
        >
          <Sliders class="w-6 h-6 mb-2 {userType === 'producer' ? 'text-purple-400' : 'text-neutral-400'}" />
          <span class="text-xs font-bold leading-tight">Productor</span>
          <span class="text-[10px] text-neutral-400 mt-0.5">DAW & Mezcla</span>
        </button>

        <!-- Fan -->
        <button
          type="button"
          onclick={() => (userType = "fan")}
          class="flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer relative {userType === 'fan' ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'}"
        >
          <Headphones class="w-6 h-6 mb-2 {userType === 'fan' ? 'text-emerald-400' : 'text-neutral-400'}" />
          <span class="text-xs font-bold leading-tight">Fanático / Fan</span>
          <span class="text-[10px] text-neutral-400 mt-0.5">Escuchar & Apoyar</span>
        </button>
      </div>
    </div>

    <!-- Campos Comunes -->
    <div class="grid gap-3.5 py-3 border-t border-neutral-800/80 mt-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <Label for="fullname" class="text-xs text-neutral-300">Nombre Completo</Label>
          <Input
            id="fullname"
            bind:value={fullName}
            placeholder="Ej. Juan Pérez"
            class="bg-neutral-900 border-neutral-800 text-sm focus-visible:ring-primary"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="email" class="text-xs text-neutral-300">Correo Electrónico</Label>
          <Input
            id="email"
            value={session?.user?.email || ""}
            disabled
            class="bg-neutral-900/60 border-neutral-800/60 text-neutral-400 text-sm cursor-not-allowed"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <Label for="username" class="text-xs text-neutral-300">Nombre de Usuario (@)</Label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-neutral-500 text-sm select-none">@</span>
          <Input
            id="username"
            bind:value={username}
            placeholder="usuario_musical"
            class="bg-neutral-900 border-neutral-800 pl-7 text-sm focus-visible:ring-primary"
          />
        </div>
      </div>

      <!-- Campos Dinámicos según Rol -->
      {#if userType === "artist"}
        <div class="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <Label for="artistName" class="text-xs font-semibold text-primary">
            Nombre Artístico *
          </Label>
          <Input
            id="artistName"
            bind:value={artistName}
            placeholder="Ej. Nova Sound, DJ Alpha, etc."
            class="bg-neutral-900 border-neutral-800 text-sm"
          />
          <p class="text-[11px] text-neutral-400">
            Este es el nombre con el que aparecerás en tus canciones y perfil público.
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="portfolio" class="text-xs text-neutral-300">Portafolio / Enlaces (Opcional)</Label>
          <Input
            id="portfolio"
            bind:value={portfolioUrl}
            placeholder="https://instagram.com/tuartista o Spotify"
            class="bg-neutral-900 border-neutral-800 text-sm"
          />
        </div>

        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
          <input
            type="checkbox"
            id="reqVerifArtist"
            bind:checked={requestVerification}
            class="w-4 h-4 mt-0.5 rounded border-neutral-700 text-primary bg-neutral-950 focus:ring-primary"
          />
          <Label for="reqVerifArtist" class="text-xs leading-snug cursor-pointer font-normal text-neutral-200">
            <span class="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4 text-primary inline" />
              Solicitar Verificación Oficial de Artista
            </span>
            <span class="text-neutral-400 block mt-0.5 text-[11px]">
              Requerido para desbloquear el DAW Studio profesional y obtener la insignia verificada en tus canciones.
            </span>
          </Label>
        </div>
      {:else if userType === "producer"}
        <div class="space-y-1.5 p-3 rounded-xl bg-purple-600/5 border border-purple-500/20">
          <Label for="producerName" class="text-xs font-semibold text-purple-400">
            Nombre de Productor *
          </Label>
          <Input
            id="producerName"
            bind:value={artistName}
            placeholder="Ej. Metro Beats, AudioLab Studio, etc."
            class="bg-neutral-900 border-neutral-800 text-sm"
          />
          <p class="text-[11px] text-neutral-400">
            Nombre de crédito para tus producciones y mezclas de estudio.
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="portfolioProd" class="text-xs text-neutral-300">Muestras de Audio / Portafolio (Opcional)</Label>
          <Input
            id="portfolioProd"
            bind:value={portfolioUrl}
            placeholder="https://soundcloud.com/tuperfil"
            class="bg-neutral-900 border-neutral-800 text-sm"
          />
        </div>

        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
          <input
            type="checkbox"
            id="reqVerifProd"
            bind:checked={requestVerification}
            class="w-4 h-4 mt-0.5 rounded border-neutral-700 text-purple-500 bg-neutral-950 focus:ring-purple-500"
          />
          <Label for="reqVerifProd" class="text-xs leading-snug cursor-pointer font-normal text-neutral-200">
            <span class="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck class="w-4 h-4 text-purple-400 inline" />
              Solicitar Verificación Oficial de Productor
            </span>
            <span class="text-neutral-400 block mt-0.5 text-[11px]">
              Te otorga acceso autorizado al DAW Studio para producir directamente en el sistema.
            </span>
          </Label>
        </div>
      {:else}
        <!-- Información para Fanáticos -->
        <div class="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-950 border border-emerald-800/40 space-y-2">
          <div class="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <CheckCircle2 class="w-4 h-4" />
            <span>Registro Gratuito de Fan</span>
          </div>
          <p class="text-xs text-neutral-300 leading-relaxed">
            Como fanático, tu registro es <span class="text-emerald-400 font-medium">100% gratuito</span>. Puedes escuchar todas las canciones, descubrir nuevos talentos y seguir o guardar temas de hasta <strong class="text-white font-semibold">5 artistas</strong> en tu perfil.
          </p>
          <div class="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200">
            💡 <strong>Membresía Fan Unlimited:</strong> Si más adelante deseas seguir artistas ilimitados y tener playlists sin restricciones, podrás activar el pase por solo <strong>$8 USD/mes</strong>.
          </div>
        </div>
      {/if}

      <!-- Términos -->
      <div class="flex items-start gap-2 pt-2 border-t border-neutral-800">
        <input
          type="checkbox"
          id="terms"
          bind:checked={agreedTerms}
          class="w-4 h-4 mt-0.5 rounded border-neutral-700 text-primary bg-neutral-950 focus:ring-primary"
        />
        <Label for="terms" class="text-[11px] leading-tight font-normal text-neutral-400 cursor-pointer">
          Acepto las normas de la comunidad, derechos de autor y términos de servicio de QAMUZ AI.
        </Label>
      </div>
    </div>

    <Dialog.Footer class="pt-2">
      <Button
        onclick={handleSubmit}
        disabled={!agreedTerms || isSubmitting}
        class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5"
      >
        {#if isSubmitting}
          <span class="animate-pulse">Guardando perfil...</span>
        {:else}
          Guardar y Comenzar
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
