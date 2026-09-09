import type { Actions, PageServerLoad } from './$types'
import { fail } from '@sveltejs/kit'
import { getAIModelSettings, adminSettingsService } from '$lib/server/admin-settings'
import { settingsStore } from '$lib/server/settings-store'
import { isDemoModeEnabled, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js'

export const load: PageServerLoad = async () => {
  try {
    const settings = await getAIModelSettings();

    return {
      settings: {
        openrouterApiKey: settings.openrouter_api_key || "",
        replicateApiKey: settings.replicate_api_key || "",
        elevenlabsApiKey: settings.elevenlabs_api_key || "",
        sunoApiKey: settings.suno_api_key || "",
        musicgptApiKey: settings.musicgpt_api_key || "",
        localMusicEnabled: settings.local_music_enabled === 'true',
        localMusicBaseUrl: settings.local_music_base_url || 'http://localhost:42003',
        localImageEnabled: settings.local_image_enabled === 'true',
        localImageBaseUrl: settings.local_image_base_url || 'http://127.0.0.1:7860',
        localVideoEnabled: settings.local_video_enabled === 'true',
        localVideoBaseUrl: settings.local_video_base_url || 'http://127.0.0.1:42005',
        genaudiusModalUrl: settings.genaudius_modal_url || "",
        genaudiusModalToken: settings.genaudius_modal_token || "",
        genaudiusRunpodUrl: settings.genaudius_runpod_url || "",
        genaudiusRunpodToken: settings.genaudius_runpod_token || ""
      },
      isDemoMode: isDemoModeEnabled()
    }
  } catch (error) {
    console.error('Failed to load AI model settings:', error);
    // Fallback to default values
    return {
      settings: {
        openrouterApiKey: "",
        replicateApiKey: "",
        elevenlabsApiKey: "",
        sunoApiKey: "",
        musicgptApiKey: "",
        localMusicEnabled: false,
        localMusicBaseUrl: 'http://localhost:42003',
        localImageEnabled: false,
        localImageBaseUrl: 'http://127.0.0.1:7860',
        localVideoEnabled: false,
        localVideoBaseUrl: 'http://127.0.0.1:42005',
        genaudiusModalUrl: "",
        genaudiusModalToken: "",
        genaudiusRunpodUrl: "",
        genaudiusRunpodToken: ""
      },
      isDemoMode: isDemoModeEnabled()
    }
  }
}

export const actions: Actions = {
  update: async ({ request }) => {
    // Check demo mode - block modifications
    if (isDemoModeEnabled()) {
      return fail(403, {
        error: DEMO_MODE_MESSAGES.ADMIN_SAVE_DISABLED
      });
    }

    const data = await request.formData()

    const openrouterApiKey = data.get('openrouterApiKey')?.toString()
    const replicateApiKey = data.get('replicateApiKey')?.toString()
    const elevenlabsApiKey = data.get('elevenlabsApiKey')?.toString()
    const sunoApiKey = data.get('sunoApiKey')?.toString()
    const musicgptApiKey = data.get('musicgptApiKey')?.toString()
    const localMusicEnabled = data.get('localMusicEnabled') === 'on'
    const localMusicBaseUrl = data.get('localMusicBaseUrl')?.toString().trim() || 'http://localhost:42003'
    const localImageEnabled = data.get('localImageEnabled') === 'on'
    const localImageBaseUrl = data.get('localImageBaseUrl')?.toString().trim() || 'http://127.0.0.1:7860'
    const localVideoEnabled = data.get('localVideoEnabled') === 'on'
    const localVideoBaseUrl = data.get('localVideoBaseUrl')?.toString().trim() || 'http://127.0.0.1:42005'

    const genaudiusModalUrl = data.get('genaudiusModalUrl')?.toString().trim() || ''
    const genaudiusModalToken = data.get('genaudiusModalToken')?.toString().trim() || ''
    const genaudiusRunpodUrl = data.get('genaudiusRunpodUrl')?.toString().trim() || ''
    const genaudiusRunpodToken = data.get('genaudiusRunpodToken')?.toString().trim() || ''

    try {
      const parsedLocalUrl = new URL(localMusicBaseUrl)
      if (!['http:', 'https:'].includes(parsedLocalUrl.protocol)) throw new Error('protocol')
    } catch {
      return fail(400, { error: 'Local music URL must be a valid HTTP or HTTPS URL.' })
    }
    for (const [label, value, required] of [
      ['image', localImageBaseUrl, true],
      ['video', localVideoBaseUrl, localVideoEnabled]
    ] as const) {
      if (!required && !value) continue
      try {
        const parsed = new URL(value)
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol')
      } catch {
        return fail(400, { error: `Local ${label} URL must be a valid HTTP or HTTPS URL.` })
      }
    }

    // Validation for OpenRouter API Key
    if (openrouterApiKey && openrouterApiKey.length < 10) {
      return fail(400, {
        error: 'OpenRouter API key is too short. Please provide a valid API key.'
      })
    }

    // Validation for Replicate API Token
    if (replicateApiKey && !replicateApiKey.startsWith('r8_')) {
      return fail(400, {
        error: 'Invalid Replicate API token format. It should start with "r8_".'
      })
    }

    // Validation for ElevenLabs API Key
    if (elevenlabsApiKey && elevenlabsApiKey.length < 10) {
      return fail(400, {
        error: 'ElevenLabs API key is too short. Please provide a valid API key.'
      })
    }

    // Validation for Suno API Key
    if (sunoApiKey && sunoApiKey.length < 10) {
      return fail(400, {
        error: 'Suno API key is too short. Please provide a valid API key.'
      })
    }

    try {
      // Get current decrypted values to compare and prevent double encryption
      const currentSettings = await getAIModelSettings();

      // Helper function to check if value should be saved
      const shouldSaveValue = (newValue: string | undefined, currentValue: string | undefined) => {
        // Only save if we have a non-empty new value that's different from current
        const trimmedNew = (newValue || '').trim();
        const trimmedCurrent = (currentValue || '').trim();
        return trimmedNew && trimmedNew !== trimmedCurrent;
      };

      // Only save settings that have actually changed to prevent double encryption
      const settingsToSave = [];

      if (shouldSaveValue(openrouterApiKey, currentSettings.openrouter_api_key)) {
        settingsToSave.push({ key: 'openrouter_api_key', value: openrouterApiKey!.trim(), category: 'ai_models', description: 'OpenRouter API key for 32+ text models (encrypted)' });
      }
      if (shouldSaveValue(replicateApiKey, currentSettings.replicate_api_key)) {
        settingsToSave.push({ key: 'replicate_api_key', value: replicateApiKey!.trim(), category: 'ai_models', description: 'Replicate API token for image/video generation models (encrypted)' });
      }
      if (shouldSaveValue(elevenlabsApiKey, currentSettings.elevenlabs_api_key)) {
        settingsToSave.push({ key: 'elevenlabs_api_key', value: elevenlabsApiKey!.trim(), category: 'ai_models', description: 'ElevenLabs API key for text-to-speech models (encrypted)' });
      }
      if (shouldSaveValue(sunoApiKey, currentSettings.suno_api_key)) {
        settingsToSave.push({ key: 'suno_api_key', value: sunoApiKey!.trim(), category: 'ai_models', description: 'Suno API key for music generation models (encrypted)' });
      }
      if (shouldSaveValue(musicgptApiKey, currentSettings.musicgpt_api_key)) {
        settingsToSave.push({ key: 'musicgpt_api_key', value: musicgptApiKey!.trim(), category: 'ai_models', description: 'MusicGPT API key for music generation models (encrypted)' });
      }
      if (String(localMusicEnabled) !== currentSettings.local_music_enabled) {
        settingsToSave.push({ key: 'local_music_enabled', value: String(localMusicEnabled), category: 'ai_models', description: 'Use the local music provider exclusively' });
      }
      if (localMusicBaseUrl !== currentSettings.local_music_base_url) {
        settingsToSave.push({ key: 'local_music_base_url', value: localMusicBaseUrl, category: 'ai_models', description: 'Launcher-discovered local music API URL' });
      }
      if (String(localImageEnabled) !== currentSettings.local_image_enabled) {
        settingsToSave.push({ key: 'local_image_enabled', value: String(localImageEnabled), category: 'ai_models', description: 'Use the local image provider exclusively' });
      }
      if (localImageBaseUrl !== currentSettings.local_image_base_url) {
        settingsToSave.push({ key: 'local_image_base_url', value: localImageBaseUrl, category: 'ai_models', description: 'Launcher-discovered local image API URL' });
      }
      if (String(localVideoEnabled) !== currentSettings.local_video_enabled) {
        settingsToSave.push({ key: 'local_video_enabled', value: String(localVideoEnabled), category: 'ai_models', description: 'Use the local video provider exclusively' });
      }
      if (localVideoBaseUrl && localVideoBaseUrl !== currentSettings.local_video_base_url) {
        settingsToSave.push({ key: 'local_video_base_url', value: localVideoBaseUrl, category: 'ai_models', description: 'Launcher-discovered local video API URL' });
      }
      if (genaudiusModalUrl !== currentSettings.genaudius_modal_url) {
        settingsToSave.push({ key: 'genaudius_modal_url', value: genaudiusModalUrl, category: 'ai_models', description: 'Genaudius modal URL' });
      }
      if (genaudiusModalToken !== currentSettings.genaudius_modal_token) {
        settingsToSave.push({ key: 'genaudius_modal_token', value: genaudiusModalToken, category: 'ai_models', description: 'Genaudius modal token' });
      }
      if (genaudiusRunpodUrl !== currentSettings.genaudius_runpod_url) {
        settingsToSave.push({ key: 'genaudius_runpod_url', value: genaudiusRunpodUrl, category: 'ai_models', description: 'Genaudius runpod URL' });
      }
      if (genaudiusRunpodToken !== currentSettings.genaudius_runpod_token) {
        settingsToSave.push({ key: 'genaudius_runpod_token', value: genaudiusRunpodToken, category: 'ai_models', description: 'Genaudius runpod token' });
      }

      // Only save if there are actual changes
      if (settingsToSave.length > 0) {
        await adminSettingsService.setSettings(settingsToSave);
      }

      // Clear the settings cache to force refresh on next request
      settingsStore.clearCache();

      console.log('AI model settings saved successfully');

      // Get updated settings to return current values (decrypted)
      const updatedSettings = await getAIModelSettings();

      return {
        success: true
      }
    } catch (error) {
      console.error('Error saving AI model settings:', error)
      return fail(500, {
        error: 'Failed to save AI model settings. Please try again.'
      })
    }
  }
}
