export type ImageStudioProviderMode = 'sub2api' | 'external-relay' | 'external-browser'

export type ImageStudioProtocolProfile =
  | 'openai-image-api'
  | 'openai-responses'
  | 'sub2api-sora-compatible'

export type ImageStudioResolutionPreset = 'standard' | '2k' | '4k'

export interface NormalizedImageResult {
  id: string
  url: string
  source: 'remote-url' | 'data-url'
  mimeType?: string
  revisedPrompt?: string
  filename: string
  originalUrl?: string
  blob?: Blob
}

export interface ImageStudioHistoryItem {
  id: string
  createdAt: string
  providerMode: ImageStudioProviderMode
  profile: ImageStudioProtocolProfile
  model: string
  prompt: string
  aspectRatio: string
  count: number
  referenceImageUrl?: string
  referenceImageUrls?: string[]
  parentHistoryId?: string
  parentTileId?: string
  results: NormalizedImageResult[]
}

export interface ImageStudioWorkspaceTile {
  id: string
  historyId: string
  createdAt: string
  providerMode: ImageStudioProviderMode
  profile: ImageStudioProtocolProfile
  model: string
  prompt: string
  aspectRatio: string
  result: NormalizedImageResult
  parentHistoryId?: string
  parentTileId?: string
}

export interface ImageStudioPreferences {
  providerMode: ImageStudioProviderMode
  profile: ImageStudioProtocolProfile
  model: string
  aspectRatio: string
  resolutionPreset: ImageStudioResolutionPreset
  count: number
  quality: string
  background: string
  format: string
  externalBaseUrl: string
}

export interface Sub2ApiImageStudioRequest {
  model: string
  prompt: string
  api_key_id: number
  count: number
  image_input?: string
}

export interface ExternalImageStudioRequest {
  base_url: string
  api_key: string
  profile: ImageStudioProtocolProfile
  model: string
  prompt: string
  count: number
  image_input?: string
  image_inputs?: string[]
  size?: string
  aspect_ratio?: string
  quality?: string
  background?: string
  format?: string
}

export interface ImageStudioUsageWindow {
  requests: number
  input_tokens: number
  output_tokens: number
  cache_creation_tokens: number
  cache_read_tokens: number
  total_tokens: number
  image_requests: number
  images: number
  image_sizes: Record<string, number>
  cost: number
  actual_cost: number
}

export interface ImageStudioApiKeyUsage {
  today: ImageStudioUsageWindow
  total: ImageStudioUsageWindow
  average_duration_ms: number
  rpm: number
  tpm: number
}

export interface ImageStudioQuotaInfo {
  limit: number
  used: number
  remaining: number
  unit?: string
}

export interface ImageStudioRateLimitInfo {
  window: string
  limit: number
  used: number
  remaining: number
  reset_at?: string
  window_start?: string
}

export interface ImageStudioSubscriptionInfo {
  daily_usage_usd?: number
  weekly_usage_usd?: number
  monthly_usage_usd?: number
  daily_limit_usd?: number
  weekly_limit_usd?: number
  monthly_limit_usd?: number
  expires_at?: string
}

export interface ImageStudioUsageResponse {
  mode: string
  isValid: boolean
  status?: string
  planName?: string
  unit?: string
  remaining?: number
  balance?: number
  expires_at?: string
  days_until_expiry?: number
  quota?: ImageStudioQuotaInfo
  rate_limits?: ImageStudioRateLimitInfo[]
  subscription?: ImageStudioSubscriptionInfo
  usage?: ImageStudioApiKeyUsage
}
