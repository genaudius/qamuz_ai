import React, { useState } from 'react';
import { Plus, Heart, Music, ListMusic, Search, Pin, Trash2, Upload } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useTheme } from '../../context/ThemeContext';

export const LibraryView: React.FC = () => {
  const { 
    playlists, 
    likedTrackIds, 
    navigateTo, 
    setIsCreatePlaylistModalOpen,
    setIsAddCustomTrackModalOpen,
    deletePlaylist 
  } = usePlayer();

  const { theme } = useTheme();
  const [searchFilter, setSearchFilter] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'alpha'>('recent');

  const filteredPlaylists = playlists
    .filter(pl => pl.title.toLowerCase().includes(searchFilter.toLowerCase()))
    .sort((a, b) => {
      if (sortMode === 'alpha') return a.title.localeCompare(b.title);
      return 0;
    });

  return (
    <div className="flex flex-col gap-6 pb-12 animate-fade-in select-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            Tu biblioteca
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Gestiona tus listas de reproducción, canciones guardadas y artistas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddCustomTrackModalOpen(true)}
            className={`flex items-center gap-2 font-bold text-xs px-4 py-2.5 rounded-full transition-colors border ${
              theme === 'dark' 
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700' 
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300 shadow-sm'
            }`}
          >
            <Upload className="w-4 h-4 text-[#05e0e9]" />
            <span>Subir Canción</span>
          </button>
          <button
            onClick={() => setIsCreatePlaylistModalOpen(true)}
            className="flex items-center gap-2 bg-[#ffde59] hover:bg-[#fcd338] text-black font-extrabold text-xs px-4 py-2.5 rounded-full transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Crear Playlist</span>
          </button>
        </div>
      </div>

      {/* Filter and Sort bar */}
      <div className={`flex items-center justify-between gap-4 p-3 rounded-xl border ${
        theme === 'dark' ? 'bg-[#181818] border-zinc-800 text-white' : 'bg-zinc-100/60 border-zinc-200 text-zinc-900'
      }`}>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar en tu biblioteca"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
              theme === 'dark' ? 'bg-[#282828] text-white' : 'bg-white border border-zinc-300 text-zinc-950 shadow-sm'
            }`}
          />
        </div>

        <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
          <span>Ordenar por:</span>
          <button 
            onClick={() => setSortMode(sortMode === 'recent' ? 'alpha' : 'recent')}
            className={`font-bold px-3 py-1.5 rounded-md transition-colors capitalize shadow-sm ${
              theme === 'dark' ? 'text-white bg-zinc-800 hover:bg-zinc-700' : 'text-zinc-800 bg-white border border-zinc-300 hover:bg-zinc-100'
            }`}
          >
            {sortMode === 'recent' ? 'Recientes' : 'Alfabético'}
          </button>
        </div>
      </div>

      {/* Grid of Playlists */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* Liked Songs Tile */}
        <div
          onClick={() => navigateTo('liked')}
          className="bg-gradient-to-br from-indigo-700 via-purple-800 to-pink-600 p-5 rounded-xl flex flex-col justify-between cursor-pointer shadow-xl hover:scale-[1.02] transition-all group aspect-square"
        >
          <div className="flex items-center justify-between">
            <Heart className="w-8 h-8 text-white fill-current" />
            <Pin className="w-4 h-4 text-white animate-pulse" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-white">Tus Me Gusta</h3>
            <p className="text-xs text-purple-200 mt-1">{likedTrackIds.length} canciones guardadas</p>
          </div>
        </div>

        {/* User Playlists */}
        {filteredPlaylists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => navigateTo('playlist', pl.id)}
            className={`p-3.5 rounded-xl flex flex-col gap-3 cursor-pointer group relative transition-all ${
              theme === 'dark' 
                ? 'bg-[#2c2c2c] hover:bg-[#383838]' 
                : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 shadow-sm'
            }`}
          >
            <div className={`relative aspect-square w-full rounded-md overflow-hidden shadow ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
              <img 
                src={pl.coverUrl} 
                alt={pl.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{pl.title}</span>
              <span className={`text-xs truncate ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Playlist • {pl.tracks.length} canciones
              </span>
            </div>

            {pl.isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePlaylist(pl.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                title="Eliminar playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
