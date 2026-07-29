import React, { useState } from 'react';
import { X, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register, loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const success = await login(email, password);
        if (!success) {
          setError(t('auth.invalidCreds'));
        }
      } else {
        if (!name.trim()) {
          setError(t('auth.enterName'));
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError(t('auth.passwordMin'));
          setLoading(false);
          return;
        }
        const success = await register(name, email, password);
        if (!success) {
          setError(t('auth.invalidCreds'));
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={closeAuthModal} />
      
      <div className="relative w-full max-w-sm bg-[#1E1E1E] rounded-xl overflow-hidden shadow-2xl flex flex-col p-8 z-10 border border-zinc-800">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Logo & Title */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center mb-4">
            <span className="text-black font-black text-2xl">Q</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            {mode === 'login' ? 'Sign in to Qamuz' : 'Create an Account'}
          </h2>
        </div>

        {/* Continue with Google */}
        <button
          onClick={() => loginWithGoogle()}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-zinc-200 hover:bg-white text-black font-bold py-3 px-4 rounded-full transition-all text-sm mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"/>
            <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"/>
          </svg>
          Continue with Google
        </button>

        {/* Other Socials */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button type="button" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-all text-white">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </button>
          <button type="button" onClick={() => login('usuario.apple@icloud.com', 'demo')} className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-all text-white">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-.99 2.97 1.08.08 2.16-.57 2.8-1.37z"/>
            </svg>
          </button>
          <button type="button" className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-all text-white">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
               <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
            </svg>
          </button>
        </div>

        {/* OR Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700/60" />
          </div>
          <div className="relative bg-[#1E1E1E] px-3 text-xs text-zinc-500 font-semibold tracking-wider">
            OR
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 text-xs text-center font-medium">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-[#2A2A2A] text-white text-sm rounded-lg px-4 py-3.5 border-none focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-500 font-medium"
              />
            </div>
          )}

          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-[#2A2A2A] text-white text-sm rounded-lg px-4 py-3.5 border-none focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-500 font-medium"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#2A2A2A] text-white text-sm rounded-lg pl-4 pr-12 py-3.5 border-none focus:outline-none focus:ring-1 focus:ring-zinc-600 placeholder:text-zinc-500 font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {mode === 'login' && (
            <div className="flex justify-end mt-1 mb-2">
              <button type="button" className="text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors">
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#36686C] hover:bg-[#3d7a7e] text-white font-bold py-3.5 rounded-lg transition-all active:scale-98 mt-2 text-sm shadow-md"
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign in' : 'Sign up')}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-sm">
          <span className="text-zinc-500 font-medium">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-white hover:underline font-bold"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {/* Terms */}
        <div className="mt-6 text-center text-xs text-zinc-500 font-medium leading-relaxed px-2">
          By continuing, you agree to <button className="text-white hover:underline">Terms of Use</button> and <button className="text-white hover:underline">Privacy Policy</button>.
        </div>
      </div>
    </div>
  );
};
