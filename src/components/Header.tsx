import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  X, 
  User, 
  Sparkles, 
  Plus, 
  Upload, 
  Check, 
  Settings, 
  ExternalLink,
  LogOut,
  CreditCard,
  Zap,
  Activity,
  Award,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mic2,
  Sun,
  Moon,
  PanelLeft,
  PanelBottom
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { LanguageSelector } from './LanguageSelector';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { 
    activeView, 
    canGoBack, 
    canGoForward, 
    navigateBack, 
    navigateForward,
    searchQuery,
    setSearchQuery,
    navigateTo,
    setIsCreatePlaylistModalOpen,
    setIsAddCustomTrackModalOpen,
    setIsRecommendationModalOpen,
    setIsPlanRecommenderOpen,
    isSidebarOpen,
    setIsSidebarOpen,
    isPlayerOpen,
    setIsPlayerOpen
  } = usePlayer();

  const { 
    user, 
    logout, 
    openCheckoutModal, 
    openAuthModal, 
    openSecurityModal, 
    openArtistProfileModal 
  } = useAuth();
  const { t } = useLanguage();

  const [filterChip, setFilterChip] = useState<'all' | 'music' | 'podcasts'>('all');
  const [profileOpen, setProfileOpen] = useState<boolean>(false);

  const planLabel = user?.plan === 'pro' ? t('header.planPro') : user?.plan === 'creator' ? t('header.planCreator') : t('header.planFree');
  const planBadgeColor = user?.plan === 'pro' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : user?.plan === 'creator' ? 'bg-cyan-500/20 text-[#05e0e9] border-cyan-500/40' : theme === 'dark' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-100 text-zinc-600 border-zinc-200';

  const bgHeaderStyle = theme === 'dark' ? 'bg-[#383838]/90 text-white' : 'bg-white/90 text-zinc-900 border-b border-zinc-200/80';

  return (
    <header className={`sticky top-0 z-30 ${bgHeaderStyle} backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 select-none transition-all duration-200`}>
      {/* Navigation Arrows & Search Input */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
            title="Toggle Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsPlayerOpen(!isPlayerOpen)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all mr-2 ${
              theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
            title="Toggle Player"
          >
            <PanelBottom className="w-5 h-5" />
          </button>
          
          <button
            onClick={navigateBack}
            disabled={!canGoBack}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              theme === 'dark' 
                ? 'bg-black/60 text-white' 
                : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 shadow-sm'
            } ${
              canGoBack ? 'hover:scale-105 cursor-pointer opacity-100' : 'opacity-40 cursor-not-allowed'
            }`}
            title={t('header.back')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={navigateForward}
            disabled={!canGoForward}
            className={`hidden sm:flex w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              theme === 'dark' 
                ? 'bg-black/60 text-white' 
                : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 shadow-sm'
            } ${
              canGoForward ? 'hover:scale-105 cursor-pointer opacity-100' : 'opacity-40 cursor-not-allowed'
            }`}
            title={t('header.forward')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Global or Search View Search Bar */}
        {(activeView.type === 'search' || searchQuery.length > 0) ? (
          <div className="relative max-w-md w-full animate-fade-in">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView.type !== 'search') {
                  navigateTo('search');
                }
              }}
              className={`w-full ${
                theme === 'dark' 
                  ? 'bg-[#242424] text-white focus:ring-white border-transparent placeholder-zinc-400' 
                  : 'bg-zinc-100 text-zinc-900 focus:ring-[#05e0e9] border border-zinc-200 placeholder-zinc-500'
              } text-xs sm:text-sm rounded-full pl-9 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 focus:outline-none focus:ring-2 transition-all`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigateTo('search')}
            className={`sm:hidden flex items-center gap-2 ${
              theme === 'dark' ? 'bg-[#242424] text-zinc-400' : 'bg-zinc-100 border border-zinc-200 text-zinc-600'
            } px-3 py-1.5 rounded-full text-xs`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t('header.searchShort')}</span>
          </button>
        )}

        {/* Filter Pills (Home view) */}
        {activeView.type === 'home' && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setFilterChip('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterChip === 'all' 
                  ? (theme === 'dark' ? 'bg-white text-black' : 'bg-zinc-900 text-white') 
                  : (theme === 'dark' ? 'bg-[#242424] text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200')
              }`}
            >
              {t('header.filterAll')}
            </button>
            <button
              onClick={() => setFilterChip('music')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterChip === 'music' 
                  ? (theme === 'dark' ? 'bg-white text-black' : 'bg-zinc-900 text-white') 
                  : (theme === 'dark' ? 'bg-[#242424] text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200')
              }`}
            >
              {t('header.filterMusic')}
            </button>
            <button
              onClick={() => setFilterChip('podcasts')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterChip === 'podcasts' 
                  ? (theme === 'dark' ? 'bg-white text-black' : 'bg-zinc-900 text-white') 
                  : (theme === 'dark' ? 'bg-[#242424] text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200')
              }`}
            >
              {t('header.filterPodcasts')}
            </button>
          </div>
        )}
      </div>

      {/* Right User Controls & Plan Badge */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 text-qamuz-btn border border-zinc-700/60 transition-all hover:scale-105 shadow"
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#ffde59]" />
          ) : (
            <Moon className="w-4 h-4 text-[#05e0e9]" />
          )}
        </button>

        <LanguageSelector />

        {user && (
          <button
            onClick={() => openCheckoutModal('creator')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all hover:scale-105 ${planBadgeColor}`}
            title="Plan & Credits"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>{planLabel} ({user.credits} {t('header.credits')})</span>
          </button>
        )}

        <button 
          onClick={() => setIsAddCustomTrackModalOpen(true)}
          className={`flex items-center gap-1.5 ${
            theme === 'dark' 
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700' 
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300 shadow-sm'
          } text-xs font-bold px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full transition-all border`}
          title={t('header.addCustomTrack')}
        >
          <Upload className="w-3.5 h-3.5 text-[#05e0e9]" />
          <span className="hidden sm:inline">{t('header.addCustomTrack')}</span>
        </button>

        <button 
          onClick={() => setIsCreatePlaylistModalOpen(true)}
          className="hidden sm:flex items-center gap-1.5 bg-[#ffde59] hover:bg-[#fcd338] text-black hover:scale-105 text-xs font-extrabold px-3 py-2 rounded-full transition-all shadow"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t('nav.createPlaylist')}</span>
        </button>

        {/* Admin Panel Quick Access Button */}
        {(user?.isAdmin || user?.email === 'genaudius@gmail.com') && (
          <button
            onClick={() => navigateTo('admin')}
            className="flex items-center gap-1.5 bg-cyan-500/20 text-[#05e0e9] border border-cyan-500/40 hover:bg-cyan-500/30 text-xs font-extrabold px-3 py-1.5 rounded-full transition-all shadow"
            title={t('header.adminPanel')}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden md:inline">{t('header.adminPanel')}</span>
          </button>
        )}

        {/* User Profile / Auth Controls */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className={`w-9 h-9 rounded-full p-0.5 border ${
                theme === 'dark' ? 'bg-[#121212] border-zinc-700' : 'bg-white border-zinc-300 shadow-sm'
              } hover:scale-105 transition-transform flex items-center justify-center`}
              title={user.name}
            >
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-full h-full rounded-full object-cover"
              />
            </button>

            {profileOpen && (
              <div 
                className={`absolute right-0 top-11 w-56 ${
                  theme === 'dark' ? 'bg-[#282828] text-zinc-200 border-zinc-700' : 'bg-white text-zinc-800 border-zinc-200 shadow-xl'
                } rounded-xl p-1 text-xs border z-50 animate-in fade-in zoom-in-95 duration-100`}
                onClick={() => setProfileOpen(false)}
              >
                <div className={`px-3 py-2 border-b ${theme === 'dark' ? 'border-zinc-700/60' : 'border-zinc-100'} mb-1`}>
                  <p className={`font-bold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>{user.name}</p>
                  <p className="text-zinc-400 text-[11px] truncate">{user.email}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                    <span>{planLabel}</span>
                    <span>{user.credits} {t('header.credits')}</span>
                  </div>
                </div>

                {/* Artist Profile Trigger */}
                <button 
                  onClick={openArtistProfileModal}
                  className="w-full text-left px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 rounded flex items-center justify-between font-bold text-sky-300 transition-colors my-0.5 border border-sky-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Mic2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{user.artistProfile ? 'Mi Perfil de Artista' : 'Crear Perfil de Artista'}</span>
                  </div>
                  {user.artistProfile ? (
                    <CheckCircle2 className="w-3.5 h-3.5 fill-sky-400 text-black" />
                  ) : (
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded">Gratis</span>
                  )}
                </button>

                {/* Security & 2FA Trigger */}
                <button 
                  onClick={openSecurityModal}
                  className="w-full text-left px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded flex items-center justify-between font-bold text-cyan-300 transition-colors my-0.5 border border-cyan-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#05e0e9]" />
                    <span>Seguridad y 2FA</span>
                  </div>
                  {user.twoFactorEnabled ? (
                    <span className="text-[9px] bg-[#ffde59] text-black px-1.5 py-0.2 font-black rounded uppercase">2FA ON</span>
                  ) : (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 font-bold rounded uppercase">Rec.</span>
                  )}
                </button>

                {(user.isAdmin || user.email === 'genaudius@gmail.com') && (
                  <button 
                    onClick={() => navigateTo('admin')}
                    className="w-full text-left px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded flex items-center gap-2 font-bold text-[#05e0e9] transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('header.adminPanel')}</span>
                  </button>
                )}

                <button 
                  onClick={() => navigateTo('ai-studio')}
                  className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-zinc-700/60 text-cyan-300' : 'hover:bg-zinc-100 text-[#05e0e9]'} rounded flex items-center justify-between font-bold transition-colors`}
                >
                  <span>{t('header.aiStudio')}</span>
                </button>

                <button 
                  onClick={() => setIsRecommendationModalOpen(true)}
                  className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-zinc-700/60' : 'hover:bg-zinc-100'} rounded flex items-center gap-2 font-bold text-cyan-300 transition-colors`}
                >
                  <Activity className="w-3.5 h-3.5 text-[#05e0e9]" />
                  <span>{t('header.discoveryAlg')}</span>
                </button>

                <button 
                  onClick={() => setIsPlanRecommenderOpen(true)}
                  className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-zinc-700/60' : 'hover:bg-zinc-100'} rounded flex items-center gap-2 font-bold text-purple-400 transition-colors`}
                >
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('header.planRecommender')}</span>
                </button>

                <button 
                  onClick={() => openCheckoutModal('creator')}
                  className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-zinc-700/60 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'} rounded flex items-center gap-2 font-bold transition-colors`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t('header.stripeCheckout')}</span>
                </button>

                <button 
                  onClick={() => navigateTo('liked')}
                  className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-zinc-700/60 text-white' : 'hover:bg-zinc-100 text-zinc-800'} rounded flex items-center justify-between font-medium transition-colors`}
                >
                  <span>{t('header.savedSongs')}</span>
                </button>

                <button 
                  onClick={() => navigateTo('library')}
                  className={`w-full text-left px-3 py-2 ${theme === 'dark' ? 'hover:bg-zinc-700/60 text-white' : 'hover:bg-zinc-100 text-zinc-800'} rounded flex items-center justify-between font-medium transition-colors`}
                >
                  <span>{t('header.yourLibrary')}</span>
                </button>

                <div className={`border-t ${theme === 'dark' ? 'border-zinc-700/60' : 'border-zinc-200'} my-1`}></div>

                <button 
                  onClick={logout}
                  className="w-full text-left px-3 py-2 hover:bg-rose-500/20 text-rose-400 rounded flex items-center gap-2 font-bold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('header.logOut')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openAuthModal('login')}
              className={`text-xs font-bold px-3 py-2 rounded-full transition-colors ${
                theme === 'dark' ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {t('header.logIn')}
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="bg-[#ffde59] hover:bg-[#fcd338] text-black text-xs font-extrabold px-4 py-2 rounded-full transition-transform hover:scale-105 shadow"
            >
              {t('header.signUp')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
