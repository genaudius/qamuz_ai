'use client';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import { Player } from './components/Player';
import { MobileNav } from './components/MobileNav';
import { LyricsView } from './components/views/LyricsView';
import { QueueView } from './components/views/QueueView';
import { CreatePlaylistModal } from './components/modals/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/modals/AddToPlaylistModal';
import { AddCustomTrackModal } from './components/modals/AddCustomTrackModal';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { StripeCheckoutModal } from './components/auth/StripeCheckoutModal';
import { AIUpsellModal } from './components/modals/AIUpsellModal';
import { NowPlayingSidePanel } from './components/views/NowPlayingSidePanel';
import { PlanRecommenderModal } from './components/modals/PlanRecommenderModal';
import { RecommendationAlgorithmModal } from './components/modals/RecommendationAlgorithmModal';
import { ArtistProfileModal } from './components/modals/ArtistProfileModal';
import { SecurityModal } from './components/modals/SecurityModal';

function MainAppShell() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { 
    isLyricsOpen, 
    isQueueOpen,
    isPlanRecommenderOpen,
    setIsPlanRecommenderOpen,
    isRecommendationModalOpen,
    setIsRecommendationModalOpen,
    isSidebarOpen,
    isPlayerOpen
  } = usePlayer();

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Return null on server to avoid hydration mismatch, or match server exactly
  }

  if (!isAuthenticated) {
    return (
      <>
        <LandingPage />
        <AuthModal />
        <StripeCheckoutModal />
      </>
    );
  }

  const bgStyle = theme === 'dark' ? 'bg-[#545454] text-white' : 'bg-[#f4f5f8] text-[#121212]';
  const contentBgStyle = theme === 'dark' ? 'bg-[#383838]' : 'bg-white shadow-sm border border-zinc-200';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden ${bgStyle} font-sans antialiased select-none pb-12 md:pb-0 transition-colors duration-200`}>
      <div className="flex flex-1 min-h-0 overflow-hidden p-1 sm:p-2 gap-1 sm:gap-2">
        {isSidebarOpen && <Sidebar />}
        
        {/* Main Content + Player Column */}
        <div className="flex flex-col flex-1 min-w-0 gap-1 sm:gap-2 relative">
          <div className={`flex flex-col flex-1 min-w-0 ${contentBgStyle} rounded-xl overflow-hidden relative`}>
            <Header />
            <MainContent />
          </div>
          {/* Bottom Sticky Desktop Player */}
          {isPlayerOpen && <Player />}
        </div>
        
        <NowPlayingSidePanel />
      </div>

      {/* Mobile Navigation Bar */}
      <MobileNav />

      {/* Overlays & Modals */}
      {isLyricsOpen && <LyricsView />}
      {isQueueOpen && <QueueView />}
      <CreatePlaylistModal />
      <AddToPlaylistModal />
      <AddCustomTrackModal />
      <PlanRecommenderModal 
        isOpen={isPlanRecommenderOpen} 
        onClose={() => setIsPlanRecommenderOpen(false)} 
      />
      <RecommendationAlgorithmModal 
        isOpen={isRecommendationModalOpen} 
        onClose={() => setIsRecommendationModalOpen(false)} 
      />
      <AuthModal />
      <StripeCheckoutModal />
      <AIUpsellModal />
      <ArtistProfileModal />
      <SecurityModal />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <PlayerProvider>
            <MainAppShell />
          </PlayerProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}


