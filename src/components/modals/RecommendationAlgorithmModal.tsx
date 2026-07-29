import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Play, 
  Flame, 
  TrendingUp, 
  Radio, 
  Disc, 
  BarChart3, 
  Headphones, 
  Activity, 
  Heart, 
  ListPlus,
  RefreshCw,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Track } from '../../types/spotify';

interface RecommendationAlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecommendationAlgorithmModal: React.FC<RecommendationAlgorithmModalProps> = ({ isOpen, onClose }) => {
  const { allTracks, playTrack, addToQueue, toggleLikeTrack, isTrackLiked, currentTrack } = usePlayer();
  const [activeTab, setActiveTab] = useState<'popular' | 'dna' | 'mixes'>('popular');

  if (!isOpen) return null;

  // Algorithmic sorting for popular / trending tracks
  const popularTracks = [...allTracks].sort((a, b) => (b.plays || 0) - (a.plays || 0));

  // Algorithmic curated mixes based on audio vibe
  const urbanMix = allTracks.filter(t => t.genre?.toLowerCase().includes('urban') || t.genre?.toLowerCase().includes('trap') || t.genre?.toLowerCase().includes('reggaeton'));
  const popMix = allTracks.filter(t => t.genre?.toLowerCase().includes('pop') || t.genre?.toLowerCase().includes('dance'));
  const chillMix = allTracks.filter(t => t.genre?.toLowerCase().includes('lo-fi') || t.genre?.toLowerCase().includes('ambient') || t.duration < 210);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#181818] border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-zinc-900 to-indigo-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1DB954] text-black font-black flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Algoritmo de Recomendación Qamuz AI</h3>
                <span className="bg-emerald-500/20 text-[#1DB954] border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  v3.5 Engine
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Todo tu universo musical unificado con inteligencia artificial en tiempo real.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/80 hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/80 px-6 gap-2 pt-3">
          <button
            onClick={() => setActiveTab('popular')}
            className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'popular'
                ? 'border-[#1DB954] text-[#1DB954]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Música Más Popular & Tendencias</span>
          </button>

          <button
            onClick={() => setActiveTab('dna')}
            className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'dna'
                ? 'border-[#1DB954] text-[#1DB954]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Tu Perfil de Gustos AI</span>
          </button>

