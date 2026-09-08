import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import * as schema from '$lib/server/db/schema.js';
import { db } from '$lib/server/db/index.js';
import { getSocialProviders } from '$lib/server/oauth-providers.js';
import { resolveTurnstileCaptchaConfig } from '$lib/server/turnstile.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '$lib/server/email.js';
import { getPublicOrigin } from '$lib/server/settings-store.js';

const AUTH_CACHE_TTL = 5 * 60 * 1000;
const IS_PRODUCTION = env.NODE_ENV === 'production';
const CAPTCHA_PROTECTED_ENDPOINTS = ['/sign-up/email', '/request-password-reset', '/reset-password'];

let authCache: any = null;
let lastAuthBuild = 0;
let authBuildPromise: Promise<any> | null = null;

interface TurnstileCaptchaConfig {
  enabled: boolean;
  secretKey: string;
}

function normalizeOrigin(origin: string): string {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

const DEFAULT_PRODUCTION_HOSTS = [
  'qamuz.ai',
  'www.qamuz.ai',
  'qamuz.studio',
  'www.qamuz.studio',
  'qamuz-ai.vercel.app',
  'qamuz-ai-genaudius-projects.vercel.app',
  '*.vercel.app',
] as const;

function parseOriginCandidate(candidate: string | undefined): string | undefined {
  if (!candidate) {
    return undefined;
  }

  try {
    return normalizeOrigin(new URL(candidate).origin);
  } catch (error) {
    console.warn('[Auth] Invalid auth origin candidate; ignoring value.', error);
    return undefined;
  }
}

function resolveFallbackBaseURL(): string | undefined {
  return (
    parseOriginCandidate(env.BETTER_AUTH_URL) ||
    parseOriginCandidate(env.ORIGIN) ||
    (!IS_PRODUCTION ? 'http://localhost:5173' : undefined)
  );
}

/**
 * Prefer dynamic baseURL so Better Auth's SvelteKit handler matches `/api/auth/*`
 * on every production hostname (custom domains + Vercel aliases), not only the
 * single origin stored in BETTER_AUTH_URL / ORIGIN.
 */
function resolveBaseURL():
  | string
  | {
      allowedHosts: string[];
      fallback?: string;
      protocol?: 'http' | 'https';
    }
  | undefined {
  const fallback = resolveFallbackBaseURL();
  const extraHosts = (env.AUTH_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  if (!IS_PRODUCTION) {
    return fallback || 'http://localhost:5173';
  }

  const allowedHosts = Array.from(
    new Set<string>([...DEFAULT_PRODUCTION_HOSTS, ...extraHosts])
  );

  if (fallback) {
    try {
      allowedHosts.push(new URL(fallback).host);
    } catch {
      // ignore invalid fallback host
    }
  }

  return {
    allowedHosts,
    fallback,
    protocol: 'https',
  };
}

function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  const configured = [
    parseOriginCandidate(env.ORIGIN),
    parseOriginCandidate(env.BETTER_AUTH_URL),
  ].filter((value): value is string => Boolean(value));

  for (const origin of configured) {
    origins.add(origin);
  }

  for (const host of DEFAULT_PRODUCTION_HOSTS) {
    if (host.includes('*')) {
      continue;
    }
    origins.add(`https://${host}`);
  }

  const extraOrigins = (env.AUTH_TRUSTED_ORIGINS || '')
    .split(',')
    .map((value) => parseOriginCandidate(value.trim()))
    .filter((value): value is string => Boolean(value));

  for (const origin of extraOrigins) {
    origins.add(origin);
  }

  if (!IS_PRODUCTION) {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
    origins.add('http://localhost:4173');
    origins.add('http://127.0.0.1:4173');
  }

  return Array.from(origins);
}

async function createAuthInstance() {
  const socialProviders = await getSocialProviders();
  const turnstileCaptchaConfig: TurnstileCaptchaConfig = await resolveTurnstileCaptchaConfig();

  const plugins = [];

  if (turnstileCaptchaConfig.enabled && turnstileCaptchaConfig.secretKey) {
    plugins.push(
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: turnstileCaptchaConfig.secretKey,
        endpoints: CAPTCHA_PROTECTED_ENDPOINTS,
      })
    );
  }

  plugins.push(sveltekitCookies(getRequestEvent));

  return betterAuth({
    appName: 'qamuz_ai',
    secret: env.BETTER_AUTH_SECRET || env.AUTH_SECRET,
    baseURL: resolveBaseURL(),
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        ...schema,
        user: schema.users,
        account: schema.betterAuthAccounts,
        session: schema.betterAuthSessions,
        verification: schema.betterAuthVerifications,
      },
    }),
    user: {
      fields: {
        emailVerified: 'emailVerifiedBool',
      },
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
      additionalFields: {
        isAdmin: {
          type: 'boolean',
          required: true,
          defaultValue: false,
          input: false,
        },
        planTier: {
          type: 'string',
          required: false,
          input: false,
        },
        professionalRole: {
          type: 'string',
          required: false,
          input: true,
        },
        portfolioUrl: {
          type: 'string',
          required: false,
          input: true,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 24 * 60 * 60,
      sendResetPassword: async ({ user, token }) => {
        if (!user.email) {
          return;
        }

        try {
          const publicOrigin = normalizeOrigin(await getPublicOrigin());
          const resetUrl = `${publicOrigin}/reset-password/${encodeURIComponent(token)}`;
          const sent = await sendPasswordResetEmail({
            email: user.email,
            name: user.name || user.email.split('@')[0],
            resetUrl,
          });

          if (!sent) {
            console.error('[Auth] Failed to send password reset email');
          }
        } catch (error) {
          console.error('[Auth] Failed to process password reset email delivery:', error);
        }
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        if (!user.email) {
          return;
        }

        void sendWelcomeEmail({
          email: user.email,
          name: user.name || user.email.split('@')[0],
          verificationUrl: url,
        }).then((sent) => {
          if (!sent) {
            console.error('[Auth] Failed to send verification email');
          }
        }).catch((error) => {
          console.error('[Auth] Failed to process verification email delivery:', error);
        });
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['credential', 'google', 'apple', 'twitter', 'facebook'],
        allowDifferentEmails: false,
      },
    },
    socialProviders,
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    rateLimit: {
      enabled: true,
      customRules: {
        '/sign-in/email': {
          window: 10,
          max: 3,
        },
      },
    },
    trustedOrigins: getTrustedOrigins(),
    advanced: {
      useSecureCookies: env.NODE_ENV === 'production',
      disableCSRFCheck: false,
      disableOriginCheck: false,
      ipAddress: {
        ipAddressHeaders: ['x-captcha-user-remote-ip', 'cf-connecting-ip', 'x-forwarded-for', 'x-real-ip'],
      },
    },
    plugins,
  });
}

export async function getAuth() {
  const now = Date.now();
  if (authCache && now - lastAuthBuild < AUTH_CACHE_TTL) {
    return authCache;
  }

  if (authBuildPromise) {
    return authBuildPromise;
  }

  authBuildPromise = createAuthInstance();

  try {
    authCache = await authBuildPromise;
    lastAuthBuild = Date.now();
    return authCache;
  } finally {
    authBuildPromise = null;
  }
}

export function clearBetterAuthCache(): void {
  authCache = null;
  lastAuthBuild = 0;
}
