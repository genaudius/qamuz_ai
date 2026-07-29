import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Heart, 
  PlusCircle, 
  MoreHorizontal, 
  UserCheck, 
  UserPlus, 
  Mic2, 
  Tv, 
  Sparkles, 
  Play, 
  Pause, 
  SkipForward, 
  Radio, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { MOCK_ARTISTS } from '../../data/mockData';
import { TrackOptionsMenu } from '../modals/TrackOptionsMenu';

export const NowPlayingSidePanel: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    seek,
    toggleLikeTrack,
    isTrackLiked,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    setIsLyricsOpen,
    navigateTo,
    queue,
    nextTrack,
    allTracks
  } = usePlayer();

  const [isFollowingArtist, setIsFollowingArtist] = useState(false);
  const [selectedTrackForOptions, setSelectedTrackForOptions] = useState<any | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  const lyrics = currentTrack?.lyrics || [];
  let currentLyricIndex = -1;
  if (currentTrack) {
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        currentLyricIndex = i;
      } else {
        break;
      }
    }
  }

  // Auto-scroll lyrics container smoothly to active line
  useEffect(() => {
    if (lyricsContainerRef.current && currentLyricIndex !== -1) {
      const activeEl = lyricsContainerRef.current.children[currentLyricIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLyricIndex]);

  if (!isNowPlayingOpen || !currentTrack) return null;

  const isLiked = isTrackLiked(currentTrack.id);

  // Find artist info from mock data or fallback
  const artistData = MOCK_ARTISTS.find(
    a => a.name.toLowerCase() === currentTrack.artist.toLowerCase() || a.id === currentTrack.artistId
  ) || {
    id: currentTrack.artistId || 'ar1',
    name: currentTrack.artist,
    avatarUrl: currentTrack.coverUrl,
    bannerUrl: currentTrack.coverUrl,
    verified: true,
    monthlyListeners: 1420000,
    bio: `${currentTrack.artist} es uno de los artistas más escuchados en la plataforma Qamuz con múltiples reconocimientos globales y canciones producidas con tecnología de sonido HD.`
  };

  // Find next track in queue
  const nextTrackInQueue = queue.length > 0 ? queue[0] : allTracks.find(t => t.id !== currentTrack.id);

  return (
    <>
      <aside className="w-80 sm:w-96 bg-[#121212] border-l border-zinc-800/80 flex flex-col h-full overflow-y-auto select-none shrink-0 z-30 animate-in slide-in-from-right duration-300">
        {/* Top Panel Bar */}
        <div className="sticky top-0 z-20 bg-[#121212]/90 backdrop-blur-md px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-[#1DB954]" />
            <h3 className="font-extrabold text-sm text-white">Vista Sonando Ahora</h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedTrackForOptions(currentTrack)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
              title="Más opciones de este audio"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsNowPlayingOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
              title="Cerrar vista sonando ahora"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-6">
          {/* Main Visualizer Canvas / Video / Album Cover */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 group bg-zinc-950">
            {currentTrack.videoCanvasUrl ? (
              <video
                src={currentTrack.videoCanvasUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            )}

            {/* Dark Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />

            {/* Badge */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-zinc-700/80 text-[10px] font-bold text-zinc-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              <span>Canvas Qamuz HD</span>
            </div>

            {/* Bottom Title inside Canvas */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="flex flex-col min-w-0 pr-2">
                <h2 className="text-lg font-black text-white truncate drop-shadow-md">
                  {currentTrack.title}
                </h2>
                <button
                  onClick={() => navigateTo('artist', currentTrack.artistId)}
                  className="text-xs font-semibold text-zinc-300 hover:text-white hover:underline text-left truncate"
                >
                  {currentTrack.artist}
                </button>
              </div>

              <button
                onClick={() => toggleLikeTrack(currentTrack.id)}
                className={`p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-zinc-700/80 transition-all hover:scale-110 active:scale-95 shrink-0 ${
                  isLiked ? 'text-[#1DB954]' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Real-time Synced Lyrics Card */}
          <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">Letras Sincronizadas</h4>
              </div>

              <button
                onClick={() => setIsLyricsOpen(true)}
                className="text-[11px] font-bold text-[#1DB954] hover:underline flex items-center gap-0.5"
              >
                <span>Expandir</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Lyrics Lines Stream */}
            <div 
              ref={lyricsContainerRef}
              className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 text-sm font-extrabold scrollbar-thin scrollbar-thumb-zinc-700"
            >
              {lyrics.length > 0 ? (
                lyrics.map((line, idx) => {
                  const isActive = idx === currentLyricIndex;
                  return (
                    <p
                      key={idx}
                      onClick={() => seek(line.time)}
                      className={`cursor-pointer transition-all duration-300 py-1 px-2 rounded-lg text-left ${
                        isActive
                          ? 'text-[#1DB954] bg-emerald-500/10 text-base scale-102 font-black border-l-2 border-[#1DB954]'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500 italic py-4 text-center">
                  Sin letras disponibles para este tema.
                </p>
              )}
            </div>
          </div>

          {/* About the Artist Card */}
          <div className="bg-[#181818] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="relative h-28 w-full">
              <img
                src={artistData.bannerUrl || artistData.avatarUrl}
                alt={artistData.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-black/30" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                Acerca del Artista
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h4 className="font-extrabold text-base text-white">{artistData.name}</h4>
                  <span className="text-xs text-zinc-400">
                    {artistData.monthlyListeners.toLocaleString()} oyentes mensuales
                  </span>
                </div>

                <button
                  onClick={() => setIsFollowingArtist(!isFollowingArtist)}
                  className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all border ${
                    isFollowingArtist
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      : 'bg-white text-black border-white hover:scale-105 active:scale-95'
                  }`}
                >
                  {isFollowingArtist ? 'Siguiendo' : 'Seguir'}
                </button>
              </div>

              <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                {artistData.bio}
              </p>

              <button
                onClick={() => navigateTo('artist', artistData.id)}
                className="w-full mt-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl border border-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <span>Ver perfil completo del artista</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Up Next in Queue Card */}
          {nextTrackInQueue && (
            <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-400">A continuación</h4>
                <button
                  onClick={() => navigateTo('queue')}
                  className="text-[11px] font-bold text-[#1DB954] hover:underline"
                >
                  Ver cola
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
                <img
                  src={nextTrackInQueue.coverUrl}
                  alt={nextTrackInQueue.title}
                  className="w-11 h-11 rounded-lg object-cover shrink-0"
                />

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-extrabold text-xs text-white truncate">
                    {nextTrackInQueue.title}
                  </span>
                  <span className="text-[11px] text-zinc-400 truncate">
                    {nextTrackInQueue.artist}
                  </span>
                </div>

                <button
                  onClick={nextTrack}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors shrink-0"
                  title="Reproducir siguiente"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Track options modal if invoked from panel */}
      {selectedTrackForOptions && (
        <TrackOptionsMenu
          track={selectedTrackForOptions}
          isOpen={!!selectedTrackForOptions}
          onClose={() => setSelectedTrackForOptions(null)}
        />
      )}
    </>
  );
};
