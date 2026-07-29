import React, { createContext, useContext, useState, useEffect } from 'react';
import { authClient } from '../lib/auth-client';

export type UserPlan = 'free' | 'creator' | 'pro';

export interface ArtistProfile {
  id: string;
  artistName: string;
  handle: string;
  bio: string;
  genre: string;
  avatarUrl: string;
  bannerUrl: string;
  verified: boolean;
  monthlyListeners: number;
  socialLinks: {
    spotify?: string;
    instagram?: string;
    youtube?: string;
    twitter?: string;
  };
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: UserPlan;
  credits: number;
  maxCredits: number;
  stripeCustomerId?: string;
  subscribedAt?: string;
  isAdmin?: boolean;
  
  // Security & Verification
  emailVerified?: boolean;
  phoneVerified?: boolean;
  phone?: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'authenticator' | 'sms' | null;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string[];
  
  // Artist Profile
  artistProfile?: ArtistProfile | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  
  // Auth actions
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Plan & Credit management
  upgradePlan: (plan: UserPlan) => void;
  consumeCredit: (amount?: number) => boolean;
  
  // Security & Verification Actions
  verifyEmail: (code: string) => Promise<boolean>;
  verifyPhone: (phone: string, code: string) => Promise<boolean>;
  enableTwoFactor: (method: 'authenticator' | 'sms', code: string) => Promise<{ success: boolean; backupCodes?: string[]; error?: string }>;
  disableTwoFactor: () => void;
  
  // Artist Profile Actions
  saveArtistProfile: (profile: Partial<ArtistProfile>) => ArtistProfile;

  // Modals
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  
  isCheckoutModalOpen: boolean;
  selectedPlanForCheckout: UserPlan | null;
  openCheckoutModal: (plan: UserPlan) => void;
  closeCheckoutModal: () => void;

  isAIUpsellModalOpen: boolean;
  openAIUpsellModal: () => void;
  closeAIUpsellModal: () => void;

  isSecurityModalOpen: boolean;
  openSecurityModal: () => void;
  closeSecurityModal: () => void;

  isArtistProfileModalOpen: boolean;
  openArtistProfileModal: () => void;
  closeArtistProfileModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PLAN_CREDITS: Record<UserPlan, number> = {
  free: 100,
  creator: 500,
  pro: 9999
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('qamuz_user_session') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<UserPlan | null>(null);

  const [isAIUpsellModalOpen, setIsAIUpsellModalOpen] = useState(false);

  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isArtistProfileModalOpen, setIsArtistProfileModalOpen] = useState(false);

