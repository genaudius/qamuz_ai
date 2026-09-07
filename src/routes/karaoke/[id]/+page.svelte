<script lang="ts">
  import KaraokePage from "$lib/components/KaraokePage.svelte";

  let { data } = $props();
</script>

<KaraokePage musicId={data.musicId} />
