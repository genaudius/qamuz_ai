import { redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { isOAuthProviderEnabled } from '$lib/server/oauth-providers'
import { getTurnstileClientConfig } from '$lib/server/turnstile'
import { getAuth } from '$lib/auth'
import { sendWelcomeEmail } from '$lib/server/email.js'
import { createVerificationToken, generateVerificationUrl } from '$lib/server/email-verification.js'
import { authSanitizers, validatePasswordSafety } from '$lib/utils/sanitization.js'
import { validatePassword, BALANCED_PASSWORD_POLICY } from '$lib/utils/password-validation.js'
import { validateEmailForAuth } from '$lib/utils/email-validation.js'
import { getClientIP } from '$lib/server/rate-limiting.js'
import { SecurityLogger } from '$lib/server/security-monitoring.js'
import { createAuthError, handleDatabaseError, AUTH_ERRORS, AUTH_STATUS_CODES } from '$lib/utils/error-handling.js'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  // If user is already logged in, redirect to new chat page
  if (session?.user) {
    throw redirect(302, '/newchat')
  }

  // Load OAuth provider availability and Turnstile settings from database
  try {
    const [
      googleEnabled, 
      appleEnabled, 
      twitterEnabled, 
      facebookEnabled,
      turnstileConfig
    ] = await Promise.all([
      isOAuthProviderEnabled('google'),
      isOAuthProviderEnabled('apple'),
      isOAuthProviderEnabled('twitter'),
      isOAuthProviderEnabled('facebook'),
      getTurnstileClientConfig()
    ]);

    return {
      oauthProviders: {
        google: googleEnabled,
        apple: appleEnabled,
        twitter: twitterEnabled,
        facebook: facebookEnabled
      },
      turnstile: {
        enabled: turnstileConfig.enabled,
        siteKey: turnstileConfig.siteKey
      }
    }
  } catch (error) {
    console.error('Failed to load provider settings for register page:', error);
    
    // Fallback - disable providers when settings cannot be loaded
    return {
      oauthProviders: {
        google: false,
        apple: false,
        twitter: false,
        facebook: false
      },
      turnstile: {
        enabled: false,
        siteKey: ''
      }
    }
  }
}

