import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  Users, 
  Music, 
  Zap, 
  ShieldCheck, 
  Download, 
  Headphones, 
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { useAuth, UserPlan } from '../../context/AuthContext';

interface PlanRecommenderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlanRecommenderModal: React.FC<PlanRecommenderModalProps> = ({ isOpen, onClose }) => {
  const { openCheckoutModal, user } = useAuth();

  // Quiz interactive state
  const [useAI, setUseAI] = useState<boolean>(true);
  const [usersCount, setUsersCount] = useState<'1' | '2' | 'family'>('1');
  const [offlineDownloads, setOfflineDownloads] = useState<boolean>(true);
  const [audioQuality, setAudioQuality] = useState<'standard' | 'hd'>('hd');

  if (!isOpen) return null;

  // Algorithm to score plans based on user preferences
  const calculateRecommendations = () => {
    let proScore = 70;
    let creatorScore = 65;
    let freeScore = 40;

    if (useAI) {
      proScore += 25;
      creatorScore += 20;
      freeScore -= 20;
    }

    if (usersCount === 'family') {
      proScore += 15;
    } else if (usersCount === '2') {
      creatorScore += 10;
    }

    if (offlineDownloads) {
      proScore += 5;
      creatorScore += 5;
    }

    if (audioQuality === 'hd') {
      proScore += 10;
      creatorScore += 5;
    }

    // Determine highest match
    const recommended: UserPlan = proScore >= creatorScore ? 'pro' : 'creator';

    return {
      recommended,
      scores: {
        pro: Math.min(99, proScore),
        creator: Math.min(95, creatorScore),
        free: Math.max(15, freeScore)
      }
    };
  };

  const { recommended, scores } = calculateRecommendations();

  const handleSelectPlan = (plan: UserPlan) => {
    onClose();
    if (plan !== 'free') {
      openCheckoutModal(plan);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#181818] border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-950 via-zinc-900 to-purple-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1DB954] to-cyan-400 text-black flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Algoritmo Recomendador de Planes</h3>
                <span className="bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  IA Personalizada
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Responde unas breves preguntas para encontrar tu plan musical y de creador perfecto.
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-8">
          {/* Interactive Preferences Engine */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#1DB954]" />
                <span>Configura tus hábitos de escucha y creación</span>
              </h4>
              <span className="text-xs text-emerald-400 font-bold">Algoritmo Inteligente Activo</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              {/* Question 1 */}
              <div className="bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-700/60 flex flex-col gap-2">
                <span className="text-zinc-300">¿Usas Inteligencia Artificial para crear música y videos?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseAI(true)}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      useAI ? 'bg-[#1DB954] text-black border-[#1DB954]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Sí, crear con AI
                  </button>
                  <button
                    onClick={() => setUseAI(false)}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      !useAI ? 'bg-zinc-700 text-white border-zinc-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Solo escuchar
                  </button>
                </div>
              </div>

              {/* Question 2 */}
              <div className="bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-700/60 flex flex-col gap-2">
                <span className="text-zinc-300">¿Cuántas personas compartirán la cuenta?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUsersCount('1')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      usersCount === '1' ? 'bg-[#1DB954] text-black border-[#1DB954]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    1 Usuario
                  </button>
                  <button
                    onClick={() => setUsersCount('2')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      usersCount === '2' ? 'bg-[#1DB954] text-black border-[#1DB954]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    2 Personas
                  </button>
                  <button
                    onClick={() => setUsersCount('family')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      usersCount === 'family' ? 'bg-[#1DB954] text-black border-[#1DB954]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Familiar (Hasta 6)
                  </button>
                </div>
              </div>

              {/* Question 3 */}
              <div className="bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-700/60 flex flex-col gap-2">
                <span className="text-zinc-300">¿Calidad de Audio Deseada?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAudioQuality('hd')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      audioQuality === 'hd' ? 'bg-[#1DB954] text-black border-[#1DB954]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    HD Lossless / FLAC
                  </button>
                  <button
                    onClick={() => setAudioQuality('standard')}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      audioQuality === 'standard' ? 'bg-zinc-700 text-white border-zinc-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Calidad Estándar
                  </button>
                </div>
              </div>

              {/* Question 4 */}
              <div className="bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-700/60 flex flex-col gap-2">
                <span className="text-zinc-300">¿Descargas para escuchar sin conexión?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOfflineDownloads(true)}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      offlineDownloads ? 'bg-[#1DB954] text-black border-[#1DB954]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    Indispensable
                  </button>
                  <button
                    onClick={() => setOfflineDownloads(false)}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all border ${
                      !offlineDownloads ? 'bg-zinc-700 text-white border-zinc-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    No relevante
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Plans Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Plan Studio Pro */}
            <div className={`relative bg-zinc-900 rounded-2xl p-5 border flex flex-col justify-between transition-all ${
              recommended === 'pro' 
                ? 'border-[#1DB954] bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-900 shadow-2xl scale-102 ring-2 ring-[#1DB954]/50' 
                : 'border-zinc-800'
            }`}>
              {recommended === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1DB954] text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase">
                  <Award className="w-3 h-3" />
                  <span>{scores.pro}% Recomendado</span>
                </div>
              )}

              <div>
                <h4 className="font-extrabold text-base text-white">Plan Studio Pro</h4>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#1DB954]">$19.99</span>
                  <span className="text-xs text-zinc-400">/ mes</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Ideal para creadores de contenido, artistas y entusiastas de audio Lossless.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <span>Créditos Ilimitados de IA</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <span>Videos Cinemáticos 4K HD</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <span>Calidad Lossless HD</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <span>Licencia Comercial Total</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan('pro')}
                className="mt-6 w-full py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>Obtener Studio Pro</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Plan Creador AI */}
            <div className={`relative bg-zinc-900 rounded-2xl p-5 border flex flex-col justify-between transition-all ${
              recommended === 'creator' 
                ? 'border-[#1DB954] bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-900 shadow-2xl scale-102 ring-2 ring-[#1DB954]/50' 
                : 'border-zinc-800'
            }`}>
              {recommended === 'creator' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1DB954] text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 uppercase">
                  <Award className="w-3 h-3" />
                  <span>{scores.creator}% Recomendado</span>
                </div>
              )}

              <div>
                <h4 className="font-extrabold text-base text-white">Plan Creador AI</h4>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#1DB954]">$9.99</span>
                  <span className="text-xs text-zinc-400">/ mes</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Perfecto para oyentes diarios que quieren experimentar con IA.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <span>100 Créditos Mensuales IA</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <span>Musica & Vocal Studio</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1DB954] shrink-0" />
                    <span>Audio HD sin Anuncios</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan('creator')}
                className="mt-6 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs rounded-xl transition-all border border-zinc-700 flex items-center justify-center gap-2"
              >
                <span>Obtener Creador AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Plan Gratuito */}
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-base text-white">Plan Gratuito</h4>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-300">$0.00</span>
                  <span className="text-xs text-zinc-400">/ siempre</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Acceso básico a la biblioteca musical y prueba limitada de IA.
                </p>

                <ul className="mt-4 space-y-2 text-xs text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>5 Créditos Mensuales IA</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>Calidad Estándar</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onClose}
                className="mt-6 w-full py-2.5 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 font-bold text-xs rounded-xl transition-all"
              >
                <span>Continuar Gratis</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
