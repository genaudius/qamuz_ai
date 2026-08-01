<script lang="ts">
	import { cn } from "$lib/utils";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

	interface Props {
		class?: string;
		children?: import("svelte").Snippet;
		onSelect?: (event: Event) => void;
		disabled?: boolean;
		title?: string;
	}

	let { class: className, children, onSelect, disabled = false, ...props }: Props = $props();
</script>

<DropdownMenu.Item class={cn(className)} {onSelect} {disabled} {...props}>
	{#if children}
		{@render children()}
	{/if}
</DropdownMenu.Item>
