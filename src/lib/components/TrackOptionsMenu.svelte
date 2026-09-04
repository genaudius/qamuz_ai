<script lang="ts">
  import { getContext } from "svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import AddToPlaylistDialog from "$lib/components/AddToPlaylistDialog.svelte";
  import { openSongInStudio, openSongStemsInStudio } from "$lib/studio-stems";
  import { shareTrackLink } from "$lib/utils/share-track.js";
  import type { GlobalMusicState, MusicTrack } from "$lib/stores/music.svelte.js";
  import { toast } from "svelte-sonner";

  export type TrackOptionsSong = {
    id: string;
    title?: string | null;
    prompt?: string | null;
    genre?: string | null;
    isInstrumental?: boolean | null;
    videoUrl?: string | null;
    imageUrl?: string | null;
    durationMs?: number | null;
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
      durationMs: song.durationMs || 0
    };
  }

  $effect(() => {
    if (!open || !isRealTrack) return;
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
    if (!window.confirm(`¿Eliminar “${displayTitle}”?`)) return;
    deleting = true;
    try {
      const response = await fetch(`/api/music/${song.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || payload?.message || "No pude eliminar la canción");
        return;
      }
      if (musicState?.currentTrack?.id === song.id) {
        musicState.closePlayer();
      }
      toast.success("Canción eliminada");
      await invalidateAll();
    } catch {
      toast.error("No pude eliminar la canción");
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
    <DropdownMenu.Item
      class="cursor-pointer"
      onclick={() => {
        open = false;
        if (!isRealTrack) {
          toast.error("Esta canción no se puede publicar");
          return;
        }
        musicState?.openPublishModal(toPlayerTrack());
      }}
    >
      Publicar
    </DropdownMenu.Item>
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
            isInstrumental: Boolean(song.isInstrumental)
          });
        }}
      >
        Abrir en Studio
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="cursor-pointer"
        onclick={() => {
          open = false;
          openSongStemsInStudio({
            id: song.id,
            title: displayTitle,
            prompt: song.prompt || song.title || undefined,
            genre: song.genre || undefined,
            isInstrumental: Boolean(song.isInstrumental)
          });
        }}
      >
        Extraer stems
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
    {#if showClosePlayer}
      <DropdownMenu.Separator />
      <DropdownMenu.Item class="cursor-pointer" onclick={() => musicState?.closePlayer()}>
        Cerrar reproductor
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>

<AddToPlaylistDialog bind:open={playlistOpen} musicId={isRealTrack ? song.id : undefined} title={displayTitle} />
