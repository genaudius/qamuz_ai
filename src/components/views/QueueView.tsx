import React, { useState } from 'react';
import { X, Play, Trash2, ListOrdered, Music, MoreHorizontal } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { TrackOptionsMenu } from '../modals/TrackOptionsMenu';
import { Track } from '../../types/spotify';

export const QueueView: React.FC = () => {
  const { currentTrack, queue, setIsQueueOpen, removeFromQueue, playTrack } = usePlayer();
  const [selectedTrackForOptions, setSelectedTrackForOptions] = useState<Track | null>(null);

  return (
    <div className="fixed right-0 top-0 bottom-24 md:bottom-20 z-40 w-full sm:w-96 bg-[#121212] border-l border-zinc-800 shadow-2xl p-4 sm:p-5 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <ListOrdered className="w-5 h-5 text-[#1DB954]" />
          <span>Cola de reproducción</span>
        </div>
        <button 
          onClick={() => setIsQueueOpen(false)}
          className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Currently Playing */}
      {currentTrack && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sonando ahora</span>
          <div className="flex items-center justify-between gap-3 p-2 bg-zinc-800/80 rounded-lg">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-12 h-12 rounded object-cover" />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-[#1DB954] truncate">{currentTrack.title}</span>
                <span className="text-xs text-zinc-400 truncate">{currentTrack.artist}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedTrackForOptions(currentTrack)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700"
              title="Más opciones de audio"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Up Next List */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">A continuación ({queue.length})</span>
        
        {queue.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">No hay más canciones en la cola.</p>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto pr-1">
            {queue.map((track, idx) => (
              <div 
                key={track.id + '-' + idx}
                onClick={() => playTrack(track, queue.slice(idx))}
                className="group flex items-center justify-between p-2 rounded-lg hover:bg-[#282828] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs font-mono text-zinc-500 w-4">{idx + 1}</span>
                  <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded object-cover" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-white truncate">{track.title}</span>
                    <span className="text-[11px] text-zinc-400 truncate">{track.artist}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrackForOptions(track);
                    }}
                    className="p-1 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Más opciones"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Quitar de la cola"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
