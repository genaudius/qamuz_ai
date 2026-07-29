import React, { useState } from 'react';
import { X, Plus, Image } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export const CreatePlaylistModal: React.FC = () => {
  const { isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen, createPlaylist, navigateTo } = usePlayer();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isCreatePlaylistModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPl = createPlaylist(title, description);
    setIsCreatePlaylistModalOpen(false);
    setTitle('');
    setDescription('');
    navigateTo('playlist', newPl.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#282828] w-full max-w-md rounded-xl shadow-2xl p-6 border border-zinc-700 animate-in zoom-in-95 duration-150 text-white">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-700">
          <h2 className="text-xl font-bold">Crear lista de reproducción</h2>
          <button 
            onClick={() => setIsCreatePlaylistModalOpen(false)}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300">Nombre de la lista</label>
            <input 
              type="text"
              placeholder="Mi Playlist #1"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#181818] text-white text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1DB954] border border-zinc-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300">Descripción (Opcional)</label>
            <textarea 
              placeholder="Añade una descripción para tu lista de reproducción..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-[#181818] text-white text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#1DB954] border border-zinc-700 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-zinc-700">
            <button
              type="button"
              onClick={() => setIsCreatePlaylistModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-bold text-zinc-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full text-xs font-bold bg-[#1DB954] text-black hover:bg-[#1ed760] transition-transform active:scale-95 shadow-lg"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
