import { getSecuritySettings } from './admin-settings';
import { env } from '$env/dynamic/private';

interface TurnstileCaptchaConfig {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
  source: 'database' | 'environment' | 'none';
}

export async function resolveTurnstileCaptchaConfig(): Promise<TurnstileCaptchaConfig> {
  try {
    const securitySettings = await getSecuritySettings();
    const dbSiteKey = (securitySettings.turnstile_site_key || '').trim();
    const dbSecretKey = (securitySettings.turnstile_secret_key || '').trim();
    const hasDbKeys = dbSiteKey.length > 0 && dbSecretKey.length > 0;

    const hasDbSettings =
      securitySettings.turnstile_enabled !== undefined ||
      dbSiteKey.length > 0 ||
      dbSecretKey.length > 0;

    if (hasDbSettings) {
      const dbEnabled = securitySettings.turnstile_enabled === 'true';
      const enabled = dbEnabled && hasDbKeys;

      return {
        enabled,
        siteKey: enabled ? dbSiteKey : '',
        secretKey: enabled ? dbSecretKey : '',
        source: 'database',
      };
    }

    const envSiteKey = (env.TURNSTILE_SITE_KEY || '').trim();
    const envSecretKey = (env.TURNSTILE_SECRET_KEY || '').trim();
    const hasEnvKeys = envSiteKey.length > 0 && envSecretKey.length > 0;

    if (hasEnvKeys) {
      return {
        enabled: true,
        siteKey: envSiteKey,
        secretKey: envSecretKey,
        source: 'environment',
      };
    }

    return {
      enabled: false,
      siteKey: '',
      secretKey: '',
      source: 'none',
    };
  } catch (error) {
    console.error('Error resolving Turnstile configuration:', error);
    return {
      enabled: false,
      siteKey: '',
      secretKey: '',
      source: 'none',
    };
  }
}

export async function getTurnstileClientConfig(): Promise<{ enabled: boolean; siteKey: string }> {
  const config = await resolveTurnstileCaptchaConfig();
  return {
    enabled: config.enabled,
    siteKey: config.siteKey,
  };
}

/**
 * Check if Turnstile is enabled and configured with proper fallback logic
 * Priority: 1. Database settings, 2. Environment variables (auto-enable if present)
 * @returns Promise<boolean>
 */
export async function isTurnstileEnabled(): Promise<boolean> {
  const config = await resolveTurnstileCaptchaConfig();
  return config.enabled;
}
