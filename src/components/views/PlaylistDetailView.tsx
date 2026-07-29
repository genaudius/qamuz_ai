import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Heart, 
  Clock, 
  MoreHorizontal, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Music,
  PlusCircle,
  Shuffle
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useTheme } from '../../context/ThemeContext';
import { Track } from '../../types/spotify';
import { TrackOptionsMenu } from '../modals/TrackOptionsMenu';

interface Props {
  playlistId?: string;
  isLikedView?: boolean;
}

export const PlaylistDetailView: React.FC<Props> = ({ playlistId, isLikedView = false }) => {
  const { 
    playlists, 
    allTracks, 
    likedTrackIds, 
    playTrack, 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    toggleLikeTrack,
    isTrackLiked,
    removeTrackFromPlaylist,
    updatePlaylist,
    setPlaylistToAddToTrack,
    navigateTo
  } = usePlayer();

  const { theme } = useTheme();
  const [filterQuery, setFilterQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTrackForOptions, setSelectedTrackForOptions] = useState<Track | null>(null);

  // Determine playlist data
  let playlist = playlists.find(p => p.id === playlistId);
  let tracks: Track[] = [];
  let title = playlist?.title || 'Playlist';
  let description = playlist?.description || '';
  let coverUrl = playlist?.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
  let ownerName = playlist?.ownerName || 'Spotify';

  if (isLikedView) {
    title = 'Tus Me Gusta';
    description = 'Todas las canciones que has marcado con me gusta en tu biblioteca.';
    coverUrl = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80';
    ownerName = 'Tú';
    tracks = allTracks.filter(t => likedTrackIds.includes(t.id));
  } else if (playlist) {
    tracks = playlist.tracks;
  }

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 180), 0);
  const totalMins = Math.floor(totalDuration / 60);

  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);

  const handleSaveEdit = () => {
    if (playlist) {
      updatePlaylist(playlist.id, editTitle, editDesc);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fade-in select-none">
      {/* Playlist Hero Banner */}
      <div className={`flex flex-col sm:flex-row items-center sm:items-end gap-6 bg-gradient-to-b ${
        theme === 'dark' ? 'from-zinc-800/80 via-zinc-900/60' : 'from-zinc-200/80 via-zinc-100/40'
      } to-transparent p-6 -mx-6 -mt-6 rounded-b-3xl`}>
        <div className={`w-48 h-48 sm:w-56 sm:h-56 shrink-0 shadow-2xl rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        </div>

        <div className="flex flex-col gap-3 min-w-0 flex-1 text-center sm:text-left">
          <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
            {isLikedView ? 'Lista Guardada' : 'Playlist pública'}
          </span>

          {isEditing && playlist?.isCustom ? (
            <div className="flex flex-col gap-2 max-w-md">
              <input 
                type="text" 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)}
                className={`font-black text-2xl px-3 py-1.5 rounded focus:outline-none border ${
                  theme === 'dark' ? 'bg-zinc-800 text-white border-zinc-600' : 'bg-white text-zinc-900 border-zinc-300 shadow-sm'
                }`}
              />
              <textarea 
                value={editDesc} 
                onChange={(e) => setEditDesc(e.target.value)}
                className={`text-xs px-3 py-1.5 rounded focus:outline-none border h-16 resize-none ${
                  theme === 'dark' ? 'bg-zinc-800 text-zinc-300 border-zinc-600' : 'bg-white text-zinc-700 border-zinc-300 shadow-sm'
                }`}
              />
              <button 
                onClick={handleSaveEdit}
                className="self-start bg-[#ffde59] hover:bg-[#fcd338] text-black font-extrabold text-xs px-4 py-1.5 rounded-full shadow"
              >
                Guardar cambios
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <h1 className={`text-4xl sm:text-6xl font-black tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                  {title}
                </h1>
                {playlist?.isCustom && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className={`p-2 rounded-full transition-colors ${
                      theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                    title="Editar playlist"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className={`text-sm max-w-2xl ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>{description}</p>
            </>
          )}

          <div className={`flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'} mt-1`}>
            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{ownerName}</span>
            <span>•</span>
            <span>{tracks.length} canciones, aprox. {totalMins} min</span>
          </div>
        </div>
      </div>

      {/* Play Controls & Search Filter Bar */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (tracks.length > 0) {
                const isPlayingThisContext = tracks.some(t => t.id === currentTrack?.id);
                if (isPlayingThisContext && isPlaying) {
                  togglePlayPause();
                } else {
                  playTrack(tracks[0], tracks);
                }
              }
            }}
            disabled={tracks.length === 0}
            className={`w-14 h-14 rounded-full bg-[#ffde59] text-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-xl ${
              tracks.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isPlaying && tracks.some(t => t.id === currentTrack?.id) ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Search within Playlist */}
        <div className="relative max-w-xs">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar en esta lista"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className={`text-xs rounded-full pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 w-48 focus:w-64 transition-all ${
              theme === 'dark' ? 'bg-[#181818] text-white' : 'bg-zinc-100 text-zinc-950 border border-zinc-300 shadow-sm'
            }`}
          />
        </div>
      </div>

      {/* Tracks Table */}
      <div className={`flex flex-col text-sm font-sans ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {/* Table Header */}
        <div className={`grid grid-cols-12 gap-4 px-4 py-2.5 border-b text-xs font-semibold uppercase tracking-wider ${
          theme === 'dark' ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
        }`}>
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-6 sm:col-span-5">Título</div>
          <div className="hidden sm:block sm:col-span-4">Álbum</div>
          <div className="col-span-5 sm:col-span-2 text-right pr-4">
            <Clock className="w-4 h-4 inline-block" />
          </div>
        </div>

        {/* Tracks List */}
        {filteredTracks.length === 0 ? (
          <div className="py-12 text-center text-sm">
            Esta lista no contiene canciones actualmente.
          </div>
        ) : (
          filteredTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isLiked = isTrackLiked(track.id);

            return (
              <div
                key={track.id + '-' + idx}
                onClick={() => playTrack(track, tracks)}
                className={`group grid grid-cols-12 gap-4 px-4 py-2.5 items-center rounded-md cursor-pointer transition-colors ${
                  theme === 'dark' ? 'hover:bg-[#282828]' : 'hover:bg-zinc-100'
                } ${
                  isCurrent ? (theme === 'dark' ? 'bg-zinc-800/80 text-[#05e0e9]' : 'bg-zinc-100 text-[#05e0e9]') : ''
                }`}
              >
                {/* Index / Play Button */}
                <div className="col-span-1 text-center text-xs font-mono">
                  {isCurrent && isPlaying ? (
                    <span className="flex items-end justify-center gap-0.5 h-3">
                      <span className="w-0.5 bg-[#05e0e9] animate-eq-1" />
                      <span className="w-0.5 bg-[#05e0e9] animate-eq-2" />
                      <span className="w-0.5 bg-[#05e0e9] animate-eq-3" />
                    </span>
                  ) : (
                    <span className={`group-hover:hidden ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{idx + 1}</span>
                  )}
                  <button className={`hidden group-hover:inline-block ${theme === 'dark' ? 'text-white' : 'text-zinc-800'}`}>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                {/* Track Title & Cover */}
                <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                  <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded object-cover shrink-0 shadow" />
                  <div className="flex flex-col min-w-0">
                    <span className={`font-semibold text-sm truncate ${
                      isCurrent 
                        ? 'text-[#05e0e9]' 
                        : (theme === 'dark' ? 'text-white' : 'text-zinc-900')
                    }`}>
                      {track.title}
                    </span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo('artist', track.artistId);
                      }}
                      className={`text-xs hover:underline cursor-pointer truncate ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}
                    >
                      {track.artist}
                    </span>
                  </div>
                </div>

                {/* Album Name */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateTo('album', track.albumId);
                  }}
                  className={`hidden sm:block sm:col-span-4 text-xs hover:underline truncate cursor-pointer ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  {track.album}
                </div>

                {/* Duration & Actions */}
                <div className="col-span-5 sm:col-span-2 flex items-center justify-end gap-3 pr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLikeTrack(track.id);
                    }}
                    className={`p-1 transition-transform ${isLiked ? 'text-[#ffde59]' : `text-zinc-400 opacity-0 group-hover:opacity-100 ${theme === 'dark' ? 'hover:text-white' : 'hover:text-zinc-800'}`}`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistToAddToTrack(track);
                    }}
                    className={`p-1 opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'}`}
                    title="Añadir a lista"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrackForOptions(track);
                    }}
                    className={`p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full ${theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'}`}
                    title="Más opciones del audio"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {playlist?.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrackFromPlaylist(playlist.id, track.id);
                      }}
                      className="p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-opacity"
                      title="Quitar de la playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <span className={`text-xs font-mono w-10 text-right ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

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
