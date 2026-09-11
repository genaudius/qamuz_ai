<script lang="ts">
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { enhance } from "$app/forms";
  import { toast } from "svelte-sonner";
  import { 
    ShieldCheck, 
    Clock, 
    AlertCircle, 
    Check, 
    X, 
    ExternalLink, 
    Mic2, 
    Sliders, 
    Search,
    UserCheck,
    RotateCcw
  } from "@lucide/svelte";

  let { data, form } = $props();

  let activeFilter = $state<"all" | "pending" | "verified" | "rejected">("all");
  let search = $state("");

  const filteredRequests = $derived(
    data.requests.filter((r: any) => {
      // Filter by status tab
      if (activeFilter === "pending" && r.verificationStatus !== "pending") return false;
      if (activeFilter === "verified" && !r.isVerifiedArtist) return false;
      if (activeFilter === "rejected" && r.verificationStatus !== "rejected") return false;

      // Filter by search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = r.name?.toLowerCase().includes(q);
        const matchesEmail = r.email?.toLowerCase().includes(q);
        const matchesArtist = r.artistName?.toLowerCase().includes(q);
        const matchesUsername = r.username?.toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesArtist || matchesUsername;
      }

      return true;
    })
  );

  $effect(() => {
    if (form?.success && form?.message) {
      toast.success(form.message);
    } else if (form?.error) {
      toast.error(form.error);
    }
  });
</script>

