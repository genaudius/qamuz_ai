<script lang="ts">
  import { onMount } from "svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { authClient } from "$lib/auth-client.js";
  import { getContext } from "svelte";
  import * as m from "../../paraglide/messages.js";

  const sessionCtx = getContext<() => any>("session");
  const session = $derived(sessionCtx?.());
  
  let open = $state(false);
  let selectedRole = $state<string>("");
  let portfolioUrl = $state("");
  let isSubmitting = $state(false);
  let agreedTerms = $state(false);

  $effect(() => {
    if (session?.user && session.user.professionalRole === null) {
      open = true;
    } else {
      open = false;
    }
  });

  async function handleSubmit() {
    if (!selectedRole || !agreedTerms) return;
    
    isSubmitting = true;
    try {
      await (authClient as any).updateUser({
        professionalRole: selectedRole,
        portfolioUrl: portfolioUrl || null
      });
      // The session should automatically update via better-auth, or we can reload
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<Dialog.Root bind:open={open}>
  <!-- Prevent closing by clicking outside or pressing Escape -->
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>{m["onboarding.title"]()}</Dialog.Title>
      <Dialog.Description class="pt-2 text-sm leading-relaxed">
        {m["onboarding.description"]()}
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <div class="space-y-2">
        <Label for="role">{m["onboarding.role_label"]()}</Label>
        <Select.Root
          type="single"
          bind:value={selectedRole}
        >
          <Select.Trigger id="role">
            {selectedRole ? (m as any)[`onboarding.roles.${selectedRole}`]() : "Seleccionar..."}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="artist">{m["onboarding.roles.artist"]()}</Select.Item>
            <Select.Item value="producer">{m["onboarding.roles.producer"]()}</Select.Item>
            <Select.Item value="musician">{m["onboarding.roles.musician"]()}</Select.Item>
            <Select.Item value="label">{m["onboarding.role_label"]()}</Select.Item>
            <Select.Item value="none">{m["onboarding.roles.none"]()}</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      
      <div class="space-y-2">
        <Label for="portfolio">{m["onboarding.portfolio_label"]()}</Label>
        <Input id="portfolio" placeholder="https://..." bind:value={portfolioUrl} />
      </div>

      <div class="flex items-start space-x-2 pt-2 border-t mt-2">
        <input type="checkbox" id="terms" bind:checked={agreedTerms} class="w-4 h-4 mt-0.5 text-primary bg-background border-border rounded" />
        <Label for="terms" class="text-xs leading-tight font-normal text-muted-foreground">
          {m["guardrail.liability_label"]()}
        </Label>
      </div>
    </div>

    <Dialog.Footer>
      <Button onclick={handleSubmit} disabled={!selectedRole || !agreedTerms || isSubmitting} class="w-full">
        {#if isSubmitting}
          <span class="animate-pulse">Guardando...</span>
        {:else}
          {m["onboarding.submit"]()}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
