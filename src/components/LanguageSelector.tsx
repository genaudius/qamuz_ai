import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, Language } from '../context/LanguageContext';

export const LanguageSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-full border border-zinc-700/70 text-xs font-bold transition-all">
      <Globe className="w-3.5 h-3.5 text-[#1DB954]" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="bg-transparent text-white focus:outline-none cursor-pointer font-bold text-xs"
        aria-label={t('header.language')}
      >
        <option value="en" className="bg-[#181818] text-white">English (US)</option>
        <option value="es" className="bg-[#181818] text-white">Español (ES)</option>
      </select>
    </div>
  );
};
