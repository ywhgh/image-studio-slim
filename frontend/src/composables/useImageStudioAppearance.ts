import { reactive, watch } from 'vue'

type ImageStudioThemeMode = 'day' | 'night'
type ImageStudioAccentTone = 'blue' | 'emerald' | 'amber' | 'rose'
type ImageStudioTextureMode = 'soft' | 'glass' | 'solid'

interface ImageStudioAppearancePreferences {
  themeMode: ImageStudioThemeMode
  accentTone: ImageStudioAccentTone
  textureMode: ImageStudioTextureMode
  radiusScale: number
  motionEnabled: boolean
}

const STORAGE_KEY = 'image-studio.appearance'

function getDefaultAppearance(): ImageStudioAppearancePreferences {
  return {
    themeMode: 'day',
    accentTone: 'blue',
    textureMode: 'soft',
    radiusScale: 14,
    motionEnabled: true,
  }
}

function clampRadiusScale(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return getDefaultAppearance().radiusScale
  }

  return Math.min(24, Math.max(10, Math.round(value)))
}

function loadAppearance(): Partial<ImageStudioAppearancePreferences> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Partial<ImageStudioAppearancePreferences>
    return {
      themeMode: parsed.themeMode === 'night' ? 'night' : 'day',
      accentTone: ['blue', 'emerald', 'amber', 'rose'].includes(parsed.accentTone || '')
        ? parsed.accentTone as ImageStudioAccentTone
        : getDefaultAppearance().accentTone,
      textureMode: ['soft', 'glass', 'solid'].includes(parsed.textureMode || '')
        ? parsed.textureMode as ImageStudioTextureMode
        : getDefaultAppearance().textureMode,
      radiusScale: clampRadiusScale(parsed.radiusScale),
      motionEnabled: typeof parsed.motionEnabled === 'boolean'
        ? parsed.motionEnabled
        : getDefaultAppearance().motionEnabled,
    }
  } catch {
    return {}
  }
}

export function useImageStudioAppearance() {
  const appearance = reactive<ImageStudioAppearancePreferences>({
    ...getDefaultAppearance(),
    ...loadAppearance(),
  })

  watch(
    appearance,
    (value) => {
      if (typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true }
  )

  function resetAppearance() {
    Object.assign(appearance, getDefaultAppearance())
  }

  return {
    appearance,
    resetAppearance,
  }
}
