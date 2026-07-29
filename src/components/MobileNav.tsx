import React from 'react';
import { Home, Search, Sparkles, Library, Heart, ShieldCheck } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const MobileNav: React.FC = () => {
  const { activeView, navigateTo } = usePlayer();
  const { user } = useAuth();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md px-1 py-1.5 flex items-center justify-around select-none transition-colors duration-200 border-t ${
      isDark 
        ? 'bg-black/95 text-white border-zinc-800/80' 
        : 'bg-white/95 text-[#121212] border-zinc-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]'
    }`}>
      <button
        onClick={() => navigateTo('home')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
          activeView.type === 'home' 
            ? 'text-[#05e0e9]' 
            : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-medium">Inicio</span>
      </button>

      <button
        onClick={() => navigateTo('ai-studio')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
          activeView.type === 'ai-studio' 
            ? 'text-[#05e0e9] font-bold' 
            : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Sparkles className={`w-5 h-5 animate-pulse ${activeView.type === 'ai-studio' ? 'text-[#05e0e9]' : 'text-[#ffde59]'}`} />
        <span className="text-[10px] font-medium">Creador AI</span>
      </button>

      {(user?.isAdmin || user?.email === 'genaudius@gmail.com') && (
        <button
          onClick={() => navigateTo('admin')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
            activeView.type === 'admin' 
              ? 'text-[#05e0e9] font-bold' 
              : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <ShieldCheck className="w-5 h-5 text-[#ffde59]" />
          <span className="text-[10px] font-bold">Admin</span>
        </button>
      )}

      <button
        onClick={() => navigateTo('search')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
          activeView.type === 'search' 
            ? 'text-[#05e0e9]' 
            : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] font-medium">Buscar</span>
      </button>

      <button
        onClick={() => navigateTo('library')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
          activeView.type === 'library' 
            ? 'text-[#05e0e9]' 
            : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Library className="w-5 h-5" />
        <span className="text-[10px] font-medium">Biblioteca</span>
      </button>

      <button
        onClick={() => navigateTo('liked')}
        className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
          activeView.type === 'liked' 
            ? 'text-[#05e0e9]' 
            : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-500 hover:text-zinc-800'
        }`}
      >
        <Heart className="w-5 h-5" />
        <span className="text-[10px] font-medium">Me Gusta</span>
      </button>
    </nav>
  );
};
