import React from 'react';
import { Mic2, X, Music, Disc } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';

export const LyricsView: React.FC = () => {
  const { currentTrack, currentTime, setIsLyricsOpen } = usePlayer();

  if (!currentTrack) return null;

  const lyrics = currentTrack.lyrics || [
    { time: 0, text: "(Esta canción no tiene letras sincronizadas disponibles)" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-950 via-zinc-950 to-black p-6 sm:p-12 flex flex-col justify-between overflow-y-auto animate-fade-in text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Mic2 className="w-5 h-5 text-[#1DB954]" />
          </div>
          <div>
            <h3 className="font-bold text-base">{currentTrack.title}</h3>
            <p className="text-xs text-zinc-400">{currentTrack.artist}</p>
          </div>
        </div>

        <button 
          onClick={() => setIsLyricsOpen(false)}
          className="p-2 rounded-full bg-black/40 hover:bg-white/20 text-white transition-colors"
          title="Cerrar letras"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Lyrics Body */}
      <div className="my-auto max-w-4xl mx-auto w-full py-8 flex flex-col items-center gap-6 text-center">
        {lyrics.map((line, idx) => {
          const nextLineTime = lyrics[idx + 1]?.time ?? Infinity;
          const isActive = currentTime >= line.time && currentTime < nextLineTime;

          return (
            <p 
              key={idx}
              className={`transition-all duration-300 font-extrabold tracking-tight ${
                isActive 
                  ? 'text-3xl sm:text-5xl text-white scale-105 drop-shadow-[0_0_20px_rgba(29,185,84,0.6)]' 
                  : 'text-xl sm:text-2xl text-zinc-500 hover:text-zinc-300 cursor-pointer'
              }`}
            >
              {line.text}
            </p>
          );
        })}
      </div>

      {/* Bottom Visualizer Indicator */}
      <div className="flex items-center justify-center gap-1 h-8 opacity-60">
        <span className="w-1.5 bg-[#1DB954] rounded-full animate-eq-1" />
        <span className="w-1.5 bg-[#1DB954] rounded-full animate-eq-2" />
        <span className="w-1.5 bg-[#1DB954] rounded-full animate-eq-3" />
        <span className="w-1.5 bg-[#1DB954] rounded-full animate-eq-4" />
      </div>
    </div>
  );
};
