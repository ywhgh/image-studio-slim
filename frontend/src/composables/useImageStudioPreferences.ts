import { reactive, watch } from 'vue'
import type { ImageStudioPreferences } from '@/types/imageStudio'

const STORAGE_KEY = 'image-studio.preferences'

function getDefaultPreferences(): ImageStudioPreferences {
  return {
    providerMode: 'external-relay',
    profile: 'openai-image-api',
    model: 'gpt-image-1',
    aspectRatio: 'default',
    resolutionPreset: 'standard',
    count: 1,
    quality: 'high',
    background: 'auto',
    format: 'png',
    externalBaseUrl: 'https://api.openai.com/v1',
  }
}

function loadPreferences(): Partial<ImageStudioPreferences> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    return JSON.parse(raw) as Partial<ImageStudioPreferences>
  } catch {
    return {}
  }
}

export function useImageStudioPreferences() {
  const preferences = reactive<ImageStudioPreferences>({
    ...getDefaultPreferences(),
    ...loadPreferences(),
  })

  if (preferences.providerMode === 'sub2api') {
    // sub2api mode is not supported in slim build; downgrade saved preferences
    preferences.providerMode = 'external-relay'
    preferences.profile = 'openai-image-api'
    preferences.model = 'gpt-image-1'
  }

  if (!preferences.externalBaseUrl.trim()) {
    preferences.externalBaseUrl = 'https://api.openai.com/v1'
  }

  watch(
    preferences,
    (value) => {
      if (typeof window === 'undefined') {
        return
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true }
  )

  return preferences
}