export const actions: Actions = {
  register: async ({ request }) => {
    const data = await request.formData()
    const rawEmail = data.get('email') as string
    const rawPassword = data.get('password') as string
    const turnstileToken = (data.get('cf-turnstile-response') as string | null)?.trim() || ''

    // Get client IP for security logging
    const clientIP = getClientIP(request);

    // Sanitize and validate inputs for security
    const email = authSanitizers.email(rawEmail)
    const passwordSafetyCheck = validatePasswordSafety(rawPassword)

    // Basic validation
    if (!email || !passwordSafetyCheck.isValid) {
      SecurityLogger.registrationFailure(rawEmail || 'unknown', 'Invalid input data', clientIP);
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.MISSING_FIELDS);
    }

    // Comprehensive password validation
    const passwordValidation = validatePassword(rawPassword, BALANCED_PASSWORD_POLICY, { email })

    if (!passwordValidation.isValid) {
      SecurityLogger.registrationFailure(email, 'Password validation failed', clientIP);
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.INVALID_PASSWORD);
    }

    // Comprehensive RFC-compliant email validation
    const emailValidation = validateEmailForAuth(rawEmail)
    if (!emailValidation.isValid) {
      SecurityLogger.registrationFailure(rawEmail, 'Email validation failed', clientIP);
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.INVALID_EMAIL);
    }

    // Use the normalized email from validation
    const validatedEmail = emailValidation.normalizedEmail
    
    // Require captcha token when Turnstile is enabled
    const turnstileEnabled = (await getTurnstileClientConfig()).enabled
    if (turnstileEnabled && !turnstileToken) {
      return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, 'Please complete the security verification');
    }
    
    try {
      const duplicateUserErrorCodes = new Set([
        'USER_ALREADY_EXISTS',
        'ACCOUNT_ALREADY_EXISTS',
        'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      ])
      const captchaErrorCodes = new Set(['MISSING_RESPONSE', 'VERIFICATION_FAILED'])

      const origin = new URL(request.url).origin
      const signUpHeaders = new Headers(request.headers)
      signUpHeaders.set('origin', origin)

      if (turnstileToken) {
        signUpHeaders.set('x-captcha-response', turnstileToken)
      }

      if (clientIP !== 'unknown') {
        signUpHeaders.set('x-captcha-user-remote-ip', clientIP)
      }

      const auth = await getAuth()

      let createdUser: {
        id?: string
        email?: string | null
        name?: string | null
      } | undefined

      try {
        const signUpPayload = await auth.api.signUpEmail({
          body: {
            name: validatedEmail.split('@')[0],
            email: validatedEmail,
            password: rawPassword,
          },
          headers: signUpHeaders,
        }) as {
          user?: {
            id?: string
            email?: string | null
            name?: string | null
          }
        }

        createdUser = signUpPayload?.user
      } catch (signUpError) {
        const signUpErrorStatus =
          typeof signUpError === 'object' && signUpError !== null && 'status' in signUpError
            ? Number((signUpError as { status?: number }).status)
            : undefined

        const signUpErrorCodeCandidate =
          typeof signUpError === 'object' && signUpError !== null && 'code' in signUpError
            ? (signUpError as { code?: unknown }).code
            :
              typeof signUpError === 'object' && signUpError !== null && 'body' in signUpError
                ? (signUpError as { body?: { code?: unknown } }).body?.code
                : undefined

        const signUpErrorCode =
          typeof signUpErrorCodeCandidate === 'string' && signUpErrorCodeCandidate.trim().length > 0
            ? signUpErrorCodeCandidate
            : undefined

        const signUpErrorMessageCandidate =
          typeof signUpError === 'object' && signUpError !== null && 'message' in signUpError
            ? (signUpError as { message?: unknown }).message
            :
              typeof signUpError === 'object' && signUpError !== null && 'body' in signUpError
                ? (signUpError as { body?: { message?: unknown } }).body?.message
                : undefined

        const signUpErrorMessage =
          typeof signUpErrorMessageCandidate === 'string' && signUpErrorMessageCandidate.trim().length > 0
            ? signUpErrorMessageCandidate
            : undefined

        if (signUpErrorStatus === AUTH_STATUS_CODES.TOO_MANY_REQUESTS) {
          SecurityLogger.registrationFailure(validatedEmail, 'Registration rate limited', clientIP)
          return createAuthError(AUTH_STATUS_CODES.TOO_MANY_REQUESTS, AUTH_ERRORS.RATE_LIMITED)
        }

        if (signUpErrorCode && captchaErrorCodes.has(signUpErrorCode)) {
          SecurityLogger.registrationFailure(validatedEmail, `Captcha verification failed (${signUpErrorCode})`, clientIP)
          return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, 'Security verification failed. Please try again.')
        }

        const duplicateByCode = !!(signUpErrorCode && duplicateUserErrorCodes.has(signUpErrorCode))
        const duplicateByMessage =
          signUpErrorMessage?.toLowerCase().includes('already') &&
          signUpErrorMessage?.toLowerCase().includes('exist')

        if (signUpErrorStatus === 409 || signUpErrorStatus === 422 || duplicateByCode || duplicateByMessage) {
          SecurityLogger.registrationFailure(validatedEmail, 'Account already exists', clientIP)
          return createAuthError(AUTH_STATUS_CODES.BAD_REQUEST, AUTH_ERRORS.EMAIL_ALREADY_EXISTS)
        }

        SecurityLogger.registrationFailure(
          validatedEmail,
          `Better Auth sign-up failed (${signUpErrorStatus ?? 'unknown'}${signUpErrorCode ? `:${signUpErrorCode}` : ''})`,
          clientIP
        )

        console.error('[Registration] Better Auth sign-up failed', {
          status: signUpErrorStatus,
          code: signUpErrorCode,
          message: signUpErrorMessage
        })

        return createAuthError(AUTH_STATUS_CODES.INTERNAL_SERVER_ERROR, AUTH_ERRORS.SERVER_ERROR)
      }

      if (!createdUser?.id || !createdUser.email) {
        SecurityLogger.registrationFailure(validatedEmail, 'Better Auth returned invalid signup payload', clientIP)
        return createAuthError(AUTH_STATUS_CODES.INTERNAL_SERVER_ERROR, AUTH_ERRORS.SERVER_ERROR)
      }

      const createdUserEmail = createdUser.email
      const createdUserName = createdUser.name || createdUserEmail.split('@')[0]

      SecurityLogger.registrationSuccess(createdUser.id, createdUserEmail, clientIP);

      // Send welcome email asynchronously so registration speed is not blocked by SMTP latency.
      // Failures are logged but never block account creation.
      void (async () => {
        try {
          const { token } = await createVerificationToken(createdUserEmail)
          const verificationUrl = await generateVerificationUrl(token)

          const emailSent = await sendWelcomeEmail({
            email: createdUserEmail,
            name: createdUserName,
            verificationUrl
          })

          if (emailSent) {
            SecurityLogger.emailVerificationSent(createdUserEmail, createdUser.id)
            console.log('[Registration] Welcome email with verification link sent')
          } else {
            SecurityLogger.emailVerificationFailure(createdUserEmail, 'Failed to send welcome email')
            console.error('[Registration] Welcome email was not sent by email service')
          }
        } catch (emailError) {
          console.error('[Registration] Failed to send welcome email:', emailError)
          SecurityLogger.emailVerificationFailure(createdUserEmail, 'Failed to send welcome email')
        }
      })()
      
      // Redirect authenticated user to app entrypoint
      throw redirect(302, '/newchat')
      
    } catch (error) {
      // Re-throw redirects (SvelteKit redirects have a status property)
      if (typeof error === 'object' && error !== null && 'status' in error && 'location' in error) {
        throw error
      }

      // Handle database and other errors securely
      SecurityLogger.registrationFailure(validatedEmail, 'System error during registration', clientIP);
      return handleDatabaseError(error, 'user registration');
    }
  }
}
