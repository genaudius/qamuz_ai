import { redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types.js'
import { getSiteSettings } from '$lib/server/settings-store.js'
import { getTurnstileClientConfig } from '$lib/server/turnstile.js'
import { getClientIP } from '$lib/server/rate-limiting.js'
import { validateEmailForAuth } from '$lib/utils/email-validation.js'
import {
  createAuthError,
  AUTH_ERRORS,
  AUTH_STATUS_CODES,
  createGenericSuccessResponse,
  sanitizeErrorForLogging,
} from '$lib/utils/error-handling.js'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  // If user is already logged in, redirect to index page
  if (session?.user) {
    throw redirect(302, '/')
  }

  try {
    const [settings, turnstileConfig] = await Promise.all([
      getSiteSettings(),
      getTurnstileClientConfig(),
    ])

    return {
      settings: {
        siteName: settings.siteName || 'AI Chat Interface',
        siteDescription: settings.siteDescription || 'Reset your password'
      },
      turnstile: {
        enabled: turnstileConfig.enabled,
        siteKey: turnstileConfig.siteKey,
      }
    }
  } catch (error) {
    console.error('Failed to load reset-password page settings:', error)

    return {
      settings: {
        siteName: 'AI Chat Interface',
        siteDescription: 'Reset your password'
      },
      turnstile: {
        enabled: false,
        siteKey: '',
      }
    }
  }
}

export const actions = {
  default: async ({ request, fetch }) => {
    const data = await request.formData()
    const rawEmail = data.get('email') as string
    const turnstileToken = (data.get('cf-turnstile-response') as string | null)?.trim() || ''
    const clientIP = getClientIP(request)

    if (!rawEmail) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.MISSING_FIELDS, { email: '' });
    }

    const emailValidation = validateEmailForAuth(rawEmail)
    if (!emailValidation.isValid) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.INVALID_EMAIL, { email: rawEmail });
    }

    const validatedEmail = emailValidation.normalizedEmail

    const turnstileEnabled = (await getTurnstileClientConfig()).enabled
    if (turnstileEnabled && !turnstileToken) {
      return createAuthError(
        AUTH_STATUS_CODES.BAD_REQUEST,
        'Please complete the security verification',
        { email: validatedEmail }
      )
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

      const resetRequestResponse = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          email: validatedEmail,
        }),
      })

      if (resetRequestResponse.ok) {
        return createGenericSuccessResponse(AUTH_ERRORS.PASSWORD_RESET_SENT);
      }

      let errorCode: string | undefined
      let errorMessage: string | undefined

      try {
        const errorPayload = await resetRequestResponse.json() as { code?: string; message?: string }
        errorCode = errorPayload.code
        errorMessage = errorPayload.message
      } catch {
        // Ignore parse errors and use status-based fallback below
      }

      if (resetRequestResponse.status === AUTH_STATUS_CODES.TOO_MANY_REQUESTS) {
        return createAuthError(AUTH_STATUS_CODES.TOO_MANY_REQUESTS, AUTH_ERRORS.RATE_LIMITED, {
          email: validatedEmail,
        })
      }

      if (errorCode === 'MISSING_RESPONSE' || errorCode === 'VERIFICATION_FAILED') {
        return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, 'Security verification failed. Please try again.', {
          email: validatedEmail,
        })
      }

      console.error('[Password Reset] Better Auth request failed', {
        status: resetRequestResponse.status,
        code: errorCode,
        message: errorMessage,
      })

      // Keep generic success semantics to avoid account enumeration.
      return createGenericSuccessResponse(AUTH_ERRORS.PASSWORD_RESET_SENT);

    } catch (error) {
      const sanitizedError = sanitizeErrorForLogging(error);
      console.error('[Password Reset] Error processing request:', sanitizedError);

      // For other errors, show generic success message for security
      return createGenericSuccessResponse(AUTH_ERRORS.PASSWORD_RESET_SENT);
    }
  }
} satisfies Actions
