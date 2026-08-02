export type DemoArtistTrack = {
  id: string;
  title: string;
  genre: string;
  playsCount: number;
  likesCount: number;
};

export type DemoArtistPlaylist = {
  id: string;
  name: string;
  description: string;
};

export type DemoArtistProfile = {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
  followersCount: number;
  verifiedAt: Date;
  tracks: DemoArtistTrack[];
  publicPlaylists: DemoArtistPlaylist[];
};

export const DEMO_ARTIST_PROFILES: DemoArtistProfile[] = [
  {
    id: '1',
    name: 'The Weeknd',
    avatarUrl: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb',
    bio: 'Alt-pop nocturno, hooks gigantes y produccion cinematica.',
    followersCount: 1823400,
    verifiedAt: new Date('2024-02-10T00:00:00.000Z'),
    tracks: [
      { id: 'demo-track-1', title: 'Midnight Echoes', genre: 'Alt Pop', playsCount: 482102, likesCount: 31991 },
      { id: 'demo-track-2', title: 'Neon Confession', genre: 'Synthwave', playsCount: 275830, likesCount: 22107 },
    ],
    publicPlaylists: [
      { id: 'demo-playlist-1', name: 'After Dark Rotation', description: 'Late-night cuts, moody pop and futuristic R&B.' },
    ],
  },
  {
    id: '2',
    name: 'Taylor Swift',
    avatarUrl: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0',
    bio: 'Songwriting-driven pop with sharp storytelling and stadium choruses.',
    followersCount: 2148700,
    verifiedAt: new Date('2024-01-08T00:00:00.000Z'),
    tracks: [
      { id: 'demo-track-3', title: 'Polaroid Summer', genre: 'Pop', playsCount: 593001, likesCount: 40555 },
      { id: 'demo-track-4', title: 'Letters I Never Sent', genre: 'Indie Pop', playsCount: 338440, likesCount: 29100 },
    ],
    publicPlaylists: [
      { id: 'demo-playlist-2', name: 'Bridge Builders', description: 'Big bridges, diary lyrics and polished pop production.' },
    ],
  },
  {
    id: '3',
    name: 'Bad Bunny',
    avatarUrl: 'https://i.scdn.co/image/ab6761610000e5eb9e3ceaeb6cb242d8d6380d14',
    bio: 'Reggaeton, trap y mezclas caribeñas con una energia frontal.',
    followersCount: 1985400,
    verifiedAt: new Date('2024-03-14T00:00:00.000Z'),
    tracks: [
      { id: 'demo-track-5', title: 'Noche Sin Freno', genre: 'Reggaeton', playsCount: 621909, likesCount: 44218 },
      { id: 'demo-track-6', title: 'Arena y Motor', genre: 'Latin Trap', playsCount: 291334, likesCount: 19763 },
    ],
    publicPlaylists: [
      { id: 'demo-playlist-3', name: 'Perreo Curado', description: 'Warm drums, bass-heavy reggaeton and summer flex.' },
    ],
  },
  {
    id: '4',
    name: 'Drake',
    avatarUrl: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9',
    bio: 'Rap hooks, melodic confessionals and polished crossover records.',
    followersCount: 1732100,
    verifiedAt: new Date('2024-01-18T00:00:00.000Z'),
    tracks: [
      { id: 'demo-track-7', title: 'Cold Champagne', genre: 'Hip-Hop', playsCount: 410223, likesCount: 28403 },
      { id: 'demo-track-8', title: 'Six in Silence', genre: 'Melodic Rap', playsCount: 256912, likesCount: 18220 },
    ],
    publicPlaylists: [
      { id: 'demo-playlist-4', name: 'Late Replies', description: 'Melodic rap and introspective late-night records.' },
    ],
  },
  {
    id: '5',
    name: 'Dua Lipa',
    avatarUrl: 'https://i.scdn.co/image/ab6761610000e5eb4b96791e8dd2c22227d82531',
    bio: 'Dance-pop precision, glossy grooves and club-ready toplines.',
    followersCount: 1497600,
    verifiedAt: new Date('2024-02-22T00:00:00.000Z'),
    tracks: [
      { id: 'demo-track-9', title: 'Velvet Strobe', genre: 'Dance Pop', playsCount: 351220, likesCount: 26541 },
      { id: 'demo-track-10', title: 'Runway Heat', genre: 'Nu Disco', playsCount: 224331, likesCount: 17409 },
    ],
    publicPlaylists: [
      { id: 'demo-playlist-5', name: 'Studio 2AM', description: 'Disco edges, crisp basslines and sleek dance-pop.' },
    ],
  },
];

export const DEMO_ARTIST_PROFILES_BY_ID = new Map(
  DEMO_ARTIST_PROFILES.map((artist) => [artist.id, artist])
);