<script lang="ts">
  import type { ActionData, PageData } from "./$types";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { enhance } from "$app/forms";

  // Import icons
  import {
    BrainIcon,
    CheckCircleIcon,
    ExternalLinkIcon,
    EyeIcon,
    EyeOffIcon,
  } from "$lib/icons/index.js";

  let { form, data }: { form: ActionData | null | undefined; data: PageData } =
    $props();

  // Form state
  let isSubmitting = $state(false);
  let showOpenRouterKey = $state(false);
  let showReplicateKey = $state(false);
  let genaudiusModalUrl = $state(data.settings.genaudiusModalUrl);
  let genaudiusModalToken = $state(data.settings.genaudiusModalToken);
  let genaudiusRunpodUrl = $state(data.settings.genaudiusRunpodUrl);
  let genaudiusRunpodToken = $state(data.settings.genaudiusRunpodToken);
  let showGenAudiusModalToken = $state(false);
  let showGenAudiusRunpodToken = $state(false);
  let showSunoKey = $state(false);
  let showMusicGptKey = $state(false);

  // Reactive form values - initialize from server-loaded settings
  let openrouterApiKey = $state(
    (() => data.settings?.openrouterApiKey || "")(),
  );
  let replicateApiKey = $state((() => data.settings?.replicateApiKey || "")());
  let elevenlabsApiKey = $state(
    (() => data.settings?.elevenlabsApiKey || "")(),
  );
  let sunoApiKey = $state((() => data.settings?.sunoApiKey || "")());
  let musicgptApiKey = $state((() => data.settings?.musicgptApiKey || "")());
  let localMusicEnabled = $state((() => data.settings?.localMusicEnabled || false)());
  let localMusicBaseUrl = $state((() => data.settings?.localMusicBaseUrl || "http://localhost:42003")());
  let localImageEnabled = $state((() => data.settings?.localImageEnabled || false)());
  let localImageBaseUrl = $state((() => data.settings?.localImageBaseUrl || "http://127.0.0.1:7860")());
  let localVideoEnabled = $state((() => data.settings?.localVideoEnabled || false)());
  let localVideoBaseUrl = $state((() => data.settings?.localVideoBaseUrl || "http://127.0.0.1:42005")());

  // Derived display values for password fields
  $effect(() => {
    const settings = data.settings;
    openrouterApiKey = settings?.openrouterApiKey || "";
    replicateApiKey = settings?.replicateApiKey || "";
    elevenlabsApiKey = settings?.elevenlabsApiKey || "";
    sunoApiKey = settings?.sunoApiKey || "";
    musicgptApiKey = settings?.musicgptApiKey || "";
    localMusicEnabled = settings?.localMusicEnabled || false;
    localMusicBaseUrl = settings?.localMusicBaseUrl || "http://localhost:42003";
    localImageEnabled = settings?.localImageEnabled || false;
    localImageBaseUrl = settings?.localImageBaseUrl || "http://127.0.0.1:7860";
    localVideoEnabled = settings?.localVideoEnabled || false;
    localVideoBaseUrl = settings?.localVideoBaseUrl || "http://127.0.0.1:42005";
  });

  // Check if providers are configured
  function isOpenRouterConfigured() {
    return openrouterApiKey;
  }

  function isReplicateConfigured() {
    return replicateApiKey;
  }

  let isGenAudiusModalConfigured = $derived(
    genaudiusModalUrl.length > 0 && genaudiusModalToken.length > 0
  );
  let isGenAudiusRunpodConfigured = $derived(
    genaudiusRunpodUrl.length > 0 && genaudiusRunpodToken.length > 0
  );

  function isElevenLabsConfigured() {
    return elevenlabsApiKey;
  }

  function isSunoConfigured() {
    return sunoApiKey;
  }

  function isMusicGptConfigured() {
    return musicgptApiKey;
  }
</script>

<svelte:head>
  <title>AI Models - Admin Settings</title>
</svelte:head>

