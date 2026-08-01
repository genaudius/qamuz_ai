<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import * as Card from "$lib/components/ui/card/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { authClient } from "$lib/auth-client";
  import { validateEmailForAuth } from "$lib/utils/email-validation.js";
  import { authSanitizers } from "$lib/utils/sanitization.js";
  import * as m from "$lib/../paraglide/messages.js";

  // Import icons
  import { UserIcon, PencilIcon, SaveIcon } from "$lib/icons/index.js";

  // Get layout data from parent layout
  let { data } = $props();

  // Form state
  let isEditing = $state(false);
  let isSubmitting = $state(false);
  let nameValue = $state((() => data.user?.name || "")());
  let emailValue = $state((() => data.user?.email || "")());
  let successMessage = $state(
    page.url.searchParams.get("emailChanged")
      ? "Email change completed successfully."
      : ""
  );
  let errorMessage = $state(
    page.url.searchParams.get("error")
      ? "Email verification failed. Please try changing your email again."
      : ""
  );

  // Keep form values synced with loaded user when not editing
  $effect(() => {
    if (!isEditing) {
      nameValue = data.user?.name || "";
      emailValue = data.user?.email || "";
    }
  });

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault();

    if (data.isDemoMode) {
      errorMessage = "Profile editing is disabled in demo mode.";
      return;
    }

    isSubmitting = true;
    successMessage = "";
    errorMessage = "";

    try {
      const sanitizedName = authSanitizers.displayName(nameValue).trim();

      if (!sanitizedName) {
        errorMessage = "Name is required";
        return;
      }

      const emailValidation = validateEmailForAuth(emailValue);
      if (!emailValidation.isValid) {
        errorMessage = emailValidation.errors[0] || "Please enter a valid email address";
        return;
      }

      const normalizedEmail = emailValidation.normalizedEmail;
      const currentName = data.user?.name || "";
      const currentEmail = data.user?.email || "";
      const nameChanged = sanitizedName !== currentName;
      const emailChanged = normalizedEmail !== currentEmail;

      if (!nameChanged && !emailChanged) {
        successMessage = "No changes to save.";
        isEditing = false;
        return;
      }

      if (nameChanged) {
        const { error: updateError } = await authClient.updateUser({
          name: sanitizedName,
        });

        if (updateError) {
          errorMessage =
            authSanitizers.errorMessage(updateError.message) ||
            "Failed to update your profile. Please try again.";
          return;
        }
      }

      if (emailChanged) {
        const { error: changeEmailError } = await authClient.changeEmail({
          newEmail: normalizedEmail,
          callbackURL: "/settings/profile?emailChanged=1",
        });

        if (changeEmailError) {
          errorMessage =
            authSanitizers.errorMessage(changeEmailError.message) ||
            "Failed to start email change. Please try again.";
          return;
        }
      }

      await invalidateAll();

      isEditing = false;
      if (emailChanged) {
        successMessage = data.user?.emailVerified
          ? "Profile updated. Please check your new email to complete the email change."
          : "Profile updated. Your email was changed immediately and marked unverified; please check your inbox to verify it.";
      } else {
        successMessage = "Profile updated successfully.";
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      errorMessage = "Failed to update profile. Please try again.";
    } finally {
      isSubmitting = false;
    }
  }

  function cancelEdit() {
    isEditing = false;
    nameValue = data.user?.name || "";
    emailValue = data.user?.email || "";
    errorMessage = "";
    successMessage = "";
  }
</script>

<svelte:head>
  <title>{m["profile.page_title"]()}</title>
</svelte:head>

<div class="space-y-3">
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
            Profile editing is disabled. This is a read-only demonstration.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Success Message -->
  {#if successMessage}
    <div
      class="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md"
    >
      {authSanitizers.successMessage(successMessage)}
    </div>
  {/if}

  <!-- Error Message -->
  {#if errorMessage}
    <div
      class="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
    >
      {authSanitizers.errorMessage(errorMessage)}
    </div>
  {/if}

  <!-- Profile Information -->
  <Card.Root class="shadow-none">
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <UserIcon class="w-5 h-5" />
        {m["profile.information"]()}
      </Card.Title>
      <Card.Description>{m["profile.basic_details"]()}</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if isEditing}
        <!-- Edit Form -->
        <form
          onsubmit={saveProfile}
          class="space-y-6"
        >
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-2">
              <Label for="name" class="text-sm font-semibold text-foreground"
                >{m["profile.name"]()}</Label
              >
              <Input
                id="name"
                name="name"
                bind:value={nameValue}
                placeholder={m["profile.enter_name"]()}
                required
                disabled={data.isDemoMode}
                class="h-12 px-4 bg-muted/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <div class="space-y-2">
              <Label for="email" class="text-sm font-semibold text-foreground"
                >{m["profile.email"]()}</Label
              >
              <Input
                id="email"
                name="email"
                type="email"
                bind:value={emailValue}
                placeholder={m["profile.enter_email"]()}
                required
                disabled={data.isDemoMode}
                class="h-12 px-4 bg-muted/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>

          <div class="flex gap-2 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting || data.isDemoMode}
              class="cursor-pointer flex items-center gap-2"
            >
              <SaveIcon class="w-4 h-4" />
              {isSubmitting
                ? m["profile.saving"]()
                : data.isDemoMode
                  ? "Demo Mode - Read Only"
                  : m["profile.save_changes"]()}
            </Button>
            <Button
              type="button"
              variant="outline"
              onclick={cancelEdit}
              disabled={isSubmitting}
              class="cursor-pointer"
            >
              {m["profile.cancel"]()}
            </Button>
          </div>
        </form>
      {:else}
        <!-- Read-only View -->
        <div class="grid gap-6 md:grid-cols-2">
          <div>
            <span class="text-sm font-semibold text-foreground mb-2 block"
              >{m["profile.name"]()}</span
            >
            <div
              class="text-sm h-12 px-4 bg-muted/50 border rounded-lg text-foreground flex items-center"
            >
              {data.user?.name || m["profile.not_provided"]()}
            </div>
          </div>
          <div>
            <span class="text-sm font-semibold text-foreground mb-2 block"
              >{m["profile.email"]()}</span
            >
            <div
              class="text-sm h-12 px-4 bg-muted/50 border rounded-lg text-foreground flex items-center"
            >
              {data.user?.email || m["profile.not_provided"]()}
            </div>
          </div>
        </div>

        <div>
          <span class="text-sm font-semibold text-foreground mb-2 block"
            >{m["profile.user_id"]()}</span
          >
          <div
            class="text-sm font-mono h-12 px-4 bg-muted/50 border-0 rounded-lg text-muted-foreground select-all flex items-center"
          >
            {data.user?.id || m["profile.not_available"]()}
          </div>
        </div>

        <div>
          <span class="text-sm font-semibold text-foreground mb-2 block"
            >{m["profile.date_joined"]()}</span
          >
          <div
            class="text-sm h-12 px-4 bg-muted/50 border-0 rounded-lg text-muted-foreground flex items-center"
          >
            {data.user?.createdAt
              ? new Date(data.user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : m["profile.not_available"]()}
          </div>
        </div>

        <div class="pt-4 border-t">
          <Button
            variant="outline"
            onclick={() => (isEditing = true)}
            disabled={data.isDemoMode}
            class="cursor-pointer flex items-center gap-2"
          >
            <PencilIcon class="w-4 h-4" />
            {m["profile.edit_profile"]()}
          </Button>
          {#if data.isDemoMode}
            <p class="text-xs text-muted-foreground mt-2">
              Profile editing is disabled in demo mode.
            </p>
          {/if}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
