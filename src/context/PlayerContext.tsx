import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Track, Playlist, ActiveView, RepeatMode, ViewType } from '../types/spotify';
import { MOCK_TRACKS, INITIAL_PLAYLISTS, MOCK_ARTISTS, MOCK_ALBUMS } from '../data/mockData';
import { audioEngine } from '../utils/audioEngine';
import { getLatestTracks } from '../lib/actions/music';
import { getPlaylists } from '../lib/actions/playlists';

interface PlayerContextType {
  // Navigation
  activeView: ActiveView;
  canGoBack: boolean;
  canGoForward: boolean;
  navigateTo: (type: ViewType, id?: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Playback State
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: Track[];

  // Playback Actions
  playTrack: (track: Track, contextTracks?: Track[]) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;

  // Likes & Playlists
  likedTrackIds: string[];
  toggleLikeTrack: (trackId: string) => void;
  isTrackLiked: (trackId: string) => boolean;
  
  playlists: Playlist[];
  createPlaylist: (title?: string, description?: string) => Playlist;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  updatePlaylist: (playlistId: string, title: string, description: string) => void;

  // Track Creation
  allTracks: Track[];
  addCustomTrack: (track: Track) => void;

  // Modals & UI Toggles
  isNowPlayingOpen: boolean;
  setIsNowPlayingOpen: (open: boolean) => void;
  isRecommendationModalOpen: boolean;
  setIsRecommendationModalOpen: (open: boolean) => void;
  isPlanRecommenderOpen: boolean;
  setIsPlanRecommenderOpen: (open: boolean) => void;
  isLyricsOpen: boolean;
  setIsLyricsOpen: (open: boolean) => void;
  isQueueOpen: boolean;
  setIsQueueOpen: (open: boolean) => void;
  playlistToAddToTrack: Track | null;
  setPlaylistToAddToTrack: (track: Track | null) => void;
  isCreatePlaylistModalOpen: boolean;
  setIsCreatePlaylistModalOpen: (open: boolean) => void;
  isAddCustomTrackModalOpen: boolean;
  setIsAddCustomTrackModalOpen: (open: boolean) => void;
  
  // Layout toggles
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isPlayerOpen: boolean;
  setIsPlayerOpen: (open: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- View State & Navigation History ---
  const [history, setHistory] = useState<ActiveView[]>([{ type: 'home' }]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeView = history[historyIndex] || { type: 'home' };
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateTo = (type: ViewType, id?: string) => {
    const newView: ActiveView = { type, id };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newView);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const navigateBack = () => {
    if (canGoBack) {
      setHistoryIndex(prev => prev - 1);
    }
  };

  const navigateForward = () => {
    if (canGoForward) {
      setHistoryIndex(prev => prev + 1);
    }
  };

  // --- Track Catalog & Custom Tracks ---
  const [allTracks, setAllTracks] = useState<Track[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spotify_replica_tracks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse saved tracks', e);
        }
      }
    }
    return MOCK_TRACKS;
  });

  useEffect(() => {
    // Load real tracks from database on mount
    async function fetchDatabaseTracks() {
      try {
        const dbTracks = await getLatestTracks(50);
        if (dbTracks.length > 0) {
          setAllTracks(prev => {
            // Keep custom tracks added by user, prepend DB tracks
            const customTracks = prev.filter(t => t.id.startsWith('custom_'));
            return [...customTracks, ...dbTracks];
          });
        }
      } catch (e) {
        console.error('Failed to fetch DB tracks', e);
      }
    }
    fetchDatabaseTracks();
  }, []);

  useEffect(() => {
    localStorage.setItem('spotify_replica_tracks', JSON.stringify(allTracks));
  }, [allTracks]);

  const addCustomTrack = (track: Track) => {
    setAllTracks(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered];
    });
  };

  // --- Likes State ---
  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('spotify_replica_likes') : null;
    return saved ? JSON.parse(saved) : ['t1', 't2', 't5'];
  });

  useEffect(() => {
    localStorage.setItem('spotify_replica_likes', JSON.stringify(likedTrackIds));
  }, [likedTrackIds]);

  const toggleLikeTrack = (trackId: string) => {
    setLikedTrackIds(prev => 
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId]
    );
  };

  const isTrackLiked = (trackId: string) => likedTrackIds.includes(trackId);

  // --- Playlists State ---
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spotify_replica_playlists');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse saved playlists', e);
        }
      }
    }
    return INITIAL_PLAYLISTS;
  });

  useEffect(() => {
    async function fetchDatabasePlaylists() {
      try {
        const dbPlaylists = await getPlaylists(10);
        if (dbPlaylists.length > 0) {
          setPlaylists(prev => {
            const custom = prev.filter(p => p.id.startsWith('pl-custom-'));
            return [...dbPlaylists, ...custom];
          });
        }
      } catch (e) {
        console.error('Failed to fetch DB playlists', e);
      }
    }
    fetchDatabasePlaylists();
  }, []);

  useEffect(() => {
    localStorage.setItem('spotify_replica_playlists', JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = (title = 'Mi Playlist', description = 'Playlist creada por el usuario.') => {
    const newPl: Playlist = {
      id: 'pl-custom-' + Date.now(),
      title: title || `Mi Playlist #${playlists.filter(p => p.isCustom).length + 1}`,
      description: description || 'Sin descripción',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      isCustom: true,
      tracks: [],
      ownerName: 'Tú',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setPlaylists(prev => [newPl, ...prev]);
    return newPl;
  };

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        if (pl.tracks.some(t => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    }));
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    }));
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    if (activeView.type === 'playlist' && activeView.id === playlistId) {
      navigateTo('home');
    }
  };

  const updatePlaylist = (playlistId: string, title: string, description: string) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, title, description };
      }
      return pl;
    }));
  };

  // --- Playback State ---
  const [currentTrack, setCurrentTrack] = useState<Track | null>(allTracks[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(allTracks[0].duration || 180);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(0.8);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Track[]>(allTracks.slice(1));

  // Modals state
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState<boolean>(false);
  const [isPlanRecommenderOpen, setIsPlanRecommenderOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [playlistToAddToTrack, setPlaylistToAddToTrack] = useState<Track | null>(null);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState<boolean>(false);
  const [isAddCustomTrackModalOpen, setIsAddCustomTrackModalOpen] = useState<boolean>(false);

  // Setup audioEngine callbacks
  useEffect(() => {
    audioEngine.setCallbacks({
      onTimeUpdate: (time) => setCurrentTime(time),
      onDurationChange: (dur) => setDuration(dur),
      onEnded: () => handleTrackEnded()
    });
    audioEngine.setVolume(volume);
  }, []);

  // Handle Track Ended
  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'track' && currentTrack) {
      audioEngine.seek(0);
      audioEngine.resume();
      setIsPlaying(true);
      return;
    }

    if (queue.length > 0) {
      const next = queue[0];
      setQueue(prev => prev.slice(1));
      setCurrentTrack(next);
      setDuration(next.duration || 180);
      setCurrentTime(0);
      audioEngine.loadAndPlay(next.id, next.audioUrl, next.duration);
      setIsPlaying(true);
    } else if (repeatMode === 'queue') {
      // Loop queue from initial tracks
      const reshuffled = [...allTracks];
      if (reshuffled.length > 0) {
        const next = reshuffled[0];
        setQueue(reshuffled.slice(1));
        setCurrentTrack(next);
        setDuration(next.duration || 180);
        setCurrentTime(0);
        audioEngine.loadAndPlay(next.id, next.audioUrl, next.duration);
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(false);
    }
  }, [repeatMode, queue, currentTrack, allTracks]);

  const playTrack = (track: Track, contextTracks?: Track[]) => {
    audioEngine.initOnUserGesture();
    setCurrentTrack(track);
    setDuration(track.duration || 180);
    setCurrentTime(0);
    setIsNowPlayingOpen(true);

    if (contextTracks && contextTracks.length > 0) {
      const index = contextTracks.findIndex(t => t.id === track.id);
      let newQueue = index !== -1 ? contextTracks.slice(index + 1) : contextTracks;
      if (isShuffle) {
        newQueue = [...newQueue].sort(() => Math.random() - 0.5);
      }
      setQueue(newQueue);
    }

    audioEngine.loadAndPlay(track.id, track.audioUrl, track.duration);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    audioEngine.initOnUserGesture();
    if (!currentTrack) {
      if (allTracks.length > 0) {
        playTrack(allTracks[0]);
      }
      return;
    }

    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.resume();
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    if (queue.length > 0) {
      const next = queue[0];
      setQueue(prev => prev.slice(1));
      playTrack(next);
    } else {
      // Fallback next in allTracks
      if (!currentTrack) return;
      const idx = allTracks.findIndex(t => t.id === currentTrack.id);
      const nextIdx = (idx + 1) % allTracks.length;
      playTrack(allTracks[nextIdx]);
    }
  };

  const previousTrack = () => {
    if (currentTime > 3) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    if (!currentTrack) return;
    const idx = allTracks.findIndex(t => t.id === currentTrack.id);
    const prevIdx = idx > 0 ? idx - 1 : allTracks.length - 1;
    playTrack(allTracks[prevIdx]);
  };

  const seek = (seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    setIsMuted(vol === 0);
    audioEngine.setVolume(vol);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolumeState(prevVolume || 0.8);
      audioEngine.setVolume(prevVolume || 0.8);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      setVolumeState(0);
      audioEngine.setVolume(0);
    }
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => {
      const nextVal = !prev;
      if (nextVal && queue.length > 0) {
        setQueue(q => [...q].sort(() => Math.random() - 0.5));
      }
      return nextVal;
    });
  };

  const cycleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'queue';
      if (prev === 'queue') return 'track';
      return 'off';
    });
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  // Layout toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPlayerOpen, setIsPlayerOpen] = useState(true);

  return (
    <PlayerContext.Provider
      value={{
        activeView,
        canGoBack,
        canGoForward,
        navigateTo,
        navigateBack,
        navigateForward,
        searchQuery,
        setSearchQuery,

        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        queue,

        playTrack,
        togglePlayPause,
        nextTrack,
        previousTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
        removeFromQueue,

        likedTrackIds,
        toggleLikeTrack,
        isTrackLiked,

        playlists,
        createPlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        deletePlaylist,
        updatePlaylist,

        allTracks,
        addCustomTrack,

        isNowPlayingOpen,
        setIsNowPlayingOpen,
        isRecommendationModalOpen,
        setIsRecommendationModalOpen,
        isPlanRecommenderOpen,
        setIsPlanRecommenderOpen,
        isLyricsOpen,
        setIsLyricsOpen,
        isQueueOpen,
        setIsQueueOpen,
        playlistToAddToTrack,
        setPlaylistToAddToTrack,
        isCreatePlaylistModalOpen,
        setIsCreatePlaylistModalOpen,
        isAddCustomTrackModalOpen,
        setIsAddCustomTrackModalOpen,

        isSidebarOpen,
        setIsSidebarOpen,
        isPlayerOpen,
        setIsPlayerOpen
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
