import React from 'react';
import { Sparkles, Crown, Zap, ArrowRight, X, Music, Video, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const AIUpsellModal: React.FC = () => {
  const { isAIUpsellModalOpen, closeAIUpsellModal, openCheckoutModal } = useAuth();
  const { t } = useLanguage();

  if (!isAIUpsellModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={closeAIUpsellModal} />
      
      <div className="relative w-full max-w-xl bg-gradient-to-br from-[#1E1E1E] to-[#121212] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(29,185,84,0.15)] border border-zinc-800 flex flex-col p-8 z-10 text-center">
        
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[#1DB954]/20 blur-[60px] pointer-events-none" />

        <button
          onClick={closeAIUpsellModal}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors bg-black/20 p-2 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* AI Agent Avatar/Icon */}
        <div className="relative mx-auto mb-6 group cursor-default">
          <div className="absolute inset-0 bg-[#1DB954] rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative w-20 h-20 bg-gradient-to-tr from-[#1DB954] to-cyan-400 rounded-full flex items-center justify-center shadow-xl border-4 border-[#242424]">
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>

        <h2 className="text-3xl font-black text-white tracking-tight mb-2">
          Your Creative Journey Needs Fuel!
        </h2>
        
        <p className="text-zinc-400 text-sm max-w-sm mx-auto mb-8 font-medium leading-relaxed">
          I'm Qamuz AI, your virtual producer. You've just run out of free credits, but your ideas are too good to stop now. Upgrade to unlock limitless creativity.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-black/30 p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center">
            <Music className="w-6 h-6 text-[#1DB954] mb-2" />
            <span className="text-xs font-bold text-white">Pro Audio</span>
            <span className="text-[10px] text-zinc-500">Lossless WAV</span>
          </div>
          <div className="bg-black/30 p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center">
            <Video className="w-6 h-6 text-purple-400 mb-2" />
            <span className="text-xs font-bold text-white">4K Video</span>
            <span className="text-[10px] text-zinc-500">No Watermarks</span>
          </div>
          <div className="bg-black/30 p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center">
            <Crown className="w-6 h-6 text-amber-400 mb-2" />
            <span className="text-xs font-bold text-white">Commercial</span>
            <span className="text-[10px] text-zinc-500">Full Rights</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={closeAIUpsellModal}
            className="flex-1 py-3.5 px-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 font-bold text-sm transition-colors border border-zinc-700/50"
          >
            Maybe Later
          </button>
          
          <button
            onClick={() => {
              closeAIUpsellModal();
              openCheckoutModal('creator');
            }}
            className="flex-[2] flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1DB954] to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>View Creator Plans</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        <p className="mt-4 text-[10px] text-zinc-600 font-medium uppercase tracking-widest">
          Join 50,000+ creators on Qamuz
        </p>

      </div>
    </div>
  );
};
