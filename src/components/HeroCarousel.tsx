import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Sparkles, Music, Info, Volume2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLanguage } from '../context/LanguageContext';
import { Track } from '../types/spotify';

interface SlideItem {
  id: string;
  badgeKey: string;
  titleKey: string;
  subtitleKey: string;
  descKey: string;
  bgImage: string;
  accentColor: string;
  badgeBg: string;
  actionType: 'play_track' | 'navigate_ai' | 'navigate_playlist' | 'navigate_artist';
  targetId?: string;
  trackSample?: Track;
}

export const HeroCarousel: React.FC = () => {
  const { allTracks, playTrack, currentTrack, isPlaying, togglePlayPause, navigateTo } = usePlayer();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slides: SlideItem[] = [
    {
      id: 'slide-ai-studio',
      badgeKey: 'hero.slide1Badge',
      titleKey: 'hero.slide1Title',
      subtitleKey: 'hero.slide1Subtitle',
      descKey: 'hero.slide1Desc',
      bgImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-[#1DB954] to-cyan-500',
      badgeBg: 'bg-emerald-500/20 text-[#1DB954] border-emerald-500/40',
      actionType: 'navigate_ai'
    },
    {
      id: 'slide-bad-bunny',
      badgeKey: 'hero.slide2Badge',
      titleKey: 'hero.slide2Title',
      subtitleKey: 'hero.slide2Subtitle',
      descKey: 'hero.slide2Desc',
      bgImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-amber-500 to-red-600',
      badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      actionType: 'play_track',
      trackSample: allTracks[0]
    },
    {
      id: 'slide-karol-g',
      badgeKey: 'hero.slide3Badge',
      titleKey: 'hero.slide3Title',
      subtitleKey: 'hero.slide3Subtitle',
      descKey: 'hero.slide3Desc',
      bgImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-pink-500 to-purple-600',
      badgeBg: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
      actionType: 'play_track',
      trackSample: allTracks[1]
    },
    {
      id: 'slide-lofi',
      badgeKey: 'hero.slide4Badge',
      titleKey: 'hero.slide4Title',
      subtitleKey: 'hero.slide4Subtitle',
      descKey: 'hero.slide4Desc',
      bgImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1600&auto=format&fit=crop',
      accentColor: 'from-cyan-500 to-blue-600',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      actionType: 'play_track',
      trackSample: allTracks[2] || allTracks[0]
    }
  ];

  const currentSlide = slides[currentIndex];

  // Auto rotation
  useEffect(() => {
    if (!isHovered) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, 5000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, slides.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrimaryAction = () => {
    if (currentSlide.actionType === 'navigate_ai') {
      navigateTo('ai-studio');
    } else if (currentSlide.actionType === 'play_track' && currentSlide.trackSample) {
      if (currentTrack?.id === currentSlide.trackSample.id) {
        togglePlayPause();
      } else {
        playTrack(currentSlide.trackSample, allTracks);
      }
    } else {
      navigateTo('search');
    }
  };

  const isCurrentPlaying = currentSlide.trackSample && currentTrack?.id === currentSlide.trackSample.id && isPlaying;

  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden shadow-2xl group border border-zinc-800 bg-zinc-950 transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Image Carousel Container */}
      <div className="relative h-[260px] sm:h-[320px] md:h-[360px] w-full overflow-hidden">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Image */}
              <img
                src={slide.bgImage}
                alt={t(slide.titleKey)}
                className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-1000"
              />

              {/* Dark Overlays & Gradients */}
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent sm:w-3/4" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />

              {/* Slide Content */}
              <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end sm:justify-center max-w-2xl gap-3 text-white z-20">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${slide.badgeBg} backdrop-blur-md`}>
                    {t(slide.badgeKey)}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none drop-shadow-md">
                  {t(slide.titleKey)}
                </h2>

                <p className="text-xs sm:text-sm font-semibold text-zinc-300">
                  {t(slide.subtitleKey)}
                </p>

                <p className="text-xs text-zinc-400 hidden sm:line-clamp-2 max-w-lg leading-relaxed">
                  {t(slide.descKey)}
                </p>

                {/* Call To Action Buttons */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handlePrimaryAction}
                    className="flex items-center gap-2 bg-[#1DB954] hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-all shadow-xl hover:scale-105 active:scale-95"
                  >
                    {currentSlide.actionType === 'navigate_ai' ? (
                      <>
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>{t('hero.openAiStudio')}</span>
                      </>
                    ) : (
                      <>
                        {isCurrentPlaying ? (
                          <>
                            <Pause className="w-4 h-4 fill-current" />
                            <span>{t('hero.pause')}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current" />
                            <span>{t('hero.playNow')}</span>
                          </>
                        )}
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (currentSlide.actionType === 'navigate_ai') {
                        navigateTo('ai-studio');
                      } else {
                        navigateTo('search');
                      }
                    }}
                    className="flex items-center gap-2 bg-black/50 hover:bg-zinc-800/80 text-white font-bold text-xs sm:text-sm px-4 py-2.5 sm:py-3 rounded-full border border-zinc-700/80 backdrop-blur-md transition-all hover:border-zinc-500"
                  >
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('hero.learnMore')}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-zinc-700/60 transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 backdrop-blur-md shadow-2xl"
        title={t('player.previous')}
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-zinc-700/60 transition-all opacity-80 group-hover:opacity-100 hover:scale-110 active:scale-95 backdrop-blur-md shadow-2xl"
        title={t('player.next')}
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-3 right-4 sm:right-6 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all rounded-full ${
              idx === currentIndex
                ? 'w-6 h-2 bg-[#1DB954]'
                : 'w-2 h-2 bg-zinc-600 hover:bg-zinc-400'
            }`}
            title={`Diapositiva ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
