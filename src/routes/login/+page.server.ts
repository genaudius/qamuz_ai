import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { isOAuthProviderEnabled } from '$lib/server/oauth-providers'
import { isDemoModeEnabled } from '$lib/constants/demo-mode.js'

export const load: PageServerLoad = async ({ locals }) => {
  const session = await locals.auth()

  // If user is already logged in, redirect to new chat page
  if (session?.user) {
    throw redirect(302, '/newchat')
  }
  
  // Load OAuth provider availability from database settings
  try {
    const googleEnabled = await isOAuthProviderEnabled('google');
    const appleEnabled = await isOAuthProviderEnabled('apple');
    const twitterEnabled = await isOAuthProviderEnabled('twitter');
    const facebookEnabled = await isOAuthProviderEnabled('facebook');
    
    return {
      oauthProviders: {
        google: googleEnabled,
        apple: appleEnabled,
        twitter: twitterEnabled,
        facebook: facebookEnabled
      },
      isDemoMode: isDemoModeEnabled()
    }
  } catch (error) {
    console.error('Failed to load OAuth provider settings for login page:', error);
    
    // Fallback - disable providers when settings cannot be loaded
    return {
      oauthProviders: {
        google: false,
        apple: false,
        twitter: false,
        facebook: false
      },
      isDemoMode: isDemoModeEnabled()
    }
  }
}
