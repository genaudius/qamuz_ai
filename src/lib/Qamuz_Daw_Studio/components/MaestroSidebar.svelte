<aside class="w-[300px] h-full bg-surface-container dark:bg-surface-container border-l border-outline-variant flex flex-col flex-shrink-0 z-40 overflow-y-auto">
  <div class="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
    <div class="flex items-center gap-2">
      <span class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">M</span>
      <div>
        <h3 class="font-bold text-on-surface text-body-sm">Maestro</h3>
        <p class="text-[10px] text-tertiary flex items-center gap-1"><span class="w-1.5 h-1.5 bg-tertiary rounded-full"></span>Agente musical disponible</p>
      </div>
    </div>
    <button class="w-6 h-6 rounded bg-surface-variant text-on-surface flex items-center justify-center hover:bg-surface-container-highest transition-colors">
      <span class="material-symbols-outlined text-[16px]">close</span>
    </button>
  </div>
  
  <div class="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
    <!-- Chat Message -->
    <div class="bg-surface-container-low border border-outline-variant rounded-lg p-3">
      <p class="text-body-sm text-on-surface-variant">Hola, soy Maestro. ¿Qué idea tienes en mente para crear hoy?</p>
    </div>
  </div>

  <div class="p-4 border-t border-outline-variant bg-surface-container-high">
    <textarea class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-body-sm text-on-surface resize-none focus:outline-none focus:border-primary" rows="3" placeholder="Escribe tu idea aquí..."></textarea>
    <div class="flex justify-end mt-2">
      <button class="bg-primary text-on-primary px-4 py-1.5 rounded-full text-label-xs font-bold hover:opacity-90 transition-opacity">Enviar</button>
    </div>
  </div>
</aside>
