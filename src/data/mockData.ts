import { Track, Artist, Album, Playlist, Category } from '../types/spotify';

// Standard high-quality audio preview URLs (Royalty-free & reliable)
const AUDIO_URLS = [
  'https://actions.google.com/sounds/v1/grooves/funk_bass_groove.ogg',
  'https://actions.google.com/sounds/v1/grooves/electronic_synth_groove.ogg',
  'https://actions.google.com/sounds/v1/music/ambient_piano.ogg',
  'https://actions.google.com/sounds/v1/music/guitars_and_drums.ogg',
  'https://actions.google.com/sounds/v1/music/upbeat_funk.ogg',
  'https://actions.google.com/sounds/v1/music/jazz_percussion.ogg',
  'https://actions.google.com/sounds/v1/science_fiction/scifi_synth_drone.ogg',
  'https://actions.google.com/sounds/v1/foley/glass_break_heavy.ogg'
];

export const MOCK_LYRICS = [
  { time: 0, text: "(Intro instrumental...)" },
  { time: 5, text: "Bajo las luces de la gran ciudad" },
  { time: 10, text: "Siento el ritmo en cada rincón" },
  { time: 15, text: "No hay tiempo que perder hoy" },
  { time: 20, text: "La música nos conecta a todos" },
  { time: 25, text: "Sube el volumen, no te detengas" },
  { time: 30, text: "(Estribillo principal)" },
  { time: 35, text: "Bailando hasta que salga el sol" },
  { time: 40, text: "Con la noche de nuestro lado" },
  { time: 45, text: "Esta melodía nunca morirá" },
  { time: 50, text: "Sentimos el bajo en el corazón" },
  { time: 55, text: "¡Siente la vibra de nuevo!" },
  { time: 60, text: "(Solo de sintetizador / guitarra)" },
  { time: 75, text: "Volvemos al ritmo de la noche" },
  { time: 90, text: "Cierra los ojos y déjate llevar" },
  { time: 105, text: "Esta es nuestra canción favorita" },
  { time: 120, text: "(Outro ambiental...)" }
];

export const MOCK_TRACKS: Track[] = [
  {
    id: 't1',
    title: 'Midnight City Lights',
    artist: 'The Weeknd',
    artistId: 'ar1',
    album: 'After Hours',
    albumId: 'al1',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[0],
    duration: 215,
    explicit: false,
    plays: 1420500,
    genre: 'Synthwave',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-20'
  },
  {
    id: 't2',
    title: 'Levitating Beats',
    artist: 'Dua Lipa',
    artistId: 'ar2',
    album: 'Future Nostalgia',
    albumId: 'al2',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[1],
    duration: 203,
    explicit: false,
    plays: 980120,
    genre: 'Pop',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-21'
  },
  {
    id: 't3',
    title: 'Dakiti Summer Vibez',
    artist: 'Bad Bunny',
    artistId: 'ar3',
    album: 'El Último Tour Del Mundo',
    albumId: 'al3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[2],
    duration: 228,
    explicit: true,
    plays: 2540100,
    genre: 'Reggaeton / Latino',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-15'
  },
  {
    id: 't4',
    title: 'Motomami Chill Groove',
    artist: 'Rosalía',
    artistId: 'ar4',
    album: 'Motomami',
    albumId: 'al4',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[3],
    duration: 185,
    explicit: true,
    plays: 1890000,
    genre: 'Latino Pop',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-18'
  },
  {
    id: 't5',
    title: 'Coffee & Midnight Lo-Fi',
    artist: 'Lofi Girl',
    artistId: 'ar5',
    album: 'Study Sessions 2026',
    albumId: 'al5',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[4],
    duration: 162,
    explicit: false,
    plays: 3200100,
    genre: 'Lo-Fi Chill',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-10'
  },
  {
    id: 't6',
    title: 'Cyberpunk Odyssey',
    artist: 'Synthwave Collective',
    artistId: 'ar6',
    album: 'Neon Horizon',
    albumId: 'al6',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[5],
    duration: 245,
    explicit: false,
    plays: 670300,
    genre: 'Synthwave',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-22'
  },
  {
    id: 't7',
    title: 'Viva La Vida Electric',
    artist: 'Coldplay',
    artistId: 'ar7',
    album: 'Music of the Spheres',
    albumId: 'al7',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[6],
    duration: 242,
    explicit: false,
    plays: 4100900,
    genre: 'Rock',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-01'
  },
  {
    id: 't8',
    title: 'Starship Synth Drive',
    artist: 'Daft Punk',
    artistId: 'ar8',
    album: 'Random Access Memories',
    albumId: 'al8',
    coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[7],
    duration: 275,
    explicit: false,
    plays: 5890200,
    genre: 'Electronic',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-06-28'
  },
  {
    id: 't9',
    title: 'Cruel Summer Reverie',
    artist: 'Taylor Swift',
    artistId: 'ar9',
    album: 'Lover (Expanded)',
    albumId: 'al9',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    audioUrl: AUDIO_URLS[0],
    duration: 198,
    explicit: false,
    plays: 6200000,
    genre: 'Pop',
    lyrics: MOCK_LYRICS,
    addedAt: '2026-07-12'
  }
];