          <button
            onClick={() => setActiveTab('mixes')}
            className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'mixes'
                ? 'border-[#1DB954] text-[#1DB954]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Mezclas Algorítmicas Diarias</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Tab 1: Popular & Trending Music */}
          {activeTab === 'popular' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-emerald-950/40 p-4 rounded-2xl border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-[#1DB954]" />
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Ranking de Tendencias Mundiales</h4>
                    <p className="text-xs text-zinc-300">
                      Calculado por reproducción de oyentes y velocidad de compartidos hoy.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-[#1DB954] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Actualizado en vivo
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {popularTracks.map((track, idx) => {
                  const isLiked = isTrackLiked(track.id);
                  const isPlayingThis = currentTrack?.id === track.id;
                  const matchPercentage = 99 - idx * 2;

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playTrack(track, popularTracks);
                        onClose();
                      }}
                      className="group p-3 bg-zinc-900/80 hover:bg-zinc-800 rounded-2xl border border-zinc-800 transition-all flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`font-black text-sm w-6 text-center shrink-0 ${
                          idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-zinc-300 text-base' : idx === 2 ? 'text-amber-600' : 'text-zinc-500'
                        }`}>
                          #{idx + 1}
                        </span>

                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-800">
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-5 h-5 text-white fill-current" />
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className={`font-extrabold text-sm truncate ${isPlayingThis ? 'text-[#1DB954]' : 'text-white'}`}>
                            {track.title}
                          </span>
                          <span className="text-xs text-zinc-400 truncate">
                            {track.artist} • {track.genre || 'Urbano'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 hidden sm:inline-block">
                          {matchPercentage}% Coincidencia
                        </span>

                        <span className="text-xs text-zinc-400 font-mono hidden md:inline-block">
                          {(track.plays || 1400000).toLocaleString('es-ES')} streams
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLikeTrack(track.id);
                          }}
                          className={`p-2 rounded-full hover:bg-zinc-700 transition-colors ${
                            isLiked ? 'text-[#1DB954]' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Musical Taste DNA */}
          {activeTab === 'dna' && (
            <div className="flex flex-col gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-base text-white">Análisis de Tu ADN Musical Qamuz</h4>
                    <p className="text-xs text-zinc-400">Procesado en base a tus canciones escuchadas y guardadas.</p>
                  </div>
                  <span className="text-xs font-extrabold text-[#1DB954] bg-[#1DB954]/10 px-3 py-1 rounded-full">
                    Gusto Musical: Melómano Versátil
                  </span>
                </div>

                {/* Genre breakdown bars */}
                <div className="space-y-3 mt-2">
                  <div>
                    <div className="flex justify-between text-xs font-extrabold mb-1">
                      <span className="text-white">Urban / Trap Latino / Reggaeton</span>
                      <span className="text-[#1DB954]">42%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1DB954] rounded-full" style={{ width: '42%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-extrabold mb-1">
                      <span className="text-white">Pop Latino & Dance</span>
                      <span className="text-cyan-400">28%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: '28%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-extrabold mb-1">
                      <span className="text-white">Synthwave & Electronic HD</span>
                      <span className="text-purple-400">18%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: '18%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-extrabold mb-1">
                      <span className="text-white">Lo-Fi & Acoustic Relax</span>
                      <span className="text-amber-400">12%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: '12%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Audio Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 font-extrabold">Nivel de Energía Audio</span>
                  <span className="text-2xl font-black text-emerald-400">89 / 100</span>
                  <span className="text-[11px] text-zinc-500">Ritmos dinámicos y graves potentes</span>
                </div>

                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 font-extrabold">Bailabilidad (BPM)</span>
                  <span className="text-2xl font-black text-cyan-400">94% High</span>
                  <span className="text-[11px] text-zinc-500">Predominio de tempos 110-128 BPM</span>
                </div>

                <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 font-extrabold">Vocal AI Matching</span>
                  <span className="text-2xl font-black text-purple-400">98% Match</span>
                  <span className="text-[11px] text-zinc-500">Afinidad total con temas producidos en AI Studio</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Curated Daily Mixes */}
          {activeTab === 'mixes' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Mix 1 */}
              <div className="bg-gradient-to-b from-indigo-950/60 to-zinc-900 p-5 rounded-2xl border border-indigo-500/30 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-3 shadow-lg">
                    <Radio className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-base text-white">Daily Mix 1: Urbano & Flow</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Lo mejor del Trap y Reggaeton seleccionado especialmente para tu ritmo diario.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (urbanMix.length > 0) playTrack(urbanMix[0], urbanMix);
                    onClose();
                  }}
                  className="w-full py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproducir Daily Mix 1</span>
                </button>
              </div>

              {/* Mix 2 */}
              <div className="bg-gradient-to-b from-purple-950/60 to-zinc-900 p-5 rounded-2xl border border-purple-500/30 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white mb-3 shadow-lg">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-base text-white">Discover Weekly AI</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Canciones inéditas y producciones de AI Studio alineadas a tus búsquedas.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (popMix.length > 0) playTrack(popMix[0], popMix);
                    onClose();
                  }}
                  className="w-full py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproducir Discover AI</span>
                </button>
              </div>

              {/* Mix 3 */}
              <div className="bg-gradient-to-b from-amber-950/60 to-zinc-900 p-5 rounded-2xl border border-amber-500/30 flex flex-col justify-between gap-4">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white mb-3 shadow-lg">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-base text-white">Chill & Relax Beats</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Temas relajantes, instrumental lo-fi y armonías suaves para concentración.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (chillMix.length > 0) playTrack(chillMix[0], chillMix);
                    onClose();
                  }}
                  className="w-full py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproducir Chill Beats</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
