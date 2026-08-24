<script lang="ts">
  import { goto, invalidateAll, preloadData } from "$app/navigation";
  import { page } from "$app/state";
  import { authClient } from "$lib/auth-client";
  import { toast } from "svelte-sonner";

  // UI Component imports
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import Logo from "$lib/components/Logo.svelte";

  // Icon imports
  import {
    HomeIcon,
    ChevronDownIcon,
    CirclePlusIcon,
    UpgradeIcon,
    AudioLinesIcon,
    ImagesIcon,
    LoginIcon,
    LogOutIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PinIcon,
    SettingsIcon,
    TrashIcon,
    UserIcon,
    GlobeIcon,
    CheckIcon,
    FolderOpenIcon,
  } from "$lib/icons/index.js";
  import GitBranch from "@lucide/svelte/icons/git-branch";
  import LibraryIcon from "@lucide/svelte/icons/library";
  import PanelsTopLeftIcon from "@lucide/svelte/icons/panels-top-left";

  import { getContext } from "svelte";
  import type { ChatState } from "./chat-state.svelte.js";
  import * as m from "$lib/../paraglide/messages.js";
  import {
    getLocale,
    setLocale,
    type Locale,
  } from "$lib/../paraglide/runtime.js";
  import { SETTINGS_DEFAULT_PATH } from "$lib/constants/navigation-loading.js";
  import type { GlobalMusicState } from "$lib/stores/music.svelte.js";
  let { chatState }: { chatState: ChatState } = $props();

  // Get session from context (provided by layout)
  const getSession = getContext<() => App.Session | null>("session");
  const session = $derived(getSession?.() || null);

  const musicState = getContext<GlobalMusicState>("musicState");

  // Focus action for accessibility
  function focus(node: HTMLElement) {
    node.focus();
  }

  // Language switching functions
  const currentLocale = $derived(getLocale());
  let isSigningOut = $state(false);

  function warmRoute(path: string) {
    void preloadData(path);
  }

  function changeLanguage(newLocale: Locale) {
    // Disable automatic reload to prevent flickering
    setLocale(newLocale, { reload: false });

    // Allow a brief moment for the cookie to be set, then reload
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    isSigningOut = true;

    try {
      await authClient.signOut({
        fetchOptions: {
          async onSuccess() {
            await invalidateAll();
          },
          onError(context) {
            console.error("Sign-out failed:", context.error);
            toast.error("Sign out failed. Please try again.");
          },
        },
      });
    } catch (error) {
      console.error("Sign-out failed:", error);
      toast.error("Sign out failed. Please try again.");
    } finally {
      isSigningOut = false;
    }
  }
