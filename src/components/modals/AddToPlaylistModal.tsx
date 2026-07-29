import React from 'react';
import { X, Plus, Check } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export const AddToPlaylistModal: React.FC = () => {
  const { playlistToAddToTrack, setPlaylistToAddToTrack, playlists, addTrackToPlaylist, createPlaylist } = usePlayer();

  if (!playlistToAddToTrack) return null;

  const track = playlistToAddToTrack;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#282828] w-full max-w-sm rounded-xl shadow-2xl p-6 border border-zinc-700 animate-in zoom-in-95 duration-150 text-white">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-700">
          <div className="flex flex-col">
            <h2 className="text-base font-bold">Añadir a playlist</h2>
            <p className="text-xs text-zinc-400 truncate max-w-[200px]">{track.title} - {track.artist}</p>
          </div>
          <button 
            onClick={() => setPlaylistToAddToTrack(null)}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2 my-4 max-h-60 overflow-y-auto pr-1">
          <button
            onClick={() => {
              const newPl = createPlaylist(`Mi Playlist con ${track.title}`);
              addTrackToPlaylist(newPl.id, track);
              setPlaylistToAddToTrack(null);
            }}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-left transition-colors font-bold text-xs text-[#1DB954]"
          >
            <Plus className="w-4 h-4" />
            <span>Crear nueva playlist</span>
          </button>

          {playlists.map((pl) => {
            const hasTrack = pl.tracks.some(t => t.id === track.id);
            return (
              <button
                key={pl.id}
                onClick={() => {
                  addTrackToPlaylist(pl.id, track);
                  setPlaylistToAddToTrack(null);
                }}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-700 text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img src={pl.coverUrl} alt={pl.title} className="w-10 h-10 rounded object-cover" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-white truncate">{pl.title}</span>
                    <span className="text-[10px] text-zinc-400">{pl.tracks.length} canciones</span>
                  </div>
                </div>

                {hasTrack && <Check className="w-4 h-4 text-[#1DB954]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
