import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminSettingsService } from '$lib/server/admin-settings.js';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.isAdmin) {
    throw error(403, 'Forbidden: Admin access required');
  }

  const { action } = await request.json().catch(() => ({}));

  if (action === 'delete') {
    await adminSettingsService.setSetting(
      'hide_demo_artists',
      'true',
      'general',
      'Whether demo artists and tracks are hidden'
    );
    return json({ success: true, hideDemo: true });
  }

  if (action === 'restore') {
    await adminSettingsService.setSetting(
      'hide_demo_artists',
      'false',
      'general',
      'Whether demo artists and tracks are hidden'
    );
    return json({ success: true, hideDemo: false });
  }

  return json({ error: 'Invalid action' }, { status: 400 });
};
