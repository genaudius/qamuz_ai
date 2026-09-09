import type { Handle } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { building } from '$app/environment'
import { settingsStore } from '$lib/server/settings-store'
import { storageService } from '$lib/server/storage.js'
import { ensureCanonicalSchema } from '$lib/server/db/ensure-canonical.js'
import { paraglideMiddleware } from "./paraglide/server"
import { db, users, betterAuthAccounts } from '$lib/server/db/index.js'
import { and, eq, ne } from 'drizzle-orm'
import { securityHeaders } from '$lib/server/security-headers.js'
import { getAuth } from '$lib/auth'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { sendWelcomeEmail } from '$lib/server/email.js'
import { readStudioBearer } from '$lib/server/studio-sso.js'

// Settings handle - loads and caches site settings
const settingsHandle: Handle = async ({ event, resolve }) => {
  try {
    await ensureCanonicalSchema();
    // Load settings and make them available in locals
    const settings = await settingsStore.getSettings();
    event.locals.settings = settings;
  } catch (error) {
    console.error('Failed to load settings in hooks:', error);
    // Use cached settings as fallback
    event.locals.settings = settingsStore.getCachedSettings();
  }

  return resolve(event);
};

// Locale default handle - sets admin default language if no user preference exists
const localeDefaultHandle: Handle = async ({ event, resolve }) => {
  const cookies = event.cookies;
  const existingLocaleCookie = cookies.get('PARAGLIDE_LOCALE');

  // Only set default if no user preference exists
  if (!existingLocaleCookie) {
    try {
      // Use the cached settings from locals (loaded by settingsHandle)
      // This prevents additional database calls
      const cachedSettings = event.locals.settings;
      const defaultLanguage = cachedSettings?.defaultLanguage || 'en';

      // Set admin default language as the user's locale cookie
      // This becomes the user's preference until they manually change it
      cookies.set('PARAGLIDE_LOCALE', defaultLanguage, {
        path: '/',
        httpOnly: false, // Allow client-side access so users can still change it
        secure: false, // Allow for development
        sameSite: 'lax',
        maxAge: 34560000 // Same as paraglide default (400 days)
      });
    } catch (error) {
      console.error('Failed to set default locale:', error);
      // Fall back to baseLocale behavior
    }
  }

  return resolve(event);
};

// Paraglide handle - handles internationalization and favicon injection
const paraglideHandle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request: localizedRequest, locale }: { request: Request, locale: string }) => {
    event.request = localizedRequest;
    return resolve(event, {
      transformPageChunk: ({ html }: { html: string }) => {
        // Replace language placeholder
        let transformedHtml = html.replace('%lang%', locale);

        // Replace favicon placeholder with dynamic or fallback favicon
        const faviconUrl = event.locals.settings?.currentFavicon || '/branding/qamuz/favicon.ico';
        transformedHtml = transformedHtml.replace('%favicon%', faviconUrl);

        return transformedHtml;
      }
    });
  });

// Storage warming handle - eagerly initializes storage service during request processing
//
// PURPOSE:
// This middleware triggers storage service initialization in the background (non-blocking)
// to ensure it's ready before any upload/download operations that might occur later in the request.
//
// WHY IT'S NEEDED:
// On serverless platforms (Vercel, Lambda), cold starts can cause race conditions where:
// 1. Storage service singleton isn't initialized yet
// 2. Settings cache is empty (no R2 credentials loaded)
// 3. Multiple concurrent requests all try to initialize simultaneously
// 4. Result: Some requests fall back to local storage instead of R2
//
// HOW IT WORKS:
// - Triggers getStorageType() in background (doesn't await)
// - This ensures ensureInitialized() runs early in the request lifecycle
// - By the time upload/download routes execute, storage is already initialized
// - Prevents race condition where storage initializes with empty cache
//
// PERFORMANCE:
// - No latency impact (non-blocking background initialization)
// - Subsequent requests benefit from warm singleton
// - Reduces cold start initialization time by 100-500ms for media operations
//
const storageWarmingHandle: Handle = async ({ event, resolve }) => {
  // Trigger storage initialization in background (don't await - non-blocking)
  // This ensures StorageService singleton is ready before any upload/download operations
  storageService.getStorageType().catch(error => {
    // Silent catch - initialization errors will be properly handled when actually used
    // Only log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Storage Warming] Failed to warm storage service:', error.message);
    }
  });

  return resolve(event);
};

