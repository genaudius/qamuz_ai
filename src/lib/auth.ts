import { env } from 'process';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import * as schema from './server/db/schema';
import { db } from './server/db/index';
import { getSocialProviders } from './server/oauth-providers';
import { resolveTurnstileCaptchaConfig } from './server/turnstile';
import { sendPasswordResetEmail, sendWelcomeEmail } from './server/email';
import { getPublicOrigin } from './server/settings-store';

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
  // Behind a TLS-terminating reverse proxy (preview env / vite dev) the internal
  // request origin differs from the public origin. better-auth's isAuthPath does a
  // strict origin match against a pinned baseURL, so pinning it there makes every
  // /api/auth/* request 404. In those environments we leave baseURL undefined and
  // let better-auth infer it from the incoming request; CSRF stays enforced via
  // trustedOrigins. In production (adapter-node computes origin from ORIGIN) the
  // origins align, so we pin baseURL for stability.
  if (IS_PRODUCTION) {
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

  // Comma-separated extra origins (exact or wildcard) via env, works in all envs.
  if (env.ADDITIONAL_TRUSTED_ORIGINS) {
    for (const raw of env.ADDITIONAL_TRUSTED_ORIGINS.split(',')) {
      const value = raw.trim();
      if (value) origins.add(value);
    }
  }

  if (!IS_PRODUCTION) {
    origins.add('http://localhost:5173');
    origins.add('http://127.0.0.1:5173');
    origins.add('http://localhost:4173');
    origins.add('http://127.0.0.1:4173');
    // Emergent preview / CDN inject a sibling hostname (e.g. *.cluster-N.preview.emergentcf.cloud)
    // that differs from the public ORIGIN. Trust the preview domain families via wildcards so
    // browser logins work behind the reverse proxy while keeping CSRF/origin checks enabled.
    origins.add('https://*.preview.emergentagent.com');
    origins.add('https://*.preview.emergentcf.cloud');
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

  plugins.push(nextCookies());

  return betterAuth({
    appName: 'GenAudius',
    secret: env.BETTER_AUTH_SECRET || env.AUTH_SECRET,
    baseURL: resolveBaseURL(),
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            try {
              const { createAdminNotification } = await import('./server/notifications');
              await createAdminNotification(
                'New User Signup',
                `A new user just registered: ${user.email}`,
                'admin',
                '/admin'
              );
            } catch (err) {
              console.error('Failed to trigger new user notification', err);
            }
          }
        }
      }
    },
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
