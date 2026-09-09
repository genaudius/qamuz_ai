import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { isAllowedStudioCallback, signStudioSsoToken } from '$lib/server/studio-sso.js';

export const GET: RequestHandler = async ({ url, locals }) => {
  const returnTo = url.searchParams.get('return') || 'https://qamuz.studio/api/auth/callback';
  if (!isAllowedStudioCallback(returnTo)) {
    throw redirect(302, '/login?error=invalid_studio_return');
  }

  const session = await locals.auth();
  if (!session?.user?.id) {
    const next = `/api/studio/sso?return=${encodeURIComponent(returnTo)}`;
    throw redirect(302, `/login?callbackUrl=${encodeURIComponent(next)}`);
  }

  const token = signStudioSsoToken({
    saasUserId: session.user.id,
    email: session.user.email || '',
    name: session.user.name || undefined,
    planTier: session.user.planTier,
  });
  const target = new URL(returnTo);
  target.searchParams.set('token', token);
  throw redirect(302, target.toString());
};
