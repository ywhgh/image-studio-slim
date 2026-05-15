import { reactive, watch } from 'vue'
import type { ImageStudioPreferences } from '@/types/imageStudio'

const STORAGE_KEY = 'image-studio.preferences'

function getDefaultPreferences(): ImageStudioPreferences {
  return {
    providerMode: 'external-relay',
    profile: 'openai-image-api',
    currentSiteProfile: 'sub2api-sora-compatible',
    currentSiteBaseUrl: '',
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

  if (!preferences.currentSiteProfile) {
    preferences.currentSiteProfile = 'sub2api-sora-compatible'
  }

  if (typeof preferences.currentSiteBaseUrl !== 'string') {
    preferences.currentSiteBaseUrl = ''
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
