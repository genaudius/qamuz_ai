import type { PageServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'

export const load: PageServerLoad = async ({ locals, url }) => {
  // Get the default page setting from cached settings (loaded by settingsHandle in hooks)
  const defaultPage = locals.settings?.defaultPage || 'landing'

  // If admin has configured the default page to be the app, redirect to /newchat
  if (defaultPage === 'app') {
    const play = url.searchParams.get('play')
    throw redirect(302, play ? `/newchat?play=${encodeURIComponent(play)}` : '/newchat')
  }

  // Otherwise, let the landing page render normally
  return {}
}
