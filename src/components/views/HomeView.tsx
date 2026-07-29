import React from 'react';
import { Play, Heart, Disc, Sparkles, Activity, Flame, Zap, Award, TrendingUp, Sliders } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MOCK_ALBUMS } from '../../data/mockData';
import { getFeaturedArtists } from '../../lib/actions/music';
import { HeroCarousel } from '../HeroCarousel';
import type { Artist } from '../../types/spotify';

export const HomeView: React.FC = () => {
  const { 
    allTracks, 
    playlists, 
    playTrack, 
    currentTrack, 
    isPlaying, 
    togglePlayPause, 
    navigateTo,
    likedTrackIds,
    setIsRecommendationModalOpen,
    setIsPlanRecommenderOpen
  } = usePlayer();

  const { t } = useLanguage();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [artists, setArtists] = React.useState<Artist[]>([]);

  React.useEffect(() => {
    getFeaturedArtists(5).then(data => setArtists(data.length > 0 ? data : []));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let baseGreeting = t('home.greetingMorning');
    if (hour >= 12 && hour < 20) {
      baseGreeting = t('home.greetingAfternoon');
    } else if (hour >= 20) {
      baseGreeting = t('home.greetingEvening');
    }

    const firstName = user?.name ? user.name.trim().split(' ')[0] : '';
    return firstName ? `${baseGreeting}, ${firstName}` : baseGreeting;
  };

  const recentTracks = allTracks.slice(0, 6);
  const featuredPlaylists = playlists.slice(0, 6);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-fade-in select-none">
      {/* Greeting Header */}
      <div>
        <h1 className={`text-3xl font-extrabold tracking-tight mb-4 transition-colors ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
          {getGreeting()}
        </h1>

        {/* Featured Slider Carousel */}
        <div className="mb-6">
          <HeroCarousel />
        </div>

        {/* Top Quick Grid (6 items) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {/* Liked Songs Tile */}
          <div 
            onClick={() => navigateTo('liked')}
            className={`group relative flex items-center gap-2 sm:gap-4 transition-all rounded-md overflow-hidden cursor-pointer shadow-md ${
              theme === 'dark' 
                ? 'bg-zinc-800/60 hover:bg-zinc-700/60 text-white' 
                : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 border border-zinc-200'
            }`}
          >
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-500 flex items-center justify-center shrink-0 shadow">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-current" />
            </div>
            <span className={`font-bold text-xs sm:text-sm truncate flex-1 pr-1 sm:pr-2 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
              {t('home.likedSongsTile')}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigateTo('liked');
              }}
              className="mr-2 sm:mr-4 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#ffde59] text-black hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
            </button>
          </div>

          {/* Quick Playlists */}
          {featuredPlaylists.slice(0, 5).map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigateTo('playlist', pl.id)}
              className={`group relative flex items-center gap-2 sm:gap-4 transition-all rounded-md overflow-hidden cursor-pointer shadow-md ${
                theme === 'dark' 
                  ? 'bg-zinc-800/60 hover:bg-zinc-700/60' 
                  : 'bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200'
              }`}
            >
              <img 
                src={pl.coverUrl} 
                alt={pl.title}
                className="w-14 h-14 sm:w-20 sm:h-20 object-cover shrink-0 shadow" 
              />
              <span className={`font-bold text-xs sm:text-sm truncate flex-1 pr-1 sm:pr-2 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                {pl.title}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (pl.tracks.length > 0) {
                    playTrack(pl.tracks[0], pl.tracks);
                  }
                }}
                className="mr-2 sm:mr-4 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#ffde59] text-black hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Recommendation Engine & Plan Recommendation Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Music Recommendation Algorithm */}
          <div 
            onClick={() => setIsRecommendationModalOpen(true)}
            className="relative rounded-2xl p-5 bg-gradient-to-r from-emerald-950/90 via-zinc-900 to-indigo-950/90 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group shadow-xl flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffde59] text-black font-black flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 animate-pulse text-zinc-900" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-extrabold text-base">{t('home.algTitle')}</span>
                  <span className="bg-cyan-500/20 text-[#05e0e9] border border-cyan-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    {t('home.engine')}
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  {t('home.algDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold">
                <Flame className="w-3.5 h-3.5" />
                <span>{t('home.algTag')}</span>
              </div>
              <span className="text-xs font-black text-black bg-[#ffde59] px-4 py-1.5 rounded-full group-hover:scale-105 transition-transform shadow">
                {t('home.algBtn')}
              </span>
            </div>
          </div>

          {/* Card 2: Subscription Plan Recommender */}
          <div 
            onClick={() => setIsPlanRecommenderOpen(true)}
            className="relative rounded-2xl p-5 bg-gradient-to-r from-purple-950/90 via-zinc-900 to-zinc-900 border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer group shadow-xl flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-extrabold text-base">{t('home.planTitle')}</span>
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    PRO
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  {t('home.planDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
              <div className="flex items-center gap-2 text-[11px] text-purple-300 font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>{t('home.planTag')}</span>
              </div>
              <span className="text-xs font-black text-white bg-purple-600 px-4 py-1.5 rounded-full group-hover:scale-105 transition-transform shadow">
                {t('home.planBtn')}
              </span>
            </div>
          </div>
        </div>

        {/* Qamuz AI Studio Callout Banner */}
        <div 
          onClick={() => navigateTo('ai-studio')}
          className="mt-4 relative rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-zinc-900 to-purple-950 border border-emerald-500/40 hover:border-emerald-400 transition-all cursor-pointer group shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#ffde59] to-[#05e0e9] flex items-center justify-center text-black font-black shrink-0 shadow-lg group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 fill-current animate-pulse text-zinc-900" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-extrabold text-base sm:text-lg">{t('home.calloutTitle')}</span>
                <span className="bg-cyan-500/20 text-[#05e0e9] border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {t('home.calloutTag')}
                </span>
              </div>
              <p className="text-xs text-zinc-300 max-w-xl">
                {t('home.calloutDesc')}
              </p>
            </div>
          </div>

          <button className="bg-[#ffde59] hover:bg-[#fcd338] text-black font-extrabold text-xs px-5 py-2.5 rounded-full group-hover:scale-105 transition-all shadow-md shrink-0 self-end sm:self-center">
            {t('home.calloutBtn')}
          </button>
        </div>
      </div>

      {/* Section: Escuchado Recientemente (Tracks Grid) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold hover:underline cursor-pointer transition-colors ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`} onClick={() => navigateTo('search')}>
            {t('home.featuredTracks')}
          </h2>
          <span 
            onClick={() => navigateTo('search')}
            className={`text-xs font-bold cursor-pointer transition-colors uppercase tracking-wider ${
              theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-950'
            }`}
          >
            {t('home.showAll')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {recentTracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => playTrack(track, allTracks)}
                className={`p-3.5 rounded-lg flex flex-col gap-3 group cursor-pointer relative transition-all ${
                  theme === 'dark' 
                    ? 'bg-[#2c2c2c] hover:bg-[#383838]' 
                    : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 shadow-sm'
                }`}
              >
                <div className={`relative aspect-square w-full rounded-md overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  <img 
                    src={track.coverUrl} 
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCurrent && isPlaying) {
                        togglePlayPause();
                      } else {
                        playTrack(track, allTracks);
                      }
                    }}
                    className={`absolute right-2 bottom-2 w-11 h-11 rounded-full bg-[#ffde59] text-black flex items-center justify-center shadow-2xl transition-all duration-200 ${
                      isCurrent && isPlaying
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <span className="flex items-end gap-0.5 h-4">
                        <span className="w-1 bg-black animate-eq-1" />
                        <span className="w-1 bg-black animate-eq-2" />
                        <span className="w-1 bg-black animate-eq-3" />
                      </span>
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`font-bold text-sm truncate ${
                    isCurrent 
                      ? 'text-[#05e0e9]' 
                      : (theme === 'dark' ? 'text-white' : 'text-zinc-900')
                  }`}>
                    {track.title}
                  </span>
                  <span className={`text-xs truncate ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {track.artist}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section: Artistas Populares */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold hover:underline cursor-pointer transition-colors ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            {t('home.popularArtists')}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {artists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => navigateTo('artist', artist.id)}
              className={`p-3.5 rounded-lg flex flex-col items-center text-center gap-3 group cursor-pointer transition-all ${
                theme === 'dark' 
                  ? 'bg-[#2c2c2c] hover:bg-[#383838]' 
                  : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 shadow-sm'
              }`}
            >
              <div className={`relative w-32 h-32 rounded-full overflow-hidden shadow-xl ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <img 
                  src={artist.avatarUrl} 
                  alt={artist.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="flex flex-col gap-0.5 min-w-0 w-full">
                <span className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
                  {artist.name}
                </span>
                <span className={`text-xs capitalize ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {t('playlist.artistLabel')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Álbumes Destacados */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold hover:underline cursor-pointer transition-colors ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>
            {t('home.featuredAlbums')}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {MOCK_ALBUMS.map((album) => (
            <div
              key={album.id}
              onClick={() => navigateTo('album', album.id)}
              className={`p-3.5 rounded-lg flex flex-col gap-3 group cursor-pointer transition-all ${
                theme === 'dark' 
                  ? 'bg-[#2c2c2c] hover:bg-[#383838]' 
                  : 'bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 shadow-sm'
              }`}
            >
              <div className={`relative aspect-square w-full rounded-md overflow-hidden shadow-md ${theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                <img 
                  src={album.coverUrl} 
                  alt={album.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{album.title}</span>
                <span className={`text-xs truncate ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{album.artist} • {album.releaseYear}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
