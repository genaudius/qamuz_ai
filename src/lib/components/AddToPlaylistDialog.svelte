<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Button from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { toast } from "svelte-sonner";
  import ListMusic from "@lucide/svelte/icons/list-music";
  import Plus from "@lucide/svelte/icons/plus";

  type PlaylistRow = {
    id: string;
    name: string;
    trackCount: number;
  };

  let {
    open = $bindable(false),
    musicId,
    title
  }: {
    open: boolean;
    musicId?: string;
    title?: string;
  } = $props();

  let playlists = $state<PlaylistRow[]>([]);
  let loading = $state(false);
  let savingId = $state<string | null>(null);
  let creating = $state(false);
  let newName = $state("");
  let showCreate = $state(false);

  $effect(() => {
    if (open) {
      showCreate = false;
      newName = "";
      void loadPlaylists();
    }
  });

  async function loadPlaylists() {
    loading = true;
    try {
      const response = await fetch("/api/playlists");
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || "No pude cargar tus playlists");
        playlists = [];
        return;
      }
      playlists = payload?.playlists ?? [];
      showCreate = playlists.length === 0;
    } catch {
      toast.error("No pude cargar tus playlists");
      playlists = [];
    } finally {
      loading = false;
    }
  }

  async function addToPlaylist(playlist: PlaylistRow) {
    if (!musicId) {
      toast.error("No hay una canción sonando");
      return;
    }
    savingId = playlist.id;
    try {
      const response = await fetch(`/api/playlists/${playlist.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicId })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || "No pude agregar la canción");
        return;
      }
      toast.success(
        payload?.alreadyInPlaylist
          ? `Ya está en “${playlist.name}”`
          : `Agregada a “${playlist.name}”`
      );
      open = false;
    } catch {
      toast.error("No pude agregar la canción");
    } finally {
      savingId = null;
    }
  }

  async function createPlaylist() {
    const name = newName.trim();
    if (!name) {
      toast.error("Ponle un nombre a la playlist");
      return;
    }
    creating = true;
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, musicId })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        toast.error(payload?.error || "No pude crear la playlist");
        return;
      }
      const playlistName = payload?.playlist?.name || name;
      toast.success(
        payload?.added ? `Creé “${playlistName}” y agregué la canción` : `Creé “${playlistName}”`
      );
      open = false;
    } catch {
      toast.error("No pude crear la playlist");
    } finally {
      creating = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md bg-[#1c1c1c] border-white/10 text-white z-[300]">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <ListMusic class="h-4 w-4 text-[#3ae0d5]" />
        Agregar a playlist
      </Dialog.Title>
      <Dialog.Description class="text-white/60">
        {title ? `“${title}”` : "La canción que está sonando"}
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-3">
      {#if loading}
        <p class="text-sm text-white/50 py-6 text-center">Cargando playlists…</p>
      {:else if playlists.length === 0 && !showCreate}
        <p class="text-sm text-white/60">Todavía no tienes playlists.</p>
      {:else if playlists.length > 0}
        <div class="max-h-56 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
          {#each playlists as playlist (playlist.id)}
            <button
              type="button"
              class="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-white/5 disabled:opacity-50"
              disabled={savingId === playlist.id}
              onclick={() => addToPlaylist(playlist)}
            >
              <span class="truncate font-medium">{playlist.name}</span>
              <span class="text-xs text-white/45 shrink-0 ml-3">
                {savingId === playlist.id
                  ? "Agregando…"
                  : `${playlist.trackCount} ${playlist.trackCount === 1 ? "canción" : "canciones"}`}
              </span>
            </button>
          {/each}
        </div>
      {/if}

      {#if showCreate}
        <form
          class="space-y-3 rounded-xl border border-white/10 p-3"
          onsubmit={(event) => {
            event.preventDefault();
            void createPlaylist();
          }}
        >
          <p class="text-sm text-white/70">
            {playlists.length === 0 ? "Crea tu primera playlist." : "Nueva playlist"}
          </p>
          <Input
            bind:value={newName}
            placeholder="Nombre de la playlist"
            maxlength={80}
            class="bg-black/30 border-white/10 text-white"
          />
          <div class="flex justify-end gap-2">
            {#if playlists.length > 0}
              <Button.Root
                type="button"
                variant="ghost"
                class="text-white/70"
                onclick={() => (showCreate = false)}
              >
                Cancelar
              </Button.Root>
            {/if}
            <Button.Root type="submit" disabled={creating} class="bg-[#3ae0d5] text-black hover:bg-[#3ae0d5]/90">
              {creating ? "Creando…" : musicId ? "Crear y agregar" : "Crear"}
            </Button.Root>
          </div>
        </form>
      {:else}
        <Button.Root
          type="button"
          variant="outline"
          class="w-full border-white/10 text-white hover:bg-white/5"
          onclick={() => (showCreate = true)}
        >
          <Plus class="h-4 w-4 mr-1" />
          Crear playlist nueva
        </Button.Root>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
