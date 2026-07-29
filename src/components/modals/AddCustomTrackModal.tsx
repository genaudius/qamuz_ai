import React, { useState } from 'react';
import { X, Upload, Music, Image } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Track } from '../../types/spotify';

export const AddCustomTrackModal: React.FC = () => {
  const { isAddCustomTrackModalOpen, setIsAddCustomTrackModalOpen, addCustomTrack, playTrack } = usePlayer();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('Sencillo');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80');

  if (!isAddCustomTrackModalOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setAudioUrl(objectUrl);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrack: Track = {
      id: 'custom-t-' + Date.now(),
      title: title || 'Canción Personalizada',
      artist: artist || 'Artista Desconocido',
      artistId: 'ar-custom',
      album: album || 'Sencillo',
      albumId: 'al-custom',
      coverUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      audioUrl: audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration: 210,
      explicit: false,
      addedAt: new Date().toISOString().split('T')[0]
    };

    addCustomTrack(newTrack);
    setIsAddCustomTrackModalOpen(false);
    playTrack(newTrack);

    // Reset
    setTitle('');
    setArtist('');
    setAudioUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#282828] w-full max-w-md rounded-xl shadow-2xl p-6 border border-zinc-700 animate-in zoom-in-95 duration-150 text-white">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#1DB954]" />
            <h2 className="text-lg font-bold">Añadir tu propia canción</h2>
          </div>
          <button 
            onClick={() => setIsAddCustomTrackModalOpen(false)}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* File Upload Dropzone */}
          <div className="border-2 border-dashed border-zinc-600 hover:border-[#1DB954] rounded-xl p-4 text-center flex flex-col items-center gap-2 bg-[#181818] transition-colors cursor-pointer relative">
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Music className="w-8 h-8 text-[#1DB954]" />
            <span className="text-xs font-bold text-white">Haz clic o arrastra un archivo de audio (MP3, WAV)</span>
            {audioUrl && <span className="text-[11px] text-[#1DB954] font-medium">✓ Archivo cargado correctamente</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300">Título de la canción</label>
            <input 
              type="text"
              placeholder="Mi Canción"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#181818] text-white text-sm rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954] border border-zinc-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300">Artista</label>
            <input 
              type="text"
              placeholder="Nombre del artista"
              required
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="bg-[#181818] text-white text-sm rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954] border border-zinc-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-300">URL de Carátula (Opcional)</label>
            <input 
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="bg-[#181818] text-white text-xs rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#1DB954] border border-zinc-700"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-zinc-700">
            <button
              type="button"
              onClick={() => setIsAddCustomTrackModalOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-bold text-zinc-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full text-xs font-bold bg-[#1DB954] text-black hover:bg-[#1ed760] transition-transform active:scale-95 shadow-lg"
            >
              Añadir y Reproducir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
