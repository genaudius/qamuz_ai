import React, { useState, useMemo } from 'react';
import { Play, Heart, Search, Music, Disc, User, ListMusic, MoreHorizontal } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { MOCK_CATEGORIES, MOCK_ARTISTS, MOCK_ALBUMS } from '../../data/mockData';
import { TrackOptionsMenu } from '../modals/TrackOptionsMenu';
import { Track } from '../../types/spotify';

export const SearchView: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    allTracks, 
    playlists, 
    playTrack, 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    navigateTo,
    toggleLikeTrack,
    isTrackLiked
  } = usePlayer();

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedTrackForOptions, setSelectedTrackForOptions] = useState<Track | null>(null);

  // Filtered Results
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q && !selectedGenre) return null;

    let matchedTracks = allTracks;
    if (selectedGenre) {
      matchedTracks = matchedTracks.filter(t => t.genre?.toLowerCase().includes(selectedGenre.toLowerCase()));
    }
    if (q) {
      matchedTracks = matchedTracks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.artist.toLowerCase().includes(q) || 
        t.album.toLowerCase().includes(q)
      );
    }

    const matchedArtists = MOCK_ARTISTS.filter(a => a.name.toLowerCase().includes(q));
    const matchedAlbums = MOCK_ALBUMS.filter(al => al.title.toLowerCase().includes(q) || al.artist.toLowerCase().includes(q));
    const matchedPlaylists = playlists.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));

    return {
      tracks: matchedTracks,
      artists: matchedArtists,
      albums: matchedAlbums,
      playlists: matchedPlaylists,
      topResult: matchedTracks[0] || matchedArtists[0] || null
    };
  }, [searchQuery, selectedGenre, allTracks, playlists]);

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fade-in">
      {/* Category or Genre Filter Pills if genre selected */}
      {selectedGenre && (
        <div className="flex items-center justify-between bg-zinc-800/80 p-3 rounded-lg border border-zinc-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-400">Filtrado por género:</span>
            <span className="text-sm font-bold text-[#1DB954] capitalize">{selectedGenre}</span>
          </div>
          <button 
            onClick={() => setSelectedGenre(null)}
            className="text-xs text-zinc-300 hover:text-white underline font-semibold"
          >
            Ver todos los géneros
          </button>
        </div>
      )}

      {/* If No Query or Genre Selected -> Display Explorar Todo Categories */}
      {!searchResults ? (
        <section>
          <h1 className="text-2xl font-extrabold text-white mb-4 tracking-tight">
            Explorar todo
          </h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {MOCK_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedGenre(cat.name)}
                className={`relative aspect-square p-4 rounded-xl overflow-hidden cursor-pointer shadow-lg group hover:scale-[1.02] transition-transform ${cat.color}`}
              >
                <span className="font-bold text-white text-xl leading-tight block max-w-[70%] drop-shadow">
                  {cat.name}
                </span>
                <img 
                  src={cat.imageUrl} 
                  alt={cat.name} 
                  className="absolute -right-3 -bottom-2 w-24 h-24 rotate-[25deg] shadow-2xl rounded-md object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* Display Search Results */
        <div className="flex flex-col gap-8">
          {/* Top Result + Songs Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Result Card */}
            {searchResults.tracks.length > 0 && (
              <div className="lg:col-span-5 flex flex-col gap-3">
                <h2 className="text-xl font-bold text-white">Resultado principal</h2>
                {(() => {
                  const topTrack = searchResults.tracks[0];
                  const isCurrent = currentTrack?.id === topTrack.id;
                  return (
                    <div 
                      onClick={() => playTrack(topTrack, searchResults.tracks)}
                      className="bg-[#181818] hover:bg-[#282828] p-5 rounded-xl flex flex-col gap-4 cursor-pointer relative group transition-all"
                    >
                      <img 
                        src={topTrack.coverUrl} 
                        alt={topTrack.title} 
                        className="w-24 h-24 rounded-md object-cover shadow-2xl"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-2xl font-black text-white">{topTrack.title}</span>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span className="text-white font-medium">{topTrack.artist}</span>
                          <span>•</span>
                          <span className="bg-zinc-800 text-xs px-2 py-0.5 rounded-full text-zinc-300">Canción</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isCurrent && isPlaying) {
                            togglePlayPause();
                          } else {
                            playTrack(topTrack, searchResults.tracks);
                          }
                        }}
                        className={`absolute right-6 bottom-6 w-12 h-12 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-2xl transition-all ${
                          isCurrent && isPlaying ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isCurrent && isPlaying ? <Play className="w-5 h-5 fill-current ml-0.5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Matching Songs List */}
            <div className={`${searchResults.tracks.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col gap-3`}>
              <h2 className="text-xl font-bold text-white">Canciones</h2>
              {searchResults.tracks.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4">No se encontraron canciones para tu búsqueda.</p>
              ) : (
                <div className="flex flex-col">
                  {searchResults.tracks.slice(0, 5).map((track, i) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isLiked = isTrackLiked(track.id);
                    return (
                      <div
                        key={`${track.id}-${i}`}
                        onClick={() => playTrack(track, searchResults.tracks)}
                        className="group flex items-center justify-between p-2 rounded-md hover:bg-[#282828] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded object-cover" />
                          <div className="flex flex-col min-w-0">
                            <span className={`font-semibold text-sm truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>
                              {track.title}
                            </span>
                            <span className="text-xs text-zinc-400 truncate">{track.artist}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLikeTrack(track.id);
                            }}
                            className={`p-1.5 ${isLiked ? 'text-[#1DB954]' : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white'}`}
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
            </div>
          </div>

          {/* Matching Artists */}
          {searchResults.artists.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-white">Artistas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {searchResults.artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => navigateTo('artist', artist.id)}
                    className="bg-[#181818] hover:bg-[#282828] p-4 rounded-xl flex flex-col items-center text-center gap-3 cursor-pointer transition-all"
                  >
                    <img src={artist.avatarUrl} alt={artist.name} className="w-24 h-24 rounded-full object-cover shadow-lg" />
                    <span className="font-bold text-white text-sm truncate w-full">{artist.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Matching Playlists */}
          {searchResults.playlists.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-white">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {searchResults.playlists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => navigateTo('playlist', pl.id)}
                    className="bg-[#181818] hover:bg-[#282828] p-4 rounded-xl flex flex-col gap-3 cursor-pointer transition-all"
                  >
                    <img src={pl.coverUrl} alt={pl.title} className="aspect-square w-full rounded-md object-cover shadow" />
                    <span className="font-bold text-white text-sm truncate">{pl.title}</span>
                    <span className="text-xs text-zinc-400 truncate">Por {pl.ownerName}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

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
