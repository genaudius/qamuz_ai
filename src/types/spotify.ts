export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  coverUrl: string;
  audioUrl: string;
  duration: number; // in seconds
  explicit?: boolean;
  lyrics?: LyricLine[];
  plays?: number;
  addedAt?: string;
  genre?: string;
  videoCanvasUrl?: string; // Looping short video canvas for Spotify-like Now Playing view
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface Artist {
  id: string;
  name: string;
  avatarUrl: string;
  bannerUrl: string;
  verified: boolean;
  monthlyListeners: number;
  bio: string;
  topTracks: Track[];
  albums: Album[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  coverUrl: string;
  releaseYear: number;
  tracks: Track[];
  genre: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  isCustom: boolean;
  tracks: Track[];
  ownerName: string;
  createdAt?: string;
  followersCount?: number;
  isPinned?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  imageUrl: string;
}

export type ViewType = 
  | 'home' 
  | 'search' 
  | 'library' 
  | 'playlist' 
  | 'artist' 
  | 'album' 
  | 'liked' 
  | 'lyrics' 
  | 'queue'
  | 'ai-studio'
  | 'admin';

export interface AISongGenerationRequest {
  prompt: string;
  genre: string;
  mood: string;
  vocalStyle: string;
  instrumentalOnly: boolean;
  title?: string;
  customLyrics?: string;
}

export interface GeneratedAISong {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  bpm: number;
  key: string;
  lyrics: LyricLine[];
  fullLyricsText: string;
  coverUrl: string;
  audioUrl: string;
  synthData?: any;
  duration: number;
  createdAt: string;
}

export interface AIVideoGenerationRequest {
  prompt: string;
  style: string;
  cameraMotion: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  songId?: string;
}

export interface GeneratedAIVideo {
  id: string;
  title: string;
  prompt: string;
  style: string;
  videoUrl?: string;
  thumbnailUrl: string;
  sceneFrames: string[];
  cameraMotion: string;
  createdAt: string;
  songTitle?: string;
}

export interface AIImageGenerationRequest {
  prompt: string;
  style: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4';
  category: 'album-cover' | 'artist-avatar' | 'promo-poster' | 'concept-art';
}

export interface GeneratedAIImage {
  id: string;
  title: string;
  prompt: string;
  style: string;
  category: string;
  aspectRatio: string;
  imageUrl: string;
  createdAt: string;
}

export type RepeatMode = 'off' | 'track' | 'queue';

export interface ActiveView {
  type: ViewType;
  id?: string; // playlist id, artist id, album id, or search query
}
