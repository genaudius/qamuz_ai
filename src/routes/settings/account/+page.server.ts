import type { Actions, PageServerLoad } from './$types'
import { fail } from '@sveltejs/kit'
import { db, users } from '$lib/server/db'
import { eq } from 'drizzle-orm'
import { createVerificationToken, generateVerificationUrl } from '$lib/server/email-verification.js'
import { sendWelcomeEmail } from '$lib/server/email.js'
import { isDemoModeEnabled, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js'
import { getAuth } from '$lib/auth'

export const load: PageServerLoad = async ({ parent }) => {
  // Get user data from parent settings layout (already fetched from database with all needed fields)
  const { user, authProviders } = await parent();
  
  return {
    user,
    authProviders,
    isDemoMode: isDemoModeEnabled()
  }
}

// In-memory rate limiting store (in production, use Redis or database)
const verificationEmailRateLimit = new Map<string, number>();

export const actions: Actions = {
  sendVerificationEmail: async ({ locals }) => {
    const session = await locals.auth()

    if (!session?.user?.id || !session?.user?.email) {
      return fail(401, {
        error: 'You must be logged in to verify your email'
      })
    }

    // Check demo mode - block modifications
    if (isDemoModeEnabled()) {
      return fail(403, {
        error: DEMO_MODE_MESSAGES.ADMIN_SAVE_DISABLED
      });
    }
    
    try {
      // Get fresh user data to check verification status
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerifiedBool: users.emailVerifiedBool,
          emailVerified: users.emailVerified
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)
      
      if (user.length === 0) {
        return fail(404, {
          error: 'User not found'
        })
      }
      
      const userData = user[0]
      const isEmailVerified = userData.emailVerifiedBool || !!userData.emailVerified
      
      // Check if email is already verified
      if (isEmailVerified) {
        return fail(400, {
          error: 'Your email is already verified'
        })
      }
      
      // Rate limiting: check if user sent verification email in the last hour
      const userId = session.user.id
      const now = Date.now()
      const lastEmailTime = verificationEmailRateLimit.get(userId)
      const oneHourInMs = 60 * 60 * 1000
      
      if (lastEmailTime && (now - lastEmailTime) < oneHourInMs) {
        const timeRemaining = Math.ceil((oneHourInMs - (now - lastEmailTime)) / 1000 / 60)
        return fail(429, {
          error: `Please wait ${timeRemaining} minutes before requesting another verification email`,
          rateLimited: true,
          timeRemaining
        })
      }
      
      // Create verification token and send email
      const { token } = await createVerificationToken(userData.email!)
      const verificationUrl = await generateVerificationUrl(token)

      // Send verification email (using existing welcome email template with verification link)
      const emailSent = await sendWelcomeEmail({
        email: userData.email!,
        name: userData.name || userData.email!.split('@')[0],
        verificationUrl
      })
      
      if (!emailSent) {
        return fail(500, {
          error: 'Failed to send verification email. Please try again later.'
        })
      }
      
      // Update rate limiting
      verificationEmailRateLimit.set(userId, now)
      
      return {
        success: true,
        message: 'Verification email sent! Please check your inbox and click the verification link.'
      }
      
    } catch (error) {
      console.error('Error sending verification email:', error)
      return fail(500, {
        error: 'Failed to send verification email. Please try again.'
      })
    }
  },
  deleteAccount: async ({ request, locals }) => {
    const session = await locals.auth()

    if (!session?.user?.id) {
      return fail(401, {
        error: 'You must be logged in to delete your account'
      })
    }

    // Check demo mode - block modifications
    if (isDemoModeEnabled()) {
      return fail(403, {
        error: DEMO_MODE_MESSAGES.ADMIN_SAVE_DISABLED
      });
    }
    
    const data = await request.formData()
    const password = data.get('password')?.toString()
    const confirmText = data.get('confirmText')?.toString()
    
    // Validation for confirmation text
    if (confirmText !== 'DELETE') {
      return fail(400, {
        error: 'Please type "DELETE" to confirm account deletion'
      })
    }
    
    try {
      // Call the delete account API endpoint
      const url = new URL(request.url);
      const response = await fetch(`${url.origin}/api/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ password })
      })
      
      if (!response.ok) {
        try {
          const errorData = await response.json()
          console.error('Delete account API error:', errorData)
          
          if (response.status === 400 && errorData.message === 'Password is required for account deletion') {
            return fail(400, {
              error: 'Password is required to delete your account'
            })
          }
          
          if (response.status === 400 && errorData.message === 'Invalid password') {
            return fail(400, {
              error: 'The password you entered is incorrect'
            })
          }
          
          return fail(500, {
            error: 'Failed to delete account. Please try again.'
          })
        } catch (parseError) {
          // If JSON parsing fails, fall back to text parsing
          const errorText = await response.text()
          console.error('Delete account API error (text fallback):', errorText)
          
          return fail(500, {
            error: 'Failed to delete account. Please try again.'
          })
        }
      }
      
      // Account deletion was successful
      // Redirect to login page since the user no longer exists
      return {
        success: true,
        message: 'Your account has been successfully deleted',
        redirect: '/login'
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      return fail(500, {
        error: 'Failed to delete account. Please try again.'
      })
    }
  },

  changePassword: async ({ request, locals }) => {
    const session = await locals.auth()

    if (!session?.user?.id) {
      return fail(401, {
        error: 'You must be logged in to change your password'
      })
    }

    // Check demo mode - block modifications
    if (isDemoModeEnabled()) {
      return fail(403, {
        error: DEMO_MODE_MESSAGES.ADMIN_SAVE_DISABLED
      });
    }
    
    const data = await request.formData()
    const currentPassword = data.get('currentPassword')?.toString()
    const newPassword = data.get('newPassword')?.toString()
    const confirmPassword = data.get('confirmPassword')?.toString()

    if (!newPassword || newPassword.trim().length === 0) {
      return fail(400, {
        error: 'New password is required'
      })
    }

    if (!confirmPassword || confirmPassword.trim().length === 0) {
      return fail(400, {
        error: 'Please confirm your new password'
      })
    }
    
    // Password strength validation
    if (newPassword.length < 8) {
      return fail(400, {
        error: 'New password must be at least 8 characters long'
      })
    }
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return fail(400, {
        error: 'New passwords do not match'
      })
    }

    try {
      const auth = await getAuth()
      const authHeaders = new Headers(request.headers)

      try {
        await auth.api.changePassword({
          body: {
            currentPassword: currentPassword || '',
            newPassword,
            revokeOtherSessions: true,
          },
          headers: authHeaders,
        })

        return {
          success: true,
          message: 'Password changed successfully'
        }
      } catch (changeError) {
        const changeErrorCodeCandidate =
          typeof changeError === 'object' && changeError !== null && 'code' in changeError
            ? (changeError as { code?: unknown }).code
            :
              typeof changeError === 'object' && changeError !== null && 'body' in changeError
                ? (changeError as { body?: { code?: unknown } }).body?.code
                : undefined

        const changeErrorCode =
          typeof changeErrorCodeCandidate === 'string' && changeErrorCodeCandidate.trim().length > 0
            ? changeErrorCodeCandidate
            : undefined

        if (changeErrorCode === 'CREDENTIAL_ACCOUNT_NOT_FOUND') {
          try {
            await auth.api.setPassword({
              body: {
                newPassword,
              },
              headers: authHeaders,
            })

            return {
              success: true,
              message: 'Password set successfully. You can now sign in with email and password.'
            }
          } catch (setError) {
            const setErrorCodeCandidate =
              typeof setError === 'object' && setError !== null && 'code' in setError
                ? (setError as { code?: unknown }).code
                :
                  typeof setError === 'object' && setError !== null && 'body' in setError
                    ? (setError as { body?: { code?: unknown } }).body?.code
                    : undefined

            const setErrorCode =
              typeof setErrorCodeCandidate === 'string' && setErrorCodeCandidate.trim().length > 0
                ? setErrorCodeCandidate
                : undefined

            if (setErrorCode === 'PASSWORD_ALREADY_SET') {
              return fail(400, {
                error: 'A password is already set for this account. Please provide your current password to change it.'
              })
            }

            if (setErrorCode === 'PASSWORD_TOO_SHORT') {
              return fail(400, {
                error: 'New password must be at least 8 characters long'
              })
            }

            if (setErrorCode === 'PASSWORD_TOO_LONG') {
              return fail(400, {
                error: 'New password is too long'
              })
            }

            console.error('Error setting password:', setError)
            return fail(500, {
              error: 'Failed to set password. Please try again.'
            })
          }
        }

        if (changeErrorCode === 'INVALID_PASSWORD') {
          return fail(400, {
            error: 'Current password is incorrect'
          })
        }

        if (changeErrorCode === 'PASSWORD_TOO_SHORT') {
          return fail(400, {
            error: 'New password must be at least 8 characters long'
          })
        }

        if (changeErrorCode === 'PASSWORD_TOO_LONG') {
          return fail(400, {
            error: 'New password is too long'
          })
        }

        console.error('Error changing password:', changeError)
        return fail(500, {
          error: 'Failed to change password. Please try again.'
        })
      }

    } catch (error) {
      console.error('Error changing password:', error)
      return fail(500, {
        error: 'Failed to change password. Please try again.'
      })
    }
  }
}
