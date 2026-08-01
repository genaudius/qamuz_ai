import type { PageServerLoad } from './$types'
import { isDemoModeEnabled } from '$lib/constants/demo-mode.js'

export const load: PageServerLoad = async ({ parent }) => {
  // Get user data from parent settings layout (already fetched from database with all needed fields)
  const { user } = await parent();

  return {
    user,
    isDemoMode: isDemoModeEnabled()
  }
}
