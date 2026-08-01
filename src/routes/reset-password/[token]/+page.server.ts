import { redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types.js'
import { eq } from 'drizzle-orm'
import { db, betterAuthVerifications, users } from '$lib/server/db/index.js'
import { getSiteSettings } from '$lib/server/settings-store.js'
import { getTurnstileClientConfig } from '$lib/server/turnstile.js'
import { getClientIP } from '$lib/server/rate-limiting.js'
import {
  createAuthError,
  AUTH_ERRORS,
  AUTH_STATUS_CODES,
  sanitizeErrorForLogging,
} from '$lib/utils/error-handling.js'

function isValidResetTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{1,255}$/.test(token)
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const session = await locals.auth()

  // If user is already logged in, redirect to index page
  if (session?.user) {
    throw redirect(302, '/')
  }

  const token = params.token

  if (!isValidResetTokenFormat(token)) {
    throw redirect(302, '/reset-password?error=Invalid or expired reset link')
  }

  const [settings, turnstileConfig] = await Promise.all([
    getSiteSettings(),
    getTurnstileClientConfig(),
  ])

  const verificationIdentifier = `reset-password:${token}`
  const [verification] = await db
    .select({
      userId: betterAuthVerifications.value,
      expiresAt: betterAuthVerifications.expiresAt,
    })
    .from(betterAuthVerifications)
    .where(eq(betterAuthVerifications.identifier, verificationIdentifier))
    .limit(1)

  if (!verification || new Date() > verification.expiresAt) {
    // Token is invalid or expired, redirect to reset request page without exposing error details
    throw redirect(302, '/reset-password?error=Invalid or expired reset link')
  }

  const [userRecord] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, verification.userId))
    .limit(1)

  return {
    token,
    userEmail: userRecord?.email || null,
    settings: {
      siteName: settings.siteName || 'AI Chat Interface',
      siteDescription: settings.siteDescription || 'Set your new password'
    },
    turnstile: {
      enabled: turnstileConfig.enabled,
      siteKey: turnstileConfig.siteKey,
    },
  }
}

export const actions = {
  default: async ({ request, params, fetch }) => {
    const token = params.token

    if (!isValidResetTokenFormat(token)) {
      throw redirect(302, '/reset-password?error=Invalid or expired reset link')
    }

    const data = await request.formData()
    const password = data.get('password') as string
    const confirmPassword = data.get('confirmPassword') as string
    const turnstileToken = (data.get('cf-turnstile-response') as string | null)?.trim() || ''
    const clientIP = getClientIP(request)

    // Validate form data
    if (!password || !confirmPassword) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.MISSING_FIELDS, {
        password: '',
        confirmPassword: ''
      });
    }

    if (password !== confirmPassword) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, 'Passwords do not match', {
        password: '',
        confirmPassword: ''
      });
    }

    // Password strength validation
    if (password.length < 8) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.INVALID_PASSWORD, {
        password: '',
        confirmPassword: ''
      });
    }

    // Check for at least one number, one letter
    const hasNumber = /\d/.test(password)
    const hasLetter = /[a-zA-Z]/.test(password)

    if (!hasNumber || !hasLetter) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.INVALID_PASSWORD, {
        password: '',
        confirmPassword: ''
      });
    }

    const turnstileEnabled = (await getTurnstileClientConfig()).enabled
    if (turnstileEnabled && !turnstileToken) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, 'Please complete the security verification', {
        password: '',
        confirmPassword: '',
      })
    }

    try {
      const origin = new URL(request.url).origin
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Origin: origin,
      }

      if (turnstileToken) {
        requestHeaders['x-captcha-response'] = turnstileToken
      }

      if (clientIP !== 'unknown') {
        requestHeaders['x-captcha-user-remote-ip'] = clientIP
      }

      const resetResponse = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          newPassword: password,
          token,
        }),
      })

      if (resetResponse.ok) {
        throw redirect(302, '/login?message=Password+reset+successfully.+Please+log+in+with+your+new+password.')
      }

      let resetErrorCode: string | undefined

      try {
        const resetErrorPayload = await resetResponse.json() as { code?: string }
        resetErrorCode = resetErrorPayload.code
      } catch {
        // Ignore parse errors and use status-based fallback below
      }

      if (resetResponse.status === AUTH_STATUS_CODES.TOO_MANY_REQUESTS) {
        return createAuthError(AUTH_STATUS_CODES.TOO_MANY_REQUESTS, AUTH_ERRORS.RATE_LIMITED, {
          password: '',
          confirmPassword: '',
        })
      }

      if (resetErrorCode === 'MISSING_RESPONSE' || resetErrorCode === 'VERIFICATION_FAILED') {
        return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, 'Security verification failed. Please try again.', {
          password: '',
          confirmPassword: '',
        })
      }

      if (resetErrorCode === 'INVALID_TOKEN') {
        throw redirect(302, '/reset-password?error=Invalid or expired reset link')
      }

      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.PASSWORD_RESET_ERROR, {
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'status' in error && 'location' in error) {
        throw error
      }

      const sanitizedError = sanitizeErrorForLogging(error);
      console.error('[Password Reset] Error resetting password:', sanitizedError);

      return createAuthError(AUTH_STATUS_CODES.INTERNAL_SERVER_ERROR, AUTH_ERRORS.PASSWORD_RESET_ERROR, {
        password: '',
        confirmPassword: ''
      });
    }
  }
} satisfies Actions
