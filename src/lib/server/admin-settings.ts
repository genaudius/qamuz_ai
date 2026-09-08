import { building } from '$app/environment';
import { db } from './db';
import { adminSettings, adminFiles } from './db/schema';
import { eq } from 'drizzle-orm';
import { createCipheriv, createDecipheriv, randomBytes, hkdfSync } from 'crypto';
import { env } from '$env/dynamic/private';

/**
 * Encryption Key Derivation
 *
 * The encryption key for admin settings is derived using HKDF
 * (HMAC-based Key Derivation Function) from:
 * 1) BETTER_AUTH_SECRET (preferred)
 * 2) AUTH_SECRET (fallback)
 *
 * This means:
 *
 * - No additional environment variable needed (simpler installation)
 * - Each installation has a unique encryption key (based on its auth secret)
 * - The derived key is cryptographically different from the raw secret
 * - Deterministic: same input secret always produces the same derived key
 *
 * This approach is used by many applications to derive multiple purpose-specific
 * keys from a single master secret.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Context string for HKDF - makes the derived key unique to this purpose
const HKDF_CONTEXT = 'qamuz_ai-admin-settings-encryption-v1';

// Development-only fallback (when AUTH_SECRET is not set in dev)
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-for-local-development-only';

// Legacy fallback key from old versions (first 32 chars of 'your-32-character-secret-key-here')
// Used for backwards-compatible migration of existing encrypted settings
const LEGACY_FALLBACK_KEY = 'your-32-character-secret-key-her';

// Cache derived keys to avoid repeated derivation work
const derivedKeyCache = new Map<string, Buffer>();

interface SecretSet {
  primary: string | null;
  fallback: string | null;
}

function getSecretSet(): SecretSet {
  const betterAuthSecret = env.BETTER_AUTH_SECRET?.trim() || null;
  const authSecret = env.AUTH_SECRET?.trim() || null;

  if (betterAuthSecret) {
    return {
      primary: betterAuthSecret,
      fallback: authSecret && authSecret !== betterAuthSecret ? authSecret : null,
    };
  }

  return {
    primary: authSecret,
    fallback: null,
  };
}

/**
 * Derives a 32-byte encryption key from an auth secret using HKDF.
 * The derived key is cryptographically different from the input secret but deterministic.
 */
function deriveEncryptionKey(secret: string): Buffer {
  // Use HKDF to derive a 32-byte key for AES-256
  // - Algorithm: SHA-256
  // - Salt: Empty (we use the context/info parameter instead)
  // - Info/Context: Unique string identifying this key's purpose
  // - Key length: 32 bytes (256 bits for AES-256)
  return Buffer.from(
    hkdfSync(
      'sha256',
      secret,
      '', // salt (empty - source auth secret provides sufficient entropy)
      HKDF_CONTEXT,
      32 // 32 bytes = 256 bits for AES-256
    )
  );
}

function getDerivedKey(secret: string): Buffer {
  const cached = derivedKeyCache.get(secret);

  if (cached) {
    return cached;
  }

  const key = deriveEncryptionKey(secret);
  derivedKeyCache.set(secret, key);
  return key;
}

/**
 * Validates that at least one auth secret is configured.
 * BETTER_AUTH_SECRET is preferred; AUTH_SECRET is accepted as fallback.
 */
function validateAuthSecret(): void {
  const { primary, fallback } = getSecretSet();
  // Preview/build analysis often runs with NODE_ENV=production but without
  // Production-only env vars. Fail hard only at runtime outside of builds.
  const mustHaveSecret = IS_PRODUCTION && !building;

  if (!primary) {
    if (mustHaveSecret) {
      throw new Error(
        'CRITICAL: BETTER_AUTH_SECRET or AUTH_SECRET must be set. ' +
        'This is required for authentication and admin settings encryption. ' +
        'Generate a secure random string: openssl rand -base64 32'
      );
    }
    console.warn(
      '⚠️  WARNING: BETTER_AUTH_SECRET/AUTH_SECRET not set. Using insecure development fallback. ' +
      'Set BETTER_AUTH_SECRET before deploying to production.'
    );
    return;
  }

  if (primary.length < 32) {
    if (mustHaveSecret) {
      throw new Error(
        'CRITICAL: BETTER_AUTH_SECRET/AUTH_SECRET should be at least 32 characters for security. ' +
        `Current length: ${primary.length}. Generate a longer secret: openssl rand -base64 32`
      );
    }
    console.warn(
      `⚠️  WARNING: Auth secret is only ${primary.length} characters. ` +
      'Use at least 32 characters for proper security.'
    );
  }

  if (fallback) {
    console.info(
      'ℹ️  Admin settings encryption key migration active: using BETTER_AUTH_SECRET as primary and AUTH_SECRET as fallback for decryption.'
    );
  }
}

// Validate on module load
validateAuthSecret();

