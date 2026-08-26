import type { Actions, PageServerLoad } from './$types'
import { fail } from '@sveltejs/kit'
import { db } from '$lib/server/db'
import { artistProfiles, users } from '$lib/server/db/schema.js'
import { storageService } from '$lib/server/storage.js'
import { DEMO_MODE_MESSAGES, isDemoModeEnabled } from '$lib/constants/demo-mode.js'
import { eq } from 'drizzle-orm'
import { ensureArtistTables } from '$lib/server/artists.js'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

function sanitizeText(value: FormDataEntryValue | null, maxLength: number) {
  return value?.toString().trim().slice(0, maxLength) || ''
}

async function uploadArtistImage(file: File, userId: string) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Unsupported image type. Use PNG, JPG, WEBP or GIF.')
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image too large. Maximum size is 10MB.')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = storageService.generateFilename(file.name || 'artist-image')
  const uploaded = await storageService.upload(
    {
      buffer,
      mimeType: file.type,
      filename,
    },
    userId,
    'images',
    'uploaded'
  )

  return storageService.getUrl(uploaded.path)
}

export const load: PageServerLoad = async ({ parent }) => {
  // Get user data from parent settings layout (already fetched from database with all needed fields)
  const { user } = await parent();

  let artistProfile = null

  try {
    await ensureArtistTables()
    const [profile] = await db
      .select({
        id: artistProfiles.id,
        userId: artistProfiles.userId,
        bio: artistProfiles.bio,
        bannerUrl: artistProfiles.bannerUrl,
      })
      .from(artistProfiles)
      .where(eq(artistProfiles.userId, user.id))
      .limit(1)

    artistProfile = profile || null
  } catch (error) {
    console.error('Error loading artist profile in settings/profile:', error)
  }

  return {
    user,
    artistProfile,
    isDemoMode: isDemoModeEnabled()
  }
}

export const actions: Actions = {
  updateArtistProfile: async ({ request, locals }) => {
    const session = await locals.auth()

    if (!session?.user?.id) {
      return fail(401, { error: 'You must be logged in to update your artist profile', action: 'updateArtistProfile' })
    }

    if (isDemoModeEnabled()) {
      return fail(403, {
        error: DEMO_MODE_MESSAGES.ADMIN_SAVE_DISABLED,
        action: 'updateArtistProfile'
      })
    }

    const formData = await request.formData()
    const bio = sanitizeText(formData.get('bio'), 2000)
    const avatarFile = formData.get('avatar') as File | null
    const bannerFile = formData.get('banner') as File | null

    try {
      await ensureArtistTables()
      const [existingProfile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.userId, session.user.id))
        .limit(1)

      let avatarUrl: string | null = null
      let bannerUrl: string | null = existingProfile?.bannerUrl || null

      if (avatarFile && avatarFile.size > 0) {
        avatarUrl = await uploadArtistImage(avatarFile, session.user.id)
      }

      if (bannerFile && bannerFile.size > 0) {
        bannerUrl = await uploadArtistImage(bannerFile, session.user.id)
      }

      await db.transaction(async (tx) => {
        if (avatarUrl) {
          await tx
            .update(users)
            .set({ image: avatarUrl, updatedAt: new Date() })
            .where(eq(users.id, session.user.id))
        }

        if (existingProfile) {
          await tx
            .update(artistProfiles)
            .set({
              bio: bio || null,
              bannerUrl,
              updatedAt: new Date(),
            })
            .where(eq(artistProfiles.userId, session.user.id))
        } else {
          await tx.insert(artistProfiles).values({
            userId: session.user.id,
            bio: bio || null,
            bannerUrl,
          })
        }
      })

      return {
        success: true,
        action: 'updateArtistProfile',
        message: 'Artist profile updated successfully.'
      }
    } catch (error) {
      console.error('Error updating artist profile:', error)
      return fail(500, {
        error: error instanceof Error ? error.message : 'Failed to update artist profile',
        action: 'updateArtistProfile'
      })
    }
  }
}
