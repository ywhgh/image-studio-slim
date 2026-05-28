import type { ImageStudioProtocolProfile, ImageStudioProviderMode } from '@/types/imageStudio'

const STORAGE_KEY = 'image-studio.api-presets'

export interface ImageStudioApiPreset {
  id: string
  name: string
  providerMode: ImageStudioProviderMode
  profile: ImageStudioProtocolProfile
  currentSiteProfile: ImageStudioProtocolProfile
  currentSiteBaseUrl: string
  externalBaseUrl: string
  apiKey: string
  model: string
  externalRelayLocalUpscale: boolean
  createdAt: string
  updatedAt: string
}

export interface ImageStudioApiPresetInput {
  id?: string
  name: string
  providerMode: ImageStudioProviderMode
  profile: ImageStudioProtocolProfile
  currentSiteProfile: ImageStudioProtocolProfile
  currentSiteBaseUrl: string
  externalBaseUrl: string
  apiKey: string
  model: string
  externalRelayLocalUpscale: boolean
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `api-preset-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function readPresets(): ImageStudioApiPreset[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isApiPreset) : []
  } catch {
    return []
  }
}

function writePresets(presets: ImageStudioApiPreset[]): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    throw new Error('API channel presets could not be saved to local storage.')
  }
}

function isApiPreset(value: unknown): value is ImageStudioApiPreset {
  const item = value as Partial<ImageStudioApiPreset>
  return Boolean(
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.providerMode === 'string' &&
    typeof item.profile === 'string' &&
    typeof item.apiKey === 'string'
  )
}

export function listImageStudioApiPresets(): ImageStudioApiPreset[] {
  return readPresets().sort((left, right) => (
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  ))
}

export function saveImageStudioApiPreset(input: ImageStudioApiPresetInput): ImageStudioApiPreset {
  const presets = readPresets()
  const now = new Date().toISOString()
  const existing = input.id ? presets.find((preset) => preset.id === input.id) : undefined
  const next: ImageStudioApiPreset = {
    id: existing?.id || input.id || createId(),
    name: input.name.trim(),
    providerMode: input.providerMode,
    profile: input.profile,
    currentSiteProfile: input.currentSiteProfile,
    currentSiteBaseUrl: input.currentSiteBaseUrl.trim(),
    externalBaseUrl: input.externalBaseUrl.trim(),
    apiKey: input.apiKey.trim(),
    model: input.model.trim(),
    externalRelayLocalUpscale: input.externalRelayLocalUpscale,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  const merged = [
    next,
    ...presets.filter((preset) => preset.id !== next.id),
  ]
  writePresets(merged)
  return next
}

export function deleteImageStudioApiPreset(id: string): void {
  writePresets(readPresets().filter((preset) => preset.id !== id))
}

export function maskImageStudioApiKey(apiKey: string): string {
  const value = apiKey.trim()
  if (value.length <= 12) {
    return value ? '********' : ''
  }
  return `${value.slice(0, 5)}...${value.slice(-4)}`
}
