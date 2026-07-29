import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  darkLogoUrl: string;
  setDarkLogoUrl: (url: string) => void;
  lightLogoUrl: string;
  setLightLogoUrl: (url: string) => void;
  faviconUrl: string;
  setFaviconUrl: (url: string) => void;
  logoWidth: string;
  setLogoWidth: (width: string) => void;
  logoHeight: string;
  setLogoHeight: (height: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('qamuz_theme') : null;
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [darkLogoUrl, setDarkLogoUrl] = useState('');
  const [lightLogoUrl, setLightLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [logoWidth, setLogoWidth] = useState('170');
  const [logoHeight, setLogoHeight] = useState('27');

  useEffect(() => {
    localStorage.setItem('qamuz_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [faviconUrl]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, toggleTheme, setTheme,
      darkLogoUrl, setDarkLogoUrl,
      lightLogoUrl, setLightLogoUrl,
      faviconUrl, setFaviconUrl,
      logoWidth, setLogoWidth,
      logoHeight, setLogoHeight
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
