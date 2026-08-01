<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  interface Props extends HTMLAttributes<HTMLDivElement> {
    class?: string;
    children: Snippet;
  }

  let { class: className, children, ...restProps }: Props = $props();
</script>

<div
  class={cn(
    "is-user:dark flex min-w-0 flex-col gap-2 text-md",
    "group-[.is-user]:w-fit group-[.is-user]:overflow-hidden group-[.is-user]:bg-secondary group-[.is-user]:text-foreground group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:px-4 group-[.is-user]:py-3",
    "group-[.is-assistant]:w-full group-[.is-assistant]:min-w-0 group-[.is-assistant]:text-foreground",
    className,
  )}
  {...restProps}
>
  {@render children()}
</div>
