<footer class="fixed bottom-0 w-full flex justify-center items-center h-track-height-md px-4 gap-8 z-50 bg-surface-container-highest dark:bg-surface-container-highest border-t border-outline-variant flex-shrink-0">
  <!-- Display Time -->
  <div class="bg-surface-container-lowest px-4 py-1 rounded border border-outline-variant font-display-time text-display-time text-primary font-mono">
    01:14:32:00
  </div>
  <!-- Transport Controls -->
  <div class="flex items-center gap-4">
    <button class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-variant transition-colors border border-outline-variant">
      <span class="material-symbols-outlined" data-icon="skip_previous">skip_previous</span>
    </button>
    <button class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-tertiary shadow-[0_0_8px_rgba(83,225,111,0.4)] border border-outline-variant hover:bg-surface-variant transition-colors">
      <span class="material-symbols-outlined" data-icon="play_arrow" data-weight="fill" style="font-variation-settings: 'FILL' 1;">play_arrow</span>
    </button>
    <button class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-error hover:bg-surface-variant transition-colors border border-outline-variant">
      <span class="material-symbols-outlined" data-icon="fiber_manual_record" data-weight="fill" style="font-variation-settings: 'FILL' 1;">fiber_manual_record</span>
    </button>
  </div>
  <!-- Metronome & Tempo -->
  <div class="flex items-center gap-6">
    <button class="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
      <span class="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface" data-icon="timer">timer</span>
      <span class="font-mono-label text-mono-label text-on-surface">Metronome</span>
    </button>
    <button class="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
      <span class="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface" data-icon="speed">speed</span>
      <span class="font-mono-label text-mono-label text-on-surface">Tempo</span>
    </button>
    <button class="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
      <span class="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface" data-icon="measure">cloud_upload</span>
      <span class="font-mono-label text-mono-label text-on-surface">Time</span>
    </button>
  </div>
</footer>
