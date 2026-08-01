<script lang="ts">
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { authSanitizers } from "$lib/utils/sanitization.js";
  import { getTurnstileApi, loadTurnstileApi } from "$lib/utils/turnstile-client.js";

  import { page } from "$app/state";
  import { resolve } from "$app/paths";

  let { data, form } = $props();

  let email = $state("");
  let loading = $state(false);
  let clientError = $state("");
  let turnstileToken = $state("");
  let turnstileContainer = $state<HTMLDivElement | null>(null);
  let turnstileWidgetId: string | null = null;

  function clearTurnstileToken() {
    turnstileToken = "";
  }

  function initializeTurnstileWidget(turnstile: NonNullable<ReturnType<typeof getTurnstileApi>>) {
    if (!turnstileContainer || !data.turnstile?.siteKey) {
      return;
    }

    clearTurnstileToken();

    turnstileWidgetId = turnstile.render(turnstileContainer, {
      sitekey: data.turnstile.siteKey,
      theme: "auto",
      size: "normal",
      callback: (token) => {
        turnstileToken = token;
      },
      "error-callback": clearTurnstileToken,
      "expired-callback": clearTurnstileToken,
    });
  }

  onMount(() => {
    if (!data.turnstile?.enabled || !data.turnstile.siteKey) {
      return;
    }

    let isUnmounted = false;

    loadTurnstileApi()
      .then((turnstile) => {
        if (isUnmounted) {
          return;
        }

        initializeTurnstileWidget(turnstile);
      })
      .catch((error) => {
        console.error("Failed to initialize Turnstile widget:", error);
        clearTurnstileToken();
        clientError = "Unable to load security verification. Please refresh and try again.";
      });

    return () => {
      isUnmounted = true;
      clearTurnstileToken();

      const turnstile = getTurnstileApi();
      if (turnstileWidgetId && turnstile) {
        turnstile.remove(turnstileWidgetId);
      }

      turnstileWidgetId = null;
    };
  });

  // Check for error message from URL params (from expired/invalid tokens)
  const errorParam = page.url.searchParams.get("error");
  const errorMessage = errorParam
    ? authSanitizers.errorMessage(errorParam)
    : null;

  function validateForm() {
    clientError = "";

    const sanitizedEmail = authSanitizers.email(email);
    if (!sanitizedEmail) {
      clientError = "Please enter a valid email address";
      return false;
    }

    if (data.turnstile?.enabled && !turnstileToken) {
      clientError = "Please complete the security verification";
      return false;
    }

    email = sanitizedEmail;
    return true;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" && !loading) {
      event.preventDefault();
      const target = event.target as HTMLElement;
      const form = target?.closest("form") as HTMLFormElement;
      form?.requestSubmit();
    }
  }
</script>

<svelte:head>
  <title>Reset Password - {data.settings.siteName}</title>
  <meta
    name="description"
    content="Reset your password for {data.settings.siteName}"
  />
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-6 bg-muted/20">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center">
      <Card.Title class="text-2xl font-bold">Reset Your Password</Card.Title>
      <Card.Description class="text-muted-foreground">
        Enter your email address and we'll send you a link to reset your
        password.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if errorMessage}
        <div
          class="text-sm text-amber-600 text-center bg-amber-50 p-3 rounded-md border border-amber-200"
        >
          <div class="font-medium mb-1">Token Issue</div>
          <div>{errorMessage}</div>
        </div>
      {/if}

      {#if form?.success}
        <div
          class="text-sm text-green-600 text-center bg-green-50 p-3 rounded-md border border-green-200"
        >
          <div class="font-medium mb-1">Email Sent!</div>
          <div>{authSanitizers.successMessage(form.message)}</div>
        </div>
        <div class="text-center">
          <a href={resolve("/login")} class="text-primary hover:underline text-sm">
            Back to Login
          </a>
        </div>
      {:else}
        <form
          method="POST"
          use:enhance={() => {
            if (!validateForm()) {
              return () => {};
            }

            loading = true;
            return async ({ update }) => {
              await update();
              loading = false;
            };
          }}
          class="space-y-4"
        >
          <div class="space-y-2">
            <Label for="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email address"
              bind:value={email}
              onkeydown={handleKeyDown}
              disabled={loading}
              required
            />
          </div>

          {#if data.turnstile?.enabled}
            <input
              type="hidden"
              name="cf-turnstile-response"
              bind:value={turnstileToken}
            />
          {/if}

          {#if clientError}
            <div
              class="text-sm text-destructive text-center bg-destructive/10 p-2 rounded"
            >
              {authSanitizers.errorMessage(clientError)}
            </div>
          {/if}

          {#if form?.error}
            <div
              class="text-sm text-destructive text-center bg-destructive/10 p-2 rounded"
            >
              {authSanitizers.errorMessage(form.error)}
            </div>
          {/if}

          <Button
            type="submit"
            disabled={loading || !email}
            class="w-full cursor-pointer"
          >
            {loading ? "Sending Reset Link..." : "Send Reset Link"}
          </Button>

          {#if data.turnstile?.enabled && data.turnstile.siteKey}
            <div class="flex justify-center">
              <div bind:this={turnstileContainer}></div>
            </div>
          {/if}
        </form>

        <div class="text-center space-y-2">
          <p class="text-sm text-muted-foreground">
            Remember your password?
            <a
              href={resolve("/login")}
              class="text-primary hover:underline cursor-pointer"
            >
              Go back to Login
            </a>
          </p>
        </div>
      {/if}
    </Card.Content>
    <Card.Footer class="justify-center">
      <p class="text-xs text-muted-foreground text-center">
        Reset links expire after 24 hours for your security.
      </p>
    </Card.Footer>
  </Card.Root>
</div>
