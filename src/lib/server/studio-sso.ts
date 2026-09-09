import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

export type StudioSsoClaims = {
  saasUserId: string;
  email: string;
  name?: string;
  planTier?: string;
};

function ssoSecret(): string | null {
  return env.STUDIO_SSO_SECRET?.trim() || env.BETTER_AUTH_SECRET?.trim() || null;
}

export function allowedStudioCallbacks(): string[] {
  const raw = env.STUDIO_CALLBACK_URLS || 'https://qamuz.studio/api/auth/callback,http://localhost:8787/api/auth/callback,http://localhost:1420/api/auth/callback';
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

export function isAllowedStudioCallback(url: string): boolean {
  try {
    const parsed = new URL(url);
    return allowedStudioCallbacks().some((allowed) => {
      try {
        const target = new URL(allowed);
        return parsed.origin === target.origin && parsed.pathname === target.pathname;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function signStudioSsoToken(
  claims: StudioSsoClaims,
  expiresIn: SignOptions['expiresIn'] = '5m'
): string {
  const secret = ssoSecret();
  if (!secret) throw new Error('STUDIO_SSO_SECRET is not configured');
  return jwt.sign(
    { ...claims, aud: 'qamuz-studio', iss: 'qamuz.ai' },
    secret,
    { expiresIn }
  );
}

export function verifyStudioSsoToken(token: string): StudioSsoClaims | null {
  const secret = ssoSecret();
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret, {
      audience: 'qamuz-studio',
      issuer: 'qamuz.ai',
    }) as jwt.JwtPayload;
    if (!payload.saasUserId || !payload.email) return null;
    return {
      saasUserId: String(payload.saasUserId),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
      planTier: payload.planTier ? String(payload.planTier) : undefined,
    };
  } catch {
    return null;
  }
}

export function readStudioBearer(request: Request): StudioSsoClaims | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return verifyStudioSsoToken(header.slice(7).trim());
}
