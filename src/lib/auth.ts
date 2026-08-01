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

function resolveBaseURL(): string | undefined {
  const candidates = [env.BETTER_AUTH_URL, env.ORIGIN];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(candidate).origin;
    } catch (error) {
      console.warn('[Auth] Invalid auth base URL candidate; ignoring value.', error);
    }
  }

  if (!IS_PRODUCTION) {
    return 'http://localhost:5173';
  }

  return undefined;
}

function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  if (env.ORIGIN) {
    origins.add(env.ORIGIN);
  }

  if (env.BETTER_AUTH_URL) {
    try {
      origins.add(new URL(env.BETTER_AUTH_URL).origin);
    } catch (error) {
      console.warn('[Auth] Invalid BETTER_AUTH_URL; ignoring trusted origin derivation.', error);
    }
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
