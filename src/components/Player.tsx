import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Heart, 
  Mic2, 
  Maximize2,
  ListOrdered,
  PlusCircle,
  ChevronDown,
  Tv,
  MoreHorizontal
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TrackOptionsMenu } from './modals/TrackOptionsMenu';

export const Player: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleLikeTrack,
    isTrackLiked,
    isLyricsOpen,
    setIsLyricsOpen,
    isQueueOpen,
    setIsQueueOpen,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    setPlaylistToAddToTrack,
    navigateTo
  } = usePlayer();

  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiked = isTrackLiked(currentTrack.id);

  return (
    <>
      {/* ==================== MOBILE COMPACT MINI PLAYER ==================== */}
      <div className={`md:hidden fixed bottom-[52px] left-2 right-2 z-30 ${
        theme === 'dark' 
          ? 'bg-[#383838]/95 border-zinc-700/60 text-white shadow-2xl' 
          : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-lg'
      } backdrop-blur-lg border rounded-xl p-2 flex flex-col gap-1 select-none transition-colors duration-200`}>
        {/* Top Slim Progress Indicator */}
        <div className={`w-full ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'} h-1 rounded-full overflow-hidden`}>
          <div 
            className="bg-[#ffde59] h-full transition-all duration-200" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-1">
          {/* Cover & Track Info (Tap to Expand) */}
          <div 
            onClick={() => setIsMobileExpanded(true)}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer active:opacity-80"
          >
            <img 
              src={currentTrack.coverUrl} 
              alt={currentTrack.title}
              className="w-11 h-11 rounded-lg object-cover shrink-0 shadow-md"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop';
              }}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className={`font-bold text-xs truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                {currentTrack.title}
              </span>
              <span className={`text-[11px] truncate ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {currentTrack.artist}
              </span>
            </div>
          </div>

          {/* Right Mobile Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className={`p-2 transition-transform active:scale-125 ${
                isLiked ? 'text-[#ffde59]' : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-9 h-9 rounded-full bg-[#ffde59] text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className={`p-1.5 active:scale-95 ${theme === 'dark' ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== FULLSCREEN MOBILE EXPANDED PLAYER ==================== */}
      {isMobileExpanded && (
        <div className={`md:hidden fixed inset-0 z-50 ${
          theme === 'dark' 
            ? 'bg-gradient-to-b from-[#545454] via-[#383838] to-[#2c2c2c] text-white' 
            : 'bg-gradient-to-b from-[#f4f5f8] via-white to-zinc-100 text-zinc-900'
        } p-6 flex flex-col justify-between animate-in slide-in-from-bottom duration-300 select-none overflow-y-auto transition-colors duration-200`}>
          {/* Top Header Bar */}
          <div className={`flex items-center justify-between py-2 border-b ${theme === 'dark' ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
            <button 
              onClick={() => setIsMobileExpanded(false)}
              className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
            >
              <ChevronDown className="w-7 h-7" />
            </button>

            <div className="flex flex-col items-center text-center">
              <span className={`text-[10px] font-bold tracking-widest uppercase ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Sonando de tu lista
              </span>
              <span className={`text-xs font-bold truncate max-w-[200px] ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                {currentTrack.album || currentTrack.title}
              </span>
            </div>

            <button 
              onClick={() => setPlaylistToAddToTrack(currentTrack)}
              className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Big Album Artwork */}
          <div className="my-auto py-6 flex justify-center">
            <div className={`w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl border ${theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <img 
                src={currentTrack.coverUrl} 
                alt={currentTrack.title}
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop';
                }}
              />
            </div>
          </div>

          {/* Track Info & Heart Button */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex flex-col min-w-0">
              <h2 className={`text-2xl font-black truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{currentTrack.title}</h2>
              <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>{currentTrack.artist}</p>
            </div>

            <button 
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className={`p-2 transition-transform active:scale-125 ${
                isLiked ? 'text-[#ffde59]' : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Scrubber & Times */}
          <div className="flex flex-col gap-1.5 mb-6">
            <div className="relative flex items-center group cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus:outline-none"
              />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-[#ffde59] rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className={`flex items-center justify-between text-xs font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Player Media Controls */}
          <div className="flex items-center justify-between px-4 mb-6">
            <button
              onClick={toggleShuffle}
              className={`transition-colors ${isShuffle ? 'text-[#05e0e9]' : theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={previousTrack}
              className={`active:scale-95 transition-transform ${theme === 'dark' ? 'text-white hover:text-zinc-300' : 'text-zinc-800 hover:text-zinc-600'}`}
            >
              <SkipBack className="w-8 h-8 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full bg-[#ffde59] text-black flex items-center justify-center shadow-2xl active:scale-95 transition-transform font-extrabold"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className={`active:scale-95 transition-transform ${theme === 'dark' ? 'text-white hover:text-zinc-300' : 'text-zinc-800 hover:text-zinc-600'}`}
            >
              <SkipForward className="w-8 h-8 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`transition-colors ${repeatMode !== 'off' ? 'text-[#05e0e9]' : theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Actions Bar (Lyrics & Queue) */}
          <div className={`flex items-center justify-between border-t ${theme === 'dark' ? 'border-zinc-800/80' : 'border-zinc-200'} pt-4`}>
            <button
              onClick={() => {
                setIsMobileExpanded(false);
                setIsLyricsOpen(true);
              }}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full ${
                theme === 'dark' ? 'text-zinc-400 hover:text-white bg-zinc-800/60' : 'text-zinc-600 hover:text-zinc-900 bg-zinc-200/60'
              }`}
            >
              <Mic2 className="w-4 h-4 text-[#05e0e9]" />
              <span>{t('player.lyrics')}</span>
            </button>

            <button
              onClick={() => {
                setIsMobileExpanded(false);
                setIsQueueOpen(true);
              }}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full ${
                theme === 'dark' ? 'text-zinc-400 hover:text-white bg-zinc-800/60' : 'text-zinc-600 hover:text-zinc-900 bg-zinc-200/60'
              }`}
            >
              <ListOrdered className="w-4 h-4 text-[#05e0e9]" />
              <span>{t('player.queue')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== DESKTOP STANDARD PLAYER BAR ==================== */}
      <footer className={`hidden md:flex ${
        theme === 'dark' ? 'bg-[#383838] border-zinc-700/80 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
      } border px-4 py-2.5 items-center justify-between gap-4 h-20 rounded-xl select-none z-40 relative transition-colors duration-200`}>
        {/* Track Left Info */}
        <div className="flex items-center gap-3 min-w-0 w-1/4">
          <div 
            className="relative group shrink-0 cursor-pointer" 
            onClick={() => setIsNowPlayingOpen(!isNowPlayingOpen)}
            title={t('player.nowPlayingView')}
          >
            <img 
              src={currentTrack.coverUrl} 
              alt={currentTrack.title}
              className="w-14 h-14 rounded-md object-cover shadow-lg" 
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop';
              }}
            />
            <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="flex flex-col min-w-0">
            <span 
              onClick={() => setIsNowPlayingOpen(!isNowPlayingOpen)}
              className={`font-semibold text-sm hover:underline cursor-pointer truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}
              title={t('player.nowPlayingView')}
            >
              {currentTrack.title}
            </span>
            <span 
              onClick={() => navigateTo('artist', currentTrack.artistId)}
              className={`text-xs hover:underline cursor-pointer truncate ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}
            >
              {currentTrack.artist}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-1 shrink-0">
            <button 
              onClick={() => toggleLikeTrack(currentTrack.id)}
              className={`p-1.5 transition-transform active:scale-125 ${
                isLiked ? 'text-[#ffde59]' : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title={isLiked ? t('trackOptions.removeFromLiked') : t('trackOptions.addToLiked')}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => setPlaylistToAddToTrack(currentTrack)}
              className={`p-1.5 transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              title={t('trackOptions.addToPlaylist')}
            >
              <PlusCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsOptionsMenuOpen(true)}
              className={`p-1.5 transition-colors rounded-full ${
                theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title={t('common.moreOptions')}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Center Controls & Progress Scrubber */}
        <div className="flex flex-col items-center gap-1.5 max-w-2xl w-2/4">
          {/* Buttons */}
          <div className="flex items-center gap-5">
            <button
              onClick={toggleShuffle}
              className={`transition-colors relative ${
                isShuffle ? 'text-[#05e0e9]' : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title={t('player.shuffle')}
            >
              <Shuffle className="w-4 h-4" />
              {isShuffle && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#05e0e9] rounded-full" />}
            </button>

            <button
              onClick={previousTrack}
              className={`transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              title={t('player.previous')}
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-8 h-8 rounded-full bg-[#ffde59] text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg font-bold"
              title={isPlaying ? t('hero.pause') : t('hero.playNow')}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className={`transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              title={t('player.next')}
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`transition-colors relative ${
                repeatMode !== 'off' ? 'text-[#05e0e9]' : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title={`Repetir: ${repeatMode === 'track' ? 'Canción actual' : repeatMode === 'queue' ? 'Toda la lista' : 'Desactivado'}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode !== 'off' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#05e0e9] rounded-full" />
              )}
              {repeatMode === 'track' && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold">1</span>
              )}
            </button>
          </div>

          {/* Scrubber Bar */}
          <div className={`flex items-center gap-2.5 w-full text-xs font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            
            <div className="relative flex-1 flex items-center group cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className={`w-full h-1 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'} rounded-lg appearance-none cursor-pointer focus:outline-none`}
              />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#ffde59] group-hover:bg-[#fcd338] rounded-lg pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Controls (Now Playing, Lyrics, Queue, Volume) */}
        <div className="flex items-center justify-end gap-2.5 w-1/4">
          <button
            onClick={() => setIsNowPlayingOpen(!isNowPlayingOpen)}
            className={`p-1.5 rounded-full transition-colors ${
              isNowPlayingOpen 
                ? 'text-[#05e0e9] bg-cyan-500/10 ring-1 ring-[#05e0e9]/50' 
                : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
            title="Vista Sonando Ahora (Canvas & info del artista)"
          >
            <Tv className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsLyricsOpen(!isLyricsOpen)}
            className={`p-1.5 rounded-full transition-colors ${
              isLyricsOpen 
                ? 'text-[#05e0e9] bg-cyan-500/10' 
                : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
            title="Letras de la canción"
          >
            <Mic2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`p-1.5 rounded-full transition-colors ${
              isQueueOpen 
                ? 'text-[#05e0e9] bg-cyan-500/10' 
                : theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
            title="Cola de reproducción"
          >
            <ListOrdered className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 group w-32">
            <button 
              onClick={toggleMute}
              className={`transition-colors ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-red-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <div className="relative flex-1 flex items-center cursor-pointer">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className={`w-full h-1 ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-200'} rounded-lg appearance-none cursor-pointer focus:outline-none`}
              />
              <div 
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 ${theme === 'dark' ? 'bg-white' : 'bg-zinc-600'} group-hover:bg-[#05e0e9] rounded-lg pointer-events-none transition-colors`}
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      </footer>

      {/* Options Context Modal */}
      {isOptionsMenuOpen && (
        <TrackOptionsMenu
          track={currentTrack}
          isOpen={isOptionsMenuOpen}
          onClose={() => setIsOptionsMenuOpen(false)}
        />
      )}
    </>
  );
};