/**
 * Gets the primary 32-byte encryption key for AES-256.
 * Derives from BETTER_AUTH_SECRET (preferred) or AUTH_SECRET (fallback).
 */
function getKey(): Buffer {
  const { primary } = getSecretSet();

  // Use configured secret or fallback for development
  const secret = primary ?? DEV_FALLBACK_SECRET;

  return getDerivedKey(secret);
}

/**
 * Gets a fallback key used only for migration/decryption compatibility.
 * Currently this is AUTH_SECRET when BETTER_AUTH_SECRET is primary.
 */
function getFallbackKey(): Buffer | null {
  const { fallback } = getSecretSet();

  if (!fallback) {
    return null;
  }

  return getDerivedKey(fallback);
}

/**
 * Gets the legacy fallback key for backwards compatibility.
 * Used to decrypt settings that were encrypted with the old hardcoded key.
 */
function getLegacyKey(): Buffer {
  return Buffer.from(LEGACY_FALLBACK_KEY);
}

// Encrypt sensitive values
function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV to encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypts a value using a specific key.
 * Low-level function used by decrypt() for key migration support.
 */
function decryptWithKey(encryptedText: string, key: Buffer): string {
  const parts = encryptedText.split(':');

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

interface DecryptResult {
  value: string;
  needsReEncryption: boolean;
}

/**
 * Decrypts sensitive values with automatic key migration support.
 * Tries primary key first, then fallback key, then legacy key.
 * Returns whether re-encryption is needed so caller can trigger it.
 */
function decrypt(encryptedText: string, settingKey?: string): DecryptResult {
  // Try primary key first
  try {
    return { value: decryptWithKey(encryptedText, getKey()), needsReEncryption: false };
  } catch {
    // Primary key failed, try fallback key
  }

  const fallbackKey = getFallbackKey();

  if (fallbackKey) {
    try {
      const decrypted = decryptWithKey(encryptedText, fallbackKey);
      const keyInfo = settingKey ? ` (${settingKey})` : '';
      console.log(`🔄 Decrypted with fallback key${keyInfo} - queuing for re-encryption`);
      return { value: decrypted, needsReEncryption: true };
    } catch {
      // Fallback key failed, try legacy key
    }
  }

  // Try legacy hardcoded key for backwards compatibility
  try {
    const decrypted = decryptWithKey(encryptedText, getLegacyKey());
    const keyInfo = settingKey ? ` (${settingKey})` : '';
    console.log(`🔄 Decrypted with legacy key${keyInfo} - queuing for re-encryption`);
    return { value: decrypted, needsReEncryption: true };
  } catch {
    throw new Error('Decryption failed with both new and legacy keys');
  }
}

/**
 * Re-encrypts a setting with the new key and saves it to the database.
 * Called automatically when a legacy-encrypted setting is read.
 */
async function reEncryptSetting(key: string, decryptedValue: string): Promise<void> {
  try {
    const newEncrypted = encrypt(decryptedValue);
    await db
      .update(adminSettings)
      .set({ value: newEncrypted, updatedAt: new Date() })
      .where(eq(adminSettings.key, key));
    console.log(`✅ Re-encrypted setting: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to re-encrypt setting ${key}:`, error);
  }
}

// List of sensitive keys that should be encrypted
const SENSITIVE_KEYS = [
  'stripe_secret_key',
  'stripe_webhook_secret',
  'google_client_secret',
  'apple_client_secret',
  'twitter_client_secret',
  'facebook_client_secret',
  'openrouter_api_key',
  'replicate_api_key',
  'elevenlabs_api_key',
  'r2_account_id',
  'r2_access_key_id',
  'r2_secret_access_key',
  'turnstile_secret_key',
  'smtp_pass'
];

function shouldEncrypt(key: string): boolean {
  return SENSITIVE_KEYS.some(sensitiveKey => key.includes(sensitiveKey));
}

export interface AdminSetting {
  id: string;
  key: string;
  value: string | null;
  category: string;
  encrypted: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  path: string;
  url: string | null;
  storageLocation: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AdminSettingsService {

  // Get a single setting by key
  async getSetting(key: string): Promise<string | null> {
    const [setting] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, key))
      .limit(1);

    if (!setting || !setting.value) {
      return null;
    }

    if (setting.encrypted) {
      try {
        const { value, needsReEncryption } = decrypt(setting.value, key);
        if (needsReEncryption) {
          // Re-encrypt in background (don't await to avoid blocking)
          reEncryptSetting(key, value);
        }
        return value;
      } catch (error) {
        console.error(`Failed to decrypt setting ${key}:`, error);
        return null;
      }
    }

    return setting.value;
  }

  // Get multiple settings by category
  async getSettingsByCategory(category: string): Promise<Record<string, string>> {
    const settings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.category, category));

    const result: Record<string, string> = {};

    for (const setting of settings) {
      if (setting.value) {
        if (setting.encrypted) {
          try {
            const { value, needsReEncryption } = decrypt(setting.value, setting.key);
            result[setting.key] = value;
            if (needsReEncryption) {
              // Re-encrypt in background (don't await to avoid blocking)
              reEncryptSetting(setting.key, value);
            }
          } catch (error) {
            console.error(`Failed to decrypt setting ${setting.key}:`, error);
          }
        } else {
          result[setting.key] = setting.value;
        }
      }
    }

    return result;
  }

  // Set a single setting
  async setSetting(key: string, value: string, category: string, description?: string): Promise<void> {
    const isEncrypted = shouldEncrypt(key);
    const finalValue = isEncrypted ? encrypt(value) : value;

    // Check if setting exists
    const [existing] = await db
      .select({ id: adminSettings.id })
      .from(adminSettings)
      .where(eq(adminSettings.key, key))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(adminSettings)
        .set({
          value: finalValue,
          category,
          encrypted: isEncrypted,
          description,
          updatedAt: new Date(),
        })
        .where(eq(adminSettings.key, key));
    } else {
      // Create new
      await db
        .insert(adminSettings)
        .values({
          key,
          value: finalValue,
          category,
          encrypted: isEncrypted,
          description,
        });
    }
  }

  // Set multiple settings atomically
  async setSettings(settings: Array<{ key: string; value: string; category: string; description?: string }>): Promise<void> {
    // Filter out empty values to avoid storing empty strings in database
    const validSettings = settings.filter(setting => {
      return setting.value && setting.value.trim() !== '';
    });

    // For simplicity, we'll do individual updates
    // In production, you might want to use a transaction
    for (const setting of validSettings) {
      await this.setSetting(setting.key, setting.value, setting.category, setting.description);
    }
  }

  // Delete a setting
  async deleteSetting(key: string): Promise<void> {
    await db
      .delete(adminSettings)
      .where(eq(adminSettings.key, key));
  }

  // Get all settings (for export/backup)
  async getAllSettings(): Promise<AdminSetting[]> {
    const settings = await db
      .select()
      .from(adminSettings);

    // Decrypt sensitive values for internal use
    return settings.map(setting => {
      if (setting.encrypted && setting.value) {
        const { value, needsReEncryption } = decrypt(setting.value, setting.key);
        if (needsReEncryption) {
          // Re-encrypt in background
          reEncryptSetting(setting.key, value);
        }
        return { ...setting, value };
      }
      return setting;
    });
  }

  // File management methods
  async saveFile(file: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    category: string;
    path: string;
    url?: string;
    storageLocation?: string;
  }): Promise<AdminFile> {
    const [savedFile] = await db
      .insert(adminFiles)
      .values({
        ...file,
        storageLocation: file.storageLocation || 'local'
      })
      .returning();

    return savedFile;
  }

  async getFile(category: string): Promise<AdminFile | null> {
    const [file] = await db
      .select()
      .from(adminFiles)
      .where(eq(adminFiles.category, category))
      .limit(1);

    return file || null;
  }

  async deleteFile(id: string): Promise<void> {
    await db
      .delete(adminFiles)
      .where(eq(adminFiles.id, id));
  }
}

