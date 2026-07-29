import React, { useState } from 'react';
import { Play, Pause, CheckCircle2, Heart, Clock, Music, MoreHorizontal, Edit, Plus, Globe, Instagram, Youtube, Twitter } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { MOCK_ARTISTS } from '../../data/mockData';
import { TrackOptionsMenu } from '../modals/TrackOptionsMenu';
import { Track, Artist } from '../../types/spotify';

interface Props {
  artistId?: string;
}

export const ArtistDetailView: React.FC<Props> = ({ artistId }) => {
  const { 
    allTracks, 
    playTrack, 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    toggleLikeTrack,
    isTrackLiked,
    navigateTo,
    setIsAddCustomTrackModalOpen
  } = usePlayer();

  const { user, openArtistProfileModal } = useAuth();
  const [selectedTrackForOptions, setSelectedTrackForOptions] = useState<Track | null>(null);

  // Check if viewing user's own artist profile
  const userArtist = user?.artistProfile;
  const isOwnArtistProfile = userArtist && (userArtist.id === artistId || artistId === 'me');

  let artist: Artist;
  if (isOwnArtistProfile && userArtist) {
    artist = {
      id: userArtist.id,
      name: userArtist.artistName,
      avatarUrl: userArtist.avatarUrl,
      bannerUrl: userArtist.bannerUrl,
      verified: true,
      monthlyListeners: userArtist.monthlyListeners,
      bio: userArtist.bio,
      topTracks: [],
      albums: []
    };
  } else {
    artist = MOCK_ARTISTS.find(a => a.id === artistId) || MOCK_ARTISTS[0];
  }

  const artistTracks = allTracks.filter(t => 
    t.artistId === artist.id || 
    t.artist.toLowerCase().includes(artist.name.toLowerCase()) ||
    (isOwnArtistProfile && (t.artist.toLowerCase() === artist.name.toLowerCase() || t.artist === user?.name))
  );

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in">
      {/* Artist Hero Banner */}
      <div 
        className="relative h-72 sm:h-80 -mx-6 -mt-6 p-8 flex flex-col justify-end bg-cover bg-center rounded-b-3xl overflow-hidden"
        style={{ backgroundImage: `linear-gradient(to top, rgba(18,18,18,1), rgba(18,18,18,0.2)), url(${artist.bannerUrl})` }}
      >
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 fill-sky-400 text-black" />
            <span>Artista verificado</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            {artist.name}
          </h1>

          <p className="text-sm font-semibold text-zinc-300">
            {artist.monthlyListeners.toLocaleString('es-ES')} oyentes mensuales
          </p>
        </div>
      </div>

      {/* Main Play Controls */}
      <div className="flex items-center gap-4">
        {artistTracks.length > 0 && (
          <button
            onClick={() => {
              const isPlayingArtist = artistTracks.some(t => t.id === currentTrack?.id);
              if (isPlayingArtist && isPlaying) {
                togglePlayPause();
              } else {
                playTrack(artistTracks[0], artistTracks);
              }
            }}
            className="w-14 h-14 rounded-full bg-[#1DB954] text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xl"
          >
            {isPlaying && artistTracks.some(t => t.id === currentTrack?.id) ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>
        )}

        {isOwnArtistProfile ? (
          <>
            <button 
              onClick={openArtistProfileModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs transition-transform hover:scale-105 shadow"
            >
              <Edit className="w-4 h-4" />
              <span>Editar Perfil de Artista</span>
            </button>

            <button 
              onClick={() => setIsAddCustomTrackModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-600 text-white font-bold text-xs hover:border-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Subir Canción</span>
            </button>
          </>
        ) : (
          <button className="px-5 py-2.5 rounded-full border border-zinc-600 text-white font-bold text-xs hover:border-white transition-colors">
            Siguiendo
          </button>
        )}
      </div>

      {/* Popular Tracks Section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white">Lanzamientos y Canciones</h2>

        {artistTracks.length === 0 ? (
          <div className="bg-[#181818] p-8 rounded-2xl border border-zinc-800 text-center space-y-3">
            <Music className="w-12 h-12 text-zinc-600 mx-auto" />
            <p className="text-white font-bold text-base">Aún no hay canciones publicadas para este artista</p>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Utiliza nuestro estudio de música o sube tus archivos MP3/WAV para publicar canciones en tu perfil de artista verificado.
            </p>
            {isOwnArtistProfile && (
              <button 
                onClick={() => setIsAddCustomTrackModalOpen(true)}
                className="inline-flex items-center gap-2 bg-[#1DB954] hover:bg-emerald-400 text-black font-extrabold text-xs px-5 py-2.5 rounded-full transition-transform hover:scale-105 shadow mt-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Publicar Canción Ahora</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
          {artistTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isLiked = isTrackLiked(track.id);

            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, artistTracks)}
                className={`group grid grid-cols-12 gap-4 px-4 py-2.5 items-center rounded-md hover:bg-[#282828] cursor-pointer transition-colors ${
                  isCurrent ? 'bg-zinc-800 text-[#1DB954]' : ''
                }`}
              >
                <div className="col-span-1 text-center text-xs font-mono">
                  {isCurrent && isPlaying ? (
                    <span className="flex items-end justify-center gap-0.5 h-3">
                      <span className="w-0.5 bg-[#1DB954] animate-eq-1" />
                      <span className="w-0.5 bg-[#1DB954] animate-eq-2" />
                    </span>
                  ) : (
                    <span className="group-hover:hidden text-zinc-400">{idx + 1}</span>
                  )}
                  <button className="hidden group-hover:inline-block text-white">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                <div className="col-span-7 sm:col-span-6 flex items-center gap-3 min-w-0">
                  <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded object-cover shrink-0" />
                  <span className={`font-semibold text-sm truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>
                    {track.title}
                  </span>
                </div>

                <div className="hidden sm:block sm:col-span-3 text-xs text-zinc-400 font-mono">
                  {(track.plays || 1204000).toLocaleString('es-ES')} reproducciones
                </div>

                <div className="col-span-4 sm:col-span-2 flex items-center justify-end gap-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLikeTrack(track.id);
                    }}
                    className={`p-1 ${isLiked ? 'text-[#1DB954]' : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white'}`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrackForOptions(track);
                    }}
                    className="p-1 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white transition-opacity rounded-full"
                    title="Más opciones de audio"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  <span className="text-xs text-zinc-400 font-mono w-10 text-right">
                    {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </section>

      {/* Artist Bio */}
      <section className="bg-[#181818] p-6 rounded-2xl border border-zinc-800 flex flex-col gap-3">
        <h2 className="text-xl font-bold text-white">Acerca de {artist.name}</h2>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
          {artist.bio}
        </p>
      </section>

      {/* Track options modal */}
      {selectedTrackForOptions && (
        <TrackOptionsMenu
          track={selectedTrackForOptions}
          isOpen={!!selectedTrackForOptions}
          onClose={() => setSelectedTrackForOptions(null)}
        />
      )}
    </div>
  );
};
