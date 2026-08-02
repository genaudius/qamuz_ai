<script lang="ts">
  import { enhance } from "$app/forms";
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
  import { UserIcon, PencilIcon, SaveIcon, Music2Icon, ImageIcon } from "$lib/icons/index.js";

  // Get layout data from parent layout
  let { data, form }: { data: any; form: any } = $props();

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
  let artistBio = $state((() => data.artistProfile?.bio || "")());
  let isArtistSubmitting = $state(false);
  let artistSuccessMessage = $state("");
  let artistErrorMessage = $state("");

  // Keep form values synced with loaded user when not editing
  $effect(() => {
    if (!isEditing) {
      nameValue = data.user?.name || "";
      emailValue = data.user?.email || "";
    }
  });

  $effect(() => {
    artistBio = data.artistProfile?.bio || "";
  });

  $effect(() => {
    if (!form) {
      return;
    }

    if (form.success && form.action === "updateArtistProfile") {
      isArtistSubmitting = false;
      artistErrorMessage = "";
      artistSuccessMessage = form.message || "Artist profile updated successfully.";
      invalidateAll();
      return;
    }

    if (form.error && form.action === "updateArtistProfile") {
      isArtistSubmitting = false;
      artistSuccessMessage = "";
      artistErrorMessage = form.error;
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

  <Card.Root class="shadow-none">
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Music2Icon class="w-5 h-5" />
        Artist Profile
      </Card.Title>
      <Card.Description>
        Update the public artist profile shown on your artist page, including avatar, banner artwork and bio.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-5">
      {#if artistSuccessMessage}
        <div class="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
          {artistSuccessMessage}
        </div>
      {/if}

      {#if artistErrorMessage}
        <div class="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {artistErrorMessage}
        </div>
      {/if}

      <form
        method="POST"
        action="?/updateArtistProfile"
        enctype="multipart/form-data"
        class="space-y-6"
        use:enhance={() => {
          isArtistSubmitting = true;
          artistSuccessMessage = "";
          artistErrorMessage = "";
          return async ({ update }) => {
            await update();
          };
        }}
      >
        <div class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div class="space-y-4">
            <div>
              <Label class="text-sm font-semibold text-foreground mb-2 block">Current avatar</Label>
              <div class="h-36 w-36 overflow-hidden rounded-full border bg-muted/40">
                {#if data.user?.image}
                  <img src={data.user.image} alt="Artist avatar" class="h-full w-full object-cover" />
                {:else}
                  <div class="flex h-full w-full items-center justify-center text-muted-foreground">
                    <UserIcon class="w-10 h-10" />
                  </div>
                {/if}
              </div>
            </div>

            <div>
              <Label for="avatar" class="text-sm font-semibold text-foreground mb-2 block">Upload avatar</Label>
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                disabled={isArtistSubmitting || data.isDemoMode}
              />
              <p class="mt-2 text-xs text-muted-foreground">Square image recommended. Max size 10MB.</p>
            </div>
          </div>

          <div class="space-y-5">
            <div class="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Your artist name is the same as your account name above. This section manages your public bio and artwork only.
            </div>

            <div class="space-y-2">
              <Label for="bio" class="text-sm font-semibold text-foreground">Artist bio</Label>
              <textarea
                id="bio"
                name="bio"
                bind:value={artistBio}
                rows="6"
                placeholder="Describe your sound, influences and what listeners should know about you."
                disabled={isArtistSubmitting || data.isDemoMode}
                class="w-full rounded-lg border bg-muted/50 px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
              ></textarea>
            </div>

            <div class="space-y-3">
              <div>
                <Label class="text-sm font-semibold text-foreground mb-2 block">Current banner</Label>
                <div class="aspect-[16/6] overflow-hidden rounded-2xl border bg-muted/40">
                  {#if data.artistProfile?.bannerUrl}
                    <img src={data.artistProfile.bannerUrl} alt="Artist banner" class="h-full w-full object-cover" />
                  {:else}
                    <div class="flex h-full w-full items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon class="w-5 h-5" />
                      <span>No banner uploaded yet</span>
                    </div>
                  {/if}
                </div>
              </div>

              <div>
                <Label for="banner" class="text-sm font-semibold text-foreground mb-2 block">Upload banner</Label>
                <Input
                  id="banner"
                  name="banner"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  disabled={isArtistSubmitting || data.isDemoMode}
                />
                <p class="mt-2 text-xs text-muted-foreground">Wide artwork works best here. Max size 10MB.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={isArtistSubmitting || data.isDemoMode}
            class="cursor-pointer flex items-center gap-2"
          >
            <SaveIcon class="w-4 h-4" />
            {isArtistSubmitting
              ? "Saving artist profile..."
              : data.isDemoMode
                ? "Demo Mode - Read Only"
                : "Save Artist Profile"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onclick={() => (window.location.href = "/artist")}
            class="cursor-pointer"
          >
            View Artist Page
          </Button>
        </div>
      </form>
    </Card.Content>
  </Card.Root>
</div>
