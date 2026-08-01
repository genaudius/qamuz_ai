<script lang="ts">
  import LibraryPanel from "$lib/components/LibraryPanel.svelte";
  
  let { data } = $props();
</script>

<div class="flex h-full w-full pb-24 overflow-hidden relative">
    <!-- Left Main Content (Library List) -->
    <div class="flex-1 overflow-y-auto px-6 py-8 md:px-10 h-[calc(100vh-6rem)]">
        <LibraryPanel songs={data.songs} />
    </div>
</div>