// Export a singleton instance
export const adminSettingsService = new AdminSettingsService();

// Helper functions for common settings groups
export async function getGeneralSettings() {
  return await adminSettingsService.getSettingsByCategory('general');
}

export async function getBrandingSettings() {
  return await adminSettingsService.getSettingsByCategory('branding');
}

export async function getPaymentSettings() {
  return await adminSettingsService.getSettingsByCategory('payment');
}

export async function getOAuthSettings() {
  return await adminSettingsService.getSettingsByCategory('oauth');
}

export async function getAIModelSettings() {
  return await adminSettingsService.getSettingsByCategory('ai_models');
}

export async function getMusicApiSettings() {
  return await adminSettingsService.getSettingsByCategory('music_apis');
}

export async function getCloudStorageSettings() {
  // Use cached settings instead of direct DB query to avoid race conditions
  // on serverless platforms (Vercel Lambda) during cold starts
  const { getCloudStorageSettingsFromCache } = await import('./settings-store.js');
  const cached = await getCloudStorageSettingsFromCache();

  // Transform camelCase cache to snake_case for backwards compatibility
  // This prevents re-encryption of API keys on every save in the admin dashboard
  return {
    r2_account_id: cached.r2AccountId,
    r2_access_key_id: cached.r2AccessKeyId,
    r2_secret_access_key: cached.r2SecretAccessKey,
    r2_bucket_name: cached.r2BucketName,
    r2_branding_bucket_name: cached.r2BrandingBucketName,
    r2_branding_public_url: cached.r2BrandingPublicUrl
  };
}

export async function getSecuritySettings() {
  return await adminSettingsService.getSettingsByCategory('security');
}

export async function getMailingSettings() {
  return await adminSettingsService.getSettingsByCategory('mailing');
}
