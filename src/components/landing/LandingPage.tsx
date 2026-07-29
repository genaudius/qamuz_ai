import React, { useState } from 'react';
import { 
  Sparkles, 
  Music, 
  Video, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Crown, 
  Star, 
  Disc, 
  Lock, 
  ChevronRight,
  Headphones,
  Sliders
} from 'lucide-react';
import { useAuth, UserPlan } from '../../context/AuthContext';
import { audioEngine } from '../../utils/audioEngine';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelector } from '../LanguageSelector';

export const LandingPage: React.FC = () => {
  const { openAuthModal, openCheckoutModal } = useAuth();
  const { t } = useLanguage();
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Demo Track Sample for Landing Page
  const demoAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  const toggleDemoAudio = () => {
    if (isPlayingDemo) {
      audioEngine.pause();
      setIsPlayingDemo(false);
    } else {
      audioEngine.loadAndPlay('demo-landing-track', demoAudioUrl, 180);
      setIsPlayingDemo(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#1DB954] selection:text-black">
      {/* Top Sticky Navbar */}
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1DB954] text-black font-black flex items-center justify-center shadow-lg shadow-emerald-500/20 text-xl">
            Q
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">QAMUZ</span>
          <span className="hidden sm:inline-block text-[10px] bg-emerald-500/20 text-[#1DB954] border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
            AI Music Studio
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Características</a>
          <a href="#pricing" className="hover:text-white transition-colors">Planes & Precios</a>
          <a href="#security" className="hover:text-white transition-colors">Seguridad Stripe</a>
          <a href="#faq" className="hover:text-white transition-colors">Preguntas Frecuentes</a>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={() => openAuthModal('login')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
          >
            {t('header.logIn')}
          </button>
          <button
            onClick={() => openAuthModal('register')}
            className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-[#1DB954] hover:bg-emerald-400 text-black transition-all shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
          >
            {t('header.signUp')}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-[#1DB954] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>Plataforma #1 de Música, Video e Imágenes con IA</span>
        </div>

        <h1 className="text-3xl sm:text-6xl md:text-7xl font-black tracking-tight max-w-4xl leading-[1.1] text-white">
          Crea Música, Videos y Arte con <span className="bg-gradient-to-r from-[#1DB954] via-emerald-400 to-cyan-400 bg-clip-text text-transparent">Inteligencia Artificial</span>
        </h1>

        <p className="mt-6 text-sm sm:text-lg text-zinc-300 max-w-2xl font-medium leading-relaxed">
          Compone canciones completas con voces en español, produce videoclips cinemáticos y genera portadas de discos de nivel profesional en segundos.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => openAuthModal('register')}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#1DB954] hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider transition-all shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <span>Crear mi Primera Canción Gratis</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <a
            href="#pricing"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm border border-zinc-700/80 transition-all flex items-center justify-center gap-2"
          >
            <span>Ver Planes de Creador</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </a>
        </div>

        {/* Live Audio Preview Card */}
        <div className="mt-12 w-full max-w-3xl bg-[#181818]/90 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-xl group">
              <img
                src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop"
                alt="AI Song Preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={toggleDemoAudio}
                className="absolute inset-0 bg-black/40 flex items-center justify-center transition-all group-hover:bg-black/60"
              >
                <div className="w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg">
                  {isPlayingDemo ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </div>
              </button>
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">Luna Sol - Noche de Neón</span>
                <span className="text-[10px] bg-emerald-500/20 text-[#1DB954] px-2 py-0.5 rounded-full font-bold uppercase">
                  Generado por Qamuz AI
                </span>
              </div>
              <span className="text-xs text-zinc-400">Reggaetón Pop • 120 BPM • Voz Femenina Studio</span>
              <p className="text-[11px] text-zinc-500 italic mt-1">
                &quot;Bajo las luces de la ciudad, tu mirada vuelve a brillar...&quot;
              </p>
            </div>
          </div>

          <button
            onClick={toggleDemoAudio}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-zinc-700"
          >
            <Headphones className="w-4 h-4 text-[#1DB954]" />
            <span>{isPlayingDemo ? 'Pausar Demo' : 'Escuchar Muestra AI'}</span>
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-8 bg-zinc-950/60 border-y border-zinc-800/80">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          <div className="text-center flex flex-col items-center gap-3">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Tres Motores Creativos en un Solo Estudio
            </h2>
            <p className="text-sm text-zinc-400 max-w-xl">
              Diseñado para productores, músicos independientes, creadores de contenido y marcas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Music */}
            <div className="bg-[#181818] border border-zinc-800 hover:border-emerald-500/50 rounded-3xl p-6 flex flex-col gap-4 shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-[#1DB954] flex items-center justify-center shadow-lg">
                <Music className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Estudio de Música AI</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Composición con voces masculinas o femeninas, sintetizadores y ritmos de Reggaetón, Pop, Salsa, Bachata, Lo-Fi y Electronic EDM.
              </p>
              <ul className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954]" /> Letras en español sincronizadas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954]" /> Mezcla y masterización automática</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#1DB954]" /> Exportación directa a tu biblioteca</li>
              </ul>
            </div>

            {/* Feature 2: Video */}
            <div className="bg-[#181818] border border-zinc-800 hover:border-purple-500/50 rounded-3xl p-6 flex flex-col gap-4 shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Videoclips Cinemáticos</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dirección visual 4K con movimientos de cámara 360, travellings laterales y efectos estilo Runway y Sora para acompañar tus canciones.
              </p>
              <ul className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Formatos 16:9, 9:16 (TikTok/Reels) y 1:1</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Estilos Cyberpunk, Anime 3D y Fotorrealista</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Renderizado Ultra HD de secuencias</li>
              </ul>
            </div>

            {/* Feature 3: Image */}
            <div className="bg-[#181818] border border-zinc-800 hover:border-cyan-500/50 rounded-3xl p-6 flex flex-col gap-4 shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Portadas & Arte Qamuz AI</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Crea diseños de portadas de álbumes 3D, fotos artísticas de cantante y afiches de conciertos con resolución para Spotify y Apple Music.
              </p>
              <ul className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Calidad de impresión y distribución</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Estilos 3D Neo-Futurista, Óleo y Vector</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Licencia de uso libre para distribución</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section id="pricing" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col gap-12">
        <div className="text-center flex flex-col items-center gap-3">
          <span className="text-xs font-bold text-[#1DB954] uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Planes de Suscripción y Creación
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Elige el Plan Perfecto para Tu Música
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl">
            Comienza gratis con 5 créditos de prueba y mejora tu plan en cualquier momento mediante nuestra pasarela segura Stripe.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1: Free */}
          <div className="bg-[#181818] border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between gap-6 shadow-xl relative">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Plan Gratuito</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-xs text-zinc-400">/ mes</span>
              </div>
              <p className="text-xs text-zinc-400">Ideal para probar los motores creativos de Qamuz AI.</p>

              <div className="flex flex-col gap-2.5 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> 5 Créditos Mensuales de IA</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Reproducción Ilimitada en Qamuz</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Calidad de Audio Estándar MP3</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Acceso al Reproductor Web</div>
              </div>
            </div>

            <button
              onClick={() => openAuthModal('register')}
              className="w-full py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-xs transition-all border border-zinc-700"
            >
              Comenzar Gratis
            </button>
          </div>

          {/* Plan 2: Creator (Featured) */}
          <div className="bg-gradient-to-b from-[#181818] via-zinc-900 to-[#181818] border-2 border-[#1DB954] rounded-3xl p-8 flex flex-col justify-between gap-6 shadow-2xl relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#1DB954] text-black font-black text-[10px] uppercase tracking-widest px-4 py-1 rounded-full shadow-lg">
              MÁS POPULAR
            </div>

            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-[#1DB954] uppercase tracking-wider">Plan Creador AI</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$9.99</span>
                <span className="text-xs text-zinc-400">/ mes</span>
              </div>
              <p className="text-xs text-zinc-300">Para músicos, YouTubers y productores independientes.</p>

              <div className="flex flex-col gap-2.5 pt-4 border-t border-zinc-800 text-xs text-zinc-200">
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> 100 Créditos Mensuales de IA</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Generación de Voces & Arreglos</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Videos Cinemáticos en HD</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Portadas de Álbum con Qamuz AI</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Descargas de Audio MP3 & WAV</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-[#1DB954]" /> Licencia Comercial Básica</div>
              </div>
            </div>

            <button
              onClick={() => openCheckoutModal('creator')}
              className="w-full py-3.5 rounded-2xl bg-[#1DB954] hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Suscribirse con Stripe</span>
            </button>
          </div>

          {/* Plan 3: Pro Studio */}
          <div className="bg-[#181818] border border-zinc-800 hover:border-purple-500/50 rounded-3xl p-8 flex flex-col justify-between gap-6 shadow-xl relative">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Plan Studio Pro</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$19.99</span>
                <span className="text-xs text-zinc-400">/ mes</span>
              </div>
              <p className="text-xs text-zinc-400">Potencia ilimitada para estudios de grabación profesionales.</p>

              <div className="flex flex-col gap-2.5 pt-4 border-t border-zinc-800 text-xs text-zinc-300">
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Créditos Ilimitados de IA</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Renderizado de Video 4K Ultra HD</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Exportación de Pistas STEMS</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Soporte VIP Prioritario 24/7</div>
                <div className="flex items-center gap-2.5"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Licencia Comercial Total</div>
              </div>
            </div>

            <button
              onClick={() => openCheckoutModal('pro')}
              className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Suscribirse con Stripe</span>
            </button>
          </div>
        </div>
      </section>

      {/* Security & Payment Compliance Section */}
      <section id="security" className="py-16 px-4 sm:px-8 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 bg-[#181818] p-8 rounded-3xl border border-zinc-800 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#635BFF]/20 border border-[#635BFF]/40 text-[#635BFF] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="font-bold text-white text-lg">Seguridad y Pagos Protegidos por Stripe</h3>
              <p className="text-xs text-zinc-400 max-w-lg mt-1">
                Todas las suscripciones son procesadas bajo los estándares de seguridad PCI-DSS Nivel 1. Encriptación SSL de 256 bits y protección de privacidad garantizada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs font-bold text-zinc-300">
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">Stripe Verified</span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">AES-256 SSL</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-8 border-t border-zinc-800 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#1DB954] text-black font-black flex items-center justify-center text-xs">
              Q
            </div>
            <span className="font-bold text-white text-sm">QAMUZ Studio</span>
          </div>
          <p>© 2026 QAMUZ Music & Visual AI Inc. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
