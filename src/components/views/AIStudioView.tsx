import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Music, 
  Video, 
  Image as ImageIcon,
  Play, 
  Pause, 
  Plus, 
  Check, 
  Wand2, 
  Film, 
  Disc, 
  Download, 
  Eye, 
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Palette,
  Maximize2,
  Lock,
  Zap,
  Radio,
  TrendingUp,
  Flame,
  Search,
  ChevronDown,
  CheckCircle2,
  User,
  Upload,
  X
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Track } from '../../types/spotify';

interface GeneratedSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  bpm: number;
  key: string;
  lyrics: { time: number; text: string }[];
  fullLyricsText: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
}

interface GeneratedVideo {
  id: string;
  title: string;
  prompt: string;
  style: string;
  cameraMotion: string;
  thumbnailUrl: string;
  sceneFrames: string[];
  createdAt: string;
  songTitle?: string;
}

interface GeneratedImage {
  id: string;
  title: string;
  prompt: string;
  style: string;
  category: string;
  aspectRatio: string;
  imageUrl: string;
  createdAt: string;
}

export const AIStudioView: React.FC = () => {
  const { allTracks, addCustomTrack, playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const { user, consumeCredit, openAuthModal, openAIUpsellModal } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'music' | 'video' | 'image'>('music');

  // Music Creator Form States
  const [songPrompt, setSongPrompt] = useState('');
  const [aiMusicEngine, setAiMusicEngine] = useState<'music_v1' | 'music_v2' | 'music_v3'>('music_v1');
  const [genre, setGenre] = useState('Reggaeton');
  const [mood, setMood] = useState('Party & Dance');
  const [vocalStyle, setVocalStyle] = useState('Female Voice');
  const [InstrumentalOnly, setInstrumentalOnly] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customLyrics, setCustomLyrics] = useState('');
  const [showAdvancedMusic, setShowAdvancedMusic] = useState(false);

  // Dynamic tags state
  const [dynamicGenres, setDynamicGenres] = useState<string[]>([]);
  const [dynamicTags, setDynamicTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/music-tags')
      .then(res => res.json())
      .then(data => {
        if (data.genres && data.genres.length > 0) {
          // Take a random sample or slice to avoid cluttering the UI
          setDynamicGenres(data.genres.sort(() => 0.5 - Math.random()).slice(0, 15));
        }
        if (data.tags && data.tags.length > 0) {
          setDynamicTags(data.tags.sort(() => 0.5 - Math.random()).slice(0, 15));
        }
      })
      .catch(err => console.error('Failed to fetch music tags', err));
  }, []);

  // Video Creator Form States
  const [videoType, setVideoType] = useState<'music-video' | 'lyrics-video'>('music-video');
  const [selectedSongTrack, setSelectedSongTrack] = useState<Track | GeneratedSong | null>(null);
  const [isSelectSongModalOpen, setIsSelectSongModalOpen] = useState(false);
  const [songModalSearch, setSongModalSearch] = useState('');

  // 30s Viral Hook / Engagement Mode
  const [is30sViralHook, setIs30sViralHook] = useState(true);

  // Video Options & Form
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoStyle, setVideoStyle] = useState('Ink style');
  const [cameraMotion, setCameraMotion] = useState('Zoom in y barrido dinÃ¡mico');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16' | '3:4' | '4:3'>('16:9');
  const [selectedSongForVideo, setSelectedSongForVideo] = useState<string>('');
  const [videoGenMode, setVideoGenMode] = useState<'one-click' | 'storyboard'>('one-click');

  // MV Character & LipSync
  const [selectedCharacter, setSelectedCharacter] = useState('character-1');
  const [noCharacter, setNoCharacter] = useState(false);
  const [lipSyncEnabled, setLipSyncEnabled] = useState(true);

  // Background Selection
  const [selectedBackground, setSelectedBackground] = useState('bg-1');
  const [randomBackground, setRandomBackground] = useState(false);

  // Vibe Tags
  const [selectedVibeTags, setSelectedVibeTags] = useState<string[]>(['Chill', 'Viral Hook 30s']);

  // Dropdown Toggles
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isRatioDropdownOpen, setIsRatioDropdownOpen] = useState(false);

  // Image Creator Form States
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('Album Cover 3D Neo-Futurista');
  const [imageCategory, setImageCategory] = useState<'album-cover' | 'artist-avatar' | 'promo-poster' | 'concept-art'>('album-cover');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '3:4'>('1:1');

  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicProgressText, setMusicProgressText] = useState('Creating track...');
  const [videoProgress, setVideoProgress] = useState(0);
  const [imageProgress, setImageProgress] = useState(0);

  // Saved Generation Results
  const [generatedSongs, setGeneratedSongs] = useState<GeneratedSong[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());
  
  // Modals
  const [selectedVideoModal, setSelectedVideoModal] = useState<GeneratedVideo | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<GeneratedImage | null>(null);

  // Secret Spotify & Last.fm Hit Trend Presets
  const trendPresets = [
    {
      name: 'Neo-Perreo Cyber 2026',
      icon: 'ðŸ”¥',
      genre: 'Reggaeton',
      mood: 'Party & Dance',
      vocalStyle: 'Efecto Vocoder/AutoTune',
      bpm: 100,
      prompt: 'ReggaetÃ³n futurista with bajo synth 808 profundo, dembow moderno pegajoso y sintes galÃ¡cticos a 100 BPM'
    },
    {
      name: 'Afrobeat Sunset',
      icon: 'ðŸŒ´',
      genre: 'Pop Latino',
      mood: 'Motivacional',
      vocalStyle: 'Female Voice',
      bpm: 108,
      prompt: 'Afrobeat latino veraniego with guitarras tropicales limpias, percusiÃ³n suave y armonÃ­as vocales envolventes'
    },
    {
      name: 'Bachata Sensual',
      icon: 'ðŸ’ƒ',
      genre: 'Bachata',
      mood: 'Melancholic & RomÃ¡ntico',
      vocalStyle: 'DÃºo ArmÃ³nico',
      bpm: 128,
      prompt: 'Bachata urbana apasionada with requinto virtuoso, bajo fluido y ritmo bailable a 128 BPM'
    },
    {
      name: 'Synthwave Funk Retro',
      icon: 'ðŸŽ¹',
      genre: 'Synthwave',
      mood: 'Party & Dance',
      vocalStyle: 'Male Voice',
      bpm: 118,
      prompt: 'Synthwave de los 80s with bajo funk slap, pads neÃ³n de ensueÃ±o y ritmo electro pop pegajoso'
    },
    {
      name: 'Trap Soul Melancholic',
      icon: 'ðŸŽ¤',
      genre: 'Trap Urbano',
      mood: 'Melancholic & RomÃ¡ntico',
      vocalStyle: 'Efecto Vocoder/AutoTune',
      bpm: 140,
      prompt: 'Trap soul nocturno with hi-hats rÃ¡pidos, piano Melancholic profundo y voces procesadas with vibe'
    },
    {
      name: 'Cumbia ElectrÃ³nica Tribal',
      icon: 'ðŸŽ·',
      genre: 'Cumbia',
      mood: 'Party & Dance',
      vocalStyle: 'DÃºo ArmÃ³nico',
      bpm: 115,
      prompt: 'Cumbia electrÃ³nica bailable with acordeÃ³n envolvente, sintetizador analÃ³gico y guiro dinÃ¡mico'
    }
  ];

  const applyTrendPreset = (preset: typeof trendPresets[0]) => {
    setGenre(preset.genre);
    setMood(preset.mood);
    setVocalStyle(preset.vocalStyle);
    setSongPrompt(preset.prompt);
  };

  // Presets
  const genrePresets = dynamicGenres.length > 0 ? dynamicGenres : [
    'Reggaeton', 'Pop Latino', 'Trap Urbano', 'Salsa', 'Bachata', 
    'Cumbia', 'Synthwave', 'Electronic EDM', 'Lo-Fi Chill', 'Rock Alternativo'
  ];

  const moodPresets = dynamicTags.length > 0 ? dynamicTags : [
    'Party & Dance', 'Melancholic & RomÃ¡ntico', 'Motivacional', 'Ã‰pico & Intenso', 'Relajante'
  ];

  const vocalPresets = [
    'Female Voice', 'Male Voice', 'DÃºo ArmÃ³nico', 'Efecto Vocoder/AutoTune', 'Instrumental'
  ];

  const videoStylePresets = [
    'CinemÃ¡tico Ultra HD', 'Cyberpunk NeÃ³n', 'Anime 3D NextGen', 
    'Fotorrealista Estudio', 'VHS Retro 80s', 'Surrealista FantasÃ­a', 'Unreal Engine 5 Render'
  ];

  const cameraPresets = [
    'Zoom in y barrido dinÃ¡mico', 'Ã“rbita 360 alrededor del artista', 
    'Toma aÃ©rea with dron', 'CÃ¡mara lenta a 120fps', 'Travelling lateral fluido'
  ];

  const mvCharacters = [
    { id: 'character-1', name: 'Cyber Singer A', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
    { id: 'character-2', name: 'Cyber Singer B', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80' },
    { id: 'character-3', name: 'Urban Vocalist', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
    { id: 'character-4', name: 'Futuristic Diva', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80' },
    { id: 'character-5', name: 'Neon Pop Idol', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80' },
    { id: 'character-6', name: 'Anime Vocal', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80' },
  ];

  const mvBackgrounds = [
    { id: 'bg-office', name: 'Office Neon', img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&auto=format&fit=crop&q=80' },
    { id: 'bg-garden', name: 'Pink Garden', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80' },
    { id: 'bg-cyber', name: 'Cyber Grid', img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80' },
    { id: 'bg-stage', name: 'withcert Stage', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80' },
    { id: 'bg-studio', name: 'Studio Lights', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80' },
  ];

  const mvVisualStyles = [
    { id: 'Ink style', name: 'Ink style', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=300&auto=format&fit=crop&q=80' },
    { id: 'Retro neon', name: 'Retro neon', img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80' },
    { id: 'Liminal space', name: 'Liminal space', img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80' },
    { id: 'Vintage film', name: 'Vintage film', img: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=300&auto=format&fit=crop&q=80' },
    { id: 'Synthwave', name: 'Synthwave', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80' },
    { id: 'Cyberweird', name: 'Cyberweird', img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&auto=format&fit=crop&q=80' },
    { id: 'Dark realism', name: 'Dark realism', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80' },
  ];

  const vibeOptions = [
    'Chill', 'Sad', 'Happy', 'Romantic', 'Nostalgic', 'Dreamy', 'Melancholic', 'Lonely', 'Energetic', 'Viral Hook 30s', 'Hard Beat'
  ];

  const imageStylePresets = [
    'Album Cover 3D Neo-Futurista', 'IlustraciÃ³n PsicodÃ©lica', 'Fotorrealismo Estudio 8K',
    'Pixel Art NeÃ³n Retro', 'Ã“leo Surrealista Ã‰pico', 'DiseÃ±o Minimalista Vectorial', 'Cyberpunk NeÃ³n'
  ];

  // Handle Music Generation
  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto construct prompt if not specified manually
    const effectivePrompt = songPrompt.trim() || customTitle.trim() || customLyrics.trim() || `Musical hit of ${genre} style ${mood} with ${vocalStyle}`;

    if (!user) {
      openAuthModal('register');
      return;
    }

    if (!consumeCredit(1)) {
      openAIUpsellModal();
      return;
    }

    setIsGeneratingMusic(true);
    setMusicProgress(5);
    setMusicProgressText(aiMusicEngine === 'music_v1' ? 'Starting Quantum Audio Engine...' : 'Starting generation...');

    let progressTimer = setInterval(() => {
      setMusicProgress((prev) => (prev >= 90 ? 90 : prev + 5));
    }, 1500);

    const pollTask = async (taskId: string, provider: string): Promise<any> => {
      let attempts = 0;
      while (attempts < 60) { // 10 mins max (10s interval)
        try {
          const res = await fetch(`/api/ai/generate-song?taskId=${taskId}&provider=${provider}`);
          const data = await res.json();
          if (data.status === 'done') return data;
          if (data.status === 'error') throw new Error(data.error);
        } catch (err: any) {
          if (err.message) throw err;
        }
        await new Promise(r => setTimeout(r, 10000));
        attempts++;
      }
      throw new Error('Request timed out.');
    };

    const submitTask = async (engine: string) => {
      const isCustom = Boolean(customLyrics.trim());
      const finalPrompt = isCustom ? customLyrics : effectivePrompt;
      const finalStyle = isCustom ? `${genre} ${mood} ${vocalStyle}`.trim() : undefined;

      const response = await fetch('/api/ai/generate-song', {
        method: 'POST',
        headers: { 'content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          genre,
          mood,
          vocalStyle,
          InstrumentalOnly,
          title: customTitle,
          customMode: isCustom,
          style: finalStyle,
          modelId: engine
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        if (data.type === 'usage_limit_exceeded') {
          // Special specific error object for custom handling
          throw { isUsageLimit: true, message: data.error };
        }
        throw new Error(data.error || 'Request failed.');
      }
      return data;
    };

    try {
      // 1. Primer intento
      let taskData;
      let finalData;

      try {
        taskData = await submitTask(aiMusicEngine);
        
        if (taskData.taskId) {
          // Asynchronous
          setMusicProgressText(`Generating your music... (this may take a few minutes)`);
          finalData = await pollTask(taskData.taskId, taskData.provider);
        } else {
          // Synchronous
          finalData = taskData;
        }
      } catch (submitOrPollErr: any) {
        throw submitOrPollErr;
      }

      clearInterval(progressTimer);
      setMusicProgress(100);
      setMusicProgressText('Song ready!');

      const newSong: GeneratedSong = {
        id: finalData.musicId || finalData.song?.id || `m_${Date.now()}`,
        title: finalData.title || finalData.song?.title || customTitle || genre,
        artist: 'Qamuz AI',
        album: 'AI Studio Sessions',
        genre: genre,
        bpm: 120,
        key: 'C Maj',
        lyrics: [],
        fullLyricsText: finalData.lyrics || finalData.song?.lyrics || customLyrics || '',
        coverUrl: finalData.coverUrl || finalData.imageUrl || finalData.song?.imageUrl || finalData.song?.coverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
        audioUrl: finalData.audioUrl || finalData.song?.audioUrl || '',
        duration: finalData.durationMs ? Math.round(finalData.durationMs / 1000) : 180,
        createdAt: new Date().toISOString()
      };

      setGeneratedSongs((prev) => [newSong, ...prev]);

      // Auto-add track to Qamuz player & Auto-play immediately!
      handleAddToLibrary(newSong);
      handlePlaySong(newSong);

      setSongPrompt('');
      setCustomLyrics('');
      setCustomTitle('');
    } catch (err: any) {
      console.error(err);
      clearInterval(progressTimer);
      if (err.isUsageLimit) {
        openAIUpsellModal();
      } else {
        alert(err.message || 'Error connecting to Qamuz AI music production server.');
      }
    } finally {
      setIsGeneratingMusic(false);
      setTimeout(() => {
        setMusicProgress(0);
        setMusicProgressText('Creating track...');
      }, 2000);
    }
  };

  // Handle Video Generation
  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      openAuthModal('register');
      return;
    }

    if (!consumeCredit(1)) {
      openAIUpsellModal();
      return;
    }

    setIsGeneratingVideo(true);
    setVideoProgress(10);

    const progressTimer = setInterval(() => {
      setVideoProgress((prev) => (prev >= 88 ? 88 : prev + 12));
    }, 800);

    const activeSongTitle = selectedSongTrack ? selectedSongTrack.title : selectedSongForVideo;

    try {
      const response = await fetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt || (activeSongTitle ? `Video musical para "${activeSongTitle}"` : "Video musical estÃ©tico cinemÃ¡tico"),
          style: videoStyle,
          cameraMotion,
          aspectRatio: videoAspectRatio,
          songTitle: activeSongTitle,
          videoType,
          is30sViralHook,
          character: noCharacter ? 'Sin personaje' : selectedCharacter,
          background: selectedBackground,
          vibeTags: selectedVibeTags,
          videoGenMode
        })
      });

      const data = await response.json();
      clearInterval(progressTimer);
      setVideoProgress(100);

      if (data.success && data.video) {
        setGeneratedVideos((prev) => {
          const filtered = prev.filter(v => v.id !== data.video.id);
          return [data.video, ...filtered];
        });
        setVideoPrompt('');
      } else {
        alert(data.error || 'Error generating video');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to Qamuz video server.');
    } finally {
      setIsGeneratingVideo(false);
      setVideoProgress(0);
    }
  };

  // Handle Image Generation
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim()) return;

    if (!user) {
      openAuthModal('register');
      return;
    }

    if (!consumeCredit(1)) {
      openAIUpsellModal();
      return;
    }

    setIsGeneratingImage(true);
    setImageProgress(15);

    const progressTimer = setInterval(() => {
      setImageProgress((prev) => (prev >= 90 ? 90 : prev + 20));
    }, 500);

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          style: imageStyle,
          aspectRatio: imageAspectRatio,
          category: imageCategory
        })
      });

      const data = await response.json();
      clearInterval(progressTimer);
      setImageProgress(100);

      if (data.success && data.image) {
        setGeneratedImages((prev) => {
          const filtered = prev.filter(img => img.id !== data.image.id);
          return [data.image, ...filtered];
        });
        setImagePrompt('');
      } else {
        alert(data.error || 'Error generating image');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to Qamuz art server.');
    } finally {
      setIsGeneratingImage(false);
      setImageProgress(0);
    }
  };

  // Add Generated Song to Qamuz Player Library
  const handleAddToLibrary = (song: GeneratedSong) => {
    const track: Track = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      artistId: 'qamuz-ai-artist',
      album: song.album,
      albumId: 'qamuz-ai-album',
      coverUrl: song.coverUrl,
      audioUrl: song.audioUrl,
      duration: song.duration,
      lyrics: song.lyrics,
      genre: song.genre
    };

    addCustomTrack(track);
    setAddedTrackIds((prev) => new Set(prev).add(song.id));
  };

  // Play song in main player
  const handlePlaySong = (song: GeneratedSong) => {
    const track: Track = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      artistId: 'qamuz-ai-artist',
      album: song.album,
      albumId: 'qamuz-ai-album',
      coverUrl: song.coverUrl,
      audioUrl: song.audioUrl,
      duration: song.duration,
      lyrics: song.lyrics,
      genre: song.genre
    };

    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      addCustomTrack(track);
      playTrack(track);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-white max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Header Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-950 via-zinc-900 to-purple-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/20 text-[#1DB954] border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Qamuz AI Studio
              </span>
              <span className="bg-zinc-800/80 text-zinc-300 border border-zinc-700 text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Qamuz Audio Engine V4.5
              </span>

              <span className="bg-zinc-800/80 text-zinc-300 border border-zinc-700 text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Qamuz Video Render
              </span>
              <span className="bg-zinc-800/80 text-zinc-300 border border-zinc-700 text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Qamuz Neural AI
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {t('aiStudio.title')}
            </h1>
            <p className="text-zinc-300 text-xs sm:text-sm max-w-2xl">
              {t('aiStudio.subtitle')}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-black/60 p-1.5 rounded-xl border border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveTab('music')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'music'
                  ? 'bg-gradient-to-r from-[#1DB954] to-emerald-600 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Music</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video</span>
            </button>

            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'image'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>ImÃ¡genes & Arte</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: MUSIC GENERATOR ================= */}
      {activeTab === 'music' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="lg:col-span-5 bg-[#181818] rounded-2xl p-5 border border-zinc-800 flex flex-col gap-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#1DB954]" />
                <h2 className="font-bold text-base text-white">AI Song Composer</h2>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full font-mono">
                Qamuz Audio Engine
              </span>
            </div>

            <form onSubmit={(e) => handleGenerateMusic(e)} className="flex flex-col gap-4">
              {/* Engine Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>AI Music Engine</span>
                  <span className="text-[10px] text-emerald-400 font-mono">High Precision Audio</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#222] rounded-xl border border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => setAiMusicEngine('music_v1')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                      aiMusicEngine === 'music_v1'
                        ? 'bg-[#1DB954] text-black shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Qamuz Pro V3.5</span>
                    <span className="text-[9px] opacity-80 font-mono">Quantum Audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiMusicEngine('music_v3')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                      aiMusicEngine === 'music_v3'
                        ? 'bg-[#1DB954] text-black shadow-md'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Qamuz GPT v4</span>
                    <span className="text-[9px] opacity-80 font-mono">Neural Composer</span>
                  </button>
                </div>
              </div>

              {/* Global Trends */}
              <div className="bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-purple-950/80 p-3.5 rounded-xl border border-emerald-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Global Trending Presets</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500/20 text-[#1DB954] border border-emerald-500/30 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Popular Now
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300">
                  Apply a popular music style to your track instantly:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {trendPresets.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => applyTrendPreset(t)}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-emerald-500/20 text-zinc-200 hover:text-white border border-zinc-700 hover:border-emerald-500/50 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                      <span className="text-[9px] text-emerald-400 font-mono">({t.bpm} BPM)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Song Prompt */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>What is your song about?</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Idea or story</span>
                </label>
                <textarea
                  value={songPrompt}
                  onChange={(e) => setSongPrompt(e.target.value)}
                  placeholder="Ej: Un reggaetÃ³n romÃ¡ntico sobre un amor de verano en la playa con sintetizadores modernos..."
                  rows={3}
                  className="w-full bg-[#242424] text-white text-xs rounded-xl p-3 border border-zinc-700/60 focus:outline-none focus:border-[#1DB954] resize-none"
                />
              </div>

              {/* Genre Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">GÃ©nero Musical</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {genrePresets.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGenre(g)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        genre === g
                          ? 'bg-[#1DB954] text-black font-bold border-[#1DB954]'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood & Vocal Style Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300">AtmÃ³sfera / Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700 focus:outline-none focus:border-[#1DB954]"
                  >
                    {moodPresets.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-300">Vocal Style</label>
                  <select
                    value={vocalStyle}
                    onChange={(e) => setVocalStyle(e.target.value)}
                    className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700 focus:outline-none focus:border-[#1DB954]"
                  >
                    {vocalPresets.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Instrumental Toggle */}
              <div className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Solo Instrumental</span>
                  <span className="text-[10px] text-zinc-400">Sin voces cantadas</span>
                </div>
                <input
                  type="checkbox"
                  checked={InstrumentalOnly}
                  onChange={(e) => setInstrumentalOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#1DB954] cursor-pointer"
                />
              </div>

              {/* Advanced Options Accordion */}
              <div className="border-t border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedMusic(!showAdvancedMusic)}
                  className="flex items-center justify-between w-full text-xs text-zinc-400 hover:text-white font-medium"
                >
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Letras Personalizadas y TÃ­tulo (Opcional)</span>
                  </div>
                  <span>{showAdvancedMusic ? '-' : '+'}</span>
                </button>

                {showAdvancedMusic && (
                  <div className="flex flex-col gap-3 mt-3 animate-fade-in">
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Song title..."
                      className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700 focus:outline-none focus:border-[#1DB954]"
                    />
                    <textarea
                      value={customLyrics}
                      onChange={(e) => setCustomLyrics(e.target.value)}
                      placeholder="Pega aquÃ­ tus propias letras [Verso 1], [Estribillo]..."
                      rows={4}
                      className="bg-[#242424] text-white text-xs rounded-xl p-2.5 border border-zinc-700 focus:outline-none focus:border-[#1DB954] resize-none font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={isGeneratingMusic}
                className="w-full bg-gradient-to-r from-[#1DB954] via-emerald-400 to-cyan-400 text-black font-black py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98"
              >
                {isGeneratingMusic ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{musicProgressText} ({musicProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Generate AI Song</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Song Output Side */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Disc className="w-5 h-5 text-emerald-400" />
                <span>My AI Created Songs ({generatedSongs.length})</span>
              </h3>
            </div>

            {isGeneratingMusic && (
              <div className="bg-[#181818] border border-emerald-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1DB954] to-cyan-400 flex items-center justify-center text-black shadow-xl">
                  <Music className="w-8 h-8 animate-bounce" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-white text-base">{musicProgressText}</h4>
                  <p className="text-xs text-zinc-400">Generating album cover and synchronized audio file.</p>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden max-w-md">
                  <div 
                    className="bg-[#1DB954] h-full transition-all duration-300"
                    style={{ width: `${musicProgress}%` }}
                  />
                </div>
              </div>
            )}

            {generatedSongs.length === 0 && !isGeneratingMusic ? (
              <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3 text-zinc-400">
                <Music className="w-12 h-12 text-zinc-600 stroke-[1.5]" />
                <p className="text-sm font-semibold text-zinc-300">AÃºn no has creado canciones con IA</p>
                <p className="text-xs max-w-xs text-zinc-500">
                  Ingresa tu idea o letras a la izquierda y presiona &quot;Generate AI Song&quot;.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {generatedSongs.map((song, idx) => {
                  const isCurrentlyPlaying = currentTrack?.id === song.id && isPlaying;
                  const isAdded = addedTrackIds.has(song.id);

                  return (
                    <div
                      key={`${song.id}-${idx}`}
                      className="bg-[#181818] hover:bg-[#202020] border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg group"
                    >
                      {/* Left Track Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
                          <img
                            src={song.coverUrl}
                            alt={song.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=800&auto=format&fit=crop';
                            }}
                          />
                          <button
                            onClick={() => handlePlaySong(song)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <div className="w-9 h-9 rounded-full bg-[#1DB954] text-black flex items-center justify-center shadow-lg">
                              {isCurrentlyPlaying ? (
                                <Pause className="w-5 h-5 fill-current" />
                              ) : (
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              )}
                            </div>
                          </button>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white truncate">{song.title}</span>
                            <span className="text-[10px] bg-emerald-500/20 text-[#1DB954] px-2 py-0.5 rounded-md font-bold uppercase">
                              {song.genre}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 truncate">{song.artist} â€¢ {song.key} â€¢ {song.bpm} BPM</span>
                          <span className="text-[11px] text-zinc-500 line-clamp-1 italic mt-0.5">
                            &quot;{song.fullLyricsText?.slice(0, 70)}...&quot;
                          </span>
                        </div>
                      </div>

                      {/* Actions Right */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handlePlaySong(song)}
                          className="w-10 h-10 rounded-full bg-[#1DB954] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                          title="Escuchar en Qamuz"
                        >
                          {isCurrentlyPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleAddToLibrary(song)}
                          disabled={isAdded}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isAdded
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 hover:border-emerald-500/50'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#1DB954]" />
                              <span>En Biblioteca</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-[#1DB954]" />
                              <span>Guardar</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('video');
                            setVideoPrompt(`Music video for the song "${song.title}", vibe ${song.genre}`);
                            setSelectedSongForVideo(song.title);
                          }}
                          className="bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border border-purple-500/40 p-2 rounded-xl transition-all"
                          title="Create AI Music Video"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: VIDEO GENERATOR ================= */}
      {activeTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side */}
          <div className="lg:col-span-6 bg-[#121212] rounded-2xl p-5 border border-zinc-800/80 flex flex-col gap-5 shadow-2xl">
            {/* Top Sub-Tabs (Music Video vs Lyrics Video) */}
            <div className="flex items-center gap-8 border-b border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => setVideoType('music-video')}
                className={`text-sm font-bold pb-2 relative transition-all ${
                  videoType === 'music-video' ? 'text-white font-extrabold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Music Video
                {videoType === 'music-video' && (
                  <div className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#00F5A0] shadow-[0_0_12px_#00F5A0]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setVideoType('lyrics-video')}
                className={`text-sm font-bold pb-2 relative transition-all ${
                  videoType === 'lyrics-video' ? 'text-white font-extrabold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Lyrics Video
                {videoType === 'lyrics-video' && (
                  <div className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#00F5A0] shadow-[0_0_12px_#00F5A0]" />
                )}
              </button>
            </div>

            <form onSubmit={handleGenerateVideo} className="flex flex-col gap-4">
              {/* Song Selector */}
              <div className="bg-[#181818] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-2">
                <label className="text-xs font-bold text-zinc-300">Song</label>
                <div className="flex items-center justify-between bg-[#222] border border-zinc-700/60 rounded-xl p-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-[#00F5A0] border border-zinc-700">
                      <Music className="w-4 h-4" />
                    </div>
                    {selectedSongTrack ? (
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{selectedSongTrack.title}</span>
                        <span className="text-[11px] text-zinc-400 truncate">{selectedSongTrack.artist} â€¢ {selectedSongTrack.genre || 'Qamuz Track'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-zinc-400 text-xs">
                        <div className="flex items-center gap-0.5 opacity-60">
                          <span className="w-0.5 h-3 bg-[#00F5A0] rounded-full animate-pulse" />
                          <span className="w-0.5 h-4 bg-[#00F5A0] rounded-full animate-pulse delay-75" />
                          <span className="w-0.5 h-2 bg-[#00F5A0] rounded-full animate-pulse delay-150" />
                          <span className="w-0.5 h-5 bg-[#00F5A0] rounded-full animate-pulse" />
                        </div>
                        <span className="truncate">Choose any created song...</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSelectSongModalOpen(true)}
                    className="bg-[#2c2c2c] hover:bg-[#383838] text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-600 transition-all shrink-0"
                  >
                    Select a song
                  </button>
                </div>
              </div>

              {/* 30s Enganche de Tendencia AI (Viral Hook Mode) */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-purple-950/20 to-black border border-[#00F5A0]/40 rounded-2xl p-3.5 flex flex-col gap-2 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#00F5A0]" />
                    <span className="text-xs font-black text-white uppercase tracking-wide">
                      Enganche de Tendencia AI (30s Clip Viral)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={is30sViralHook}
                      onChange={(e) => setIs30sViralHook(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#00F5A0]" />
                  </label>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  The AI identifies the song hook, the most transcendent rhythm, and relevant sound to create a 30s video for TikTok/Reels.
                </p>
              </div>

              {/* MV Character (Only in Music Video mode) */}
              {videoType === 'music-video' && (
                <div className="bg-[#181818] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-200">MV character</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-zinc-800 text-zinc-400 text-[9px] flex items-center justify-center font-bold">i</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-medium">Lip-sync</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lipSyncEnabled}
                          onChange={(e) => setLipSyncEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#00F5A0]" />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
                    <div className="w-16 h-22 rounded-xl bg-[#222] border border-dashed border-zinc-700 flex flex-col items-center justify-center gap-1 shrink-0 cursor-pointer hover:border-zinc-500">
                      <Upload className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[9px] text-zinc-400 font-bold">Upload</span>
                    </div>

                    {mvCharacters.map((char) => (
                      <div
                        key={char.id}
                        onClick={() => { setSelectedCharacter(char.id); setNoCharacter(false); }}
                        className={`relative w-16 h-22 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                          selectedCharacter === char.id && !noCharacter ? 'border-[#00F5A0] ring-1 ring-[#00F5A0]' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={char.img} alt={char.name} className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 right-1 bg-black/60 p-0.5 rounded text-[#00F5A0]">
                          <Sparkles className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={noCharacter}
                      onChange={(e) => setNoCharacter(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-[#00F5A0] focus:ring-0"
                    />
                    <span>No Character</span>
                  </label>
                </div>
              )}

              {/* Background Selection */}
              <div className="bg-[#181818] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Background</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 font-medium">Random</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={randomBackground}
                        onChange={(e) => setRandomBackground(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#00F5A0]" />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-none">
                  <div className="w-16 h-20 rounded-xl bg-[#222] border border-dashed border-zinc-700 flex flex-col items-center justify-center gap-1 shrink-0 cursor-pointer hover:border-zinc-500">
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[9px] text-zinc-400 font-bold">Upload</span>
                  </div>

                  {mvBackgrounds.map((bg) => (
                    <div
                      key={bg.id}
                      onClick={() => setSelectedBackground(bg.id)}
                      className={`relative w-16 h-20 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                        selectedBackground === bg.id ? 'border-[#00F5A0]' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={bg.img} alt={bg.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] text-white px-1 py-0.2 rounded font-mono">
                        00:05
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Style Selection */}
              <div className="bg-[#181818] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-2.5">
                <span className="text-xs font-bold text-zinc-200">Visual Style</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {mvVisualStyles.map((style) => (
                    <div
                      key={style.id}
                      onClick={() => setVideoStyle(style.id)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all group ${
                        videoStyle === style.id ? 'border-[#00F5A0]' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={style.img} alt={style.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-1.5">
                        <span className="text-[9px] font-bold text-white truncate">{style.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vibe Selection */}
              <div className="bg-[#181818] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-200">Vibe</span>
                  <span className="text-[10px] text-zinc-500">Pick emotions or keywords for the AI video rhythm</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {vibeOptions.map((vibe) => {
                    const isSelected = selectedVibeTags.includes(vibe);
                    return (
                      <button
                        key={vibe}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedVibeTags(selectedVibeTags.filter(t => t !== vibe));
                          } else {
                            setSelectedVibeTags([...selectedVibeTags, vibe]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                          isSelected
                            ? 'bg-zinc-800 text-white border border-zinc-600 font-bold'
                            : 'bg-[#222] text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        {vibe}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="bg-[#181818] border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Prompt adicional / Instrucciones del guiÃ³n</label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Ej: Luces de neÃ³n, movimientos de cÃ¡mara lentos en el clÃ­max..."
                  rows={2}
                  className="w-full bg-[#222] text-white text-xs rounded-xl p-2.5 border border-zinc-700/60 focus:outline-none focus:border-[#00F5A0] resize-none"
                />
              </div>

              {/* Bottom Mode & Aspect Ratio controls */}
              <div className="flex items-center justify-between gap-2 pt-2 relative">
                {/* Mode Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setIsModeDropdownOpen(!isModeDropdownOpen); setIsRatioDropdownOpen(false); }}
                    className="bg-[#222] hover:bg-[#2c2c2c] text-white text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#00F5A0]" />
                    <span>{videoGenMode === 'one-click' ? 'One-click mode' : 'Storyboard mode'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
                  </button>

                  {isModeDropdownOpen && (
                    <div className="absolute bottom-full mb-2 left-0 w-64 bg-[#1e1e1e] border border-zinc-700 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => { setVideoGenMode('one-click'); setIsModeDropdownOpen(false); }}
                        className={`p-2.5 rounded-xl text-left transition-all ${
                          videoGenMode === 'one-click' ? 'bg-[#00F5A0]/10 border border-[#00F5A0]/40' : 'hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Zap className="w-3.5 h-3.5 text-[#00F5A0]" />
                          <span>One-click mode</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">AI handles every shot. Just hit generate</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setVideoGenMode('storyboard'); setIsModeDropdownOpen(false); }}
                        className={`p-2.5 rounded-xl text-left transition-all ${
                          videoGenMode === 'storyboard' ? 'bg-[#00F5A0]/10 border border-[#00F5A0]/40' : 'hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Layers className="w-3.5 h-3.5 text-purple-400" />
                          <span>Storyboard mode</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Review and refine each shot before generating</p>
                      </button>
                    </div>
                  )}
                </div>

                {/* Aspect Ratio Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setIsRatioDropdownOpen(!isRatioDropdownOpen); setIsModeDropdownOpen(false); }}
                    className="bg-[#222] hover:bg-[#2c2c2c] text-white text-xs font-bold px-3 py-2 rounded-xl border border-zinc-700 flex items-center gap-1.5"
                  >
                    <span className="text-[#00F5A0] font-mono">{videoAspectRatio}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </button>

                  {isRatioDropdownOpen && (
                    <div className="absolute bottom-full mb-2 right-0 w-28 bg-[#1e1e1e] border border-zinc-700 rounded-xl p-1 shadow-2xl z-50 flex flex-col gap-1">
                      {(['16:9', '9:16', '3:4', '4:3'] as const).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => { setVideoAspectRatio(ratio); setIsRatioDropdownOpen(false); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between ${
                            videoAspectRatio === ratio ? 'bg-[#00F5A0]/20 text-[#00F5A0]' : 'text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <span>{ratio}</span>
                          {videoAspectRatio === ratio && <Check className="w-3 h-3 text-[#00F5A0]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isGeneratingVideo}
                  className="flex-1 bg-[#00F5A0] hover:bg-[#00d088] text-black font-black py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-[#00F5A0]/20 active:scale-98 text-xs"
                >
                  {isGeneratingVideo ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating MV ({videoProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate MV</span>
                      <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">âœ¨ 0</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Videos Output Side */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" />
              <span>Mis Videos Creados ({generatedVideos.length})</span>
            </h3>

            {isGeneratingVideo && (
              <div className="bg-[#181818] border border-purple-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-xl">
                  <Film className="w-8 h-8 animate-bounce" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-white text-base">Generating script and cinematic frames...</h4>
                  <p className="text-xs text-zinc-400">Calculando movimiento de cÃ¡mara, profundidad de campo y renderizado 4K.</p>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden max-w-md">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-300"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              </div>
            )}

            {generatedVideos.length === 0 && !isGeneratingVideo ? (
              <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3 text-zinc-400">
                <Video className="w-12 h-12 text-zinc-600 stroke-[1.5]" />
                <p className="text-sm font-semibold text-zinc-300">You haven't generated any music videos yet</p>
                <p className="text-xs max-w-xs text-zinc-500">
                  Use the Qamuz artificial intelligence engine to generate cinematic videoclips.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {generatedVideos.map((video, idx) => (
                  <div
                    key={`${video.id}-${idx}`}
                    className="bg-[#181818] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl hover:border-purple-500/50 transition-all flex flex-col group cursor-pointer"
                    onClick={() => setSelectedVideoModal(video)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white font-bold">
                        <span className="truncate">{video.title}</span>
                        <span className="bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[9px] px-2 py-0.5 rounded-full uppercase">
                          {video.style.slice(0, 15)}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col gap-2 bg-[#181818]">
                      <p className="text-xs text-zinc-300 line-clamp-2 italic">
                        &quot;{video.prompt}&quot;
                      </p>

                      {/* Scene Frames Preview Row */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {video.sceneFrames.map((frame, idx) => (
                          <div key={idx} className="w-12 h-8 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700">
                            <img src={frame} alt="frame" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: IMAGE & ART CREATOR ================= */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Image Form Side */}
          <div className="lg:col-span-5 bg-[#181818] rounded-2xl p-5 border border-cyan-500/30 flex flex-col gap-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-cyan-400" />
                <h2 className="font-bold text-base text-white">Creador de Portadas e ImÃ¡genes AI</h2>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-1 rounded-full font-mono">
                Qamuz Vision Art
              </span>
            </div>

            <form onSubmit={handleGenerateImage} className="flex flex-col gap-4">
              {/* Category Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Tipo de Arte Musical</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setImageCategory('album-cover'); setImageAspectRatio('1:1'); }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex flex-col gap-0.5 ${
                      imageCategory === 'album-cover'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span>Album Cover</span>
                    <span className="text-[10px] font-normal text-zinc-400">Cuadrado 1:1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setImageCategory('artist-avatar'); setImageAspectRatio('1:1'); }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex flex-col gap-0.5 ${
                      imageCategory === 'artist-avatar'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span>Foto de Artista</span>
                    <span className="text-[10px] font-normal text-zinc-400">Avatar Perfil 1:1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setImageCategory('promo-poster'); setImageAspectRatio('3:4'); }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex flex-col gap-0.5 ${
                      imageCategory === 'promo-poster'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span>Promo Poster</span>
                    <span className="text-[10px] font-normal text-zinc-400">Vertical 3:4 / 9:16</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setImageCategory('concept-art'); setImageAspectRatio('16:9'); }}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex flex-col gap-0.5 ${
                      imageCategory === 'concept-art'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span>Banner withcept Art</span>
                    <span className="text-[10px] font-normal text-zinc-400">Horizontal 16:9</span>
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  DescripciÃ³n de la Imagen
                </label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Ej: Un cantante cyberpunk rodeado de ondas de sonido hologrÃ¡ficas neÃ³n verde y azul en un escenario flotante nocturno..."
                  rows={3}
                  className="w-full bg-[#242424] text-white text-xs rounded-xl p-3 border border-zinc-700/60 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Style Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Aesthetic Style</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {imageStylePresets.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setImageStyle(st)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        imageStyle === st
                          ? 'bg-cyan-500 text-black font-bold border-cyan-300 shadow'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Buttons */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-300">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['1:1', '16:9', '9:16', '3:4'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`py-1.5 text-xs font-bold rounded-xl border ${
                        imageAspectRatio === ratio
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-black font-black py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98"
              >
                {isGeneratingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating AI Image ({imageProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 fill-current" />
                    <span>Generate AI Image</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Images Output Side */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-cyan-400" />
              <span>GalerÃ­a de ImÃ¡genes Creadas ({generatedImages.length})</span>
            </h3>

            {isGeneratingImage && (
              <div className="bg-[#181818] border border-cyan-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-center animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-black shadow-xl">
                  <ImageIcon className="w-8 h-8 animate-bounce" />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="font-bold text-white text-base">Creating artistic illustration with Qamuz Vision...</h4>
                  <p className="text-xs text-zinc-400">Procesando detalles de iluminaciÃ³n, composiciÃ³n y texturas en alta definiciÃ³n.</p>
                </div>
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden max-w-md">
                  <div 
                    className="bg-cyan-400 h-full transition-all duration-300"
                    style={{ width: `${imageProgress}%` }}
                  />
                </div>
              </div>
            )}

            {generatedImages.length === 0 && !isGeneratingImage ? (
              <div className="bg-[#181818] border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3 text-zinc-400">
                <ImageIcon className="w-12 h-12 text-zinc-600 stroke-[1.5]" />
                <p className="text-sm font-semibold text-zinc-300">AÃºn no has generado imÃ¡genes artÃ­sticas</p>
                <p className="text-xs max-w-xs text-zinc-500">
                  Crea portadas de Ã¡lbumes, avatares o pÃ³sters promocionales escribiendo tu idea en el formulario.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {generatedImages.map((img, idx) => (
                  <div
                    key={`${img.id}-${idx}`}
                    className="bg-[#181818] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl hover:border-cyan-500/50 transition-all flex flex-col group cursor-pointer relative"
                    onClick={() => setSelectedImageModal(img)}
                  >
                    <div className="relative aspect-square bg-zinc-900 overflow-hidden">
                      <img
                        src={img.imageUrl}
                        alt={img.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                        <span className="text-xs text-white font-bold truncate">{img.title}</span>
                        <span className="text-[10px] text-cyan-300 truncate">{img.style}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Modal Preview */}
      {selectedVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center animate-fade-in">
          <div className="bg-[#181818] border border-zinc-700 rounded-2xl max-w-3xl w-full p-6 flex flex-col gap-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-lg text-white">{selectedVideoModal.title}</h3>
              <button
                onClick={() => setSelectedVideoModal(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold bg-zinc-800 px-3 py-1 rounded-full"
              >
                Close
              </button>
            </div>

            {/* Video Canvas Simulation */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-inner group">
              <img
                src={selectedVideoModal.thumbnailUrl}
                alt="Video main frame"
                className="w-full h-full object-cover animate-pulse"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 p-4 flex flex-col justify-between">
                <span className="bg-purple-600/80 text-white text-xs px-3 py-1 rounded-full font-bold self-start backdrop-blur-sm">
                  {selectedVideoModal.style} â€¢ {selectedVideoModal.cameraMotion}
                </span>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-300 font-medium">Renderizado Qamuz Visual AI HD</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs text-emerald-400 font-bold">Lienzo Animado Activo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storyboard Frames */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-400">Cuadros de Secuencia CinemÃ¡ticos</span>
              <div className="grid grid-cols-3 gap-3">
                {selectedVideoModal.sceneFrames.map((frame, idx) => (
                  <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-700 relative">
                    <img src={frame} alt={`Frame ${idx}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/80 text-white px-1.5 py-0.5 rounded font-mono">
                      Frame #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal Preview */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center animate-fade-in">
          <div className="bg-[#181818] border border-zinc-700 rounded-2xl max-w-xl w-full p-6 flex flex-col gap-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-lg text-white">{selectedImageModal.title}</h3>
              <button
                onClick={() => setSelectedImageModal(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold bg-zinc-800 px-3 py-1 rounded-full"
              >
                Close
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black border border-zinc-800 max-h-[450px] flex items-center justify-center">
              <img
                src={selectedImageModal.imageUrl}
                alt={selectedImageModal.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col gap-1.5 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
              <p className="text-xs text-zinc-300 font-medium italic">&quot;{selectedImageModal.prompt}&quot;</p>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Style: <strong className="text-white">{selectedImageModal.style}</strong></span>
                <span>Aspect Ratio: <strong className="text-cyan-400">{selectedImageModal.aspectRatio}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Song Modal */}
      {isSelectSongModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-[#181818] border border-zinc-700 rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl relative max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-[#00F5A0]" />
                <h3 className="font-bold text-base text-white">Select Created Song</h3>
              </div>
              <button
                onClick={() => setIsSelectSongModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                value={songModalSearch}
                onChange={(e) => setSongModalSearch(e.target.value)}
                placeholder="Search by title, genre, or artist..."
                className="w-full bg-[#242424] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 border border-zinc-700 focus:outline-none focus:border-[#00F5A0]"
              />
            </div>

            {/* Songs List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px] pr-1">
              {/* Option for No Song Selected */}
              <div
                onClick={() => {
                  setSelectedSongTrack(null);
                  setSelectedSongForVideo('');
                  setIsSelectSongModalOpen(false);
                }}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  !selectedSongTrack && !selectedSongForVideo
                    ? 'bg-[#00F5A0]/10 border-[#00F5A0] text-white'
                    : 'bg-[#222] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <span className="text-xs font-bold">Generate without linked song (Prompt Only)</span>
                {!selectedSongTrack && !selectedSongForVideo && <Check className="w-4 h-4 text-[#00F5A0]" />}
              </div>

              {/* Combined tracks list: generatedSongs + allTracks */}
              {(() => {
                const combinedList = [
                  ...generatedSongs.map(s => ({
                    id: s.id,
                    title: s.title,
                    artist: s.artist,
                    coverUrl: s.coverUrl,
                    genre: s.genre,
                    audioUrl: s.audioUrl,
                    duration: s.duration,
                    fullLyricsText: s.fullLyricsText,
                    isAiGenerated: true
                  })),
                  ...allTracks.map(t => ({
                    id: t.id,
                    title: t.title,
                    artist: t.artist,
                    coverUrl: t.coverUrl,
                    genre: t.genre || 'Qamuz Track',
                    audioUrl: t.audioUrl,
                    duration: t.duration,
                    fullLyricsText: t.lyrics || '',
                    isAiGenerated: false
                  }))
                ].filter((item, index, self) => self.findIndex(i => i.id === item.id) === index);

                const filtered = combinedList.filter(item => 
                  item.title.toLowerCase().includes(songModalSearch.toLowerCase()) ||
                  item.artist.toLowerCase().includes(songModalSearch.toLowerCase()) ||
                  item.genre.toLowerCase().includes(songModalSearch.toLowerCase())
                );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      No se encontraron canciones que coincidan with la bÃºsqueda.
                    </div>
                  );
                }

                return filtered.map((song) => {
                  const isSelected = selectedSongTrack?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      onClick={() => {
                        setSelectedSongTrack(song as any);
                        setSelectedSongForVideo(song.title);
                        setIsSelectSongModalOpen(false);
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#00F5A0]/15 border-[#00F5A0] text-white shadow-lg shadow-[#00F5A0]/10'
                          : 'bg-[#222] border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150'}
                          alt={song.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-700"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-white truncate">{song.title}</span>
                          <span className="text-[11px] text-zinc-400 truncate">{song.artist} â€¢ {song.genre}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {song.isAiGenerated && (
                          <span className="text-[9px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full font-mono border border-purple-500/30">
                            Qamuz AI
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-[#00F5A0]" />}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};






