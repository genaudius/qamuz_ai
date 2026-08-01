import { env } from '$env/dynamic/private';
import { getOAuthSettings } from '$lib/server/settings-store.js';

export type OAuthProviderName = 'google' | 'apple' | 'twitter' | 'facebook';

type SocialProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export type SocialProviders = {
  google?: SocialProviderConfig;
  apple?: SocialProviderConfig;
  twitter?: SocialProviderConfig;
  facebook?: SocialProviderConfig;
};

function hasCredentials(clientId?: string, clientSecret?: string): boolean {
  return Boolean(clientId && clientSecret);
}

function fromEnv(): SocialProviders {
  const providers: SocialProviders = {};

  if (hasCredentials(env.AUTH_GOOGLE_ID, env.AUTH_GOOGLE_SECRET)) {
    providers.google = {
      clientId: env.AUTH_GOOGLE_ID!,
      clientSecret: env.AUTH_GOOGLE_SECRET!,
    };
  }

  if (hasCredentials(env.AUTH_APPLE_ID, env.AUTH_APPLE_SECRET)) {
    providers.apple = {
      clientId: env.AUTH_APPLE_ID!,
      clientSecret: env.AUTH_APPLE_SECRET!,
    };
  }

  if (hasCredentials(env.AUTH_TWITTER_ID, env.AUTH_TWITTER_SECRET)) {
    providers.twitter = {
      clientId: env.AUTH_TWITTER_ID!,
      clientSecret: env.AUTH_TWITTER_SECRET!,
    };
  }

  if (hasCredentials(env.AUTH_FACEBOOK_ID, env.AUTH_FACEBOOK_SECRET)) {
    providers.facebook = {
      clientId: env.AUTH_FACEBOOK_ID!,
      clientSecret: env.AUTH_FACEBOOK_SECRET!,
    };
  }

  return providers;
}

export async function getSocialProviders(): Promise<SocialProviders> {
  const providers = fromEnv();

  try {
    const oauthSettings = await getOAuthSettings();

    if (
      oauthSettings.googleEnabled &&
      hasCredentials(oauthSettings.googleClientId, oauthSettings.googleClientSecret)
    ) {
      providers.google = {
        clientId: oauthSettings.googleClientId,
        clientSecret: oauthSettings.googleClientSecret,
      };
    }

    if (
      oauthSettings.appleEnabled &&
      hasCredentials(oauthSettings.appleClientId, oauthSettings.appleClientSecret)
    ) {
      providers.apple = {
        clientId: oauthSettings.appleClientId,
        clientSecret: oauthSettings.appleClientSecret,
      };
    }

    if (
      oauthSettings.twitterEnabled &&
      hasCredentials(oauthSettings.twitterClientId, oauthSettings.twitterClientSecret)
    ) {
      providers.twitter = {
        clientId: oauthSettings.twitterClientId,
        clientSecret: oauthSettings.twitterClientSecret,
      };
    }

    if (
      oauthSettings.facebookEnabled &&
      hasCredentials(oauthSettings.facebookClientId, oauthSettings.facebookClientSecret)
    ) {
      providers.facebook = {
        clientId: oauthSettings.facebookClientId,
        clientSecret: oauthSettings.facebookClientSecret,
      };
    }
  } catch (error) {
    console.error('Failed to resolve OAuth settings from database, using env fallback:', error);
  }

  return providers;
}

export async function isOAuthProviderEnabled(provider: OAuthProviderName): Promise<boolean> {
  const providers = await getSocialProviders();
  return Boolean(providers[provider]);
}
