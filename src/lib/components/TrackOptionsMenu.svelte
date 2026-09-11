<script lang="ts">
  import { getContext } from "svelte";
  import { page } from "$app/state";
  import { goto, invalidateAll } from "$app/navigation";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import AddToPlaylistDialog from "$lib/components/AddToPlaylistDialog.svelte";
  import { openSongInStudio, openSongStemsInStudio } from "$lib/studio-stems";
  import { shareTrackLink } from "$lib/utils/share-track.js";
  import type { GlobalMusicState, MusicTrack } from "$lib/stores/music.svelte.js";
  import { toast } from "svelte-sonner";
  import { appNotice } from "$lib/stores/app-notice.svelte.js";
  import { notice } from "$lib/ui/notice.js";

  export type TrackOptionsSong = {
    id: string;
    title?: string | null;
    prompt?: string | null;
    genre?: string | null;
    isInstrumental?: boolean | null;
    videoUrl?: string | null;
    imageUrl?: string | null;
    durationMs?: number | null;
    isPublic?: boolean | null;
    userId?: string | null;
    artistId?: string | null;
  };

  let {
    song,
    side = "bottom",
    align = "end",
    buttonClass = "",
    showClosePlayer = false,
  }: {
    song: TrackOptionsSong;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    buttonClass?: string;
    showClosePlayer?: boolean;
  } = $props();

  const musicState = getContext<GlobalMusicState>("musicState");

  let open = $state(false);
  let playlistOpen = $state(false);
  let liked = $state(false);
  let deleting = $state(false);
  let fetchedOwnerId = $state<string | null>(null);

  const currentUserId = $derived(page.data?.session?.user?.id);
  const currentUserRole = $derived(page.data?.session?.user?.role);

  const isOwner = $derived(
    Boolean(
      currentUserId &&
      (currentUserRole === "admin" ||
       (song.userId && song.userId === currentUserId) ||
       (song.artistId && song.artistId === currentUserId) ||
       (fetchedOwnerId && fetchedOwnerId === currentUserId))
    )
  );

  const displayTitle = $derived(song.title || song.prompt || "Untitled track");
  const isRealTrack = $derived(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(song.id));

  function stopRow(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function toPlayerTrack(): MusicTrack {
    return {
      id: song.id,
      url: `/api/music/${song.id}`,
      title: displayTitle,
      imageUrl: song.imageUrl || undefined,
      videoUrl: song.videoUrl || undefined,
      durationMs: song.durationMs || 0,
      genre: song.genre ?? null,
      isPublic: typeof song.isPublic === "boolean" ? song.isPublic : undefined
    };
  }

  async function openPublish() {
    open = false;
    if (!isRealTrack) {
      notice.error("No se puede publicar", "Esta canción aún no está lista.");
      return;
    }
    if (!isOwner) {
      notice.error("Acceso denegado", "Solo el artista creador puede publicar o editar esta canción.");
      return;
    }
    let isPublic = typeof song.isPublic === "boolean" ? song.isPublic : undefined;
    if (typeof isPublic !== "boolean") {
      try {
        const response = await fetch(`/api/music/${song.id}/info`);
        if (response.ok) {
          const info = await response.json();
          isPublic = Boolean(info?.isPublic);
          if (info?.userId || info?.artistId) {
            fetchedOwnerId = info.userId || info.artistId;
          }
        }
      } catch {
        // Modal can still check.
      }
    }
    if (isPublic) {
      notice.warning(
        "Esta canción ya está publicada",
        "Puedes actualizar los datos o despublicarla desde el panel."
      );
    }
    musicState?.openPublishModal({ ...toPlayerTrack(), isPublic });
  }

  $effect(() => {
    if (!open || !isRealTrack) return;
    if (!song.userId && !song.artistId && !fetchedOwnerId) {
      void fetch(`/api/music/${song.id}/info`)
        .then(async (response) => {
          if (!response.ok) return;
          const payload = await response.json().catch(() => null);
          if (payload?.userId || payload?.artistId) {
            fetchedOwnerId = payload.userId || payload.artistId;
          }
        })
        .catch(() => undefined);
    }
    void fetch(`/api/music/${song.id}/like`)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (response.ok) liked = Boolean(payload?.liked);
      })
      .catch(() => undefined);
  });

  async function toggleLike() {
    if (!isRealTrack) {
      toast.error("Esta canción no se puede guardar en Me gusta");
      return;
    }
    try {
      const response = await fetch(`/api/music/${song.id}/like`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || "No pude guardar el like");
        return;
      }
      liked = Boolean(payload?.liked);
      toast.success(liked ? "Agregada a Me gusta" : "Quitada de Me gusta");
    } catch {
      toast.error("No pude guardar el like");
    }
  }

  async function shareTrack() {
    const result = await shareTrackLink({ id: song.id, title: displayTitle });
    if (result === "shared") return;
    toast[result === "copied" ? "success" : "error"](
      result === "copied" ? "Enlace copiado" : "No pude copiar el enlace"
    );
  }

  function remixTrack() {
    const seed = song.prompt || displayTitle;
    const prompt = `Remix of “${displayTitle}”: ${seed}`;
    void goto(`/audio?tab=music&prompt=${encodeURIComponent(prompt)}`);
  }

  async function runMusicTool(action: string, extra: Record<string, unknown> = {}) {
    if (!isRealTrack) {
      toast.error("Esta pista no soporta herramientas GenAudius");
      return;
    }
    try {
      toast.message(`GenAudius: ${action}…`);
      const response = await fetch("/api/music-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, musicId: song.id, ...extra })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || `No pude ejecutar ${action}`);
        return;
      }
      if (payload?.status === "processing") {
        toast.success(`${action} en cola`, {
          description: payload.jobId ? `Job ${payload.jobId}` : undefined
        });
        return;
      }
      if (action === "align-lyrics") {
        toast.success(`Letras alineadas (${payload?.source || "ok"})`);
        return;
      }
      if (action === "wav" && payload?.status === "completed") {
        toast.success("WAV listo (ffmpeg local)");
        return;
      }
      if (action === "boost-style" && payload?.style) {
        toast.success("Estilo potenciado", { description: String(payload.style).slice(0, 120) });
        return;
      }
      toast.success(`${action} listo`);
    } catch {
      toast.error(`Falló ${action}`);
    }
  }

  function createVideoFromTrack() {
    const params = new URLSearchParams();
    if (isRealTrack) params.set("song", song.id);
    void goto(`/music-video?${params.toString()}`);
  }

  function addToQueue() {
    if (!musicState) return;
    const track = toPlayerTrack();
    const alreadyQueued = musicState.queue.some((item) => item.id === track.id);
    musicState.queue = alreadyQueued ? musicState.queue : [...musicState.queue, track];
    if (!musicState.currentTrack) {
      void musicState.playTrack(track);
    }
    toast.success("Agregada a la cola");
  }

  function downloadTrack() {
    const link = document.createElement("a");
    link.href = `/api/music/${song.id}`;
    link.download = `${displayTitle}.mp3`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function deleteTrack() {
    if (!isRealTrack || deleting) return;
    if (!isOwner) {
      notice.error("Acceso denegado", "Solo el artista creador puede eliminar esta canción.");
      return;
    }
    const ok = await appNotice.confirm({
      title: `¿Eliminar “${displayTitle}”?`,
      description: "Esta acción no se puede deshacer. Se borrará de tu biblioteca.",
      tone: "danger",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;
    deleting = true;
    try {
      const response = await fetch(`/api/music/${song.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        notice.error("No pude eliminar", payload?.error || payload?.message || "Inténtalo de nuevo");
        return;
      }
      if (musicState?.currentTrack?.id === song.id) {
        musicState.closePlayer();
      }
      notice.success("Canción eliminada");
      await invalidateAll();
    } catch {
      notice.error("No pude eliminar la canción");
    } finally {
      deleting = false;
    }
  }
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        type="button"
        class="h-8 w-8 shrink-0 rounded-full inline-flex items-center justify-center text-white/55 hover:text-white hover:bg-white/10 {buttonClass}"
        aria-label="Más opciones"
        title="Más opciones"
        onpointerdown={stopRow}
        onclick={(event) => {
          stopRow(event);
          open = !open;
        }}
        onkeydown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          stopRow(event);
          open = !open;
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-4 w-4"
        >
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content {side} {align} class="w-56 z-[300]">
    <DropdownMenu.Item
      class="cursor-pointer"
      onclick={() => {
        open = false;
        if (!isRealTrack) {
          toast.error("Esta canción no se puede guardar en una playlist");
          return;
        }
        playlistOpen = true;
      }}
    >
      Agregar a playlist
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="cursor-pointer"
      onclick={() => {
        open = false;
        void toggleLike();
      }}
    >
      {liked ? "Quitar de Me gusta" : "Me gusta"}
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="cursor-pointer"
      onclick={() => {
        open = false;
        addToQueue();
      }}
    >
      Agregar a la cola
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    {#if isOwner}
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          void openPublish();
        }}
      >
        Publicar
      </DropdownMenu.Item>
    {/if}
    <DropdownMenu.Item
      class="cursor-pointer"
      onclick={() => {
        open = false;
        void shareTrack();
      }}
    >
      Compartir
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="cursor-pointer"
      onclick={() => {
        open = false;
        remixTrack();
      }}
    >
      Remix
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="cursor-pointer"
      onclick={() => {
        open = false;
        createVideoFromTrack();
      }}
    >
      Crear video
    </DropdownMenu.Item>
    {#if song.videoUrl}
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          open = false;
          window.open(song.videoUrl || "", "_blank", "noopener,noreferrer");
        }}
      >
        Ver video
      </DropdownMenu.Item>
    {/if}
    {#if isRealTrack}
      <DropdownMenu.Separator />
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          open = false;
          openSongInStudio({
            id: song.id,
            title: displayTitle,
            prompt: song.prompt || song.title || undefined,
            genre: song.genre || undefined,
            isInstrumental: Boolean(song.isInstrumental),
            imageUrl: song.imageUrl || undefined
          });
        }}
      >
        Abrir en Studio
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          open = false;
          musicState?.isExpanded !== undefined && (musicState.isExpanded = false);
          openSongStemsInStudio({
            id: song.id,
            title: displayTitle,
            prompt: song.prompt || song.title || undefined,
            genre: song.genre || undefined,
            isInstrumental: Boolean(song.isInstrumental),
            imageUrl: song.imageUrl || undefined
          });
        }}
      >
        Extraer stems
      </DropdownMenu.Item>
      <DropdownMenu.Separator />
      {#if isOwner}
        <DropdownMenu.Item
          class="cursor-pointer"
          onclick={() => {
            open = false;
            void runMusicTool("align-lyrics", { refresh: true });
          }}
        >
          Alinear letras (karaoke)
        </DropdownMenu.Item>
      {/if}
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          open = false;
          void runMusicTool("wav");
        }}
      >
        Convertir a WAV
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          open = false;
          void runMusicTool("boost-style", { content: song.genre || song.prompt || "pop" });
        }}
      >
        Potenciar estilo
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="cursor-pointer opacity-60"
        disabled
        title="Suno-conditioned tools disabled — GenAudius roadmap"
      >
        Extender / Cover / Voces (próximamente)
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          open = false;
          downloadTrack();
        }}
      >
        Descargar
      </DropdownMenu.Item>
      {#if isOwner}
        <DropdownMenu.Item
          class="cursor-pointer text-destructive focus:bg-destructive/10"
          onclick={() => {
            open = false;
            void deleteTrack();
          }}
        >
          {deleting ? "Eliminando…" : "Eliminar"}
        </DropdownMenu.Item>
      {/if}
    {/if}
    {#if showClosePlayer}
      <DropdownMenu.Separator />
      <DropdownMenu.Item class="cursor-pointer" onclick={() => musicState?.closePlayer()}>
        Cerrar reproductor
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>

<AddToPlaylistDialog bind:open={playlistOpen} musicId={isRealTrack ? song.id : undefined} title={displayTitle} />