// Enhanced auth handle - wraps the original auth handle and enhances session with user data
//
// CACHE BEHAVIOR DOCUMENTATION:
// ==============================
//
// Expected Performance per Route Type:
//
// 1. Simple Routes (1 auth call):
//    - Examples: /, /pricing, /library, most API endpoints
//    - Expected: 0 hits, 1 miss (100% normal - no logging)
//    - Cache eliminates the N+1 query problem but only helps with multiple calls
//
// 2. Layout Hierarchy Routes (2+ auth calls - NOW OPTIMIZED):
//    - Examples: /admin (root + admin layouts), /settings/* (root + settings + page layouts)
//    - Before optimization: 0 hits, 2+ misses
//    - After optimization: 1-2 hits, 1 miss (cache working - logged as ✅ OPTIMIZED)
//    - Uses parent() to share session data instead of re-calling locals.auth()
//
// 3. Form Action Routes (2+ auth calls):
//    - Examples: Settings pages with form submissions
//    - Expected: 1+ hits, 1 miss (cache working during form processing)
//    - Form actions still call locals.auth() but benefit from page load cache
//
// 4. Problem Routes (multiple uncached calls - needs investigation):
//    - Shows: ⚠️ MULTIPLE CALLS with 0 hits, 2+ misses
//    - Indicates potential optimization opportunities
//
// Performance Impact:
// - Single call routes: No change (already optimal)
// - Multi call routes: 50-95% reduction in database queries
// - Complex admin routes: Improved from 2-3 DB calls to 1 DB call
//
type AppSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    isAdmin: boolean;
    planTier?: string;
  };
  expires: string;
};