export const MOCK_ARTISTS: Artist[] = [
  {
    id: 'ar1',
    name: 'The Weeknd',
    avatarUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    monthlyListeners: 108420900,
    bio: 'Abel Makkonen Tesfaye, conocido artísticamente como The Weeknd, es un cantante, compositor y productor canadiense reconocido por su versatilidad musical y visión estética.',
    topTracks: [MOCK_TRACKS[0], MOCK_TRACKS[7]],
    albums: []
  },
  {
    id: 'ar2',
    name: 'Dua Lipa',
    avatarUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    monthlyListeners: 78200100,
    bio: 'Cantante y compositora britano-albanesa. Icono del disco-pop contemporáneo y ganadora de múltiples premios Grammy.',
    topTracks: [MOCK_TRACKS[1]],
    albums: []
  },
  {
    id: 'ar3',
    name: 'Bad Bunny',
    avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    monthlyListeners: 84100500,
    bio: 'Benito Antonio Martínez Ocasio es un cantante, compositor y rapero puertorriqueño que ha revolucionado la música urbana latina a nivel global.',
    topTracks: [MOCK_TRACKS[2]],
    albums: []
  },
  {
    id: 'ar4',
    name: 'Rosalía',
    avatarUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    monthlyListeners: 39500000,
    bio: 'Cantante, compositora y productora española premiada internacionalmente por fusionar el flamenco con sonidos urbanos, pop y vanguardia.',
    topTracks: [MOCK_TRACKS[3]],
    albums: []
  },
  {
    id: 'ar5',
    name: 'Lofi Girl',
    avatarUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=80',
    verified: true,
    monthlyListeners: 15400200,
    bio: 'El canal y sello discográfico de ritmos tranquilos más popular del mundo, perfecto para concentrarse, estudiar o relajarse.',
    topTracks: [MOCK_TRACKS[4]],
    albums: []
  }
];

export const MOCK_ALBUMS: Album[] = [
  {
    id: 'al1',
    title: 'After Hours',
    artist: 'The Weeknd',
    artistId: 'ar1',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
    releaseYear: 2020,
    tracks: [MOCK_TRACKS[0]],
    genre: 'Synthwave / R&B'
  },
  {
    id: 'al2',
    title: 'Future Nostalgia',
    artist: 'Dua Lipa',
    artistId: 'ar2',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    releaseYear: 2020,
    tracks: [MOCK_TRACKS[1]],
    genre: 'Pop / Disco'
  },
  {
    id: 'al3',
    title: 'El Último Tour Del Mundo',
    artist: 'Bad Bunny',
    artistId: 'ar3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    releaseYear: 2020,
    tracks: [MOCK_TRACKS[2]],
    genre: 'Reggaeton'
  },
  {
    id: 'al4',
    title: 'Motomami',
    artist: 'Rosalía',
    artistId: 'ar4',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    releaseYear: 2022,
    tracks: [MOCK_TRACKS[3]],
    genre: 'Latino Experimental'
  }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'pop', name: 'Pop', color: 'bg-gradient-to-br from-pink-600 to-rose-700', imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80' },
  { id: 'reggaeton', name: 'Reggaeton', color: 'bg-gradient-to-br from-orange-500 to-amber-600', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80' },
  { id: 'lofi', name: 'Lo-Fi Chill', color: 'bg-gradient-to-br from-emerald-600 to-teal-800', imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80' },
  { id: 'synthwave', name: 'Synthwave & Retro', color: 'bg-gradient-to-br from-purple-600 to-indigo-900', imageUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80' },
  { id: 'rock', name: 'Rock Clásico', color: 'bg-gradient-to-br from-red-600 to-rose-900', imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80' },
  { id: 'latin', name: 'Latino y Urbano', color: 'bg-gradient-to-br from-yellow-500 to-orange-700', imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80' },
  { id: 'workout', name: 'Para Entrenar', color: 'bg-gradient-to-br from-cyan-600 to-blue-800', imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80' },
  { id: 'focus', name: 'Concentración', color: 'bg-gradient-to-br from-slate-600 to-slate-900', imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&auto=format&fit=crop&q=80' }
];

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-top50',
    title: 'Top 50 - España',
    description: 'Las canciones más escuchadas del momento en España.',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    isCustom: false,
    tracks: [MOCK_TRACKS[0], MOCK_TRACKS[1], MOCK_TRACKS[2], MOCK_TRACKS[3], MOCK_TRACKS[8]],
    ownerName: 'Qamuz',
    followersCount: 1420900,
    isPinned: true
  },
  {
    id: 'pl-lofi',
    title: 'Lo-Fi Chill & Focus',
    description: 'Rhythm, relax & study beats para acompañar tus horas de trabajo o lectura.',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
    isCustom: false,
    tracks: [MOCK_TRACKS[4], MOCK_TRACKS[5], MOCK_TRACKS[7]],
    ownerName: 'Lofi Girl',
    followersCount: 890400,
    isPinned: true
  },
  {
    id: 'pl-synth',
    title: 'Neon Synthwave 2088',
    description: 'Pulsos de neón, sintetizadores analógicos y autopistas nocturnas.',
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80',
    isCustom: false,
    tracks: [MOCK_TRACKS[0], MOCK_TRACKS[5], MOCK_TRACKS[7]],
    ownerName: 'Cyberpunk Radio',
    followersCount: 432100
  },
  {
    id: 'pl-custom-1',
    title: 'Mi Playlist #1',
    description: 'Mi selección personal de temas favoritos.',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    isCustom: true,
    tracks: [MOCK_TRACKS[0], MOCK_TRACKS[2], MOCK_TRACKS[4]],
    ownerName: 'Tú',
    createdAt: '2026-07-28'
  }
];
