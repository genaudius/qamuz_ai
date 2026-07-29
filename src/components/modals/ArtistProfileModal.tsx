import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Sparkles, 
  Music, 
  Globe, 
  Instagram, 
  Youtube, 
  Twitter, 
  User, 
  Image as ImageIcon,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { useLanguage } from '../../context/LanguageContext';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80'
];

const PRESET_BANNERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=1200&auto=format&fit=crop&q=80'
];

export const ArtistProfileModal: React.FC = () => {
  const { user, saveArtistProfile, isArtistProfileModalOpen, closeArtistProfileModal } = useAuth();
  const { navigateTo } = usePlayer();
  const { t } = useLanguage();

  const existingProfile = user?.artistProfile;

  const [artistName, setArtistName] = useState(existingProfile?.artistName || user?.name || '');
  const [handle, setHandle] = useState(existingProfile?.handle || `@${(user?.name || 'artista').toLowerCase().replace(/\s+/g, '')}`);
  const [genre, setGenre] = useState(existingProfile?.genre || 'Urbano / Pop');
  const [bio, setBio] = useState(existingProfile?.bio || 'Compositor y productor de música original en Qamuz AI Studio.');
  const [avatarUrl, setAvatarUrl] = useState(existingProfile?.avatarUrl || user?.avatar || PRESET_AVATARS[0]);
  const [bannerUrl, setBannerUrl] = useState(existingProfile?.bannerUrl || PRESET_BANNERS[0]);
  const [spotifyUrl, setSpotifyUrl] = useState(existingProfile?.socialLinks?.spotify || '');
  const [instagramUrl, setInstagramUrl] = useState(existingProfile?.socialLinks?.instagram || '');
  const [youtubeUrl, setYoutubeUrl] = useState(existingProfile?.socialLinks?.youtube || '');
  const [twitterUrl, setTwitterUrl] = useState(existingProfile?.socialLinks?.twitter || '');

  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  if (!isArtistProfileModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistName.trim()) return;

    const saved = saveArtistProfile({
      artistName: artistName.trim(),
      handle: handle.startsWith('@') ? handle.trim() : `@${handle.trim()}`,
      genre,
      bio,
      avatarUrl,
      bannerUrl,
      socialLinks: {
        spotify: spotifyUrl,
        instagram: instagramUrl,
        youtube: youtubeUrl,
        twitter: twitterUrl
      }
    });

    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      closeArtistProfileModal();
      navigateTo('artist', saved.id);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#181818] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#121212]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {existingProfile ? 'Editar Perfil de Artista' : 'Crear Perfil de Artista Verificado'}
              </h2>
              <p className="text-xs text-zinc-400">
                Lanza tu perfil oficial con insignia azul de verificación en Qamuz
              </p>
            </div>
          </div>

          <button 
            onClick={closeArtistProfileModal}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-sky-950/60 via-indigo-950/40 to-purple-950/60 p-4 rounded-xl border border-sky-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-100 space-y-1">
              <p className="font-extrabold text-white text-sm">Insignia de Artista Verificado</p>
              <p className="text-zinc-300">
                Al publicar tu Perfil de Artista, obtendrás automáticamente la insignia oficial de verificación azul, un banner personalizado y la posibilidad de vincular tus creaciones musicales directamente en el catálogo general.
              </p>
            </div>
          </div>

          {/* Live Profile Card Preview */}
          <div className="bg-[#121212] rounded-xl overflow-hidden border border-zinc-800 p-4">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Vista Previa de tu Perfil de Artista
            </p>

            <div 
              className="relative h-36 rounded-lg bg-cover bg-center p-4 flex items-end justify-between border border-zinc-700/50"
              style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2)), url(${bannerUrl})` }}
            >
              <div className="flex items-center gap-3">
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="w-16 h-16 rounded-full border-2 border-sky-400 object-cover shadow-lg shrink-0" 
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-white text-xl">{artistName || 'Nombre de Artista'}</span>
                    <CheckCircle2 className="w-5 h-5 text-black fill-sky-400 shrink-0" />
                  </div>
                  <p className="text-xs text-sky-300 font-medium">{handle}</p>
                  <span className="inline-block mt-1 bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-500/30">
                    {genre}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Artist Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Nombre del Artista <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Ej: Bad Bunny, Synthia"
                className="w-full bg-[#242424] text-white text-sm rounded-lg px-3 py-2.5 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Handle / Slug */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Usuario / Handle (@)
              </label>
              <input 
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@nombreartista"
                className="w-full bg-[#242424] text-white text-sm rounded-lg px-3 py-2.5 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Primary Genre */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Género Principal
              </label>
              <select 
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-[#242424] text-white text-sm rounded-lg px-3 py-2.5 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Urbano / Reggaeton">Urbano / Reggaeton</option>
                <option value="Pop Latino">Pop Latino</option>
                <option value="Synthwave & Retro">Synthwave & Retro</option>
                <option value="Lo-Fi Chill">Lo-Fi Chill</option>
                <option value="Rock & Metal">Rock & Metal</option>
                <option value="EDM / Electronic">EDM / Electronic</option>
                <option value="Trap / Hip-Hop">Trap / Hip-Hop</option>
                <option value="Clásica / Instrumental">Clásica / Instrumental</option>
              </select>
            </div>

            {/* Bio */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Biografía del Artista
              </label>
              <textarea 
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Escribe una breve descripción de tu propuesta musical..."
                className="w-full bg-[#242424] text-white text-sm rounded-lg p-3 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Avatar Photo Selection */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-zinc-300">
                Imagen de Perfil (Avatar)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input 
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="URL de imagen https://..."
                  className="w-full sm:flex-1 bg-[#242424] text-white text-xs rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-[10px] text-zinc-500 uppercase font-bold hidden sm:inline-block">o</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAvatarUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-extrabold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 cursor-pointer w-full sm:w-auto"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-zinc-400">Presets rápidos:</span>
                {PRESET_AVATARS.map((url, i) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt="Preset" 
                    onClick={() => setAvatarUrl(url)}
                    className={`w-8 h-8 rounded-full cursor-pointer object-cover border-2 transition-all hover:scale-110 ${
                      avatarUrl === url ? 'border-sky-400 ring-2 ring-sky-500/50' : 'border-zinc-700 opacity-60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Banner Photo Selection */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-zinc-300">
                Banner de Portada del Artista
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input 
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="URL de portada https://..."
                  className="w-full sm:flex-1 bg-[#242424] text-white text-xs rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-[10px] text-zinc-500 uppercase font-bold hidden sm:inline-block">o</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setBannerUrl(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-extrabold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 cursor-pointer w-full sm:w-auto"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-zinc-400">Portadas disponibles:</span>
                {PRESET_BANNERS.map((url, i) => (
                  <div 
                    key={i} 
                    onClick={() => setBannerUrl(url)}
                    className={`w-14 h-8 rounded cursor-pointer overflow-hidden border-2 transition-all hover:scale-105 ${
                      bannerUrl === url ? 'border-sky-400 ring-2 ring-sky-500/50' : 'border-zinc-700 opacity-60'
                    }`}
                  >
                    <img src={url} alt="Preset" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="sm:col-span-2 pt-2 border-t border-zinc-800 space-y-3">
              <p className="text-xs font-bold text-zinc-300">Redes Sociales y Streaming (Opcional)</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-zinc-700">
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Spotify Artist Link"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                  />
                </div>

                <div className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-zinc-700">
                  <Instagram className="w-4 h-4 text-pink-400 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Instagram (@tuusuario)"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                  />
                </div>

                <div className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-zinc-700">
                  <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Canal de YouTube"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                  />
                </div>

                <div className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2 border border-zinc-700">
                  <Twitter className="w-4 h-4 text-sky-400 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Twitter / X (@tuusuario)"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none w-full"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button 
              type="button"
              onClick={closeArtistProfileModal}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>

            <button 
              type="submit"
              disabled={isSavedSuccess}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-black font-extrabold text-xs px-6 py-2.5 rounded-full transition-transform hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {isSavedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>¡Perfil Guardado!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 fill-current text-black" />
                  <span>Guardar Perfil Verificado</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
