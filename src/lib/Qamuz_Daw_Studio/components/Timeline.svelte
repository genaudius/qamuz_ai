<main class="flex-1 flex flex-col relative bg-surface-container-lowest overflow-hidden">
  <!-- Timeline Header (Ruler) -->
  <div class="h-8 bg-surface-container-high border-b border-outline-variant flex flex-shrink-0 overflow-hidden relative">
    <!-- Track Headers spacer -->
    <div class="w-[200px] border-r border-outline-variant bg-surface-container flex-shrink-0"></div>
    <!-- Ruler marks -->
    <div class="flex-1 relative font-mono-label text-mono-label text-on-surface-variant">
      <div class="absolute left-0 top-0 h-full w-full timeline-grid opacity-50"></div>
      <div class="absolute left-[100px] top-1">1</div>
      <div class="absolute left-[200px] top-1">2</div>
      <div class="absolute left-[300px] top-1">3</div>
      <div class="absolute left-[400px] top-1">4</div>
      <div class="absolute left-[500px] top-1">5</div>
      <!-- Playhead -->
      <div class="absolute left-[250px] top-0 h-screen w-px bg-error z-20 pointer-events-none">
        <div class="w-3 h-3 bg-error transform -translate-x-1 -translate-y-1 rotate-45"></div>
      </div>
    </div>
  </div>
  <!-- Tracks Area -->
  <div class="flex-1 overflow-auto flex flex-col relative">
    <!-- Track 1: Audio -->
    <div class="flex h-track-height-sm border-b border-outline-variant group">
      <!-- Track Header -->
      <div class="w-[200px] bg-surface-container flex-shrink-0 flex items-center px-2 gap-2 border-r border-outline-variant sticky left-0 z-10 bg-surface-container-high">
        <div class="w-2 h-full bg-primary-container"></div>
        <span class="font-label-xs text-label-xs truncate flex-1">Kick Drum</span>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">M</button>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">S</button>
      </div>
      <!-- Track Canvas -->
      <div class="flex-1 relative timeline-grid">
        <div class="absolute left-[100px] top-[2px] h-[28px] w-[180px] bg-primary-container/20 border border-primary-container rounded flex items-center px-1 overflow-hidden">
          <svg class="w-full h-full opacity-60" preserveAspectRatio="none"><path d="M0,14 L10,5 L20,20 L30,10 L40,22 L50,14" fill="none" stroke="#00aeef" stroke-width="1"></path></svg>
        </div>
      </div>
    </div>
    <!-- Track 2: Audio -->
    <div class="flex h-track-height-sm border-b border-outline-variant group">
      <div class="w-[200px] bg-surface-container flex-shrink-0 flex items-center px-2 gap-2 border-r border-outline-variant sticky left-0 z-10">
        <div class="w-2 h-full bg-primary-container"></div>
        <span class="font-label-xs text-label-xs truncate flex-1">Snare</span>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">M</button>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">S</button>
      </div>
      <div class="flex-1 relative timeline-grid">
        <div class="absolute left-[150px] top-[2px] h-[28px] w-[120px] bg-primary-container/20 border border-primary-container rounded flex items-center px-1 overflow-hidden">
          <svg class="w-full h-full opacity-60" preserveAspectRatio="none"><path d="M0,14 L10,2 L20,25 L30,8 L40,18 L50,14" fill="none" stroke="#00aeef" stroke-width="1"></path></svg>
        </div>
      </div>
    </div>
    <!-- Track 3: MIDI Bass -->
    <div class="flex h-track-height-sm border-b border-outline-variant group">
      <div class="w-[200px] bg-surface-container flex-shrink-0 flex items-center px-2 gap-2 border-r border-outline-variant sticky left-0 z-10">
        <div class="w-2 h-full bg-secondary-container"></div>
        <span class="font-label-xs text-label-xs truncate flex-1">Sub Bass</span>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">M</button>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">S</button>
      </div>
      <div class="flex-1 relative timeline-grid">
        <div class="absolute left-[100px] top-[2px] h-[28px] w-[300px] bg-secondary-container/20 border border-secondary-container rounded flex items-center px-1 relative">
          <!-- MIDI notes -->
          <div class="absolute top-[4px] left-2 w-8 h-1 bg-secondary-container rounded-sm"></div>
          <div class="absolute top-[12px] left-12 w-16 h-1 bg-secondary-container rounded-sm"></div>
          <div class="absolute top-[8px] left-32 w-8 h-1 bg-secondary-container rounded-sm"></div>
        </div>
      </div>
    </div>
    <!-- Track 4: MIDI Synth -->
    <div class="flex h-track-height-sm border-b border-outline-variant group">
      <div class="w-[200px] bg-surface-container flex-shrink-0 flex items-center px-2 gap-2 border-r border-outline-variant sticky left-0 z-10">
        <div class="w-2 h-full bg-tertiary-container"></div>
        <span class="font-label-xs text-label-xs truncate flex-1">Arp Synth</span>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">M</button>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">S</button>
      </div>
      <div class="flex-1 relative timeline-grid">
        <div class="absolute left-[200px] top-[2px] h-[28px] w-[200px] bg-tertiary-container/20 border border-tertiary-container rounded flex items-center px-1 relative">
          <!-- MIDI notes -->
          <div class="absolute top-[2px] left-2 w-4 h-1 bg-tertiary-container rounded-sm"></div>
          <div class="absolute top-[6px] left-8 w-4 h-1 bg-tertiary-container rounded-sm"></div>
          <div class="absolute top-[10px] left-14 w-4 h-1 bg-tertiary-container rounded-sm"></div>
          <div class="absolute top-[14px] left-20 w-4 h-1 bg-tertiary-container rounded-sm"></div>
        </div>
      </div>
    </div>
    <!-- Track 5: Audio Vocals -->
    <div class="flex h-track-height-sm border-b border-outline-variant group">
      <div class="w-[200px] bg-surface-container flex-shrink-0 flex items-center px-2 gap-2 border-r border-outline-variant sticky left-0 z-10">
        <div class="w-2 h-full bg-inverse-primary"></div>
        <span class="font-label-xs text-label-xs truncate flex-1">Lead Vox</span>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">M</button>
        <button class="w-5 h-5 rounded bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant font-label-xs flex items-center justify-center">S</button>
      </div>
      <div class="flex-1 relative timeline-grid">
        <div class="absolute left-[300px] top-[2px] h-[28px] w-[250px] bg-inverse-primary/20 border border-inverse-primary rounded flex items-center px-1 overflow-hidden">
          <svg class="w-full h-full opacity-60" preserveAspectRatio="none"><path d="M0,14 L5,14 L15,2 L25,25 L35,8 L45,20 L55,14 L100,14" fill="none" stroke="#00658d" stroke-width="1"></path></svg>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  /* Grid background for timeline */
  .timeline-grid {
      background-image: 
          linear-gradient(to right, #353534 1px, transparent 1px),
          linear-gradient(to bottom, #353534 1px, transparent 1px);
      background-size: 100px 32px;
  }
</style>