<svelte:head>
  <title>Verificaciones de Artistas y Productores | Admin QAMUZ</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page Header -->
  <div>
    <h1 class="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
      <ShieldCheck class="w-8 h-8 text-primary" />
      Verificaciones de Artistas & Productores
    </h1>
    <p class="text-sm text-muted-foreground mt-1">
      Gestiona las solicitudes de verificación para creadores. Los usuarios verificados tienen acceso exclusivo al DAW Studio profesional.
    </p>
  </div>

  <!-- Metric Summary Cards -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <Card.Root class="bg-card/50 border-border/80">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">
          Pendientes de Revisión
        </Card.Title>
        <Clock class="w-4 h-4 text-amber-400" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-amber-400">{data.pendingCount}</div>
        <p class="text-xs text-muted-foreground mt-1">Requieren aprobación para acceder al DAW</p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="bg-card/50 border-border/80">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">
          Verificados Activos
        </Card.Title>
        <UserCheck class="w-4 h-4 text-emerald-400" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-emerald-400">{data.verifiedCount}</div>
        <p class="text-xs text-muted-foreground mt-1">Artistas y productores con DAW habilitado</p>
      </Card.Content>
    </Card.Root>

    <Card.Root class="bg-card/50 border-border/80">
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-sm font-medium text-muted-foreground">
          Total Creadores
        </Card.Title>
        <Mic2 class="w-4 h-4 text-primary" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold text-white">{data.requests.length}</div>
        <p class="text-xs text-muted-foreground mt-1">Artistas, productores y postulantes</p>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Filters & Search Toolbar -->
  <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
    <!-- Filter Tabs -->
    <div class="inline-flex rounded-xl bg-neutral-900 border border-neutral-800 p-1">
      <button
        type="button"
        onclick={() => (activeFilter = "all")}
        class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition {activeFilter === 'all' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-400 hover:text-white'}"
      >
        Todos ({data.requests.length})
      </button>
      <button
        type="button"
        onclick={() => (activeFilter = "pending")}
        class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 {activeFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-400 hover:text-amber-300'}"
      >
        Pendientes
        {#if data.pendingCount > 0}
          <span class="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
            {data.pendingCount}
          </span>
        {/if}
      </button>
      <button
        type="button"
        onclick={() => (activeFilter = "verified")}
        class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition {activeFilter === 'verified' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-neutral-400 hover:text-emerald-300'}"
      >
        Verificados ({data.verifiedCount})
      </button>
      <button
        type="button"
        onclick={() => (activeFilter = "rejected")}
        class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition {activeFilter === 'rejected' ? 'bg-red-500/20 text-red-300 font-semibold' : 'text-neutral-400 hover:text-red-300'}"
      >
        Rechazados
      </button>
    </div>

    <!-- Search input -->
    <div class="relative w-full sm:w-72">
      <Search class="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
      <Input
        bind:value={search}
        placeholder="Buscar creador, correo..."
        class="pl-9 bg-neutral-900/60 border-neutral-800 text-xs"
      />
    </div>
  </div>

  <!-- Requests Table -->
  <Card.Root class="border-border/80">
    <div class="overflow-x-auto">
      <Table.Root>
        <Table.Header>
          <Table.Row class="hover:bg-transparent">
            <Table.Head class="w-[240px]">Usuario / Creador</Table.Head>
            <Table.Head class="w-[120px]">Rol</Table.Head>
            <Table.Head class="w-[180px]">Nombre Artístico / Productor</Table.Head>
            <Table.Head class="w-[160px]">Portafolio</Table.Head>
            <Table.Head class="w-[130px]">Estado</Table.Head>
            <Table.Head class="w-[120px]">Fecha</Table.Head>
            <Table.Head class="text-right">Acciones</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if filteredRequests.length === 0}
            <Table.Row>
              <Table.Cell colspan={7} class="h-32 text-center text-muted-foreground text-sm">
                No hay solicitudes que coincidan con los filtros actuales.
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredRequests as req}
              <Table.Row class="border-border/50">
                <!-- Usuario -->
                <Table.Cell>
                  <div>
                    <div class="font-medium text-white text-sm">
                      {req.name || "Sin nombre"}
                    </div>
                    <div class="text-xs text-muted-foreground">
                      {req.email}
                    </div>
                    {#if req.username}
                      <div class="text-[11px] text-primary/80 font-mono mt-0.5">
                        @{req.username}
                      </div>
                    {/if}
                  </div>
                </Table.Cell>

                <!-- Rol -->
                <Table.Cell>
                  {#if req.userType === "producer_artist"}
                    <Badge variant="outline" class="border-cyan-500/40 text-cyan-300 bg-cyan-950/20 text-xs flex items-center gap-1 w-fit">
                      <Sliders class="w-3 h-3 text-cyan-400" />
                      Productor & Artista
                    </Badge>
                  {:else if req.userType === "producer"}
                    <Badge variant="outline" class="border-purple-500/40 text-purple-300 bg-purple-950/20 text-xs flex items-center gap-1 w-fit">
                      <Sliders class="w-3 h-3" />
                      Productor
                    </Badge>
                  {:else if req.userType === "artist"}
                    <Badge variant="outline" class="border-primary/40 text-primary bg-primary/10 text-xs flex items-center gap-1 w-fit">
                      <Mic2 class="w-3 h-3" />
                      Artista
                    </Badge>
                  {:else}
                    <Badge variant="outline" class="border-neutral-700 text-neutral-400 text-xs">
                      {req.userType || "Fan"}
                    </Badge>
                  {/if}
                </Table.Cell>

                <!-- Nombre Artístico -->
                <Table.Cell>
                  <div class="font-medium text-neutral-200 text-sm">
                    {req.artistName || "—"}
                  </div>
                </Table.Cell>

                <!-- Portafolio -->
                <Table.Cell>
                  {#if req.portfolioUrl}
                    <a
                      href={req.portfolioUrl.startsWith("http") ? req.portfolioUrl : `https://${req.portfolioUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 underline underline-offset-2 max-w-[150px] truncate"
                    >
                      <ExternalLink class="w-3 h-3 shrink-0" />
                      <span class="truncate">{req.portfolioUrl.replace(/^https?:\/\//, "")}</span>
                    </a>
                  {:else}
                    <span class="text-xs text-neutral-500">—</span>
                  {/if}
                </Table.Cell>

                <!-- Estado -->
                <Table.Cell>
                  {#if req.isVerifiedArtist || req.verificationStatus === "verified"}
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      <ShieldCheck class="w-3 h-3" />
                      Verificado
                    </span>
                  {:else if req.verificationStatus === "pending"}
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse">
                      <Clock class="w-3 h-3" />
                      Pendiente
                    </span>
                  {:else if req.verificationStatus === "rejected"}
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/60">
                      <AlertCircle class="w-3 h-3" />
                      Rechazado
                    </span>
                  {:else}
                    <span class="text-xs text-neutral-500">Sin solicitud</span>
                  {/if}
                </Table.Cell>

                <!-- Fecha -->
                <Table.Cell>
                  <span class="text-xs text-neutral-400">
                    {#if req.verificationRequestedAt}
                      {new Date(req.verificationRequestedAt).toLocaleDateString()}
                    {:else if req.createdAt}
                      {new Date(req.createdAt).toLocaleDateString()}
                    {:else}
                      —
                    {/if}
                  </span>
                </Table.Cell>

                <!-- Acciones -->
                <Table.Cell class="text-right">
                  <div class="inline-flex items-center justify-end gap-1.5">
                    {#if !req.isVerifiedArtist}
                      <!-- Aprobar -->
                      <form method="POST" action="?/approve" use:enhance>
                        <input type="hidden" name="userId" value={req.id} />
                        <Button
                          type="submit"
                          size="sm"
                          class="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1 font-medium"
                        >
                          <Check class="w-3 h-3" />
                          Aprobar
                        </Button>
                      </form>

                      <!-- Rechazar -->
                      {#if req.verificationStatus === "pending"}
                        <form method="POST" action="?/reject" use:enhance>
                          <input type="hidden" name="userId" value={req.id} />
                          <Button
                            type="submit"
                            size="sm"
                            variant="destructive"
                            class="h-7 px-2.5 text-xs flex items-center gap-1"
                          >
                            <X class="w-3 h-3" />
                            Rechazar
                          </Button>
                        </form>
                      {/if}
                    {:else}
                      <!-- Revocar -->
                      <form method="POST" action="?/revoke" use:enhance>
                        <input type="hidden" name="userId" value={req.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          class="h-7 px-2.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-950/20 flex items-center gap-1"
                        >
                          <RotateCcw class="w-3 h-3" />
                          Revocar
                        </Button>
                      </form>
                    {/if}
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Root>
</div>
