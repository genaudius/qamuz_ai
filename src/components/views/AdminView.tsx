import React, { useState } from 'react';
import { 
  Users, 
  MessageSquare, 
  Image as ImageIcon, 
  Video, 
  DollarSign, 
  Award, 
  Activity, 
  TrendingUp, 
  Search, 
  Settings, 
  CreditCard, 
  Layers, 
  ShieldCheck, 
  Key, 
  Cloud, 
  Lock, 
  Mail, 
  Music, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  Check, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Globe, 
  Sparkles, 
  Cpu, 
  Server, 
  RefreshCw, 
  ArrowLeft, 
  HelpCircle,
  Radio,
  Sliders,
  Database,
  Bell,
  ChevronRight,
  ExternalLink,
  Shield,
  Zap,
  HardDrive,
  Brain,
  Palette,
  Upload,
  Gem
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

type MainTab = 'overview' | 'analytics' | 'users' | 'payments' | 'subscriptions' | 'notifications' | 'settings';

type SettingsSubTab = 
  | 'general' 
  | 'branding' 
  | 'payments' 
  | 'pricing' 
  | 'oauth' 
  | 'ai' 
  | 'storage' 
  | 'security' 
  | 'mailing' 
  | 'music_apis'
  | 'credit_packages';

interface CreditPackage {
  id: string;
  stripePriceId: string;
  priceAmount: number;
  credits: number;
  oldCredits: number | null;
  badgeText: string | null;
  isActive: boolean;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  status: 'Free' | 'Active' | 'Cancelled' | 'Expired';
  plan: 'Free' | 'Creator' | 'Studio Pro' | 'Enterprise';
  role: 'User' | 'Admin';
  createdAt: string;
}

interface SubscriptionRecord {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  planTier: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  createdAt: Date | null;
}

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const { navigateTo } = usePlayer();
  const { t } = useLanguage();
  const { 
    darkLogoUrl, setDarkLogoUrl, 
    lightLogoUrl, setLightLogoUrl, 
    faviconUrl, setFaviconUrl,
    logoWidth, setLogoWidth,
    logoHeight, setLogoHeight
  } = useTheme();

  const [activeMainTab, setActiveMainTab] = useState<MainTab>('overview');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsSubTab>('general');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // User Management State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [users, setUsers] = useState<UserRecord[]>([
    {
      id: 'usr_danny',
      name: 'dannygarciabachata',
      email: 'dannygarciabachata@gmail.com',
      status: 'Free',
      plan: 'Free',
      role: 'User',
      createdAt: 'Jul 4, 2026, 02:02 AM'
    },
    {
      id: 'usr_genaudius',
      name: 'Gen Audius',
      email: 'genaudius@gmail.com',
      status: 'Free',
      plan: 'Free',
      role: 'Admin',
      createdAt: 'Jul 3, 2026, 11:46 PM'
    },
    {
      id: 'usr_admin',
      name: 'admin',
      email: 'admin@genaudius.com',
      status: 'Free',
      plan: 'Free',
      role: 'Admin',
      createdAt: 'Jul 3, 2026, 06:23 PM'
    }
  ]);

  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  // Subscriptions State
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const [subscriptions] = useState<SubscriptionRecord[]>([
    {
      id: 'sub_123',
      userId: 'usr_danny',
      userName: 'dannygarciabachata',
      userEmail: 'dannygarciabachata@gmail.com',
      planTier: 'pro',
      status: 'active',
      currentPeriodStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25),
      cancelAtPeriodEnd: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 35)
    },
    {
      id: 'sub_456',
      userId: 'usr_genaudius',
      userName: 'Gen Audius',
      userEmail: 'genaudius@gmail.com',
      planTier: 'starter',
      status: 'canceled',
      currentPeriodStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
      cancelAtPeriodEnd: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45)
    }
  ]);
  const subscriptionsPerPage = 15;
  const totalSubscriptions = subscriptions.length;
  const totalSubscriptionPages = Math.ceil(totalSubscriptions / subscriptionsPerPage);


  // Settings State
  const [siteName, setSiteName] = useState('Gen Audius AI Platform');
  const [siteTitle, setSiteTitle] = useState('GenAudius - AI Music & Chat');
  const [siteDescription, setSiteDescription] = useState('GenAudius AI — music generation, chat with 65+ AI models, and more.');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [defaultTheme, setDefaultTheme] = useState('dark');
  const [defaultPage, setDefaultPage] = useState('landing');
  const [publicOrigin, setPublicOrigin] = useState('');
  const [openrouterSystemPrompt, setOpenrouterSystemPrompt] = useState('');
  
  const [stripeLiveMode, setStripeLiveMode] = useState(false); // Map false -> "test", true -> "live"
  const [stripePublishableKey, setStripePublishableKey] = useState('pk_test_sample_key_4839204');
  const [stripeSecretKey, setStripeSecretKey] = useState('sk_test_sample_key_9823489');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('whsec_sample_secret_7384923');
  const [showStripeInstructions, setShowStripeInstructions] = useState(false);
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false);
  const [showStripeWebhookSecret, setShowStripeWebhookSecret] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // OAuth Settings State
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('727297288161-ca9l576as7bmf8qkvbdh1adfsb4pqucf.apps.googleusercontent.com');
  const [googleClientSecret, setGoogleClientSecret] = useState('GOCSPX-sample_google_secret_key_89234');
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);

  const [appleEnabled, setAppleEnabled] = useState(false);
  const [appleClientId, setAppleClientId] = useState('com.yourcompany.yourapp');
  const [appleClientSecret, setAppleClientSecret] = useState('sample_apple_jwt_or_private_key');
  const [showAppleSecret, setShowAppleSecret] = useState(false);

  const [twitterEnabled, setTwitterEnabled] = useState(false);
  const [twitterClientId, setTwitterClientId] = useState('Your-App-Client-ID');
  const [twitterClientSecret, setTwitterClientSecret] = useState('Your-App-Client-Secret');
  const [showTwitterSecret, setShowTwitterSecret] = useState(false);

  const [facebookEnabled, setFacebookEnabled] = useState(false);
  const [facebookClientId, setFacebookClientId] = useState('1234567890123456');
  const [facebookClientSecret, setFacebookClientSecret] = useState('abcdefghijklmnopqrstuvwxyz123456');
  const [showFacebookSecret, setShowFacebookSecret] = useState(false);

  // AI Models Settings State
  const [openRouterKey, setOpenRouterKey] = useState('sk-or-v1-987239487239487239847293847293847293847293847293847293847239847');
  const [replicateKey, setReplicateKey] = useState('r8_sample_replicate_token_92837492837492837');
  const [sunoKey, setSunoKey] = useState('kie_sample_suno_key_9283749283749283');

  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  const [showReplicateKey, setShowReplicateKey] = useState(false);
  const [showSunoKey, setShowSunoKey] = useState(false);

  // Cloud Storage Settings State
  const [r2AccountId, setR2AccountId] = useState('89a4f0bc1fd541a289288c76cb7e7aa2');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('4a5b6c7d8e9f0123456789abcdef0123');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('f0e9d8c7b6a543210fedcba9876543210fedcba987654321');
  const [r2BucketName, setR2BucketName] = useState('genaudiusa-pp');
  const [r2BrandingBucket, setR2BrandingBucket] = useState('genaudius-branding');
  const [r2PublicUrl, setR2PublicUrl] = useState('https://pub-89a4f0bc1fd541a289288c76cb7e7aa2.r2.dev');

  const [showAccountId, setShowAccountId] = useState(false);
  const [showAccessKeyId, setShowAccessKeyId] = useState(false);
  const [showSecretAccessKey, setShowSecretAccessKey] = useState(false);

  // Security Settings State
  const [turnstileEnabled, setTurnstileEnabled] = useState(true);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('0x4AAAAAADvW7vTjNC6MvaBy');
  const [turnstileSecretKey, setTurnstileSecretKey] = useState('0x4AAAAAADvW7vTjNC6MvaBy_secret_key');
  const [showTurnstileSecretKey, setShowTurnstileSecretKey] = useState(false);

  // Mailing Settings State
  const [smtpHost, setSmtpHost] = useState('smtp.hostinger.com');

  // Notifications State
  const [notificationType, setNotificationType] = useState('promo');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationLink, setNotificationLink] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpSsl, setSmtpSsl] = useState('true');
  const [smtpUser, setSmtpUser] = useState('admin@genaudius.com');
  const [smtpPassword, setSmtpPassword] = useState('password123');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState('noreply@genaudius.com');
  const [smtpDisplayName, setSmtpDisplayName] = useState('Gen Audius');

  // Music APIs Settings State
  const [spotifyClientId, setSpotifyClientId] = useState('884ef4764df944deaecf565a8e4b57ae');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('fee73d7863dc4c1b8f2390b23a57023b');
  const [lastfmApiKey, setLastfmApiKey] = useState('58d061f907804dadbc5dbf61f1a53bba');
  const [musicTagsCount, setMusicTagsCount] = useState({ genres: 0, tags: 50 });
  const [showSpotifySecret, setShowSpotifySecret] = useState(false);
  const [showLastfmKey, setShowLastfmKey] = useState(false);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);

  // Credit Packages State
  type CreditPackageView = 'list' | 'create' | 'edit';
  const [creditPackageView, setCreditPackageView] = useState<CreditPackageView>('list');
  const [editingCreditPackageId, setEditingCreditPackageId] = useState<string | null>(null);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([
    { id: '1', stripePriceId: 'price_1Qx7r22eZvKYlo2C3J4s5K6L', priceAmount: 5, credits: 500, oldCredits: null, badgeText: null, isActive: true },
    { id: '2', stripePriceId: 'price_1Qx7r32eZvKYlo2C4K5t6L7M', priceAmount: 10, credits: 1100, oldCredits: 1000, badgeText: '10% Bonus', isActive: true },
    { id: '3', stripePriceId: 'price_1Qx7r42eZvKYlo2C5L6u7M8N', priceAmount: 20, credits: 2400, oldCredits: 2000, badgeText: '20% Bonus', isActive: true },
  ]);
  const [cpForm, setCpForm] = useState<Partial<CreditPackage>>({});

  // Pricing Plans State
  type PricingPlanView = 'list' | 'create' | 'edit';
  const [pricingPlanView, setPricingPlanView] = useState<PricingPlanView>('list');
  const [editingPricingPlanId, setEditingPricingPlanId] = useState<string | null>(null);
  const [pricingPlans, setPricingPlans] = useState<any[]>([
    { id: '1', name: 'Free plan', tier: 'free', stripePriceId: 'free_plan_default', priceAmount: 0, currency: 'usd', billingInterval: 'month', creditLimit: 500, textGenerationLimit: null, imageGenerationLimit: null, videoGenerationLimit: null, audioGenerationLimit: null, features: ['Free plan'], isActive: true },
    { id: '2', name: 'Creator AI', tier: 'starter', stripePriceId: 'price_1CreatorAI', priceAmount: 999, currency: 'usd', billingInterval: 'month', creditLimit: 2500, textGenerationLimit: null, imageGenerationLimit: null, videoGenerationLimit: null, audioGenerationLimit: null, features: ['Creator AI features'], isActive: true },
    { id: '3', name: 'Studio Pro', tier: 'pro', stripePriceId: 'price_1StudioPro', priceAmount: 1999, currency: 'usd', billingInterval: 'month', creditLimit: 9999, textGenerationLimit: null, imageGenerationLimit: null, videoGenerationLimit: null, audioGenerationLimit: null, features: ['Studio Pro features'], isActive: true },
  ]);
  const [ppForm, setPpForm] = useState<any>({});

  // Filter users
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const handleSaveUser = () => {
    if (!editingUser) return;
    setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
    showToast('Usuario actualizado correctamente');
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este usuario?')) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('Usuario eliminado del sistema');
    }
  };

  const handleCpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCreditPackageId) {
      setCreditPackages(creditPackages.map(pkg => pkg.id === editingCreditPackageId ? { ...pkg, ...cpForm } as CreditPackage : pkg));
      showToast('Credit Package updated');
    } else {
      const newPkg: CreditPackage = {
        ...(cpForm as CreditPackage),
        id: Math.random().toString(36).substr(2, 9),
        isActive: true,
      };
      setCreditPackages([...creditPackages, newPkg]);
      showToast('Credit Package created');
    }
    setCreditPackageView('list');
  };

  const handleCpDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this credit package?')) {
      setCreditPackages(creditPackages.filter(pkg => pkg.id !== id));
      showToast('Credit Package deleted');
    }
  };

  const handleCpToggleActive = (id: string) => {
    setCreditPackages(creditPackages.map(pkg => pkg.id === id ? { ...pkg, isActive: !pkg.isActive } : pkg));
    showToast('Credit Package status updated');
  };

  const openCpCreate = () => {
    setCpForm({ stripePriceId: '', priceAmount: 0, credits: 0, oldCredits: null, badgeText: '' });
    setEditingCreditPackageId(null);
    setCreditPackageView('create');
  };

  const openCpEdit = (pkg: CreditPackage) => {
    setCpForm({ ...pkg });
    setEditingCreditPackageId(pkg.id);
    setCreditPackageView('edit');
  };

  return (
    <div className="flex flex-col gap-6 text-white pb-16 animate-fade-in font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-black font-extrabold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Header Navigation Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo('home')}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-2xl transition-all border border-zinc-700/80 flex items-center gap-2 text-xs font-extrabold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Go back to app</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Admin Dashboard</h1>
              <span className="bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                genaudius.com
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Logged as superadmin: <strong className="text-emerald-400 font-mono">genaudius@gmail.com</strong>
            </p>
          </div>
        </div>

        {/* Top Tab Bar */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'overview'
                ? 'bg-[#1DB954] text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveMainTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'analytics'
                ? 'bg-[#1DB954] text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveMainTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'users'
                ? 'bg-[#1DB954] text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users</span>
          </button>

          <button
            onClick={() => setActiveMainTab('payments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'payments'
                ? 'bg-[#1DB954] text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments</span>
          </button>

          <button
            onClick={() => setActiveMainTab('subscriptions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'subscriptions'
                ? 'bg-[#1DB954] text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Subscriptions</span>
          </button>

          <button
            onClick={() => setActiveMainTab('notifications')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'notifications'
                ? 'bg-[#1DB954] text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveMainTab('settings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeMainTab === 'settings'
                ? 'bg-[#1DB954] text-black shadow-lg'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Site Settings</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD OVERVIEW */}
      {/* ========================================================================= */}
      {activeMainTab === 'overview' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-black text-white">Dashboard Overview</h2>
            <p className="text-xs text-zinc-400">Monitor your platform's performance and activity.</p>
          </div>

          {/* 6 Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-4 flex flex-col gap-1 shadow-lg hover:border-emerald-500/40 transition-all">
              <span className="text-xs font-bold text-zinc-400">Total Users</span>
              <span className="text-3xl font-black text-white">3</span>
              <span className="text-[10px] text-zinc-500 font-medium">Registered users</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-4 flex flex-col gap-1 shadow-lg hover:border-emerald-500/40 transition-all">
              <span className="text-xs font-bold text-zinc-400">Total Chats</span>
              <span className="text-3xl font-black text-white">3</span>
              <span className="text-[10px] text-zinc-500 font-medium">Conversations created</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-4 flex flex-col gap-1 shadow-lg hover:border-emerald-500/40 transition-all">
              <span className="text-xs font-bold text-zinc-400">Images Generated</span>
              <span className="text-3xl font-black text-white">7</span>
              <span className="text-[10px] text-zinc-500 font-medium">Total images generated</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-4 flex flex-col gap-1 shadow-lg hover:border-emerald-500/40 transition-all">
              <span className="text-xs font-bold text-zinc-400">Videos Generated</span>
              <span className="text-3xl font-black text-white">2</span>
              <span className="text-[10px] text-zinc-500 font-medium">Total videos generated</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-4 flex flex-col gap-1 shadow-lg hover:border-emerald-500/40 transition-all">
              <span className="text-xs font-bold text-zinc-400">Total Revenue</span>
              <span className="text-3xl font-black text-[#1DB954]">$0.00</span>
              <span className="text-[10px] text-zinc-500 font-medium">Revenue from payments</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl p-4 flex flex-col gap-1 shadow-lg hover:border-emerald-500/40 transition-all">
              <span className="text-xs font-bold text-zinc-400">Active Subscriptions</span>
              <span className="text-3xl font-black text-white">0</span>
              <span className="text-[10px] text-zinc-500 font-medium">Current active subscriptions</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div>
                <h3 className="text-base font-extrabold text-white">Recent Activity</h3>
                <p className="text-xs text-zinc-400">Latest user actions across the platform</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-[#1DB954] font-black text-xs flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">genaudius@gmail.com</span>
                      <span className="text-[11px] text-zinc-400">Started new chat with <code className="text-emerald-400 bg-zinc-900 px-1 py-0.5 rounded">nvidia/nemotron-3-nano-30b-a3b:free</code></span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium shrink-0">7 days ago</span>
                </div>

                <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-black text-xs flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">genaudius@gmail.com</span>
                      <span className="text-[11px] text-zinc-400">Generated video</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium shrink-0">24 days ago</span>
                </div>

                <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-black text-xs flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">genaudius@gmail.com</span>
                      <span className="text-[11px] text-zinc-400">Generated video</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium shrink-0">24 days ago</span>
                </div>

                <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 font-black text-xs flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">genaudius@gmail.com</span>
                      <span className="text-[11px] text-zinc-400">Generated image</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium shrink-0">24 days ago</span>
                </div>

                <div className="bg-zinc-950/70 border border-zinc-800 p-3.5 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 font-black text-xs flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-white block">genaudius@gmail.com</span>
                      <span className="text-[11px] text-zinc-400">Generated image</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium shrink-0">24 days ago</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
              <div>
                <h3 className="text-base font-extrabold text-white">Quick Actions</h3>
                <p className="text-xs text-zinc-400">Common administrative tasks</p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setActiveMainTab('analytics')}
                  className="w-full p-3.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-2xl flex items-center gap-3 text-xs font-extrabold text-white transition-all text-left group"
                >
                  <span className="text-lg">📊</span>
                  <div className="flex flex-col">
                    <span>Analytics</span>
                    <span className="text-[10px] text-zinc-400 font-normal">View platform trends & statistics</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveMainTab('users')}
                  className="w-full p-3.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-2xl flex items-center gap-3 text-xs font-extrabold text-white transition-all text-left group"
                >
                  <span className="text-lg">👥</span>
                  <div className="flex flex-col">
                    <span>Manage Users</span>
                    <span className="text-[10px] text-zinc-400 font-normal">View registered users & edit roles</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveMainTab('payments')}
                  className="w-full p-3.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-2xl flex items-center gap-3 text-xs font-extrabold text-white transition-all text-left group"
                >
                  <span className="text-lg">💳</span>
                  <div className="flex flex-col">
                    <span>Manage Payments</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Review transactions & receipts</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveMainTab('subscriptions')}
                  className="w-full p-3.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-2xl flex items-center gap-3 text-xs font-extrabold text-white transition-all text-left group"
                >
                  <span className="text-lg">📋</span>
                  <div className="flex flex-col">
                    <span>Manage Subscriptions</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Monitor active plan tiers</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveMainTab('settings')}
                  className="w-full p-3.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-2xl flex items-center gap-3 text-xs font-extrabold text-white transition-all text-left group"
                >
                  <span className="text-lg">⚙️</span>
                  <div className="flex flex-col">
                    <span>Site Settings</span>
                    <span className="text-[10px] text-zinc-400 font-normal">API keys, OAuth, Stripe & branding</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ANALYTICS */}
      {/* ========================================================================= */}
      {activeMainTab === 'analytics' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-black text-white">Analytics</h2>
            <p className="text-xs text-zinc-400">Trends and usage charts across the platform</p>
          </div>

          {/* Chart 1: Users & Subscriptions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Users & Subscriptions</h3>
              <p className="text-xs text-zinc-400">Showing total registered users and active subscriptions over time</p>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center justify-end gap-6 text-xs">
                <span className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-3 h-3 rounded-full bg-[#1DB954]" />
                  Total Users (3)
                </span>
                <span className="flex items-center gap-2 text-purple-400 font-bold">
                  <span className="w-3 h-3 rounded-full bg-purple-500" />
                  Active Subscriptions (0)
                </span>
              </div>

              <div className="h-48 w-full flex items-end gap-2 pt-6 pb-2 border-b border-zinc-800 relative">
                {/* Horizontal reference lines */}
                <div className="absolute inset-x-0 top-1/4 border-b border-zinc-800/40 text-[9px] text-zinc-600 pl-1">3</div>
                <div className="absolute inset-x-0 top-2/4 border-b border-zinc-800/40 text-[9px] text-zinc-600 pl-1">2</div>
                <div className="absolute inset-x-0 top-3/4 border-b border-zinc-800/40 text-[9px] text-zinc-600 pl-1">1</div>

                <svg className="w-full h-full overflow-visible" viewBox="0 0 800 150" preserveAspectRatio="none">
                  {/* Total Users Line */}
                  <path
                    d="M 0,140 Q 200,140 400,120 T 800,20"
                    fill="none"
                    stroke="#1DB954"
                    strokeWidth="3"
                  />
                  {/* Active Subscriptions Line */}
                  <path
                    d="M 0,145 L 800,145"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1">
                <span>May 2</span>
                <span>May 16</span>
                <span>May 30</span>
                <span>Jun 13</span>
                <span>Jun 27</span>
                <span>Jul 11</span>
                <span>Jul 25</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800 pt-3">
              <span><strong>3</strong> total users</span>
              <span><strong>0</strong> total active subscriptions across all plans</span>
            </div>
          </div>

          {/* Chart 2: Revenue */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Revenue</h3>
              <p className="text-xs text-zinc-400">Daily revenue generated from successful payments over the last 90 days</p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-2">
              <div className="h-32 w-full flex items-end gap-2 pt-6 pb-2 border-b border-zinc-800">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 800 100" preserveAspectRatio="none">
                  <path
                    d="M 0,95 L 800,95"
                    fill="none"
                    stroke="#3f3f46"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1">
                <span>May 2</span>
                <span>May 16</span>
                <span>May 30</span>
                <span>Jun 13</span>
                <span>Jun 27</span>
                <span>Jul 11</span>
                <span>Jul 25</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Trending up by 0% compared to previous period
              </span>
              <span className="text-zinc-300 font-bold">Revenue: <strong className="text-white">$0</strong> over the last 90 days</span>
            </div>
          </div>

          {/* Chart 3: Conversations & Activity Metrics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
            <div>
              <h3 className="text-base font-extrabold text-white">Conversations</h3>
              <p className="text-xs text-zinc-400">Showing total chats created over the last 90 days</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 block">Total Chats (90 Days)</span>
                <span className="text-2xl font-black text-white mt-1 block">3</span>
                <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">+100% from previous period</span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 block">Daily Average</span>
                <span className="text-2xl font-black text-white mt-1 block">0.0</span>
                <span className="text-[10px] text-zinc-500 font-medium mt-0.5 block">Chats created per day on average</span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 block">Peak Day</span>
                <span className="text-2xl font-black text-white mt-1 block">2</span>
                <span className="text-[10px] text-zinc-500 font-medium mt-0.5 block">Maximum chats created in single day</span>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 block">Active Days</span>
                <span className="text-2xl font-black text-white mt-1 block">2</span>
                <span className="text-[10px] text-zinc-500 font-medium mt-0.5 block">Days with at least 1 chat created</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl text-xs text-zinc-400 flex items-center justify-between">
              <span>More charts and comprehensive reporting features coming soon!</span>
              <span className="text-[#1DB954] font-bold">Qamuz Engine v3.5</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MANAGE USERS */}
      {/* ========================================================================= */}
      {activeMainTab === 'users' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {editingUser ? (
            /* USER DETAILS VIEW */
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <button 
                    onClick={() => setEditingUser(null)} 
                    className="hover:text-white transition-colors"
                  >
                    Users
                  </button>
                  <span>/</span>
                  <span className="text-white">{editingUser.name || editingUser.email}</span>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white">User Details</h1>
                  <p className="text-xs text-zinc-400">Comprehensive information for {editingUser.name || editingUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Information */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-white">User Information</h3>
                      <p className="text-xs text-zinc-400">Basic account details and settings</p>
                    </div>
                    <button 
                      onClick={() => showToast('Edit user info...')}
                      className="px-3 py-1.5 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Edit User
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Name</span>
                      <span className="text-xs text-white font-medium">{editingUser.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Email</span>
                      <span className="text-xs text-white font-mono">{editingUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Current Plan</span>
                      <span className="text-xs text-white capitalize">{editingUser.plan}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Role</span>
                      <div className="flex items-center gap-2">
                        <select 
                          value={editingUser.role.toLowerCase()}
                          onChange={(e) => showToast(`Role changing to ${e.target.value}`)}
                          className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1 outline-none focus:border-[#1DB954]"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">User ID</span>
                      <span className="text-xs text-zinc-400 font-mono">{editingUser.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Account Created</span>
                      <span className="text-xs text-zinc-400">{editingUser.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Usage & Quota */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                  <div className="border-b border-zinc-800 pb-4">
                    <h3 className="text-base font-extrabold text-white">Usage & Quota</h3>
                    <p className="text-xs text-zinc-400">Current usage on {editingUser.plan} plan</p>
                  </div>
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Credits</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] uppercase font-bold">Unlimited</span>
                          <span className="text-xs text-zinc-400">0 used</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500">Last reset: N/A</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-base font-extrabold text-white">Payment History</h3>
                  <p className="text-xs text-zinc-400">0 payment(s) found</p>
                </div>
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No payment history available
                </div>
              </div>

              {/* Subscriptions */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-base font-extrabold text-white">Subscriptions</h3>
                  <p className="text-xs text-zinc-400">Active and past subscriptions</p>
                </div>
                
                {/* Find user subscriptions */}
                {(() => {
                  const userSubs = subscriptions.filter(s => s.userId === editingUser.id);
                  if (userSubs.length === 0) {
                    return (
                      <div className="text-center py-8 text-zinc-500 text-xs">
                        No subscription history available
                      </div>
                    );
                  }
                  
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-zinc-800">
                          <tr>
                            <th className="p-4">Plan</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Period</th>
                            <th className="p-4">Auto-Renew</th>
                            <th className="p-4">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/80 font-medium text-white">
                          {userSubs.map(sub => (
                            <tr key={sub.id} className="hover:bg-zinc-800/40 transition-colors">
                              <td className="p-4 capitalize">{sub.planTier}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border ${
                                  sub.status === 'active' ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20' :
                                  sub.status === 'canceled' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                                  'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td className="p-4 text-zinc-400">
                                {sub.currentPeriodStart ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric'}).format(sub.currentPeriodStart) : 'N/A'} 
                                {' - '} 
                                {sub.currentPeriodEnd ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric'}).format(sub.currentPeriodEnd) : 'N/A'}
                              </td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border ${
                                  sub.cancelAtPeriodEnd ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-zinc-800 text-white border-zinc-700'
                                }`}>
                                  {sub.cancelAtPeriodEnd ? 'No' : 'Yes'}
                                </span>
                              </td>
                              <td className="p-4 text-zinc-400">
                                {sub.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric'}).format(sub.createdAt) : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* USERS LIST */
            <>
              <div>
                <h2 className="text-2xl font-black text-white">User Management</h2>
                <p className="text-xs text-zinc-400">Manage and view all registered users on the platform.</p>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by partial or full email or user ID..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white focus:outline-none focus:border-[#1DB954]"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-extrabold text-white">All Users</span>
                  <span>Showing 1-{filteredUsers.length} of {filteredUsers.length} users</span>
                </div>
              </div>

              {/* User Table */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider font-extrabold border-b border-zinc-800">
                      <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Subscription Status</th>
                        <th className="p-4">Plan</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Created at</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80 font-medium">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="p-4 font-bold text-white">{u.name}</td>
                          <td className="p-4 text-zinc-300 font-mono">{u.email}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {u.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-[#1DB954] border border-emerald-500/30">
                              {u.plan}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                              u.role === 'Admin'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-zinc-400 text-[11px] font-mono">{u.createdAt}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold rounded-lg text-[11px] transition-all border border-zinc-700"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MANAGE PAYMENTS */}
      {/* ========================================================================= */}
      {activeMainTab === 'payments' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-black text-white">Payment Management</h2>
            <p className="text-xs text-zinc-400">View and manage all payment transactions on the platform.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 shadow-xl min-h-[250px]">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-white">All Payments</h3>
            <p className="text-xs text-zinc-400 max-w-sm">No payments recorded yet. Transactions performed through Stripe will appear here automatically.</p>
            <button
              onClick={() => showToast('Stripe Webhook Listener Activo')}
              className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white rounded-xl border border-zinc-700 transition-all"
            >
              Sync Stripe Payments
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MANAGE SUBSCRIPTIONS */}
      {/* ========================================================================= */}
      {activeMainTab === 'subscriptions' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-black text-white">Subscription Management</h2>
            <p className="text-xs text-zinc-400">View and manage all user subscriptions on the platform.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl overflow-hidden flex flex-col gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white">All Subscriptions</h3>
              <p className="text-xs text-zinc-400">
                {totalSubscriptions === 0 
                  ? 'No subscriptions found' 
                  : `Showing ${(subscriptionsPage - 1) * subscriptionsPerPage + 1}-${Math.min(subscriptionsPage * subscriptionsPerPage, totalSubscriptions)} of ${totalSubscriptions} subscriptions`}
              </p>
            </div>

            {totalSubscriptions === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No subscriptions found
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full pb-4">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                      <th className="font-bold py-3 px-4 uppercase tracking-wider">User</th>
                      <th className="font-bold py-3 px-4 uppercase tracking-wider">Plan</th>
                      <th className="font-bold py-3 px-4 uppercase tracking-wider">Status</th>
                      <th className="font-bold py-3 px-4 uppercase tracking-wider">Period (Start - End)</th>
                      <th className="font-bold py-3 px-4 uppercase tracking-wider">Auto-Renew</th>
                      <th className="font-bold py-3 px-4 uppercase tracking-wider">Created at</th>
                      <th className="font-bold py-3 px-4 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(sub => (
                      <tr key={sub.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{sub.userName || "N/A"}</span>
                            <span className="text-xs text-zinc-400">{sub.userEmail || "N/A"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-zinc-300 font-medium capitalize">
                            {sub.planTier || "N/A"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border ${
                            sub.status === 'active' ? 'bg-[#1DB954]/10 text-[#1DB954] border-[#1DB954]/20' :
                            sub.status === 'trialing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            ['canceled', 'incomplete', 'incomplete_expired'].includes(sub.status) ? 'bg-zinc-800 text-zinc-400 border-zinc-700' :
                            ['past_due', 'unpaid'].includes(sub.status) ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}>
                            {sub.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-zinc-300">
                          {sub.currentPeriodStart ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric'}).format(sub.currentPeriodStart) : 'N/A'} 
                          {' - '} 
                          {sub.currentPeriodEnd ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric'}).format(sub.currentPeriodEnd) : 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border ${
                            sub.cancelAtPeriodEnd ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-zinc-800 text-white border-zinc-700'
                          }`}>
                            {sub.cancelAtPeriodEnd ? 'No' : 'Yes'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-zinc-400">
                          {sub.createdAt ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric'}).format(sub.createdAt) : 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => {
                              showToast(`Editing user ${sub.userId}`);
                            }}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold text-white transition-all"
                          >
                            Edit User
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalSubscriptionPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-zinc-800">
                <button
                  disabled={subscriptionsPage === 1}
                  onClick={() => setSubscriptionsPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalSubscriptionPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setSubscriptionsPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                        subscriptionsPage === i + 1
                          ? 'bg-[#1DB954] text-black'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  disabled={subscriptionsPage === totalSubscriptionPages}
                  onClick={() => setSubscriptionsPage(p => Math.min(totalSubscriptionPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. NOTIFICATIONS */}
      {/* ========================================================================= */}
      {activeMainTab === 'notifications' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-black text-white">Mass Notifications</h2>
            <p className="text-xs text-zinc-400">Send an alert or promotion to all users on the platform.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl max-w-xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Notification Type</label>
                <select 
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                >
                  <option value="promo">Promotion</option>
                  <option value="alert">Alert</option>
                  <option value="system">System Update</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Title</label>
                <input 
                  type="text" 
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="e.g., Summer Sale is Here!"
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Message</label>
                <textarea 
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Explain the details..."
                  required
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300">Link (Optional)</label>
                <input 
                  type="text" 
                  value={notificationLink}
                  onChange={(e) => setNotificationLink(e.target.value)}
                  placeholder="e.g., /settings/billing or https://..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast('Mass notification sent successfully!');
                  setNotificationTitle('');
                  setNotificationMessage('');
                  setNotificationLink('');
                }}
                className="w-full py-3 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-[1.02] transition-all shadow-lg mt-2"
              >
                Broadcast to All Users
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SITE SETTINGS */}
      {/* ========================================================================= */}
      {activeMainTab === 'settings' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-black text-white">Site Settings</h2>
            <p className="text-xs text-zinc-400">Configure platform settings, API credentials, and integrations.</p>
          </div>

          {/* Settings Sub-Tab Navigation Bar */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveSettingsTab('general')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'general' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveSettingsTab('branding')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'branding' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Branding
            </button>
            <button
              onClick={() => setActiveSettingsTab('payments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'payments' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Payment Methods
            </button>
            <button
              onClick={() => setActiveSettingsTab('pricing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'pricing' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pricing Plans
            </button>
            <button
              onClick={() => setActiveSettingsTab('credit_packages')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'credit_packages' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Credit Packages
            </button>
            <button
              onClick={() => setActiveSettingsTab('oauth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'oauth' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              OAuth Providers
            </button>
            <button
              onClick={() => setActiveSettingsTab('ai')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'ai' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              AI Models
            </button>
            <button
              onClick={() => setActiveSettingsTab('storage')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'storage' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Cloud Storage
            </button>
            <button
              onClick={() => setActiveSettingsTab('security')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'security' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveSettingsTab('mailing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'mailing' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Mailing
            </button>
            <button
              onClick={() => setActiveSettingsTab('music_apis')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                activeSettingsTab === 'music_apis' ? 'bg-zinc-800 text-[#1DB954] border border-emerald-500/30' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Music APIs
            </button>
          </div>

          {/* Sub-Tab 1: GENERAL */}
          {activeSettingsTab === 'general' && (
            <div className="space-y-4">
              {/* Page Header */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-2 shadow-xl">
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-zinc-400" />
                  General Settings
                </h1>
                <p className="text-zinc-400 text-xs">
                  Configure basic platform settings and information.
                </p>
              </div>

              {/* Basic Site Information */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-zinc-400" />
                    Site Information
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Basic information about your platform</p>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300">Site Name</label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="GenAudius"
                        required
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <p className="text-[11px] text-zinc-500">The name displayed in the browser tab and throughout the app</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300">Site Title</label>
                      <input
                        type="text"
                        value={siteTitle}
                        onChange={(e) => setSiteTitle(e.target.value)}
                        placeholder="GenAudius - AI Music & Chat"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <p className="text-[11px] text-zinc-500">SEO title used in meta tags</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Site Description</label>
                    <textarea
                      value={siteDescription}
                      onChange={(e) => setSiteDescription(e.target.value)}
                      placeholder="GenAudius AI — music generation, chat with 65+ AI models, and more."
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white resize-y"
                    />
                    <p className="text-[11px] text-zinc-500">Used for SEO meta descriptions and site information</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">App Domain/URL</label>
                    <input
                      type="url"
                      value={publicOrigin}
                      onChange={(e) => setPublicOrigin(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <p className="text-[11px] text-zinc-500">
                      The public URL of your application (e.g., https://yourdomain.com).
                      Used for email links, cookie domain, and security headers
                    </p>
                  </div>
                </div>
              </div>

              {/* Default User Preferences */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-zinc-400" />
                    Default User Preferences
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Set default language, theme, and landing page for new users. Individual users can still override some of these preferences.
                  </p>
                </div>
                
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Default Language</label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                    >
                      <option value="en">English</option>
                      <option value="de">German</option>
                      <option value="es">Spanish</option>
                      <option value="pt">Portuguese</option>
                      <option value="ar">Arabic</option>
                    </select>
                    <p className="text-[11px] text-zinc-500">The default language for new users</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Default Theme</label>
                    <select
                      value={defaultTheme}
                      onChange={(e) => setDefaultTheme(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                    <p className="text-[11px] text-zinc-500">The default theme mode for new users</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Default Page</label>
                    <select
                      value={defaultPage}
                      onChange={(e) => setDefaultPage(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                    >
                      <option value="landing">Landing Page</option>
                      <option value="app">App Page</option>
                    </select>
                    <p className="text-[11px] text-zinc-500">The page users see when visiting the root URL</p>
                  </div>
                </div>
              </div>

              {/* OpenRouter Settings */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 8V4H8" />
                      <rect width="16" height="12" x="4" y="8" rx="2" />
                      <path d="M2 14h2" />
                      <path d="M20 14h2" />
                      <path d="M15 13v2" />
                      <path d="M9 13v2" />
                    </svg>
                    Global System Prompt
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Configure global system prompt for OpenRouter models (Claude, GPT, Gemini, etc.)</p>
                </div>
                
                <div className="p-5 space-y-2">
                  <textarea
                    value={openrouterSystemPrompt}
                    onChange={(e) => setOpenrouterSystemPrompt(e.target.value)}
                    placeholder="Enter a system prompt that will be applied to all conversations. Leave empty to disable."
                    rows={6}
                    maxLength={4000}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white resize-y"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <p>This prompt will be prepended to all OpenRouter model conversations</p>
                    <p className={(4000 - openrouterSystemPrompt.length) < 500 ? "text-amber-500" : ""}>
                      {openrouterSystemPrompt.length}/4000 characters
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => showToast('General settings have been saved successfully!')}
                  className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                >
                  Save General Settings
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: BRANDING */}
          {activeSettingsTab === 'branding' && (
            <div className="space-y-4">
              {/* Serverless Platform Note */}
              <div className="bg-blue-950/40 border border-blue-500/30 text-blue-400 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                <div>
                  <p className="font-extrabold text-sm text-blue-300">Serverless Platform Requirement</p>
                  <p className="text-xs mt-1 text-blue-200">
                    If hosting on a serverless platform (e.g., Vercel), Cloud Storage must be configured before uploading logos or favicons. Serverless platforms have read-only filesystems.
                  </p>
                </div>
              </div>

              {/* Page Header */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-2 shadow-xl">
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Palette className="w-6 h-6 text-pink-500" />
                  Branding Settings
                </h1>
                <p className="text-zinc-400 text-xs">
                  Customize your app's appearance and branding elements.
                </p>
              </div>

              <div className="flex flex-col gap-4 max-w-4xl">
                {/* Logo Settings */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-zinc-400" />
                      App Logos
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">Upload separate logos for dark and light mode themes</p>
                  </div>
                  
                  <div className="p-5 space-y-6">
                    {/* Logo Upload Sections - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Dark Mode Logo Section */}
                      <div className="space-y-4">
                        <label className="text-sm font-bold text-white">Dark Mode Logo</label>
                        <div className="w-32 h-32 bg-zinc-950 rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-800">
                          {darkLogoUrl ? (
                            <img src={darkLogoUrl} alt="Current dark logo" className="max-w-full max-h-full object-contain p-2" />
                          ) : (
                            <div className="text-center">
                              <ImageIcon className="w-8 h-8 mx-auto mb-1 text-zinc-600" />
                              <p className="text-[10px] text-zinc-600">No dark logo uploaded</p>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setDarkLogoUrl(URL.createObjectURL(e.target.files[0]));
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-xs font-bold text-white transition-colors">
                            <Upload className="w-4 h-4" />
                            Upload Dark Mode Logo
                          </button>
                        </div>
                      </div>

                      {/* Light Mode Logo Section */}
                      <div className="space-y-4">
                        <label className="text-sm font-bold text-white">Light Mode Logo</label>
                        <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-300">
                          {lightLogoUrl ? (
                            <img src={lightLogoUrl} alt="Current light logo" className="max-w-full max-h-full object-contain p-2" />
                          ) : (
                            <div className="text-center">
                              <ImageIcon className="w-8 h-8 mx-auto mb-1 text-zinc-400" />
                              <p className="text-[10px] text-zinc-400">No light logo uploaded</p>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setLightLogoUrl(URL.createObjectURL(e.target.files[0]));
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-xs font-bold text-white transition-colors">
                            <Upload className="w-4 h-4" />
                            Upload Light Mode Logo
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* General Info */}
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <p className="text-[11px] text-zinc-400">
                        <strong className="text-zinc-200">Recommendation:</strong> PNG or SVG format with transparent background.
                      </p>
                    </div>

                    {/* Logo Dimensions Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Logo Width (px)</label>
                        <input
                          type="number"
                          min="16" max="512"
                          value={logoWidth}
                          onChange={(e) => setLogoWidth(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Logo Height (px)</label>
                        <input
                          type="number"
                          min="16" max="512"
                          value={logoHeight}
                          onChange={(e) => setLogoHeight(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* Logo Size Preview */}
                    {(darkLogoUrl || lightLogoUrl) && (
                      <div className="border-t border-zinc-800 pt-6 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-white">Logo Size Preview</h4>
                          <p className="text-xs text-zinc-400 mt-1">Preview of how your logos will appear with the specified dimensions</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {darkLogoUrl && (
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-zinc-400">Dark Mode Preview</label>
                              <div className="p-4 bg-zinc-950 rounded-xl flex items-center justify-center min-h-[80px] border border-zinc-800">
                                <img src={darkLogoUrl} alt="Dark logo preview" style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }} className="object-contain" />
                              </div>
                            </div>
                          )}
                          {lightLogoUrl && (
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-zinc-400">Light Mode Preview</label>
                              <div className="p-4 bg-white rounded-xl flex items-center justify-center min-h-[80px] border border-zinc-300">
                                <img src={lightLogoUrl} alt="Light logo preview" style={{ width: `${logoWidth}px`, height: `${logoHeight}px` }} className="object-contain" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Favicon Settings Section */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800">
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      App Favicon
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">Upload a custom favicon for your site that will appear in browser tabs</p>
                  </div>

                  <div className="p-5 space-y-6">
                    <div className="space-y-4">
                      <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-300 shadow-sm">
                        {faviconUrl ? (
                          <img src={faviconUrl} alt="Current favicon" className="max-w-full max-h-full object-contain p-2" />
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="w-6 h-6 mx-auto mb-1 text-zinc-400" />
                            <p className="text-[10px] text-zinc-400">No favicon uploaded</p>
                          </div>
                        )}
                      </div>

                      <div className="relative max-w-xs">
                        <input
                          type="file"
                          accept="image/x-icon,image/png,image/svg+xml,image/gif,image/jpeg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setFaviconUrl(URL.createObjectURL(e.target.files[0]));
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-700 hover:bg-zinc-800 rounded-lg text-xs font-bold text-white transition-colors">
                          <Upload className="w-4 h-4" />
                          Upload Favicon
                        </button>
                      </div>

                      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl max-w-lg">
                        <p className="text-[11px] text-zinc-400">
                          <strong className="text-zinc-200">Recommendation:</strong> ICO, PNG, or SVG format. Size: 16x16, 32x32, or 64x64 pixels for best compatibility.
                        </p>
                      </div>
                    </div>

                    {faviconUrl && (
                      <div className="border-t border-zinc-800 pt-6 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-white">Favicon Preview</h4>
                          <p className="text-xs text-zinc-400 mt-1">Preview of how your favicon will appear in browser tabs</p>
                        </div>
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 rounded-t-lg border-b-2 border-[#1DB954] min-w-[200px]">
                            <img src={faviconUrl} alt="Favicon preview" className="w-4 h-4 object-contain rounded-sm" />
                            <span className="text-xs text-zinc-300 font-medium">Your Site</span>
                          </div>
                          <p className="text-[10px] text-zinc-500">Browser tab preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => showToast('Branding Settings saved successfully!')}
                    className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                  >
                    Save Branding Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: PAYMENT METHODS (STRIPE) */}
          {activeSettingsTab === 'payments' && (
            <div className="space-y-4">
              {/* Page Header */}
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-zinc-400" />
                  Payment Methods
                </h1>
                <p className="text-xs text-zinc-400">
                  Configure Stripe integration and payment processing settings.
                </p>
              </div>

              {/* Setup Instructions Card */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 flex items-center justify-between border-b border-blue-500/10">
                  <div>
                    <h3 className="text-base font-extrabold text-blue-400 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Setup Instructions
                    </h3>
                    <p className="text-[11px] text-blue-400/70 mt-1">Step-by-step guide to configure Stripe integration</p>
                  </div>
                  <button
                    onClick={() => setShowStripeInstructions(!showStripeInstructions)}
                    className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    {showStripeInstructions ? 'Hide' : 'Show'} Instructions
                    <svg className={`w-3 h-3 transition-transform ${showStripeInstructions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {showStripeInstructions && (
                  <div className="p-5 space-y-6 bg-zinc-950/50">
                    {/* Section 1: Getting API Keys */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px]">1</span>
                        Getting Your Stripe API Keys
                      </h3>
                      <div className="pl-7 space-y-3 text-xs text-zinc-300">
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">1</span>
                          <p>
                            Log in to your <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Stripe Dashboard <ExternalLink className="w-2.5 h-2.5" /></a>
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">2</span>
                          <p>Navigate to <strong>Developers</strong> → <strong>API keys</strong> in the left sidebar</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">3</span>
                          <div className="flex-1">
                            <p className="mb-2">Copy your keys based on your environment:</p>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-3">
                              <div>
                                <p className="font-bold text-[11px] text-zinc-400 mb-1">Test Mode (Development):</p>
                                <ul className="list-disc list-inside space-y-1 ml-1 text-zinc-300">
                                  <li><strong>Publishable key:</strong> Starts with <code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">pk_test_</code></li>
                                  <li><strong>Secret key:</strong> Starts with <code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">sk_test_</code></li>
                                </ul>
                              </div>
                              <div className="pt-2 border-t border-zinc-800">
                                <p className="font-bold text-[11px] text-zinc-400 mb-1">Live Mode (Production):</p>
                                <ul className="list-disc list-inside space-y-1 ml-1 text-zinc-300">
                                  <li><strong>Publishable key:</strong> Starts with <code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">pk_live_</code></li>
                                  <li><strong>Secret key:</strong> Starts with <code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">sk_live_</code></li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Setting Up Webhook */}
                    <div className="space-y-4 pt-5 border-t border-blue-500/10">
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px]">2</span>
                        Setting Up Webhook Secret
                      </h3>
                      <div className="pl-7 space-y-3 text-xs text-zinc-300">
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">1</span>
                          <p>In the Stripe Dashboard, go to <strong>Developers</strong> → <strong>Webhooks</strong></p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">2</span>
                          <p>Click <strong>"Add endpoint"</strong> or <strong>"+ Add an endpoint"</strong></p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">3</span>
                          <div className="flex-1 w-full overflow-hidden">
                            <p className="mb-2">Enter your webhook endpoint URL:</p>
                            <div className="flex items-center gap-2 max-w-full">
                              <code className="flex-1 bg-zinc-900 border border-zinc-800 text-emerald-400 px-3 py-2 rounded-xl font-mono text-[10px] overflow-x-auto whitespace-nowrap">
                                {typeof window !== "undefined" ? `${window.location.origin}/api/stripe/webhook` : "https://yourdomain.com/api/stripe/webhook"}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(typeof window !== "undefined" ? `${window.location.origin}/api/stripe/webhook` : "https://yourdomain.com/api/stripe/webhook");
                                  setCopiedWebhookUrl(true);
                                  setTimeout(() => setCopiedWebhookUrl(false), 2000);
                                }}
                                className="flex-shrink-0 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                              >
                                {copiedWebhookUrl ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <svg className="w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">4</span>
                          <div className="flex-1">
                            <p className="mb-2">Select events to listen to. <strong>Required events:</strong></p>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                              <ul className="list-disc list-inside space-y-1.5 text-zinc-300 text-[11px]">
                                <li><code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">checkout.session.completed</code></li>
                                <li><code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">customer.subscription.created</code></li>
                                <li><code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">customer.subscription.updated</code></li>
                                <li><code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">customer.subscription.deleted</code></li>
                                <li><code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">invoice.payment_succeeded</code></li>
                                <li><code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">invoice.payment_failed</code></li>
                              </ul>
                              <p className="text-[10px] text-zinc-500 mt-3 italic">Tip: You can also select "Send all events" for comprehensive tracking</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">5</span>
                          <p>Click <strong>"Add endpoint"</strong> to save</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold mt-0.5">6</span>
                          <div className="flex-1">
                            <p>After creation, click on the webhook endpoint to view details, then click <strong>"Reveal"</strong> next to <strong>"Signing secret"</strong></p>
                            <p className="text-[10px] text-zinc-500 mt-1">The signing secret starts with <code className="bg-zinc-800 px-1 py-0.5 rounded text-emerald-400 font-mono">whsec_</code></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stripe Configuration Form */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl">
                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                  <div className="w-8 h-8 rounded-full bg-[#635BFF] flex items-center justify-center">
                    <span className="text-white font-bold font-serif text-lg leading-none">S</span>
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Stripe API Configuration</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Configure your Stripe keys for payment processing</p>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Environment Selection */}
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-2">Environment Mode</label>
                    <div className="flex items-center p-1 bg-zinc-950 rounded-xl border border-zinc-800 w-fit">
                      <button
                        onClick={() => setStripeLiveMode(false)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          !stripeLiveMode ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Test Mode
                      </button>
                      <button
                        onClick={() => setStripeLiveMode(true)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          stripeLiveMode ? 'bg-[#1DB954] text-black shadow' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Live Mode
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">
                      {!stripeLiveMode ? 'Use test keys for development and testing' : 'Use live keys for production payments'}
                    </p>
                  </div>

                  {/* API Keys */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1">Stripe Publishable Key</label>
                      <input
                        type="text"
                        value={stripePublishableKey}
                        onChange={(e) => setStripePublishableKey(e.target.value)}
                        placeholder={!stripeLiveMode ? "pk_test_..." : "pk_live_..."}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">Used in frontend for creating payment elements (safe to expose publicly)</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-300">Stripe Secret Key</label>
                        <button type="button" onClick={() => setShowStripeSecretKey(!showStripeSecretKey)} className="text-zinc-400 hover:text-white p-1">
                          {showStripeSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <input
                        type={showStripeSecretKey ? "text" : "password"}
                        value={stripeSecretKey}
                        onChange={(e) => setStripeSecretKey(e.target.value)}
                        placeholder={!stripeLiveMode ? "sk_test_..." : "sk_live_..."}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">Used on server for API calls (<span className="text-red-400 font-semibold">Keep secret!</span>)</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-300">Stripe Webhook Secret</label>
                        <button type="button" onClick={() => setShowStripeWebhookSecret(!showStripeWebhookSecret)} className="text-zinc-400 hover:text-white p-1">
                          {showStripeWebhookSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <input
                        type={showStripeWebhookSecret ? "text" : "password"}
                        value={stripeWebhookSecret}
                        onChange={(e) => setStripeWebhookSecret(e.target.value)}
                        placeholder="whsec_..."
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <span className="text-[10px] text-zinc-500 mt-1 block">Used to verify webhook events from Stripe (<span className="text-red-400 font-semibold">Keep secret!</span>)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => showToast('Payment settings saved successfully')}
                    className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                  >
                    Save Payment Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: PRICING PLANS */}
          {activeSettingsTab === 'pricing' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl">
              {pricingPlanView === 'list' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Gem className="w-5 h-5 text-emerald-400" />
                        Pricing Plans
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">Create, edit, and manage subscription pricing plans for the platform.</p>
                    </div>

                    <button
                      onClick={() => {
                        setPpForm({
                          name: '', tier: 'free', stripePriceId: '', priceAmount: 0, currency: 'usd', billingInterval: 'month',
                          creditLimit: '', textGenerationLimit: '', imageGenerationLimit: '', videoGenerationLimit: '', audioGenerationLimit: '',
                          features: '', isActive: true
                        });
                        setPricingPlanView('create');
                      }}
                      className="px-4 py-2 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Create Plan
                    </button>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-x-auto">
                    {pricingPlans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <p className="text-zinc-400 text-xs">No plans found.</p>
                        <button
                          onClick={() => {
                            setPricingPlans([
                              { id: Date.now().toString(), name: 'Free plan', tier: 'free', stripePriceId: 'free_plan_default', priceAmount: 0, currency: 'usd', billingInterval: 'month', creditLimit: 500, textGenerationLimit: null, imageGenerationLimit: null, videoGenerationLimit: null, audioGenerationLimit: null, features: ['Free plan'], isActive: true }
                            ]);
                            showToast('Free plan seeded');
                          }}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                          Seed Free Plan
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-zinc-800">
                          <tr>
                            <th className="p-3.5">Plan Name</th>
                            <th className="p-3.5">Tier</th>
                            <th className="p-3.5">Price</th>
                            <th className="p-3.5">Credit Limit</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/80 font-medium text-zinc-300">
                          {pricingPlans.map(plan => (
                            <tr key={plan.id} className="hover:bg-zinc-900/60 transition-colors">
                              <td className="p-3.5 font-bold text-white">{plan.name}</td>
                              <td className="p-3.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                  plan.tier === 'free' ? 'bg-zinc-800 text-zinc-300 border-zinc-700' :
                                  plan.tier === 'starter' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                  plan.tier === 'pro' ? 'bg-emerald-500/20 text-[#1DB954] border-emerald-500/30' :
                                  'bg-amber-500/20 text-amber-500 border-amber-500/30'
                                }`}>
                                  {plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)}
                                </span>
                              </td>
                              <td className="p-3.5 font-mono text-white">
                                <div className="space-y-0.5">
                                  <div>${(plan.priceAmount / 100).toFixed(2)}</div>
                                  <div className="text-[10px] text-zinc-500 uppercase">{plan.billingInterval === 'month' ? 'Monthly' : 'Yearly'}</div>
                                </div>
                              </td>
                              <td className="p-3.5 font-mono text-zinc-400">{plan.creditLimit === null ? 'Unlimited' : plan.creditLimit.toLocaleString()}</td>
                              <td className="p-3.5">
                                <button
                                  onClick={() => {
                                    setPricingPlans(pricingPlans.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
                                    showToast(`Plan ${!plan.isActive ? 'activated' : 'deactivated'}`);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${plan.isActive ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}>
                                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${plan.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </div>
                                  <span className={`text-[10px] font-bold ${plan.isActive ? 'text-[#1DB954]' : 'text-zinc-500'}`}>
                                    {plan.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </button>
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => {
                                    setPpForm({
                                      ...plan,
                                      creditLimit: plan.creditLimit === null ? '' : plan.creditLimit.toString(),
                                      textGenerationLimit: plan.textGenerationLimit === null ? '' : plan.textGenerationLimit.toString(),
                                      imageGenerationLimit: plan.imageGenerationLimit === null ? '' : plan.imageGenerationLimit.toString(),
                                      videoGenerationLimit: plan.videoGenerationLimit === null ? '' : plan.videoGenerationLimit.toString(),
                                      audioGenerationLimit: plan.audioGenerationLimit === null ? '' : plan.audioGenerationLimit.toString(),
                                      features: plan.features ? plan.features.join('\n') : ''
                                    });
                                    setEditingPricingPlanId(plan.id);
                                    setPricingPlanView('edit');
                                  }}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-xs transition-colors"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}

              {(pricingPlanView === 'create' || pricingPlanView === 'edit') && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white">
                        {pricingPlanView === 'create' ? 'Create New Plan' : 'Edit Plan'}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        {pricingPlanView === 'create' ? 'Add a new pricing plan to the platform.' : 'Update the information below to modify the pricing plan.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setPricingPlanView('list')}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Back to Plans
                    </button>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1.5">Plan Name</label>
                        <input
                          type="text"
                          value={ppForm.name}
                          onChange={(e) => setPpForm({ ...ppForm, name: e.target.value })}
                          placeholder="e.g., Professional Plan"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1.5">Tier</label>
                        <select
                          value={ppForm.tier}
                          onChange={(e) => setPpForm({ ...ppForm, tier: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    {/* Stripe Info */}
                    <div>
                      <label className="text-xs font-bold text-zinc-300 block mb-1.5">Stripe Price ID</label>
                      <input
                        type="text"
                        value={ppForm.stripePriceId}
                        onChange={(e) => setPpForm({ ...ppForm, stripePriceId: e.target.value })}
                        placeholder="price_123..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>

                    {/* Pricing Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1.5">Price (in cents)</label>
                        <input
                          type="number"
                          value={ppForm.priceAmount}
                          onChange={(e) => setPpForm({ ...ppForm, priceAmount: e.target.value })}
                          placeholder="2999"
                          min="0"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1">e.g., 2999 = $29.99</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1.5">Currency</label>
                        <select
                          value={ppForm.currency}
                          onChange={(e) => setPpForm({ ...ppForm, currency: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white appearance-none uppercase"
                        >
                          <option value="usd">USD</option>
                          <option value="eur">EUR</option>
                          <option value="gbp">GBP</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-300 block mb-1.5">Billing Interval</label>
                        <select
                          value={ppForm.billingInterval}
                          onChange={(e) => setPpForm({ ...ppForm, billingInterval: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                        >
                          <option value="month">Monthly</option>
                          <option value="year">Yearly</option>
                        </select>
                      </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="pt-4 border-t border-zinc-800/50">
                      <h4 className="text-sm font-bold text-white mb-1">Usage Limits</h4>
                      <p className="text-[10px] text-zinc-500 mb-4">Leave empty for unlimited usage</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Credit Limit</label>
                          <input
                            type="number"
                            value={ppForm.creditLimit}
                            onChange={(e) => setPpForm({ ...ppForm, creditLimit: e.target.value })}
                            placeholder="Unlimited"
                            min="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Text Gen Limit</label>
                          <input
                            type="number"
                            value={ppForm.textGenerationLimit}
                            onChange={(e) => setPpForm({ ...ppForm, textGenerationLimit: e.target.value })}
                            placeholder="Unlimited"
                            min="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Image Gen Limit</label>
                          <input
                            type="number"
                            value={ppForm.imageGenerationLimit}
                            onChange={(e) => setPpForm({ ...ppForm, imageGenerationLimit: e.target.value })}
                            placeholder="Unlimited"
                            min="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Video Gen Limit</label>
                          <input
                            type="number"
                            value={ppForm.videoGenerationLimit}
                            onChange={(e) => setPpForm({ ...ppForm, videoGenerationLimit: e.target.value })}
                            placeholder="Unlimited"
                            min="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-300 block mb-1.5">Audio Gen Limit</label>
                          <input
                            type="number"
                            value={ppForm.audioGenerationLimit}
                            onChange={(e) => setPpForm({ ...ppForm, audioGenerationLimit: e.target.value })}
                            placeholder="Unlimited"
                            min="0"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="pt-4 border-t border-zinc-800/50">
                      <label className="text-xs font-bold text-zinc-300 block mb-1.5">Plan Features</label>
                      <textarea
                        value={ppForm.features}
                        onChange={(e) => setPpForm({ ...ppForm, features: e.target.value })}
                        placeholder="Enter each feature on a new line..."
                        rows={5}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white resize-none"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Enter each feature on a separate line</p>
                    </div>

                    {/* Status */}
                    <div className="pt-4 border-t border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPpForm({ ...ppForm, isActive: !ppForm.isActive })}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors relative ${ppForm.isActive ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${ppForm.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                        <div>
                          <span className="text-xs font-bold text-zinc-300 block">Plan is Active</span>
                          <span className="text-[10px] text-zinc-500">Toggle to activate or deactivate this plan</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setPricingPlanView('list')}
                      className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const parsedAmount = parseInt(ppForm.priceAmount);
                        if (!ppForm.name || !ppForm.tier || !ppForm.stripePriceId || isNaN(parsedAmount)) {
                          showToast('Please fill out all required fields properly');
                          return;
                        }

                        const parseLimit = (val: string) => (val === '' || val === null || val === undefined) ? null : parseInt(val);
                        
                        const newPlan = {
                          ...ppForm,
                          priceAmount: parsedAmount,
                          creditLimit: parseLimit(ppForm.creditLimit),
                          textGenerationLimit: parseLimit(ppForm.textGenerationLimit),
                          imageGenerationLimit: parseLimit(ppForm.imageGenerationLimit),
                          videoGenerationLimit: parseLimit(ppForm.videoGenerationLimit),
                          audioGenerationLimit: parseLimit(ppForm.audioGenerationLimit),
                          features: ppForm.features ? ppForm.features.split('\n').map((f: string) => f.trim()).filter((f: string) => f.length > 0) : [],
                        };

                        if (pricingPlanView === 'create') {
                          setPricingPlans([...pricingPlans, { ...newPlan, id: Date.now().toString() }]);
                          showToast('Pricing plan created successfully');
                        } else {
                          setPricingPlans(pricingPlans.map(p => p.id === editingPricingPlanId ? { ...newPlan, id: editingPricingPlanId } : p));
                          showToast('Pricing plan updated successfully');
                        }
                        setPricingPlanView('list');
                      }}
                      className="px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                    >
                      {pricingPlanView === 'create' ? 'Create Plan' : 'Update Plan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 4.5: CREDIT PACKAGES */}
          {activeSettingsTab === 'credit_packages' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl">
              {creditPackageView === 'list' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <Gem className="w-5 h-5 text-purple-400" />
                        Credit Packages
                      </h3>
                      <p className="text-xs text-zinc-400">Create, edit, and manage top-up credit packages for the platform.</p>
                    </div>

                    <button
                      onClick={openCpCreate}
                      className="px-4 py-2 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Create Package
                    </button>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-zinc-800">
                        <tr>
                          <th className="p-3.5">Stripe Price ID</th>
                          <th className="p-3.5">Price</th>
                          <th className="p-3.5">Credits</th>
                          <th className="p-3.5">Badge Text</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/80 font-medium text-zinc-300">
                        {creditPackages.map(pkg => (
                          <tr key={pkg.id} className="hover:bg-zinc-900/60 transition-colors">
                            <td className="p-3.5 font-mono text-xs">{pkg.stripePriceId}</td>
                            <td className="p-3.5 text-white">${pkg.priceAmount.toFixed(2)}</td>
                            <td className="p-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-white">{pkg.credits.toLocaleString()} credits</span>
                                {pkg.oldCredits && <span className="text-[10px] text-zinc-500 line-through">{pkg.oldCredits.toLocaleString()}</span>}
                              </div>
                            </td>
                            <td className="p-3.5">
                              {pkg.badgeText ? (
                                <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 text-[10px] uppercase font-bold">
                                  {pkg.badgeText}
                                </span>
                              ) : (
                                <span className="text-zinc-500">-</span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <button
                                onClick={() => handleCpToggleActive(pkg.id)}
                                className={`flex items-center w-8 h-4 rounded-full transition-colors ${pkg.isActive ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}
                              >
                                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform ${pkg.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                              </button>
                              <span className={`text-[10px] font-bold block mt-1 ${pkg.isActive ? 'text-green-500' : 'text-zinc-500'}`}>
                                {pkg.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => openCpEdit(pkg)}
                                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg text-[11px] transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCpDelete(pkg.id)}
                                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-lg text-[11px] transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {creditPackages.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-zinc-500">
                              No credit packages found. Create one to get started.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Form View (Create / Edit) */}
              {(creditPackageView === 'create' || creditPackageView === 'edit') && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCreditPackageView('list')}
                      className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h3 className="text-base font-extrabold text-white">
                        {creditPackageView === 'create' ? 'Create Credit Package' : 'Edit Credit Package'}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {creditPackageView === 'create' ? 'Add a new credit top-up package.' : 'Update credit top-up package details.'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6">
                    <form onSubmit={handleCpSubmit} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300">Stripe Price ID *</label>
                          <input
                            type="text"
                            value={cpForm.stripePriceId || ''}
                            onChange={(e) => setCpForm({ ...cpForm, stripePriceId: e.target.value })}
                            placeholder="price_..."
                            required
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#1DB954]"
                          />
                          <p className="text-[10px] text-zinc-500">The Price ID from your Stripe dashboard.</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300">Price Amount ($) *</label>
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={cpForm.priceAmount || ''}
                            onChange={(e) => setCpForm({ ...cpForm, priceAmount: parseFloat(e.target.value) })}
                            placeholder="20"
                            required
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#1DB954]"
                          />
                          <p className="text-[10px] text-zinc-500">The price in dollars.</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300">Credits *</label>
                          <input
                            type="number"
                            min="1"
                            value={cpForm.credits || ''}
                            onChange={(e) => setCpForm({ ...cpForm, credits: parseInt(e.target.value) })}
                            placeholder="1000"
                            required
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#1DB954]"
                          />
                          <p className="text-[10px] text-zinc-500">Amount of credits granted.</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-300">Old Credits (Optional)</label>
                          <input
                            type="number"
                            min="0"
                            value={cpForm.oldCredits || ''}
                            onChange={(e) => setCpForm({ ...cpForm, oldCredits: parseInt(e.target.value) || null })}
                            placeholder="800"
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#1DB954]"
                          />
                          <p className="text-[10px] text-zinc-500">Used to show a strikethrough value.</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Badge Text (Optional)</label>
                        <input
                          type="text"
                          value={cpForm.badgeText || ''}
                          onChange={(e) => setCpForm({ ...cpForm, badgeText: e.target.value })}
                          placeholder="20% More"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#1DB954]"
                        />
                        <p className="text-[10px] text-zinc-500">Highlights this package with a badge.</p>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setCreditPackageView('list')}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {creditPackageView === 'create' ? 'Create Package' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 5: OAUTH PROVIDERS */}
          {/* Sub-Tab 5: OAUTH PROVIDERS */}
          {activeSettingsTab === 'oauth' && (
            <div className="space-y-4">
              {/* Page Header */}
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Key className="w-6 h-6 text-zinc-400" />
                  OAuth Providers
                </h1>
                <p className="text-xs text-zinc-400">
                  Configure social login providers for user authentication.
                </p>
              </div>

              <div className="flex flex-col gap-6">
                {/* Google OAuth Configuration */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">G</span>
                        </div>
                        Google OAuth
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">Configure Google OAuth for social login</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={googleEnabled} onChange={() => setGoogleEnabled(!googleEnabled)} />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1DB954]"></div>
                    </label>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="font-bold text-white mb-2 text-xs">Setup Instructions:</h4>
                      <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to the <a href="https://console.developers.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3" /></a></li>
                        <li>Create or select a project</li>
                        <li>Enable the Google+ API</li>
                        <li>Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"</li>
                        <li>Set Application type to "Web application"</li>
                        <li>Add this redirect URI: <code className="px-1 bg-zinc-800 rounded font-mono text-emerald-400 text-[10px]">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/google` : "https://yourdomain.com/api/auth/callback/google"}</code></li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Google Client ID</label>
                        <input
                          type="text"
                          value={googleClientId}
                          onChange={(e) => setGoogleClientId(e.target.value)}
                          placeholder="1234567890-abcdefghijklmnop.apps.googleusercontent.com"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-300">Google Client Secret</label>
                          <button type="button" onClick={() => setShowGoogleSecret(!showGoogleSecret)} className="text-zinc-400 hover:text-white p-1">
                            {showGoogleSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <input
                          type={showGoogleSecret ? "text" : "password"}
                          value={googleClientSecret}
                          onChange={(e) => setGoogleClientSecret(e.target.value)}
                          placeholder="GOCSPX-..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[10px] text-zinc-500">
                          <span className="text-red-500 font-bold">⚠ Keep this secret!</span> Never expose this in client-side code
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Redirect URI</label>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <code className="text-xs font-mono text-emerald-400">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/google` : "https://yourdomain.com/api/auth/callback/google"}</code>
                        </div>
                        <p className="text-[10px] text-zinc-500">Add this exact URI to your Google OAuth app configuration</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apple OAuth Configuration */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
                          <span className="text-white text-sm">🍎</span>
                        </div>
                        Apple OAuth
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">Configure Apple Sign-In for social login</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={appleEnabled} onChange={() => setAppleEnabled(!appleEnabled)} />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1DB954]"></div>
                    </label>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="font-bold text-white mb-2 text-xs">Setup Instructions:</h4>
                      <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to the <a href="https://developer.apple.com/account/resources/identifiers/list/serviceId" target="_blank" rel="noreferrer" className="text-zinc-300 hover:underline inline-flex items-center gap-1">Apple Developer Console <ExternalLink className="w-3 h-3" /></a></li>
                        <li>Create or select your App ID</li>
                        <li>Create a Service ID for web authentication</li>
                        <li>Enable "Sign In with Apple" capability</li>
                        <li>Configure your Service ID with web domain and return URL</li>
                        <li>Add this redirect URI: <code className="px-1 bg-zinc-800 rounded font-mono text-emerald-400 text-[10px]">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/apple` : "https://yourdomain.com/api/auth/callback/apple"}</code></li>
                        <li>Get your Client Secret (can be a Client Secret, JWT, or Private Key)</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Apple Service ID (Client ID)</label>
                        <input
                          type="text"
                          value={appleClientId}
                          onChange={(e) => setAppleClientId(e.target.value)}
                          placeholder="com.yourcompany.yourapp"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-300">Apple Client Secret</label>
                          <button type="button" onClick={() => setShowAppleSecret(!showAppleSecret)} className="text-zinc-400 hover:text-white p-1">
                            {showAppleSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <input
                          type={showAppleSecret ? "text" : "password"}
                          value={appleClientSecret}
                          onChange={(e) => setAppleClientSecret(e.target.value)}
                          placeholder="Client Secret, JWT, or Private Key..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[10px] text-zinc-500">
                          <span className="text-red-500 font-bold">⚠ Keep this secret!</span> Can be a Client Secret, JWT, or Private Key from Apple Developer Console
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Redirect URI</label>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <code className="text-xs font-mono text-emerald-400">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/apple` : "https://yourdomain.com/api/auth/callback/apple"}</code>
                        </div>
                        <p className="text-[10px] text-zinc-500">Add this exact URI to your Apple Service ID configuration</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* X (Twitter) OAuth Configuration */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">𝕏</span>
                        </div>
                        X (Twitter) OAuth
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">Configure X (formerly Twitter) OAuth for social login</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={twitterEnabled} onChange={() => setTwitterEnabled(!twitterEnabled)} />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1DB954]"></div>
                    </label>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="font-bold text-white mb-2 text-xs">Setup Instructions:</h4>
                      <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to the <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noreferrer" className="text-zinc-300 hover:underline inline-flex items-center gap-1">X Developer Portal <ExternalLink className="w-3 h-3" /></a></li>
                        <li>Create a new App or select an existing one</li>
                        <li>Navigate to "App settings" → "User authentication settings"</li>
                        <li>Enable "OAuth 2.0" and set App permissions to "Read"</li>
                        <li>Set Type of App to "Web App"</li>
                        <li>Add this redirect URI: <code className="px-1 bg-zinc-800 rounded font-mono text-emerald-400 text-[10px]">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/twitter` : "https://yourdomain.com/api/auth/callback/twitter"}</code></li>
                        <li>Save settings and copy your Client ID and Client Secret</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">X (Twitter) Client ID</label>
                        <input
                          type="text"
                          value={twitterClientId}
                          onChange={(e) => setTwitterClientId(e.target.value)}
                          placeholder="Your-App-Client-ID"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-300">X (Twitter) Client Secret</label>
                          <button type="button" onClick={() => setShowTwitterSecret(!showTwitterSecret)} className="text-zinc-400 hover:text-white p-1">
                            {showTwitterSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <input
                          type={showTwitterSecret ? "text" : "password"}
                          value={twitterClientSecret}
                          onChange={(e) => setTwitterClientSecret(e.target.value)}
                          placeholder="Your-App-Client-Secret"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[10px] text-zinc-500">
                          <span className="text-red-500 font-bold">⚠ Keep this secret!</span> Never expose this in client-side code
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Redirect URI</label>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <code className="text-xs font-mono text-emerald-400">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/twitter` : "https://yourdomain.com/api/auth/callback/twitter"}</code>
                        </div>
                        <p className="text-[10px] text-zinc-500">Add this exact URI to your X Developer Portal app configuration</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Facebook OAuth Configuration */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#1877F2] rounded flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">f</span>
                        </div>
                        Facebook OAuth
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">Configure Facebook Login for social authentication</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={facebookEnabled} onChange={() => setFacebookEnabled(!facebookEnabled)} />
                      <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1DB954]"></div>
                    </label>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="font-bold text-white mb-2 text-xs">Setup Instructions:</h4>
                      <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to the <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">Meta for Developers <ExternalLink className="w-3 h-3" /></a></li>
                        <li>Create a new App or select an existing one</li>
                        <li>Add "Facebook Login" product to your app</li>
                        <li>Navigate to Facebook Login → Settings</li>
                        <li>Add this redirect URI to "Valid OAuth Redirect URIs": <code className="px-1 bg-zinc-800 rounded font-mono text-emerald-400 text-[10px]">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/facebook` : "https://yourdomain.com/api/auth/callback/facebook"}</code></li>
                        <li>Go to Settings → Basic to find your App ID and App Secret</li>
                        <li>Make sure your app is in "Live" mode for production use</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Facebook App ID</label>
                        <input
                          type="text"
                          value={facebookClientId}
                          onChange={(e) => setFacebookClientId(e.target.value)}
                          placeholder="1234567890123456"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-zinc-300">Facebook App Secret</label>
                          <button type="button" onClick={() => setShowFacebookSecret(!showFacebookSecret)} className="text-zinc-400 hover:text-white p-1">
                            {showFacebookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <input
                          type={showFacebookSecret ? "text" : "password"}
                          value={facebookClientSecret}
                          onChange={(e) => setFacebookClientSecret(e.target.value)}
                          placeholder="abcdefghijklmnopqrstuvwxyz123456"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[10px] text-zinc-500">
                          <span className="text-red-500 font-bold">⚠ Keep this secret!</span> Never expose this in client-side code
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">Redirect URI</label>
                        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                          <code className="text-xs font-mono text-emerald-400">{typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback/facebook` : "https://yourdomain.com/api/auth/callback/facebook"}</code>
                        </div>
                        <p className="text-[10px] text-zinc-500">Add this exact URI to your Facebook Login settings under "Valid OAuth Redirect URIs"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => showToast('OAuth Settings saved successfully')}
                    className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                  >
                    Save OAuth Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 6: AI MODELS */}
          {activeSettingsTab === 'ai' && (
            <div className="space-y-4">
              {/* Page Header */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-2 shadow-xl">
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Brain className="w-6 h-6 text-emerald-400" />
                  AI Models Configuration
                </h1>
                <p className="text-zinc-400 text-xs">
                  Configure API keys for AI model providers (OpenRouter for text gen, Replicate for image/video gen).
                </p>
              </div>

              <div className="flex flex-col gap-4 max-w-3xl">
                {/* OpenRouter Configuration */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">OR</span>
                        </div>
                        OpenRouter
                        {openRouterKey && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">Unified API for all text generation models</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="font-bold text-white mb-2 text-xs">Setup Instructions:</h4>
                      <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to <a href="https://openrouter.ai/" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">OpenRouter.ai <ExternalLink className="w-2 h-2" /></a></li>
                        <li>Sign up or log in to your account</li>
                        <li>Navigate to "Keys" in your dashboard</li>
                        <li>Create a new API key</li>
                        <li>Copy the key and paste it below</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-300">OpenRouter API Key</label>
                        <button type="button" onClick={() => setShowOpenRouterKey(!showOpenRouterKey)} className="text-zinc-400 hover:text-white p-1">
                          {showOpenRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <input
                        type={showOpenRouterKey ? "text" : "password"}
                        value={openRouterKey}
                        onChange={(e) => setOpenRouterKey(e.target.value)}
                        placeholder="sk-or-..."
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <p className="text-[10px] text-zinc-500">
                        Enables access to 40+ text models including GPT, Claude, Gemini, Grok, DeepSeek, Qwen, Kimi, GLM, Llama, and more...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Replicate Configuration */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">R</span>
                        </div>
                        Replicate
                        {replicateKey && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">Unified API for all image and video generation models</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="font-bold text-white mb-2 text-xs">Setup Instructions:</h4>
                      <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to <a href="https://replicate.com/account/api-tokens" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">Replicate API Tokens <ExternalLink className="w-2 h-2" /></a></li>
                        <li>Sign up or log in to your account</li>
                        <li>Create a new API token</li>
                        <li>Copy the token and paste it below</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-300">Replicate API Token</label>
                        <button type="button" onClick={() => setShowReplicateKey(!showReplicateKey)} className="text-zinc-400 hover:text-white p-1">
                          {showReplicateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <input
                        type={showReplicateKey ? "text" : "password"}
                        value={replicateKey}
                        onChange={(e) => setReplicateKey(e.target.value)}
                        placeholder="r8_..."
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <p className="text-[10px] text-zinc-500">
                        Enables access to 64+ image and video models including Sora, Veo, Imagen, Flux, Stable Diffusion, LeonardoAI, Kling, and more...
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        <span className="font-bold text-amber-400">IMPORTANT:</span> In order to use media generation models or make the file upload functionality work in general, you will need to integrate Cloud Storage first.
                      </p>
                    </div>
                  </div>
                </div>


                {/* Suno Configuration */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">SU</span>
                        </div>
                        Suno
                        {sunoKey && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">AI music generation — create songs from text prompts</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <h4 className="font-bold text-white mb-2 text-xs">Setup Instructions:</h4>
                      <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                        <li>Go to <a href="https://kie.ai" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">kie.ai <ExternalLink className="w-2 h-2" /></a></li>
                        <li>Sign up or log in to your account</li>
                        <li>Navigate to API Keys in your dashboard</li>
                        <li>Create a new API key and copy it</li>
                        <li>Paste the key below</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-300">Suno API Key</label>
                        <button type="button" onClick={() => setShowSunoKey(!showSunoKey)} className="text-zinc-400 hover:text-white p-1">
                          {showSunoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <input
                        type={showSunoKey ? "text" : "password"}
                        value={sunoKey}
                        onChange={(e) => setSunoKey(e.target.value)}
                        placeholder="kie-..."
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <p className="text-[10px] text-zinc-500">
                        Enables access to Suno music generation models: V3.5, V4, V4.5, V4.5 Plus, V4.5 All, V5, and V5.5.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => showToast('AI Model Settings saved successfully!')}
                    className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                  >
                    Save AI Model Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 7: CLOUD STORAGE */}
          {activeSettingsTab === 'storage' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-2 shadow-xl">
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Cloud className="w-6 h-6 text-sky-400" />
                  Cloud Storage Settings
                </h1>
                <p className="text-zinc-400 text-xs">
                  Configure Cloudflare R2 object storage for media files.
                </p>
              </div>

              {/* Storage Status Info */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-base font-extrabold text-white">Current Storage Configuration</h3>
                </div>
                <div className="p-5 space-y-2">
                  <div className="text-sm font-bold text-zinc-300">
                    Fallback Order:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-400 ml-4">
                    <li>
                      Admin Dashboard Settings (this page) - {(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName && r2BrandingBucket && r2PublicUrl) ? "✅ Configured" : "❌ Not configured"}
                    </li>
                    <li>Environment Variables (.env file)</li>
                    <li>
                      Local Storage (static folder) - Always enabled (not available for serverless platforms e.g. Vercel)
                    </li>
                  </ol>
                </div>
              </div>

              {/* Cloudflare R2 Configuration */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-base font-extrabold text-white">Cloudflare R2 Configuration</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Configure your Cloudflare R2 credentials. Get these from your Cloudflare dashboard &gt; R2 Object Storage &gt; Manage R2 API tokens.
                  </p>
                </div>
                
                <div className="p-5 space-y-6">
                  {/* Account ID */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300">Account ID *</label>
                      <button
                        type="button"
                        onClick={() => setShowAccountId(!showAccountId)}
                        className="text-zinc-400 hover:text-white transition-colors"
                      >
                        {showAccountId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showAccountId ? "text" : "password"}
                      value={r2AccountId}
                      onChange={(e) => setR2AccountId(e.target.value)}
                      placeholder="your-cloudflare-account-id"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <p className="text-[11px] text-zinc-500">Your Cloudflare Account ID (stored encrypted in database)</p>
                  </div>

                  {/* Access Key ID */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300">Access Key ID *</label>
                      <button
                        type="button"
                        onClick={() => setShowAccessKeyId(!showAccessKeyId)}
                        className="text-zinc-400 hover:text-white transition-colors"
                      >
                        {showAccessKeyId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showAccessKeyId ? "text" : "password"}
                      value={r2AccessKeyId}
                      onChange={(e) => setR2AccessKeyId(e.target.value)}
                      placeholder="your-r2-access-key-id"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <p className="text-[11px] text-zinc-500">R2 API token Access Key ID (stored encrypted in database)</p>
                  </div>

                  {/* Secret Access Key */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300">Secret Access Key *</label>
                      <button
                        type="button"
                        onClick={() => setShowSecretAccessKey(!showSecretAccessKey)}
                        className="text-zinc-400 hover:text-white transition-colors"
                      >
                        {showSecretAccessKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showSecretAccessKey ? "text" : "password"}
                      value={r2SecretAccessKey}
                      onChange={(e) => setR2SecretAccessKey(e.target.value)}
                      placeholder="your-r2-secret-access-key"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <p className="text-[11px] text-zinc-500">R2 API token Secret Access Key (stored encrypted in database)</p>
                  </div>

                  {/* Bucket Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Bucket Name *</label>
                    <input
                      type="text"
                      value={r2BucketName}
                      onChange={(e) => setR2BucketName(e.target.value)}
                      placeholder="your-r2-bucket-name"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <p className="text-[11px] text-zinc-500">The name of your R2 bucket where files will be stored</p>
                  </div>
                </div>
              </div>

              {/* Public Branding Bucket Section */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl mt-4">
                <div className="p-5 border-b border-zinc-800">
                  <h3 className="text-base font-extrabold text-white">Public Branding Bucket</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Configure a separate public bucket for logo and favicon files.</p>
                </div>
                
                <div className="p-5 space-y-6">
                  {/* Branding Bucket Info */}
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                      <div className="space-y-1 text-xs text-zinc-400">
                        <p className="font-bold text-zinc-300">Why is a separate branding bucket required?</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-2">
                          <li>Logo and favicon URLs are not pre-signed</li>
                          <li>Bucket must have public access enabled in Cloudflare R2</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Branding Bucket Name */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Branding Bucket Name *</label>
                    <input
                      type="text"
                      value={r2BrandingBucket}
                      onChange={(e) => setR2BrandingBucket(e.target.value)}
                      placeholder="your-branding-bucket-name"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <p className="text-[11px] text-zinc-500">The name of your public R2 bucket</p>
                  </div>

                  {/* Branding Public URL */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Branding Public URL *</label>
                    <input
                      type="url"
                      value={r2PublicUrl}
                      onChange={(e) => setR2PublicUrl(e.target.value)}
                      placeholder="https://your-branding-domain-url"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                    <p className="text-[11px] text-zinc-500">The public URL for accessing the branding files (app logo & favicon)</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => showToast('Cloud Storage Settings saved successfully!')}
                  className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                >
                  Save Cloud Storage Settings
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 8: SECURITY */}
          {activeSettingsTab === 'security' && (
            <div className="space-y-4">
              {/* Page Header */}
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-zinc-400" />
                  Security Settings
                </h1>
                <p className="text-xs text-zinc-400">
                  Configure Cloudflare Turnstile and other security features.
                </p>
              </div>

              {/* Security Settings Form */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl">
                <div>
                  <h3 className="text-base font-extrabold text-white">Cloudflare Turnstile</h3>
                  <p className="text-xs text-zinc-400 mt-1">Configure bot protection for registration and other forms using Cloudflare Turnstile.</p>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Enable Turnstile Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTurnstileEnabled(!turnstileEnabled)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors relative ${turnstileEnabled ? 'bg-[#1DB954]' : 'bg-zinc-700'}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${turnstileEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <div>
                      <span className="text-sm font-bold text-white block">Enable Turnstile Protection</span>
                      <span className="text-[11px] text-zinc-500">Enable or disable Cloudflare Turnstile CAPTCHA protection on registration and other forms</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-1">
                    {/* Site Key */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300 block mb-1">Site Key (Public)</label>
                      <input
                        type="text"
                        value={turnstileSiteKey}
                        onChange={(e) => setTurnstileSiteKey(e.target.value)}
                        placeholder="1x00000000000000000000AA (for testing)"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Your Cloudflare Turnstile site key. This is safe to expose publicly.</p>
                    </div>

                    {/* Secret Key */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-300">Secret Key (Private)</label>
                        <button
                          type="button"
                          onClick={() => setShowTurnstileSecretKey(!showTurnstileSecretKey)}
                          className="text-zinc-400 hover:text-white p-1"
                        >
                          {showTurnstileSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <input
                        type={showTurnstileSecretKey ? "text" : "password"}
                        value={turnstileSecretKey}
                        onChange={(e) => setTurnstileSecretKey(e.target.value)}
                        placeholder="1x0000000000000000000000000000000AA (for testing)"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Your Cloudflare Turnstile secret key. This will be encrypted and stored securely.</p>
                    </div>

                    {/* Documentation Link */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-2">
                      <p className="text-xs text-blue-400">
                        <strong className="font-extrabold">Need help?</strong> Get your Turnstile keys from the{' '}
                        <a href="https://dash.cloudflare.com/sign-up/turnstile" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline font-semibold">
                          Cloudflare Dashboard
                        </a>{' '}
                        or use the dummy keys above for testing.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => showToast('Security settings saved successfully')}
                    className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                  >
                    Save Security Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 9: MAILING */}
          {activeSettingsTab === 'mailing' && (
            <div className="space-y-4">
              {/* Page Header */}
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Mail className="w-6 h-6 text-zinc-400" />
                  Mailing Settings
                </h1>
                <p className="text-xs text-zinc-400">
                  Configure SMTP settings for automated system emails. These settings take precedence over environment variables.
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">SMTP Configuration</h3>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Configure your SMTP server settings for sending transactional emails such as welcome messages and password resets.
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* SMTP Server Settings */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">Server Settings</h3>
                      <p className="text-[11px] text-zinc-400">Configure your SMTP server connection details.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">
                          SMTP Host <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.gmail.com"
                          required
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[11px] text-zinc-500">Your SMTP server hostname (e.g., smtp.gmail.com, smtp.outlook.com)</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          placeholder="587"
                          min="1"
                          max="65535"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[11px] text-zinc-500">Common ports: 587 (STARTTLS), 465 (SSL), 25 (insecure)</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-300">Security</label>
                      <select
                        value={smtpSsl}
                        onChange={(e) => setSmtpSsl(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white appearance-none"
                      >
                        <option value="false">No (STARTTLS)</option>
                        <option value="true">Yes (SSL/TLS)</option>
                      </select>
                      <p className="text-[11px] text-zinc-500">Choose "Yes" for port 465, "No" for ports 587/25 with STARTTLS</p>
                    </div>
                  </div>

                  <hr className="border-zinc-800" />

                  {/* Authentication */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">Authentication</h3>
                      <p className="text-[11px] text-zinc-400">Your SMTP server login credentials.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="your-email@example.com"
                          required
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[11px] text-zinc-500">Usually your email address</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSmtpPass ? "text" : "password"}
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                            placeholder="Your SMTP password"
                            required
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPass(!showSmtpPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                          >
                            {showSmtpPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-500">Use an app password for Gmail/Outlook. Stored encrypted.</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-zinc-800" />

                  {/* Email Identity */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">Email Identity</h3>
                      <p className="text-[11px] text-zinc-400">How emails will appear to recipients.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">From Email</label>
                        <input
                          type="email"
                          value={smtpSenderEmail}
                          onChange={(e) => setSmtpSenderEmail(e.target.value)}
                          placeholder="noreply@yoursite.com"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                        />
                        <p className="text-[11px] text-zinc-500">Leave empty to use SMTP username</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300">From Name</label>
                        <input
                          type="text"
                          value={smtpDisplayName}
                          onChange={(e) => setSmtpDisplayName(e.target.value)}
                          placeholder="Your Company Name"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                        />
                        <p className="text-[11px] text-zinc-500">Display name for outgoing emails</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => showToast('Mailing settings saved successfully!')}
                  className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                >
                  Save Mailing Settings
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 10: MUSIC APIS */}
          {activeSettingsTab === 'music_apis' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                  <Music className="w-6 h-6 text-zinc-400" />
                  Music APIs Configuration
                </h1>
                <p className="text-xs text-zinc-400">
                  Configure API keys to dynamically fetch genres and styles for the track generation forms.
                </p>
              </div>
              
              <div className="mb-6 flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl">
                <div>
                  <h3 className="text-sm font-extrabold text-white">Dynamic Genres & Styles</h3>
                  <p className="text-[11px] text-zinc-400">Fetch the latest tags from Spotify and Last.fm to populate the music creation form.</p>
                  <p className="text-[10px] text-emerald-400 mt-1 font-bold">Cache active: {musicTagsCount?.genres || 0} genres, {musicTagsCount?.tags || 0} tags.</p>
                </div>
                <button
                  disabled={isUpdatingTags || !spotifyClientId || !spotifyClientSecret || !lastfmApiKey}
                  onClick={async () => {
                    setIsUpdatingTags(true);
                    try {
                      const res = await fetch('/api/admin/sync-music-tags', { method: 'POST' });
                      const data = await res.json();
                      if (res.ok) {
                        setMusicTagsCount(data.count);
                        showToast('Successfully fetched genres and tags from Spotify/Last.fm.');
                      } else {
                        showToast(data.error || 'Failed to sync tags.');
                      }
                    } catch (error) {
                      showToast('Network error while syncing tags.');
                    } finally {
                      setIsUpdatingTags(false);
                    }
                  }}
                  className="px-4 py-2 bg-zinc-800 text-white font-extrabold text-xs rounded-xl hover:bg-zinc-700 transition-all shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isUpdatingTags ? 'animate-spin' : ''}`} />
                  {isUpdatingTags ? 'Updating...' : 'Update Genres and Styles'}
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#1DB954] rounded-full flex items-center justify-center">
                        <span className="text-black text-[10px] font-black">SP</span>
                      </div>
                      Spotify API
                      {spotifyClientId && spotifyClientSecret && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">Fetch available genre seeds</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <h4 className="text-xs font-bold text-white mb-2">Setup Instructions:</h4>
                    <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-[#1DB954] hover:underline inline-flex items-center gap-1">Spotify Developer Dashboard <ExternalLink className="w-3 h-3" /></a></li>
                      <li>Create an app</li>
                      <li>Copy the Client ID and Client Secret</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Spotify Client ID</label>
                    <input
                      type="text"
                      value={spotifyClientId}
                      onChange={(e) => setSpotifyClientId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300">Spotify Client Secret</label>
                      <button
                        type="button"
                        onClick={() => setShowSpotifySecret(!showSpotifySecret)}
                        className="text-zinc-400 hover:text-white p-1"
                      >
                        {showSpotifySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showSpotifySecret ? "text" : "password"}
                      value={spotifyClientSecret}
                      onChange={(e) => setSpotifyClientSecret(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl mt-6">
                <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                      <div className="w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px] font-black">LF</span>
                      </div>
                      Last.fm API
                      {lastfmApiKey && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1">Fetch top music tags and styles</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <h4 className="text-xs font-bold text-white mb-2">Setup Instructions:</h4>
                    <ol className="text-[11px] text-zinc-400 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://www.last.fm/api/account/create" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline inline-flex items-center gap-1">Last.fm API Accounts <ExternalLink className="w-3 h-3" /></a></li>
                      <li>Create an API account</li>
                      <li>Copy the API Key</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300">Last.fm API Key</label>
                      <button
                        type="button"
                        onClick={() => setShowLastfmKey(!showLastfmKey)}
                        className="text-zinc-400 hover:text-white p-1"
                      >
                        {showLastfmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type={showLastfmKey ? "text" : "password"}
                      value={lastfmApiKey}
                      onChange={(e) => setLastfmApiKey(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => showToast('Music API Settings saved successfully!')}
                  className="w-fit px-5 py-2.5 bg-[#1DB954] text-black font-extrabold text-xs rounded-xl hover:scale-105 transition-all shadow"
                >
                  Save Music API Settings
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
