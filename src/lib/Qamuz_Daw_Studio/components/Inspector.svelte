<aside class="w-[240px] h-full bg-surface-container-low dark:bg-surface-container-low border-r border-outline-variant flex flex-col flex-shrink-0 z-40 overflow-y-auto">
  <!-- Context Tabs -->
  <div class="flex border-b border-outline-variant bg-surface-container-highest">
    <button class="flex-1 py-2 font-label-xs text-label-xs text-primary border-b-2 border-primary bg-surface-variant text-center"><span class="material-symbols-outlined text-[16px] block mb-1">info</span>Inspector</button>
    <button class="flex-1 py-2 font-label-xs text-label-xs text-on-surface-variant hover:bg-surface-variant transition-colors text-center"><span class="material-symbols-outlined text-[16px] block mb-1">folder_open</span>Browser</button>
    <button class="flex-1 py-2 font-label-xs text-label-xs text-on-surface-variant hover:bg-surface-variant transition-colors text-center"><span class="material-symbols-outlined text-[16px] block mb-1">library_music</span>Library</button>
  </div>
  <!-- Inspector Content -->
  <div class="p-panel-padding flex flex-col gap-4">
    <div class="bg-surface-container rounded border border-outline-variant p-2">
      <div class="flex justify-between items-center mb-2">
        <span class="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider">Track 1: Kick</span>
        <div class="w-3 h-3 rounded-full bg-tertiary shadow-[0_0_8px_rgba(83,225,111,0.4)]"></div>
      </div>
      <!-- Fader -->
      <div class="flex gap-4 mt-4 h-32 items-end justify-center">
        <div class="w-8 flex flex-col items-center">
          <span class="font-mono-label text-mono-label text-on-surface-variant mb-1">VOL</span>
          <div class="relative h-full w-2 bg-surface-container-highest rounded-full overflow-hidden flex items-end">
            <div class="w-full bg-primary h-[70%]"></div>
          </div>
          <span class="font-mono-label text-mono-label mt-1">-3.2</span>
        </div>
        <!-- VU Meter vertical -->
        <div class="w-2 h-full flex flex-col justify-end gap-[1px]">
          <div class="w-full h-2 bg-error opacity-20"></div>
          <div class="w-full h-2 bg-error opacity-20"></div>
          <div class="w-full h-2 bg-tertiary-container opacity-20"></div>
          <div class="w-full h-2 bg-tertiary-container opacity-20"></div>
          <div class="w-full h-2 bg-tertiary"></div>
          <div class="w-full h-2 bg-tertiary"></div>
          <div class="w-full h-2 bg-tertiary"></div>
          <div class="w-full h-2 bg-tertiary"></div>
          <div class="w-full h-2 bg-tertiary"></div>
          <div class="w-full h-2 bg-tertiary"></div>
        </div>
      </div>
    </div>
    <!-- EQ Plugin Placeholder -->
    <div class="bg-surface-container rounded border border-outline-variant p-2">
      <span class="font-label-xs text-label-xs text-on-surface-variant uppercase tracking-wider block mb-2">Channel EQ</span>
      <div class="h-24 bg-surface-container-highest rounded relative overflow-hidden">
        <!-- Simple fake EQ curve -->
        <svg class="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <path d="M0,80 Q20,20 40,50 T100,50 T150,70 T200,40" fill="none" stroke="#00aeef" stroke-width="2"></path>
        </svg>
      </div>
    </div>
  </div>
</aside>
