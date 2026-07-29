import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { LibraryView } from './views/LibraryView';
import { PlaylistDetailView } from './views/PlaylistDetailView';
import { ArtistDetailView } from './views/ArtistDetailView';
import { AIStudioView } from './views/AIStudioView';
import { AdminView } from './views/AdminView';

export const MainContent: React.FC = () => {
  const { activeView } = usePlayer();

  return (
    <main className="flex-1 bg-transparent rounded-xl overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6 relative flex flex-col min-h-0">
      {activeView.type === 'home' && <HomeView />}
      {activeView.type === 'search' && <SearchView />}
      {activeView.type === 'library' && <LibraryView />}
      {activeView.type === 'ai-studio' && <AIStudioView />}
      {activeView.type === 'admin' && <AdminView />}
      {activeView.type === 'playlist' && <PlaylistDetailView playlistId={activeView.id} />}
      {activeView.type === 'liked' && <PlaylistDetailView isLikedView={true} />}
      {activeView.type === 'artist' && <ArtistDetailView artistId={activeView.id} />}
      {activeView.type === 'album' && <PlaylistDetailView playlistId={activeView.id} />}
    </main>
  );
};