<div class="space-y-4">
  <!-- Demo Mode Banner -->
  {#if data.isDemoMode}
    <div
      class="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md"
    >
      <div class="flex items-center gap-2">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </div>
        <div>
          <p class="font-medium">Demo Mode Active</p>
          <p class="text-sm">
            All modifications are disabled. This is a read-only demonstration of
            the admin interface.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Page Header -->
  <div>
    <h1 class="text-xl font-semibold tracking-tight flex items-center gap-2">
      <BrainIcon class="w-6 h-6" />
      AI Models Configuration
    </h1>
    <p class="text-muted-foreground">
      Configure local development models and optional external AI providers.
    </p>
  </div>

  <!-- Form -->
  <form
    method="POST"
    action="?/update"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
    class="space-y-6"
  >
    <!-- Error Message -->
    {#if form?.error}
      <div
        class="p-3 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-md"
      >
        {form.error}
      </div>
    {/if}

    <!-- Success Message -->
    {#if form?.success}
      <div
        class="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md"
      >
        AI model settings updated successfully!
      </div>
    {/if}

    <!-- OpenRouter Configuration -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div>
            <Card.Title class="flex items-center gap-2">
              <div
                class="w-6 h-6 bg-orange-500 rounded flex items-center justify-center"
              >
                <span class="text-white text-xs font-bold">OR</span>
              </div>
              OpenRouter
              {#if isOpenRouterConfigured()}
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
              {/if}
            </Card.Title>
            <Card.Description
              >Unified API for all text generation models</Card.Description
            >
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 class="font-medium text-gray-800 mb-2">Setup Instructions:</h4>
          <ol class="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>
              Go to <a
                href="https://openrouter.ai/"
                target="_blank"
                class="underline inline-flex items-center gap-1"
                >OpenRouter.ai <ExternalLinkIcon class="w-3 h-3" /></a
              >
            </li>
            <li>Sign up or log in to your account</li>
            <li>Navigate to "Keys" in your dashboard</li>
            <li>Create a new API key</li>
            <li>Copy the key and paste it below</li>
          </ol>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="openrouterApiKey">OpenRouter API Key</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onclick={() => (showOpenRouterKey = !showOpenRouterKey)}
              class="h-auto p-1"
              disabled={data.isDemoMode}
            >
              {#if showOpenRouterKey}
                <EyeOffIcon class="w-4 h-4" />
              {:else}
                <EyeIcon class="w-4 h-4" />
              {/if}
            </Button>
          </div>
          <Input
            id="openrouterApiKey"
            name="openrouterApiKey"
            type={showOpenRouterKey ? "text" : "password"}
            placeholder="sk-or-..."
            bind:value={openrouterApiKey}
            class="font-mono"
            disabled={data.isDemoMode}
          />
          <p class="text-xs text-muted-foreground">
            Enables access to 40+ text models including GPT, Claude, Gemini,
            Grok, DeepSeek, Qwen, Kimi, GLM, Llama, and more...
          </p>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Replicate Configuration -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div>
            <Card.Title class="flex items-center gap-2">
              <div
                class="w-6 h-6 bg-purple-600 rounded flex items-center justify-center"
              >
                <span class="text-white text-xs font-bold">R</span>
              </div>
              Replicate
              {#if isReplicateConfigured()}
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
              {/if}
            </Card.Title>
            <Card.Description
              >Unified API for all image and video generation models</Card.Description
            >
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 class="font-medium text-gray-800 mb-2">Setup Instructions:</h4>
          <ol class="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>
              Go to <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                class="underline inline-flex items-center gap-1"
                >Replicate API Tokens <ExternalLinkIcon class="w-3 h-3" /></a
              >
            </li>
            <li>Sign up or log in to your account</li>
            <li>Create a new API token</li>
            <li>Copy the token and paste it below</li>
          </ol>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="replicateApiKey">Replicate API Token</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onclick={() => (showReplicateKey = !showReplicateKey)}
              class="h-auto p-1"
              disabled={data.isDemoMode}
            >
              {#if showReplicateKey}
                <EyeOffIcon class="w-4 h-4" />
              {:else}
                <EyeIcon class="w-4 h-4" />
              {/if}
            </Button>
          </div>
          <Input
            id="replicateApiKey"
            name="replicateApiKey"
            type={showReplicateKey ? "text" : "password"}
            placeholder="r8_..."
            bind:value={replicateApiKey}
            class="font-mono"
            disabled={data.isDemoMode}
          />
          <p class="text-xs text-muted-foreground">
            Enables access to 64+ image and video models including Sora, Veo,
            Imagen, Flux, Stable Diffusion, LeonardoAI, Kling, and more...
          </p>
          <p class="text-xs text-muted-foreground">
            <span class="font-bold">IMPORTANT:</span> In order to use media
            generation models or make the file upload functionality work in
            general, you will need to integrate
            <a
              class="underline font-bold"
              href="/admin/settings/cloud-storage"
              data-sveltekit-preload-data="tap">Cloud Storage</a
            > first. Cloud Storage is required since Local Storage cannot be used
            if the app is hosted on a serverless platform (e.g. Vercel).
          </p>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- ElevenLabs Configuration -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div>
            <Card.Title class="flex items-center gap-2">
              <div
                class="w-6 h-6 bg-black rounded flex items-center justify-center"
              >
                <span class="text-white text-xs font-bold">XI</span>
              </div>
              ElevenLabs
              {#if isElevenLabsConfigured()}
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
              {/if}
            </Card.Title>
            <Card.Description
              >Text-to-speech API for high-quality voice synthesis</Card.Description
            >
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 class="font-medium text-gray-800 mb-2">Setup Instructions:</h4>
          <ol class="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>
              Go to <a
                href="https://elevenlabs.io/app/settings/api-keys"
                target="_blank"
                class="underline inline-flex items-center gap-1"
                >ElevenLabs API Keys <ExternalLinkIcon class="w-3 h-3" /></a
              >
            </li>
            <li>Sign up or log in to your account</li>
            <li>Create a new API key or copy your existing key</li>
            <li>Paste the key below</li>
          </ol>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="elevenlabsApiKey">ElevenLabs API Key</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onclick={() => (showElevenLabsKey = !showElevenLabsKey)}
              class="h-auto p-1"
              disabled={data.isDemoMode}
            >
              {#if showElevenLabsKey}
                <EyeOffIcon class="w-4 h-4" />
              {:else}
                <EyeIcon class="w-4 h-4" />
              {/if}
            </Button>
          </div>
          <Input
            id="elevenlabsApiKey"
            name="elevenlabsApiKey"
            type={showElevenLabsKey ? "text" : "password"}
            placeholder="xi-..."
            bind:value={elevenlabsApiKey}
            class="font-mono"
            disabled={data.isDemoMode}
          />
          <p class="text-xs text-muted-foreground">
            Enables access to ElevenLabs text-to-speech models including
            Multilingual v2, Flash v2.5, Turbo v2.5, and more. Supports 29
            voices.
          </p>
        </div>
      </Card.Content>
    </Card.Root>



    <!-- GenAudius Configuration -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div>
            <Card.Title class="flex items-center gap-2">
              GenAudius Serverless Infrastructure
              {#if isGenAudiusModalConfigured || isGenAudiusRunpodConfigured}
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
              {/if}
            </Card.Title>
            <Card.Description>Manage API keys and Endpoint URLs for Modal and RunPod serverless deployments.</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-6">
        
        <!-- Modal Serverless -->
        <div class="space-y-4">
          <h4 class="font-medium text-gray-800 flex items-center gap-2">
            Modal (Primary)
            {#if isGenAudiusModalConfigured}
              <CheckCircleIcon class="w-4 h-4 text-green-500" />
            {/if}
          </h4>
          <div class="space-y-2">
            <Label for="genaudiusModalUrl">Modal Endpoint URL</Label>
            <Input
              id="genaudiusModalUrl"
              name="genaudiusModalUrl"
              type="text"
              placeholder="https://your-workspace--genaudius-v1-api-app.modal.run"
              bind:value={genaudiusModalUrl}
              disabled={data.isDemoMode}
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="genaudiusModalToken">Modal App Token (Secret)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onclick={() => (showGenAudiusModalToken = !showGenAudiusModalToken)}
                class="h-auto p-1"
                disabled={data.isDemoMode}
              >
                {#if showGenAudiusModalToken}
                  <EyeOffIcon class="w-4 h-4" />
                {:else}
                  <EyeIcon class="w-4 h-4" />
                {/if}
              </Button>
            </div>
            <Input
              id="genaudiusModalToken"
              name="genaudiusModalToken"
              type={showGenAudiusModalToken ? "text" : "password"}
              placeholder="modal_api_token"
              bind:value={genaudiusModalToken}
              class="font-mono"
              disabled={data.isDemoMode}
            />
          </div>
        </div>

        <Separator />

        <!-- RunPod Serverless -->
        <div class="space-y-4">
          <h4 class="font-medium text-gray-800 flex items-center gap-2">
            RunPod (Failover)
            {#if isGenAudiusRunpodConfigured}
              <CheckCircleIcon class="w-4 h-4 text-green-500" />
            {/if}
          </h4>
          <div class="space-y-2">
            <Label for="genaudiusRunpodUrl">RunPod Endpoint URL</Label>
            <Input
              id="genaudiusRunpodUrl"
              name="genaudiusRunpodUrl"
              type="text"
              placeholder="https://api.runpod.ai/v2/your_endpoint_id"
              bind:value={genaudiusRunpodUrl}
              disabled={data.isDemoMode}
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label for="genaudiusRunpodToken">RunPod API Key (Secret)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onclick={() => (showGenAudiusRunpodToken = !showGenAudiusRunpodToken)}
                class="h-auto p-1"
                disabled={data.isDemoMode}
              >
                {#if showGenAudiusRunpodToken}
                  <EyeOffIcon class="w-4 h-4" />
                {:else}
                  <EyeIcon class="w-4 h-4" />
                {/if}
              </Button>
            </div>
            <Input
              id="genaudiusRunpodToken"
              name="genaudiusRunpodToken"
              type={showGenAudiusRunpodToken ? "text" : "password"}
              placeholder="runpod_api_key"
              bind:value={genaudiusRunpodToken}
              class="font-mono"
              disabled={data.isDemoMode}
            />
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Local music configuration -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <Card.Title class="flex items-center gap-2">
              Local Music (Pinokio)
              {#if localMusicEnabled}
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
              {/if}
            </Card.Title>
            <Card.Description>
              Use the local music engine for development and testing.
            </Card.Description>
          </div>
          <label class="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="localMusicEnabled"
              bind:checked={localMusicEnabled}
              disabled={data.isDemoMode}
              class="h-4 w-4 rounded border-gray-300"
            />
            Enabled
          </label>
        </div>
      </Card.Header>
      <Card.Content class="space-y-3">
        <div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          When enabled, music jobs run only on the local engine. External music APIs are never used as fallback.
        </div>
        <div class="space-y-2">
          <Label for="localMusicBaseUrl">Local API URL</Label>
          <Input
            id="localMusicBaseUrl"
            name="localMusicBaseUrl"
            type="url"
            bind:value={localMusicBaseUrl}
            placeholder="http://localhost:42003"
            disabled={data.isDemoMode}
          />
          <p class="text-xs text-muted-foreground">
            Use the ready URL reported by Pinokio for ACE-Step Studio.
          </p>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <Card.Title class="flex items-center gap-2">
              Local Image (Pinokio)
              {#if localImageEnabled}<CheckCircleIcon class="w-4 h-4 text-green-500" />{/if}
            </Card.Title>
            <Card.Description>Generate and store images using the local GPU.</Card.Description>
          </div>
          <label class="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="localImageEnabled" bind:checked={localImageEnabled} disabled={data.isDemoMode} class="h-4 w-4 rounded border-gray-300" />
            Enabled
          </label>
        </div>
      </Card.Header>
      <Card.Content class="space-y-3">
        <div class="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          When enabled, image jobs use only the local engine and are saved in the Qamuz library.
        </div>
        <div class="space-y-2">
          <Label for="localImageBaseUrl">Local API URL</Label>
          <Input id="localImageBaseUrl" name="localImageBaseUrl" type="url" bind:value={localImageBaseUrl} placeholder="http://127.0.0.1:7860" disabled={data.isDemoMode} />
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between gap-4">
          <div>
            <Card.Title class="flex items-center gap-2">
              Local Video (Pinokio)
              {#if localVideoEnabled}<CheckCircleIcon class="w-4 h-4 text-green-500" />{/if}
            </Card.Title>
            <Card.Description>Generate videos locally after the video service is connected.</Card.Description>
          </div>
          <label class="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="localVideoEnabled" bind:checked={localVideoEnabled} disabled={data.isDemoMode} class="h-4 w-4 rounded border-gray-300" />
            Enabled
          </label>
        </div>
      </Card.Header>
      <Card.Content class="space-y-3">
        <div class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Keep this disabled until the local video URL has been detected and verified.
        </div>
        <div class="space-y-2">
          <Label for="localVideoBaseUrl">Local API URL</Label>
          <Input id="localVideoBaseUrl" name="localVideoBaseUrl" type="url" bind:value={localVideoBaseUrl} placeholder="http://127.0.0.1:42005" disabled={data.isDemoMode} />
        </div>
      </Card.Content>
    </Card.Root>

<!-- Suno Configuration -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center justify-between">
          <div>
            <Card.Title class="flex items-center gap-2">
              <div
                class="w-6 h-6 bg-green-600 rounded flex items-center justify-center"
              >
                <span class="text-white text-xs font-bold">SU</span>
              </div>
              Suno
              {#if isSunoConfigured()}
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
              {/if}
            </Card.Title>
            <Card.Description
              >AI music generation — create songs from text prompts</Card.Description
            >
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 class="font-medium text-gray-800 mb-2">Setup Instructions:</h4>
          <ol class="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>
              Go to <a
                href="https://kie.ai"
                target="_blank"
                class="underline inline-flex items-center gap-1"
                >kie.ai <ExternalLinkIcon class="w-3 h-3" /></a
              >
            </li>
            <li>Sign up or log in to your account</li>
            <li>Navigate to API Keys in your dashboard</li>
            <li>Create a new API key and copy it</li>
            <li>Paste the key below</li>
          </ol>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="sunoApiKey">Suno API Key</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onclick={() => (showSunoKey = !showSunoKey)}
              class="h-auto p-1"
              disabled={data.isDemoMode}
            >
              {#if showSunoKey}
                <EyeOffIcon class="w-4 h-4" />
              {:else}
                <EyeIcon class="w-4 h-4" />
              {/if}
            </Button>
          </div>
          <Input
            id="sunoApiKey"
            name="sunoApiKey"
            type={showSunoKey ? "text" : "password"}
            placeholder="kie-..."
            bind:value={sunoApiKey}
            class="font-mono"
            disabled={data.isDemoMode}
          />
          <p class="text-xs text-muted-foreground">
            Enables access to Suno music generation models: V3.5, V4, V4.5,
            V4.5 Plus, V4.5 All, V5, and V5.5.
          </p>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- MusicGPT Card -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <Card.Title class="flex items-center gap-2">
              <div
                class="w-8 h-8 bg-purple-600 rounded-md flex items-center justify-center flex-shrink-0"
              >
                <span class="text-white text-xs font-bold">MG</span>
              </div>
              MusicGPT
              {#if isMusicGptConfigured()}
                <CheckCircleIcon class="w-4 h-4 text-green-500" />
              {/if}
            </Card.Title>
            <Card.Description
              >AI music generation — create songs using MusicGPT API</Card.Description
            >
          </div>
        </div>
      </Card.Header>
      <Card.Content class="space-y-4">
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <h4 class="font-medium text-gray-800 mb-2">Setup Instructions:</h4>
          <ol class="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>
              Go to <a
                href="https://musicgpt.com"
                target="_blank"
                class="underline inline-flex items-center gap-1"
                >musicgpt.com <ExternalLinkIcon class="w-3 h-3" /></a
              >
            </li>
            <li>Navigate to the API section to get your key</li>
            <li>Paste the key below</li>
          </ol>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for="musicgptApiKey">MusicGPT API Key</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onclick={() => (showMusicGptKey = !showMusicGptKey)}
              class="h-auto p-1"
              disabled={data.isDemoMode}
            >
              {#if showMusicGptKey}
                <EyeOffIcon class="w-4 h-4" />
              {:else}
                <EyeIcon class="w-4 h-4" />
              {/if}
            </Button>
          </div>
          <Input
            id="musicgptApiKey"
            name="musicgptApiKey"
            type={showMusicGptKey ? "text" : "password"}
            placeholder="musicgpt-..."
            bind:value={musicgptApiKey}
            class="font-mono"
            disabled={data.isDemoMode}
          />
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Submit Button -->
    <div class="space-y-2">
      <div class="flex justify-end">
        <Button type="submit" disabled={isSubmitting || data.isDemoMode}>
          {isSubmitting
            ? "Saving..."
            : data.isDemoMode
              ? "Demo Mode - Read Only"
              : "Save AI Model Settings"}
        </Button>
      </div>
      {#if data.isDemoMode}
        <p class="text-xs text-muted-foreground text-right">
          Saving is disabled in demo mode. This is a read-only demonstration.
        </p>
      {/if}
    </div>
  </form>
</div>