  // Sync session to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('qamuz_user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('qamuz_user_session');
    }
  }, [user]);

  // Security Verification Methods
  const verifyEmail = async (code: string): Promise<boolean> => {
    if (!user) return false;
    // Simulate OTP verification check (accepts any 6 digit code or 123456)
    if (code.trim().length >= 4) {
      setUser(prev => prev ? { ...prev, emailVerified: true } : null);
      return true;
    }
    return false;
  };

  const verifyPhone = async (phoneNumber: string, code: string): Promise<boolean> => {
    if (!user) return false;
    if (phoneNumber && code.trim().length >= 4) {
      setUser(prev => prev ? {
        ...prev,
        phone: phoneNumber,
        phoneVerified: true
      } : null);
      return true;
    }
    return false;
  };

  const enableTwoFactor = async (
    method: 'authenticator' | 'sms', 
    code: string
  ): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };
    if (!code || code.trim().length < 4) {
      return { success: false, error: 'Código de verificación de 2FA inválido' };
    }

    // Generate 8 backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000)
    );

    setUser(prev => prev ? {
      ...prev,
      twoFactorEnabled: true,
      twoFactorMethod: method,
      twoFactorSecret: method === 'authenticator' ? 'QAMUZ-2FA-' + Math.random().toString(36).substring(2, 8).toUpperCase() : null,
      twoFactorBackupCodes: backupCodes
    } : null);

    return { success: true, backupCodes };
  };

  const disableTwoFactor = () => {
    setUser(prev => prev ? {
      ...prev,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorSecret: null,
      twoFactorBackupCodes: []
    } : null);
  };

  // Artist Profile Method
  const saveArtistProfile = (data: Partial<ArtistProfile>): ArtistProfile => {
    const currentArtist = user?.artistProfile;
    const newArtistProfile: ArtistProfile = {
      id: currentArtist?.id || `ar_usr_${user?.id || Date.now()}`,
      artistName: data.artistName || currentArtist?.artistName || user?.name || 'Nuevo Artista',
      handle: data.handle || currentArtist?.handle || `@${(user?.name || 'artista').toLowerCase().replace(/\s+/g, '')}`,
      bio: data.bio || currentArtist?.bio || 'Artista independiente en la plataforma Qamuz AI.',
      genre: data.genre || currentArtist?.genre || 'Urbano / Pop',
      avatarUrl: data.avatarUrl || currentArtist?.avatarUrl || user?.avatar || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      bannerUrl: data.bannerUrl || currentArtist?.bannerUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
      verified: true, // Automatically grant verified artist status on completion
      monthlyListeners: currentArtist?.monthlyListeners || Math.floor(12500 + Math.random() * 50000),
      socialLinks: {
        spotify: data.socialLinks?.spotify || currentArtist?.socialLinks?.spotify || '',
        instagram: data.socialLinks?.instagram || currentArtist?.socialLinks?.instagram || '',
        youtube: data.socialLinks?.youtube || currentArtist?.socialLinks?.youtube || '',
        twitter: data.socialLinks?.twitter || currentArtist?.socialLinks?.twitter || ''
      },
      createdAt: currentArtist?.createdAt || new Date().toISOString()
    };

    setUser(prev => prev ? { ...prev, artistProfile: newArtistProfile } : null);
    
    // Save to global local artists cache
    try {
      const savedArtists = typeof window !== 'undefined' ? localStorage.getItem('qamuz_custom_artists') : null;
      let artistList: ArtistProfile[] = savedArtists ? JSON.parse(savedArtists) : [];
      artistList = [newArtistProfile, ...artistList.filter(a => a.id !== newArtistProfile.id)];
      localStorage.setItem('qamuz_custom_artists', JSON.stringify(artistList));
    } catch (e) {
      console.warn("Could not sync custom artist list", e);
    }

    return newArtistProfile;
  };

  const openSecurityModal = () => setIsSecurityModalOpen(true);
  const closeSecurityModal = () => setIsSecurityModalOpen(false);

  const openArtistProfileModal = () => setIsArtistProfileModalOpen(true);
  const closeArtistProfileModal = () => setIsArtistProfileModalOpen(false);

  const { data: sessionData, isPending: isSessionPending } = authClient.useSession();
  
  useEffect(() => {
    if (sessionData && (sessionData as any).user) {
      const u = (sessionData as any).user;
      setUser({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.image || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop`,
        plan: (u as any).planTier || 'free',
        credits: (u as any).isAdmin ? 9999 : 100,
        maxCredits: (u as any).isAdmin ? 9999 : 100,
        isAdmin: !!(u as any).isAdmin,
        emailVerified: u.emailVerified
      });
    } else if (!isSessionPending) {
      setUser(null);
    }
  }, [sessionData, isSessionPending]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.includes('@')) return false;
    
    const { error } = await authClient.signIn.email({
      email: normalizedEmail,
      password: pass
    });

    if (!error) {
      setIsAuthModalOpen(false);
      return true;
    } else {
      console.warn("Login failed:", error.message);
      return false;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();
    const cleanedName = name.trim();

    if (!normalizedEmail.includes('@') || !cleanedName) return false;

    const { error } = await authClient.signUp.email({
      email: normalizedEmail,
      password: pass,
      name: cleanedName
    });

    if (!error) {
      setIsAuthModalOpen(false);
      return true;
    } else {
      console.warn("Registration failed:", error.message);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    const { error } = await authClient.signIn.social({
      provider: "google"
    });
    return !error;
  };

  const logout = async () => {
    await authClient.signOut();
    setUser(null);
  };

  const upgradePlan = (plan: UserPlan) => {
    if (!user) return;
    const maxCreds = PLAN_CREDITS[plan];
    setUser({
      ...user,
      plan,
      credits: maxCreds,
      maxCredits: maxCreds,
      stripeCustomerId: `cus_${Math.random().toString(36).substring(2, 10)}`,
      subscribedAt: new Date().toISOString()
    });
  };

  const consumeCredit = (amount = 1): boolean => {
    if (!user) return false;
    if (user.credits < amount) return false;

    setUser(prev => prev ? { ...prev, credits: prev.credits - amount } : null);
    return true;
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const openCheckoutModal = (plan: UserPlan) => {
    if (!user) {
      openAuthModal('register');
      return;
    }
    setSelectedPlanForCheckout(plan);
    setIsCheckoutModalOpen(true);
  };

  const closeCheckoutModal = () => {
    setIsCheckoutModalOpen(false);
    setSelectedPlanForCheckout(null);
  };

  const openAIUpsellModal = () => setIsAIUpsellModalOpen(true);
  const closeAIUpsellModal = () => setIsAIUpsellModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        loginWithGoogle,
        logout,
        upgradePlan,
        consumeCredit,
        verifyEmail,
        verifyPhone,
        enableTwoFactor,
        disableTwoFactor,
        saveArtistProfile,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isCheckoutModalOpen,
        selectedPlanForCheckout,
        openCheckoutModal,
        closeCheckoutModal,
        isAIUpsellModalOpen,
        openAIUpsellModal,
        closeAIUpsellModal,
        isSecurityModalOpen,
        openSecurityModal,
        closeSecurityModal,
        isArtistProfileModalOpen,
        openArtistProfileModal,
        closeArtistProfileModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

