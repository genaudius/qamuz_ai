import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  ListPlus, 
  Heart, 
  User, 
  Disc, 
  Mic2, 
  Tv, 
  Sparkles, 
  Share2, 
  Copy, 
  X, 
  CheckCircle2,
  Radio,
  ExternalLink
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useTheme } from '../../context/ThemeContext';
import { Track } from '../../types/spotify';

interface TrackOptionsMenuProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  anchorPosition?: { top: number; left: number } | null;
}

export const TrackOptionsMenu: React.FC<TrackOptionsMenuProps> = ({
  track,
  isOpen,
  onClose,
  anchorPosition
}) => {
  const {
    addToQueue,
    setPlaylistToAddToTrack,
    toggleLikeTrack,
    isTrackLiked,
    navigateTo,
    setIsLyricsOpen,
    setIsNowPlayingOpen,
    playTrack,
    currentTrack
  } = usePlayer();

  const { theme } = useTheme();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Close on outer click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !track) return null;

  const isLiked = isTrackLiked(track.id);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1200);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/track/${track.id}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Enlace copiado al portapapeles');
    }).catch(() => {
      showToast('Enlace copiado');
    });
  };

  const handleAddToQueue = () => {
    addToQueue(track);
    showToast('Añadido a la cola de reproducción');
  };

  const handleAddToPlaylist = () => {
    setPlaylistToAddToTrack(track);
    onClose();
  };

  const handleToggleLike = () => {
    toggleLikeTrack(track.id);
    showToast(isLiked ? 'Eliminado de Canciones que te gustan' : 'Añadido a Canciones que te gustan');
  };

  const handleGoToArtist = () => {
    navigateTo('artist', track.artistId);
    onClose();
  };

  const handleGoToAlbum = () => {
    navigateTo('album', track.albumId);
    onClose();
  };

  const handleOpenLyrics = () => {
    if (currentTrack?.id !== track.id) {
      playTrack(track);
    }
    setIsLyricsOpen(true);
    onClose();
  };

  const handleOpenNowPlaying = () => {
    if (currentTrack?.id !== track.id) {
      playTrack(track);
    }
    setIsNowPlayingOpen(true);
    onClose();
  };

  const handleOpenAIStudio = () => {
    navigateTo('ai-studio');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div 
        ref={menuRef}
        className={`relative w-full max-w-sm border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up ${
          isDark ? 'bg-[#282828] border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Toast Notification Header */}
        {toastMessage ? (
          <div className={`p-6 flex flex-col items-center justify-center text-center gap-3 border-b ${
            isDark ? 'bg-emerald-950/90 border-emerald-500/30' : 'bg-emerald-50 border-emerald-100'
          }`}>
            <CheckCircle2 className="w-10 h-10 text-[#05e0e9]" />
            <span className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{toastMessage}</span>
          </div>
        ) : (
          <>
            {/* Header / Track Badge */}
            <div className={`p-4 bg-gradient-to-b ${
              isDark ? 'from-zinc-800 border-zinc-700/80' : 'from-zinc-100 border-zinc-200'
            } to-transparent border-b flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img 
                  src={track.coverUrl} 
                  alt={track.title}
                  className={`w-12 h-12 rounded-xl object-cover shadow-lg shrink-0 border ${
                    isDark ? 'border-zinc-700' : 'border-zinc-200'
                  }`} 
                />
                <div className="flex flex-col min-w-0">
                  <h4 className={`font-extrabold text-sm truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{track.title}</h4>
                  <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{track.artist} • {track.album}</p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className={`p-2 rounded-full transition-all shrink-0 ${
                  isDark 
                    ? 'text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700' 
                    : 'text-zinc-500 hover:text-zinc-800 bg-zinc-100 hover:bg-zinc-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spotify-style Options List */}
            <div className="p-2 flex flex-col gap-0.5 max-h-[380px] overflow-y-auto text-xs font-semibold">
              <button
                onClick={handleAddToQueue}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-zinc-200 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <ListPlus className="w-4 h-4 text-[#05e0e9]" />
                <span>Añadir a la cola</span>
              </button>

              <button
                onClick={handleAddToPlaylist}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-zinc-200 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#05e0e9]" />
                <span>Añadir a lista de reproducción</span>
              </button>

              <button
                onClick={handleToggleLike}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-zinc-200 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-[#ffde59]' : (isDark ? 'text-zinc-400' : 'text-zinc-400')}`} />
                <span>{isLiked ? 'Quitar de Canciones que te gustan' : 'Guardar en Canciones que te gustan'}</span>
              </button>

              <div className={`border-t my-1 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

              <button
                onClick={handleOpenNowPlaying}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors font-bold text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-cyan-400 hover:text-cyan-300' : 'hover:bg-zinc-100 text-cyan-600 hover:text-cyan-700'
                }`}
              >
                <Tv className="w-4 h-4 text-[#05e0e9]" />
                <span>Ver en &quot;Vista Sonando Ahora&quot; (Canvas & Live)</span>
              </button>

              <button
                onClick={handleOpenLyrics}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-zinc-200 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <Mic2 className="w-4 h-4 text-cyan-400" />
                <span>Ver Letras Sincronizadas</span>
              </button>

              <button
                onClick={handleOpenAIStudio}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors font-bold text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-purple-300 hover:text-purple-200' : 'hover:bg-zinc-100 text-purple-600 hover:text-purple-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Generar Video / Portada AI para este tema</span>
              </button>

              <div className={`border-t my-1 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

              <button
                onClick={handleGoToArtist}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-zinc-200 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <User className="w-4 h-4 text-zinc-400" />
                <span>Ir al Artista ({track.artist})</span>
              </button>

              <button
                onClick={handleGoToAlbum}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-zinc-200 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <Disc className="w-4 h-4 text-zinc-400" />
                <span>Ir al Álbum ({track.album})</span>
              </button>

              <button
                onClick={handleCopyLink}
                className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-left ${
                  isDark ? 'hover:bg-zinc-700/70 text-zinc-200 hover:text-white' : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950'
                }`}
              >
                <Copy className="w-4 h-4 text-zinc-400" />
                <span>Copiar enlace de la canción</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
