import React, { useState } from 'react';
import { 
  Home, 
  Search, 
  Library, 
  Plus, 
  Heart, 
  Music, 
  ListMusic, 
  User, 
  Disc, 
  Trash2, 
  MoreVertical,
  Pin,
  Upload,
  Sparkles,
  Activity,
  Award,
  Flame,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export const Sidebar: React.FC = () => {
  const { 
    activeView, 
    navigateTo, 
    playlists, 
    likedTrackIds, 
    setIsCreatePlaylistModalOpen,
    setIsAddCustomTrackModalOpen,
    deletePlaylist,
    setIsRecommendationModalOpen,
    setIsPlanRecommenderOpen
  } = usePlayer();

  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme, darkLogoUrl, lightLogoUrl, logoWidth, logoHeight } = useTheme();

  const [filter, setFilter] = useState<'all' | 'playlists' | 'artists'>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredPlaylists = playlists.filter(pl => {
    if (filter === 'playlists') return true;
    return true;
  });

  const bgAside = theme === 'dark' ? 'bg-[#545454] text-zinc-300' : 'bg-[#f4f5f8] text-zinc-700';
  const bgContainer = theme === 'dark' ? 'bg-[#383838]' : 'bg-white shadow-sm border border-zinc-200';
  const textHeader = theme === 'dark' ? 'text-white' : 'text-zinc-900';
  const textActive = theme === 'dark' ? 'text-white bg-zinc-800/60' : 'text-zinc-900 bg-zinc-200/80';
  const textInactive = theme === 'dark' ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/30' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/50';
  const playlistHover = theme === 'dark' ? 'hover:bg-[#1f1f1f]' : 'hover:bg-zinc-100';
  const playlistActive = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-200/60';
  const filterActiveStyle = theme === 'dark' ? 'bg-white text-black' : 'bg-zinc-900 text-white';
  const filterInactiveStyle = theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300';

  return (
    <aside className={`hidden md:flex w-72 lg:w-80 ${bgAside} flex-col gap-2 p-2 h-full font-sans select-none shrink-0 transition-colors duration-200`}>
      {/* Top Main Navigation */}
      <div className={`${bgContainer} rounded-xl p-4 flex flex-col gap-4 transition-colors duration-200`}>
        {/* Qamuz Logo */}
        <div className="flex items-center gap-2 font-bold text-xl px-2 py-1 cursor-pointer" onClick={() => navigateTo('home')}>
          {((theme === 'dark' && darkLogoUrl) || (theme === 'light' && lightLogoUrl)) ? (
            <img 
              src={theme === 'dark' ? darkLogoUrl : lightLogoUrl} 
              alt="Qamuz" 
              style={{ width: `${logoWidth}px`, height: `${logoHeight}px`, objectFit: 'contain', objectPosition: 'left' }}
              className="shrink-0"
            />
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#05e0e9] via-cyan-400 to-[#ffde59] flex items-center justify-center text-black font-black shadow-lg shadow-cyan-500/20">
                <Sparkles className="w-5 h-5 text-black fill-current" />
              </div>
              <div className="flex flex-col">
                <span className={`tracking-wider text-lg font-black bg-gradient-to-r from-[#05e0e9] to-[#ffde59] bg-clip-text text-transparent`}>Qamuz</span>
              </div>
            </>
          )}
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1">
          <button
            onClick={() => navigateTo('home')}
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg font-bold text-sm transition-colors ${
              activeView.type === 'home' ? textActive : textInactive
            }`}
          >
            <Home className="w-5 h-5" />
            <span>{t('nav.home')}</span>
          </button>

          <button
            onClick={() => navigateTo('search')}
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg font-bold text-sm transition-colors ${
              activeView.type === 'search' ? textActive : textInactive
            }`}
          >
            <Search className="w-5 h-5" />
            <span>{t('nav.search')}</span>
          </button>

          <button
            onClick={() => navigateTo('ai-studio')}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-bold text-sm transition-all border ${
              activeView.type === 'ai-studio'
                ? 'text-white bg-gradient-to-r from-emerald-950/80 via-zinc-800 to-purple-950/80 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : theme === 'dark' 
                  ? 'text-zinc-300 hover:text-white bg-gradient-to-r from-zinc-900/80 to-zinc-800/40 border-zinc-700/50 hover:border-cyan-500/40'
                  : 'text-zinc-700 hover:text-zinc-900 bg-zinc-100 border-zinc-300 hover:border-cyan-500/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#05e0e9] animate-pulse" />
              <span>{t('nav.aiCreator')}</span>
            </div>
            <span className="text-[10px] uppercase font-black tracking-widest bg-cyan-500/20 text-[#05e0e9] px-1.5 py-0.5 rounded border border-cyan-500/30">
              AI
            </span>
          </button>

          {(user?.isAdmin || user?.email === 'genaudius@gmail.com') && (
            <button
              onClick={() => navigateTo('admin')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg font-bold text-xs transition-colors ${
                activeView.type === 'admin'
                  ? 'text-[#05e0e9] bg-cyan-500/10 border border-cyan-500/30'
                  : textInactive
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-[#05e0e9]" />
                <span>{t('nav.adminPanel')}</span>
              </div>
              <span className="text-[10px] font-black text-[#05e0e9] bg-cyan-500/20 px-1.5 py-0.5 rounded">
                Admin
              </span>
            </button>
          )}

          <button
            onClick={() => setIsPlanRecommenderOpen(true)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg font-bold text-xs transition-colors ${textInactive}`}
          >
            <div className="flex items-center gap-3">
              <Award className="w-4 h-4 text-purple-400" />
              <span>{t('header.planRecommender')}</span>
            </div>
            <span className="text-[10px] font-black text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">
              PRO
            </span>
          </button>
        </nav>
      </div>

      {/* Library Section */}
      <div className={`${bgContainer} rounded-xl p-3 flex-1 flex flex-col min-h-0 overflow-hidden transition-colors duration-200`}>
        {/* Library Header */}
        <div className="flex items-center justify-between px-2 py-2 mb-2">
          <button 
            onClick={() => navigateTo('library')}
            className={`flex items-center gap-2 transition-colors font-bold text-sm ${
              theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Library className="w-6 h-6" />
            <span>{t('nav.library')}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAddCustomTrackModalOpen(true)}
              title={t('header.addCustomTrack')}
              className={`p-1.5 rounded-full transition-colors ${
                theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsCreatePlaylistModalOpen(true)}
              title={t('nav.createPlaylist')}
              className={`p-1.5 rounded-full transition-colors ${
                theme === 'dark' ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-2 mb-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === 'all' ? filterActiveStyle : filterInactiveStyle
            }`}
          >
            {t('nav.all')}
          </button>
          <button
            onClick={() => setFilter('playlists')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === 'playlists' ? filterActiveStyle : filterInactiveStyle
            }`}
          >
            {t('nav.playlists')}
          </button>
        </div>

        {/* Playlists & Liked List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
          {/* Liked Songs Card */}
          <div
            onClick={() => navigateTo('liked')}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
              activeView.type === 'liked' ? playlistActive : playlistHover
            }`}
          >
            <div className="w-12 h-12 rounded-md bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-500 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-white fill-current" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`font-semibold text-sm truncate ${activeView.type === 'liked' ? 'text-[#05e0e9]' : theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>
                {t('home.likedSongsTile')}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Pin className="w-3 h-3 text-[#05e0e9] fill-current" />
                <span>Playlist • {likedTrackIds.length} {t('playlist.songsCount')}</span>
              </div>
            </div>
          </div>

          {/* User Playlists */}
          {filteredPlaylists.map((pl) => {
            const isActive = activeView.type === 'playlist' && activeView.id === pl.id;
            return (
              <div
                key={pl.id}
                onClick={() => navigateTo('playlist', pl.id)}
                className={`group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isActive ? playlistActive : playlistHover
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img 
                    src={pl.coverUrl} 
                    alt={pl.title}
                    className="w-12 h-12 rounded-md object-cover shrink-0 shadow"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className={`font-semibold text-sm truncate ${isActive ? 'text-[#05e0e9]' : theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>
                      {pl.title}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">
                      Playlist • {pl.ownerName}
                    </span>
                  </div>
                </div>

                {/* Options Menu for Custom Playlists */}
                {pl.isCustom && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === pl.id ? null : pl.id);
                      }}
                      className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                        theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpenId === pl.id && (
                      <div 
                        className={`absolute right-0 top-8 z-50 w-44 rounded-md shadow-2xl p-1 border ${
                          theme === 'dark' ? 'bg-[#282828] border-zinc-700/50 text-white' : 'bg-white border-zinc-200 text-zinc-800 shadow-lg'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            deletePlaylist(pl.id);
                            setMenuOpenId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-700/50 rounded text-left transition-colors font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar playlist</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