const enhancedAuthHandle: Handle = async ({ event, resolve }) => {
  let cachedEnhancedSession: AppSession | null = null;
  let sessionCached = false;

  let cacheHits = 0;
  let cacheMisses = 0;

  const baseAuth = async (): Promise<AppSession | null> => {
    const auth = await getAuth();
    const sessionData = await auth.api.getSession({
      headers: event.request.headers,
    });

    if (!sessionData?.user?.id) {
      const studio = readStudioBearer(event.request);
      if (!studio) return null;
      return {
        user: {
          id: studio.saasUserId,
          email: studio.email,
          name: studio.name || null,
          image: null,
          isAdmin: false,
          planTier: studio.planTier,
        },
        expires: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
      };
    }

    const sessionExpiresAt = sessionData.session.expiresAt;

    return {
      user: {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        image: sessionData.user.image,
        isAdmin: (sessionData.user as { isAdmin?: boolean }).isAdmin ?? false,
        planTier: (sessionData.user as { planTier?: string }).planTier,
      },
      expires:
        sessionExpiresAt instanceof Date
          ? sessionExpiresAt.toISOString()
          : typeof sessionExpiresAt === 'string'
            ? sessionExpiresAt
            : new Date(sessionExpiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  };

  const getEnhancedSession = async (): Promise<AppSession | null> => {
    if (sessionCached) {
      if (process.env.NODE_ENV === 'development') {
        cacheHits++;
      }
      return cachedEnhancedSession;
    }

    if (process.env.NODE_ENV === 'development') {
      cacheMisses++;
    }

    const session = await baseAuth();

    if (session?.user?.id) {
      try {
        const startTime = Date.now();
        const [userData] = await db
          .select({
            id: users.id,
            planTier: users.planTier,
            isAdmin: users.isAdmin,
            email: users.email,
            name: users.name,
            emailVerifiedBool: users.emailVerifiedBool,
          })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1);

        const queryTime = Date.now() - startTime;
        if (process.env.NODE_ENV === 'development' && queryTime > 100) {
          console.warn(`[Performance] Slow user data query: ${queryTime}ms for user ${session.user.id}`);
        }

        if (userData) {
          if (userData.email && !userData.emailVerifiedBool) {
            const [oauthAccount] = await db
              .select({ providerId: betterAuthAccounts.providerId })
              .from(betterAuthAccounts)
              .where(
                and(
                  eq(betterAuthAccounts.userId, userData.id),
                  ne(betterAuthAccounts.providerId, 'credential')
                )
              )
              .limit(1);

            if (oauthAccount) {
              const [credentialAccount] = await db
                .select({ id: betterAuthAccounts.id })
                .from(betterAuthAccounts)
                .where(
                  and(
                    eq(betterAuthAccounts.userId, userData.id),
                    eq(betterAuthAccounts.providerId, 'credential')
                  )
                )
                .limit(1);

              if (!credentialAccount) {
                const [updatedUser] = await db
                  .update(users)
                  .set({
                    emailVerifiedBool: true,
                    emailVerified: new Date(),
                  })
                  .where(
                    and(
                      eq(users.id, userData.id),
                      eq(users.emailVerifiedBool, false)
                    )
                  )
                  .returning({ id: users.id });

                if (updatedUser) {
                  try {
                    await sendWelcomeEmail({
                      email: userData.email,
                      name: userData.name || userData.email.split('@')[0],
                    });
                  } catch (emailError) {
                    console.error('[Auth] Failed to send welcome email for social auth user:', emailError);
                  }
                }
              }
            }
          }

          session.user.planTier = userData.planTier || undefined;
          session.user.isAdmin = userData.isAdmin;
          session.user.email = userData.email;
          session.user.name = userData.name;
          cachedEnhancedSession = session;
          sessionCached = true;
        } else {
          console.log(`[Auth] Session invalidated: user ${session.user.id} no longer exists in database`);
          cachedEnhancedSession = null;
          sessionCached = true;
          return null;
        }
      } catch (error) {
        console.error(`[Auth] Error enhancing session with user data for user ${session.user.id}:`, error);
        cachedEnhancedSession = session;
        sessionCached = true;
      }
    } else {
      cachedEnhancedSession = session;
      sessionCached = true;
    }

    return cachedEnhancedSession;
  };

  event.locals.auth = getEnhancedSession;
  event.locals.getSession = getEnhancedSession;

  const result = await resolve(event);

  if (process.env.NODE_ENV === 'development' && (cacheHits > 0 || cacheMisses > 0)) {
    const totalCalls = cacheHits + cacheMisses;
    const hitRate = totalCalls > 0 ? ((cacheHits / totalCalls) * 100).toFixed(1) : '0';

    if (cacheHits > 0 || cacheMisses > 1) {
      const status = cacheHits > 0 ? '✅ OPTIMIZED' : '⚠️  MULTIPLE CALLS';
      console.log(`[Auth Cache] ${status} ${event.url.pathname}: ${cacheHits} hits, ${cacheMisses} misses (${hitRate}% hit rate)`);
    }
  }

  return result;
};

const betterAuthHandle: Handle = async ({ event, resolve }) => {
  const auth = await getAuth();
  return svelteKitHandler({ event, resolve, auth, building });
};

// Combine all handles: security headers, settings, storage warming, locale default, paraglide, and enhanced auth
// Storage warming runs after settings to ensure R2 credentials are loaded before storage initialization
export const handle: Handle = sequence(
  securityHeaders,
  settingsHandle,
  storageWarmingHandle,
  localeDefaultHandle,
  paraglideHandle,
  enhancedAuthHandle,
  betterAuthHandle
)