</script>
{#snippet chatItem(chat: {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  isBranch: boolean;
  createdAt: string;
  updatedAt: string;
})}
  <!-- Normal display mode -->
  <div class="relative group/item">
    <!-- Full-width hover background -->
    <div
      class="absolute inset-0 rounded-md bg-accent/100 transition-opacity {chatState.currentChatId ===
      chat.id
        ? 'opacity-100'
        : 'opacity-0 group-hover/item:opacity-100'}"
    ></div>

    <!-- Content layer -->
    <div class="relative flex items-center">
      <Sidebar.MenuButton
        class="flex-1 text-left py-6 cursor-pointer hover:!bg-transparent min-w-0"
        onclick={() => chatState.loadChat(chat.id)}
      >
        <div class="flex flex-col gap-1 min-w-0">
          <span
            class="font-light text-sm truncate leading-tight flex items-center gap-1"
          >
            {#if chat.isBranch || chat.title.endsWith(" (Branch)")}
              <GitBranch class="w-3 h-3 flex-shrink-0 text-muted-foreground" />
            {/if}
            <span class="truncate">{chat.title}</span>
          </span>
          <div
            class="flex items-center gap-2 text-xs text-muted-foreground leading-tight"
          >
            <span class="truncate">
              {chatState.getModelDisplayName(chat.model)}
            </span>
            <span>•</span>
            <span class="whitespace-nowrap">
              {chatState.formatDate(chat.updatedAt)}
            </span>
          </div>
        </div>
      </Sidebar.MenuButton>

      <!-- Pin button -->
      <Button
        variant="ghost"
        size="sm"
        class="opacity-0 group-hover/item:opacity-100 transition-opacity p-2 h-6 w-6 flex-shrink-0 hover:bg-transparent {chat.pinned
          ? 'text-yellow-600'
          : 'text-muted-foreground'}"
        onclick={(e) => {
          e.stopPropagation();
          chatState.toggleChatPin(chat.id);
        }}
      >
        <PinIcon />
      </Button>

      <!-- 3-dot menu -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="sm"
              class="opacity-0 group-hover/item:opacity-100 transition-opacity p-2 h-6 w-6 flex-shrink-0 hover:!bg-transparent"
              onclick={(e) => e.stopPropagation()}
            >
              <MoreHorizontalIcon />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="right" align="start">
          <DropdownMenu.Item
            class="cursor-pointer"
            onclick={() => chatState.startEditingTitle(chat.id, chat.title)}
          >
            <PencilIcon class="w-4 h-4 mr-2" />
            {m["chat.rename"]()}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            class="cursor-pointer text-destructive focus:text-destructive"
            onclick={() => chatState.startDeleteChat(chat.id)}
          >
            <TrashIcon class="w-4 h-4 mr-2" />
            {m["chat.delete"]()}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>
{/snippet}

