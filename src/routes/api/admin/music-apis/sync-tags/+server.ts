import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { adminSettingsService } from '$lib/server/admin-settings.js';
import { settingsStore } from '$lib/server/settings-store.js';
import { syncDiscoveryTagsFromProviders } from '$lib/server/music-providers.js';

export const POST: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    throw error(401, 'Unauthorized');
  }

  const [currentUser] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!currentUser?.isAdmin) {
    throw error(403, 'Forbidden - Admin access required');
  }

  const { genres, tags } = await syncDiscoveryTagsFromProviders();

  await adminSettingsService.setSettings([
    {
      key: 'cached_genres',
      value: JSON.stringify(genres),
      category: 'music_apis',
      description: 'Cached discovery genres synced from providers',
    },
    {
      key: 'cached_tags',
      value: JSON.stringify(tags),
      category: 'music_apis',
      description: 'Cached discovery tags synced from providers',
    },
    {
      key: 'last_sync_at',
      value: new Date().toISOString(),
      category: 'music_apis',
      description: 'Last successful provider sync timestamp',
    },
  ]);

  settingsStore.clearCache();

  return json({
    success: true,
    genresCount: genres.length,
    tagsCount: tags.length,
  });
};
