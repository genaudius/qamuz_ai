<script lang="ts">
	import { getAttachmentsContext } from "./attachments-context.svelte.js";
	import PromptInputActionMenuItem from "./PromptInputActionMenuItem.svelte";
	import { PaperclipIcon } from "$lib/icons/index.js";

	interface Props {
		label?: string;
		class?: string;
		disabled?: boolean;
		title?: string;
	}

	let {
		label = "Add photos or files",
		class: className,
		disabled = false,
		...props
	}: Props = $props();

	let attachments = getAttachmentsContext();

	let handleSelect = (e: Event) => {
		if (disabled) {
			e.preventDefault();
			return;
		}
		e.preventDefault();
		attachments.openFileDialog();
	};
</script>

<PromptInputActionMenuItem class={className} onSelect={handleSelect} {disabled} {...props}>
	<PaperclipIcon class="mr-2 size-4" />
	{label}
</PromptInputActionMenuItem>