<Sidebar.Root collapsible="icon">
  <Sidebar.Header>
    <div class="">
      <!-- Logo Section -->
      <div class="mb-5 mt-1 ml-1 flex items-center gap-2 overflow-hidden h-8 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:justify-center">
        {#if page.data.settings?.sidebarIconUrlDark || page.data.settings?.sidebarIconUrlLight}
          <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            {#if page.data.settings?.sidebarIconUrlDark}
              <img src={page.data.settings.sidebarIconUrlDark} alt="Logo" class="max-w-full max-h-full object-contain hidden dark:block" />
            {/if}
            {#if page.data.settings?.sidebarIconUrlLight}
              <img src={page.data.settings.sidebarIconUrlLight} alt="Logo" class="max-w-full max-h-full object-contain block dark:hidden" />
            {/if}
            <!-- Fallback if one of them is missing -->
            {#if !page.data.settings?.sidebarIconUrlDark && page.data.settings?.sidebarIconUrlLight}
              <img src={page.data.settings.sidebarIconUrlLight} alt="Logo" class="max-w-full max-h-full object-contain hidden dark:block" />
            {/if}
            {#if !page.data.settings?.sidebarIconUrlLight && page.data.settings?.sidebarIconUrlDark}
              <img src={page.data.settings.sidebarIconUrlDark} alt="Logo" class="max-w-full max-h-full object-contain block dark:hidden" />
            {/if}
          </div>
        {:else}
          <div class="flex-shrink-0 w-8 h-8 bg-qamuz-primary rounded-md flex items-center justify-center">
            <span class="text-black font-bold text-xl">Q</span>
          </div>
        {/if}
        <span class="text-xl font-bold tracking-tight whitespace-nowrap group-data-[collapsible=icon]:hidden">{page.data.settings?.siteName || "Qamuz"}</span>
      </div>

      <div
        class="group/home flex items-center p-2 mr-2 gap-2 text-md font-semibold cursor-pointer hover:text-primary transition-colors hover:bg-accent/100 rounded-md group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:justify-center"
        onclick={() => goto("/")}
        onmouseenter={() => warmRoute("/")}
        ontouchstart={() => warmRoute("/")}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goto("/");
          }
        }}
      >
        <HomeIcon
          class="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover/home:scale-110"
        />
        <span class="group-data-[collapsible=icon]:hidden">Home</span>
      </div>

      <!-- New Chat Button -->
      <div
        class="group/newchat flex items-center p-2 mr-2 gap-2 text-md font-semibold cursor-pointer hover:text-primary transition-colors hover:bg-accent/100 rounded-md group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:justify-center"
        onclick={() => chatState.startNewChat()}
        onmouseenter={() => warmRoute("/newchat")}
        ontouchstart={() => warmRoute("/newchat")}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            chatState.startNewChat();
          }
        }}
      >
        <CirclePlusIcon
          class="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover/newchat:scale-110 group-hover/newchat:rotate-8"
        />
        <span class="group-data-[collapsible=icon]:hidden">{m["nav.new_chat"]()}</span>
      </div>

      <!-- Image & Video Button -->
      <div
        class="group/imagevideo flex items-center p-2 mr-2 gap-2 text-md font-semibold cursor-pointer hover:text-primary transition-colors hover:bg-accent/100 rounded-md group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:justify-center"
        onclick={() => goto("/image-video")}
        onmouseenter={() => warmRoute("/image-video")}
        ontouchstart={() => warmRoute("/image-video")}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goto("/image-video");
          }
        }}
      >
        <ImagesIcon
          class="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover/imagevideo:scale-110 group-hover/imagevideo:rotate-4"
        />
        <span class="group-data-[collapsible=icon]:hidden">{m["nav.image_video"]()}</span>
      </div>

      <!-- Audio Button -->
      <div
        class="group/audio flex items-center p-2 mr-2 gap-2 text-md font-semibold cursor-pointer hover:text-primary transition-colors hover:bg-accent/100 rounded-md group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:justify-center"
        onclick={() => { 
          if (musicState) musicState.showLibrary = false;
          goto("/audio");
        }}
        onmouseenter={() => warmRoute("/audio")}
        ontouchstart={() => warmRoute("/audio")}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (musicState) musicState.showLibrary = false;
            goto("/audio");
          }
        }}
      >
        <AudioLinesIcon
          class="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover/audio:scale-110 group-hover/audio:rotate-4"
        />
        <span class="group-data-[collapsible=icon]:hidden">Create Music</span>
      </div>

      <div
        class="group/library flex items-center p-2 mr-2 gap-2 text-md font-semibold cursor-pointer hover:text-primary transition-colors hover:bg-accent/100 rounded-md group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:justify-center"
        onclick={() => goto("/library")}
        onmouseenter={() => warmRoute("/library")}
        ontouchstart={() => warmRoute("/library")}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goto("/library");
          }
        }}
      >
        <LibraryIcon
          class="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover/library:scale-110 group-hover/library:rotate-4"
        />
        <span class="group-data-[collapsible=icon]:hidden">Library</span>
      </div>

      <!-- QAMUZ Studio -->
      <div
        class="group/studio flex items-center p-2 mr-2 gap-2 text-md font-semibold cursor-pointer transition-colors rounded-md group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:justify-center {page.url.pathname === '/studio' ? 'bg-primary/15 text-primary' : 'hover:text-primary hover:bg-accent/100'}"
        onclick={() => goto("/studio")}
        onmouseenter={() => warmRoute("/studio")}
        ontouchstart={() => warmRoute("/studio")}
        role="button"
        tabindex="0"
        aria-current={page.url.pathname === "/studio" ? "page" : undefined}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goto("/studio");
          }
        }}
      >
        <PanelsTopLeftIcon
          class="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover/studio:scale-110"
        />
        <span class="group-data-[collapsible=icon]:hidden">QAMUZ Studio</span>
      </div>

      <hr class="my-2 mr-2 border-border" />

      <!-- Projects Button -->
      <div
        class="group/projects flex items-center p-2 mr-2 gap-2 text-md font-semibold cursor-pointer hover:text-primary transition-colors hover:bg-accent/100 rounded-md group-data-[collapsible=icon]:mr-0 group-data-[collapsible=icon]:justify-center"
        onclick={() => goto("/projects")}
        onmouseenter={() => warmRoute("/projects")}
        ontouchstart={() => warmRoute("/projects")}
        role="button"
        tabindex="0"
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goto("/projects");
          }
        }}
      >
        <FolderOpenIcon
          class="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover/projects:scale-110 group-hover/projects:rotate-4"
        />
        <span class="group-data-[collapsible=icon]:hidden">{m["nav.projects"]()}</span>
      </div>
    </div>
  </Sidebar.Header>
  <Sidebar.Content class="scrollbar-thin">
    <!-- Pinned Chats Section -->
    {#if chatState.pinnedChats.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel class="cursor-default"
          >{m["sidebar.pinned_chats"]()}</Sidebar.GroupLabel
        >
        <Sidebar.GroupContent>
          <Sidebar.Menu class="space-y-1">
            {#each chatState.pinnedChats as chat}
              <Sidebar.MenuItem>
                {#if chatState.editingChatId === chat.id}
                  <!-- Editing mode -->
                  <div class="p-2 bg-accent/50 rounded-md">
                    <input
                      type="text"
                      bind:value={chatState.editingTitle}
                      class="w-full text-sm bg-transparent border-none outline-none p-1 rounded"
                      onkeydown={(e) => {
                        if (e.key === "Enter") {
                          chatState.saveRenamedTitle(chat.id);
                        } else if (e.key === "Escape") {
                          chatState.cancelEditing();
                        }
                      }}
                      {@attach focus}
                    />
                    <div class="flex gap-1 mt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        class="h-6 px-2 text-xs"
                        onclick={() => chatState.saveRenamedTitle(chat.id)}
                      >
                        {m["chat.save"]()}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        class="h-6 px-2 text-xs"
                        onclick={() => chatState.cancelEditing()}
                      >
                        {m["chat.cancel"]()}
                      </Button>
                    </div>
                  </div>
                {:else}
                  {@render chatItem(chat)}
                {/if}
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    <!-- Recent Chats Section -->
    <Sidebar.Group>
      <Sidebar.GroupLabel class="cursor-default"
        >{m["sidebar.recent_chats"]()}</Sidebar.GroupLabel
      >
      <Sidebar.GroupContent>
        <Sidebar.Menu class="space-y-1">
          {#if chatState.recentChats.length === 0 && chatState.pinnedChats.length === 0}
            <div class="p-4 text-center text-sm text-muted-foreground">
              {#each m["sidebar.no_chat_history"]().split("\n") as line}
                {line}<br />
              {/each}
            </div>
          {:else if chatState.recentChats.length === 0}
            <div class="p-4 text-center text-sm text-muted-foreground">
              {#each m["sidebar.all_chats_pinned"]().split("\n") as line}
                {line}<br />
              {/each}
            </div>
          {:else}
            {#each chatState.recentChats as chat}
              <Sidebar.MenuItem>
                {#if chatState.editingChatId === chat.id}
                  <!-- Editing mode -->
                  <div class="p-2 bg-accent/50 rounded-md">
                    <input
                      type="text"
                      bind:value={chatState.editingTitle}
                      class="w-full text-sm bg-transparent border-none outline-none p-1 rounded"
                      onkeydown={(e) => {
                        if (e.key === "Enter") {
                          chatState.saveRenamedTitle(chat.id);
                        } else if (e.key === "Escape") {
                          chatState.cancelEditing();
                        }
                      }}
                      {@attach focus}
                    />
                    <div class="flex gap-1 mt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        class="h-6 px-2 text-xs"
                        onclick={() => chatState.saveRenamedTitle(chat.id)}
                      >
                        {m["chat.save"]()}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        class="h-6 px-2 text-xs"
                        onclick={() => chatState.cancelEditing()}
                      >
                        {m["chat.cancel"]()}
                      </Button>
                    </div>
                  </div>
                {:else}
                  {@render chatItem(chat)}
                {/if}
              </Sidebar.MenuItem>
            {/each}
          {/if}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

  </Sidebar.Content>
  <Sidebar.Footer>
    {#if session?.user}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              class="w-full justify-start mb-2 p-3 h-auto rounded-xl cursor-pointer"
            >
              <div class="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                <div
                  class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"
                >
                  <UserIcon class="w-4 h-4" />
                </div>
                <div class="flex flex-col items-start text-left flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <span class="font-medium text-sm truncate w-full">
                    {session?.user?.name || "User"}
                  </span>
                  <span class="text-xs text-muted-foreground truncate w-full">
                    {session?.user?.email || ""}
                  </span>
                </div>
                <ChevronDownIcon class="w-4 h-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              </div>
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side="top" align="end" class="w-56">
          <DropdownMenu.Item
            onclick={() => goto(SETTINGS_DEFAULT_PATH)}
            onmouseenter={() => warmRoute(SETTINGS_DEFAULT_PATH)}
            ontouchstart={() => warmRoute(SETTINGS_DEFAULT_PATH)}
            class="cursor-pointer"
          >
            <SettingsIcon class="w-4 h-4 mr-2" />
            {m["auth.account_settings"]()}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onclick={() => goto("/pricing")}
            onmouseenter={() => warmRoute("/pricing")}
            ontouchstart={() => warmRoute("/pricing")}
            class="cursor-pointer"
          >
            <UpgradeIcon class="w-4 h-4 mr-2" />
            {m["auth.upgrade_plan"]()}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger class="cursor-pointer">
              <GlobeIcon class="w-4 h-4 mr-2" />
              {m["common.language"]()}
            </DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent side="right" class="w-40">
              <DropdownMenu.Item
                onclick={() => changeLanguage("en")}
                class="cursor-pointer"
              >
                <div class="flex items-center justify-between w-full">
                  <span>{m["common.english"]()}</span>
                  {#if currentLocale === "en"}
                    <CheckIcon class="w-4 h-4 ml-2" />
                  {/if}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => changeLanguage("de")}
                class="cursor-pointer"
              >
                <div class="flex items-center justify-between w-full">
                  <span>{m["common.german"]()}</span>
                  {#if currentLocale === "de"}
                    <CheckIcon class="w-4 h-4 ml-2" />
                  {/if}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => changeLanguage("es")}
                class="cursor-pointer"
              >
                <div class="flex items-center justify-between w-full">
                  <span>{m["common.spanish"]()}</span>
                  {#if currentLocale === "es"}
                    <CheckIcon class="w-4 h-4 ml-2" />
                  {/if}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => changeLanguage("pt")}
                class="cursor-pointer"
              >
                <div class="flex items-center justify-between w-full">
                  <span>{m["common.portuguese"]()}</span>
                  {#if currentLocale === "pt"}
                    <CheckIcon class="w-4 h-4 ml-2" />
                  {/if}
                </div>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onclick={() => changeLanguage("ar")}
                class="cursor-pointer"
              >
                <div class="flex items-center justify-between w-full">
                  <span>{m["common.arabic"]()}</span>
                  {#if currentLocale === "ar"}
                    <CheckIcon class="w-4 h-4 ml-2" />
                  {/if}
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={handleSignOut} class="cursor-pointer">
            <LogOutIcon class="w-4 h-4 mr-2" />
            {m["auth.sign_out"]()}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {:else}
      <Button
        variant="ghost"
        size="sm"
        onclick={() => goto("/login")}
        class="w-full justify-start mb-2 p-5 rounded-xl cursor-pointer"
      >
        {m["auth.sign_in"]()}
        <LoginIcon />
      </Button>
    {/if}
  </Sidebar.Footer>
</Sidebar.Root>
