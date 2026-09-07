import { GlobalMusicState } from "$lib/stores/music.svelte.js";

/**
 * Shared client music player state.
 * Using a module singleton avoids getContext/HMR drift that left the footer
 * player on a stale empty instance while the rest of the app played audio.
 */
export const musicState = new GlobalMusicState();
