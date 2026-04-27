import { apiClient } from './client'
import type {
  ExternalImageStudioRequest,
  ImageStudioApiKeyUsage,
  ImageStudioQuotaInfo,
  ImageStudioRateLimitInfo,
  ImageStudioResolutionPreset,
  ImageStudioSubscriptionInfo,
  ImageStudioUsageResponse,
  ImageStudioUsageWindow,
  NormalizedImageResult,
} from '@/types/imageStudio'

interface RelayImageStudioResult {
  url: string
  source: 'remote-url' | 'data-url'
  mime_type?: string
  revised_prompt?: string
}

interface RelayImageStudioResponse {
  profile: string
  results: RelayImageStudioResult[]
}

export class BrowserDirectGenerationError extends Error {
  code: string
  fallbackSuggested: boolean

  constructor(message: string, fallbackSuggested: boolean) {
    super(message)
    this.name = 'BrowserDirectGenerationError'
    this.code = 'BROWSER_DIRECT_FAILED'
    this.fallbackSuggested = fallbackSuggested
  }
}

function createImageStudioId(prefix: string, index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}-${index}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}-${index}`
}

function mimeTypeForFormat(formatHint?: string): string {
  switch ((formatHint || '').trim().toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

function extensionForMimeType(mimeType?: string): string {
  switch ((mimeType || '').trim().toLowerCase()) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    default:
      return 'png'
  }
}

function parseMimeTypeFromDataUrl(dataUrl: string): string | undefined {
  if (!dataUrl.startsWith('data:')) {
    return undefined
  }
  return dataUrl.slice(5).split(';', 1)[0] || undefined
}

function buildDataUrl(base64Payload: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64Payload.trim()}`
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

function getObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeUsageSizeCounts(value: unknown): Record<string, number> {
  const root = getObject(value)
  if (!root) {
    return {}
  }

  return Object.entries(root).reduce<Record<string, number>>((acc, [key, item]) => {
    const count = getNumber(item)
    if (!key.trim() || count == null || count <= 0) {
      return acc
    }
    acc[key.trim()] = count
    return acc
  }, {})
}

function normalizeUsageWindow(value: unknown): ImageStudioUsageWindow {
  const root = getObject(value)
  return {
    requests: getNumber(root?.requests) ?? 0,
    input_tokens: getNumber(root?.input_tokens) ?? 0,
    output_tokens: getNumber(root?.output_tokens) ?? 0,
    cache_creation_tokens: getNumber(root?.cache_creation_tokens) ?? 0,
    cache_read_tokens: getNumber(root?.cache_read_tokens) ?? 0,
    total_tokens: getNumber(root?.total_tokens) ?? 0,
    image_requests: getNumber(root?.image_requests) ?? 0,
    images: getNumber(root?.images) ?? 0,
    image_sizes: normalizeUsageSizeCounts(root?.image_sizes),
    cost: getNumber(root?.cost) ?? 0,
    actual_cost: getNumber(root?.actual_cost) ?? 0,
  }
}

function normalizeQuotaInfo(value: unknown): ImageStudioQuotaInfo | undefined {
  const root = getObject(value)
  if (!root) {
    return undefined
  }

  return {
    limit: getNumber(root.limit) ?? 0,
    used: getNumber(root.used) ?? 0,
    remaining: getNumber(root.remaining) ?? 0,
    unit: getString(root.unit) || undefined,
  }
}

function normalizeRateLimits(value: unknown): ImageStudioRateLimitInfo[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const items = value
    .map((item) => getObject(item))
    .filter((item): item is Record<string, unknown> => !!item)
    .map((item) => ({
      window: getString(item.window),
      limit: getNumber(item.limit) ?? 0,
      used: getNumber(item.used) ?? 0,
      remaining: getNumber(item.remaining) ?? 0,
      reset_at: getString(item.reset_at) || undefined,
      window_start: getString(item.window_start) || undefined,
    }))
    .filter((item) => !!item.window)

  return items.length ? items : undefined
}

function normalizeSubscriptionInfo(value: unknown): ImageStudioSubscriptionInfo | undefined {
  const root = getObject(value)
  if (!root) {
    return undefined
  }

  return {
    daily_usage_usd: getNumber(root.daily_usage_usd),
    weekly_usage_usd: getNumber(root.weekly_usage_usd),
    monthly_usage_usd: getNumber(root.monthly_usage_usd),
    daily_limit_usd: getNumber(root.daily_limit_usd),
    weekly_limit_usd: getNumber(root.weekly_limit_usd),
    monthly_limit_usd: getNumber(root.monthly_limit_usd),
    expires_at: getString(root.expires_at) || undefined,
  }
}

function normalizeApiKeyUsage(value: unknown): ImageStudioApiKeyUsage | undefined {
  const root = getObject(value)
  if (!root) {
    return undefined
  }

  return {
    today: normalizeUsageWindow(root.today),
    total: normalizeUsageWindow(root.total),
    average_duration_ms: getNumber(root.average_duration_ms) ?? 0,
    rpm: getNumber(root.rpm) ?? 0,
    tpm: getNumber(root.tpm) ?? 0,
  }
}

function normalizeUsageResponse(payload: unknown): ImageStudioUsageResponse {
  const root = getObject(payload)
  if (!root) {
    return {
      mode: 'unknown',
      isValid: false,
    }
  }

  return {
    mode: getString(root.mode) || 'unknown',
    isValid: Boolean(root.isValid),
    status: getString(root.status) || undefined,
    planName: getString(root.planName) || undefined,
    unit: getString(root.unit) || undefined,
    remaining: getNumber(root.remaining),
    balance: getNumber(root.balance),
    expires_at: getString(root.expires_at) || undefined,
    days_until_expiry: getNumber(root.days_until_expiry),
    quota: normalizeQuotaInfo(root.quota),
    rate_limits: normalizeRateLimits(root.rate_limits),
    subscription: normalizeSubscriptionInfo(root.subscription),
    usage: normalizeApiKeyUsage(root.usage),
  }
}

function parseAspectRatio(aspectRatio?: string): [number, number] | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(aspectRatio || '')
  if (!match) {
    return null
  }

  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  return [width, height]
}

function roundToEven(value: number): number {
  const rounded = Math.max(2, Math.round(value))
  return rounded % 2 === 0 ? rounded : rounded + 1
}

function resolvePresetLongEdge(preset: ImageStudioResolutionPreset): number | null {
  switch (preset) {
    case '2k':
      return 2048
    case '4k':
      return 4096
    default:
      return null
  }
}

function resolvePresetSize(aspectRatio?: string, preset: ImageStudioResolutionPreset = 'standard'): string {
  const longEdge = resolvePresetLongEdge(preset)
  if (!longEdge) {
    return ''
  }

  const parsedAspectRatio = parseAspectRatio(aspectRatio)
  if (!parsedAspectRatio) {
    return ''
  }

  const [widthRatio, heightRatio] = parsedAspectRatio
  if (widthRatio === heightRatio) {
    return `${longEdge}x${longEdge}`
  }

  if (widthRatio > heightRatio) {
    const height = roundToEven((longEdge * heightRatio) / widthRatio)
    return `${longEdge}x${height}`
  }

  const width = roundToEven((longEdge * widthRatio) / heightRatio)
  return `${width}x${longEdge}`
}

function resolveSizeFromAspect(
  aspectRatio?: string,
  explicitSize?: string,
  resolutionPreset: ImageStudioResolutionPreset = 'standard'
): string {
  if (explicitSize?.trim()) {
    return explicitSize.trim()
  }

  const presetSize = resolvePresetSize(aspectRatio, resolutionPreset)
  if (presetSize) {
    return presetSize
  }

  switch ((aspectRatio || '').trim()) {
    case '16:9':
    case '21:9':
    case '4:3':
    case '3:2':
    case '5:4':
      return '1536x1024'
    case '9:16':
    case '3:4':
    case '2:3':
    case '4:5':
      return '1024x1536'
    case '1:1':
      return '1024x1024'
    default:
      return ''
  }
}

function finalizeResults(results: Array<Omit<NormalizedImageResult, 'id' | 'filename'>>): NormalizedImageResult[] {
  // Stable per-batch stamp so all images in the same generation share a prefix,
  // but no two batches collide. Format: yyyymmdd-hhmmss-random.
  const now = new Date()
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '')
  const hhmmss = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const rand = Math.random().toString(36).slice(2, 7)
  const stamp = `${yyyymmdd}-${hhmmss}-${rand}`
  return results.map((result, index) => {
    const mimeType = result.mimeType || parseMimeTypeFromDataUrl(result.url)
    return {
      ...result,
      id: createImageStudioId('image-studio', index + 1),
      filename: `image-studio-${stamp}-${index + 1}.${extensionForMimeType(mimeType)}`,
    }
  })
}

function normalizeImageStudioResults(payload: unknown, formatHint?: string): NormalizedImageResult[] {
  const relayResponse = getObject(payload)
  if (relayResponse && Array.isArray(relayResponse.results)) {
    return finalizeResults(
      relayResponse.results
        .map((item) => getObject(item))
        .filter((item): item is Record<string, unknown> => !!item)
        .map((item) => ({
          url: getString(item.url),
          originalUrl: getString(item.url),
          source: (getString(item.source) || 'remote-url') as 'remote-url' | 'data-url',
          mimeType: getString(item.mime_type),
          revisedPrompt: getString(item.revised_prompt),
        }))
        .filter((item) => !!item.url)
    )
  }

  const root = getObject(payload)
  if (!root) {
    return []
  }

  const defaultMime = mimeTypeForFormat(formatHint)
  const results: Array<Omit<NormalizedImageResult, 'id' | 'filename'>> = []
  const seen = new Set<string>()

  const addResult = (
    url: string,
    source: 'remote-url' | 'data-url',
    mimeType?: string,
    revisedPrompt?: string,
  ) => {
    const normalizedUrl = url.trim()
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      return
    }
    seen.add(normalizedUrl)
    results.push({
      url: normalizedUrl,
      originalUrl: normalizedUrl,
      source,
      mimeType,
      revisedPrompt,
    })
  }

  const mediaUrl = getString(root.media_url)
  if (mediaUrl) {
    addResult(mediaUrl, 'remote-url')
  }

  if (Array.isArray(root.media_urls)) {
    root.media_urls.forEach((item) => {
      const mediaItem = getString(item)
      if (mediaItem) {
        addResult(mediaItem, 'remote-url')
      }
    })
  }

  if (Array.isArray(root.data)) {
    root.data.forEach((item) => {
      const record = getObject(item)
      if (!record) return

      const revisedPrompt = getString(record.revised_prompt) || getString(record.revisedPrompt)
      const resultUrl = getString(record.url)
      if (resultUrl) {
        addResult(resultUrl, 'remote-url', getString(record.mime_type), revisedPrompt)
      }

      const b64 = getString(record.b64_json)
      if (b64) {
        const mimeType = getString(record.mime_type) || defaultMime
        addResult(buildDataUrl(b64, mimeType), 'data-url', mimeType, revisedPrompt)
      }
    })
  }

  if (Array.isArray(root.output)) {
    root.output.forEach((item) => {
      const record = getObject(item)
      if (!record) return

      const revisedPrompt = getString(record.revised_prompt) || getString(record.revisedPrompt)
      const resultUrl = getString(record.url) || getString(record.image_url)
      if (resultUrl) {
        addResult(resultUrl, 'remote-url', getString(record.mime_type), revisedPrompt)
      }

      const b64 = getString(record.result) || getString(record.b64_json)
      if (b64) {
        const mimeType = getString(record.mime_type) || defaultMime
        addResult(buildDataUrl(b64, mimeType), 'data-url', mimeType, revisedPrompt)
      }

      if (!Array.isArray(record.content)) {
        return
      }

      record.content.forEach((contentItem) => {
        const contentRecord = getObject(contentItem)
        if (!contentRecord) return

        const contentUrl = getString(contentRecord.url) || getString(contentRecord.image_url)
        if (contentUrl) {
          addResult(contentUrl, 'remote-url', getString(contentRecord.mime_type), revisedPrompt)
        }

        const contentB64 = getString(contentRecord.result) || getString(contentRecord.b64_json)
        if (contentB64) {
          const mimeType = getString(contentRecord.mime_type) || defaultMime
          addResult(buildDataUrl(contentB64, mimeType), 'data-url', mimeType, revisedPrompt)
        }
      })
    })
  }

  const topLevelUrl = getString(root.url)
  if (topLevelUrl) {
    addResult(topLevelUrl, 'remote-url', getString(root.mime_type))
  }

  const topLevelB64 = getString(root.result) || getString(root.b64_json)
  if (topLevelB64) {
    const mimeType = getString(root.mime_type) || defaultMime
    addResult(buildDataUrl(topLevelB64, mimeType), 'data-url', mimeType)
  }

  return finalizeResults(results)
}

function joinEndpoint(baseURL: string, endpointPath: string): string {
  const url = new URL(baseURL)
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/${endpointPath.replace(/^\/+/, '')}`
  return url.toString()
}

function collectImageInputs(request: ExternalImageStudioRequest): string[] {
  if (request.image_inputs && request.image_inputs.length) {
    return request.image_inputs.filter((s) => typeof s === 'string' && s.length > 0)
  }
  return request.image_input ? [request.image_input] : []
}

function mapExternalPayload(request: ExternalImageStudioRequest) {
  const count = Math.max(1, Math.min(10, request.count || 1))
  const size = resolveSizeFromAspect(request.aspect_ratio, request.size)
  const imageInputs = collectImageInputs(request)

  if (request.profile === 'openai-image-api') {
    if (imageInputs.length === 0) {
      return {
        url: joinEndpoint(request.base_url, '/images/generations'),
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          n: count,
          ...(size ? { size } : {}),
          ...(request.quality ? { quality: request.quality } : {}),
          ...(request.background ? { background: request.background } : {}),
          ...(request.format ? { output_format: request.format } : {}),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    }

    const formData = new FormData()
    formData.set('model', request.model)
    formData.set('prompt', request.prompt)
    formData.set('n', String(count))
    if (size) {
      formData.set('size', size)
    }
    if (request.quality) {
      formData.set('quality', request.quality)
    }
    if (request.background) {
      formData.set('background', request.background)
    }
    if (request.format) {
      formData.set('output_format', request.format)
    }

    imageInputs.forEach((dataUrl, index) => {
      const blob = dataUrlToBlob(dataUrl)
      formData.append(
        'image[]',
        new File([blob], `reference-${index + 1}.${extensionForMimeType(blob.type)}`, { type: blob.type })
      )
    })

    return {
      url: joinEndpoint(request.base_url, '/images/edits'),
      body: formData,
      headers: {},
    }
  }

  if (request.profile === 'openai-responses') {
    const tool: Record<string, unknown> = {
      type: 'image_generation',
      ...(size ? { size } : {}),
      ...(request.quality ? { quality: request.quality } : {}),
      ...(request.background ? { background: request.background } : {}),
      ...(request.format ? { format: request.format } : {}),
      ...(count > 1 ? { n: count } : {}),
    }

    return {
      url: joinEndpoint(request.base_url, '/responses'),
      body: JSON.stringify({
        model: request.model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: request.prompt },
              ...imageInputs.map((dataUrl) => ({ type: 'input_image', image_url: dataUrl })),
            ],
          },
        ],
        tools: [tool],
        stream: false,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  }

  return {
    url: joinEndpoint(request.base_url, '/chat/completions'),
    body: JSON.stringify({
      model: request.model,
      messages: [{ role: 'user', content: request.prompt }],
      stream: false,
      ...(imageInputs.length ? { image_input: imageInputs[0], image_inputs: imageInputs } : {}),
      ...(count > 1 ? { n_variants: count } : {}),
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const metadata = parts[0] || 'data:image/png;base64'
  const mimeType = metadata.split(':')[1]?.split(';')[0] || 'image/png'
  const binary = atob(parts[1] || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

function parseFetchErrorBody(payload: unknown): string {
  const root = getObject(payload)
  if (!root) {
    return ''
  }
  const nestedError = getObject(root.error)
  return (
    getString(nestedError?.message) ||
    getString(root.message) ||
    getString(root.detail) ||
    getString(root.error)
  )
}

export interface ImageStudioGenerationOptions {
  signal?: AbortSignal
}

export async function generateImageWithExternalRelay(
  request: ExternalImageStudioRequest,
  options: ImageStudioGenerationOptions = {}
): Promise<NormalizedImageResult[]> {
  const { data } = await apiClient.post<RelayImageStudioResponse>(
    '/image-studio/generate-external',
    request,
    { signal: options.signal }
  )
  return normalizeImageStudioResults(data, request.format)
}

export async function generateImageWithExternalBrowser(
  request: ExternalImageStudioRequest,
  options: ImageStudioGenerationOptions = {}
): Promise<NormalizedImageResult[]> {
  const mapped = mapExternalPayload(request)
  const requestHeaders = new Headers()
  Object.entries(mapped.headers || {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      requestHeaders.set(key, value)
    }
  })
  requestHeaders.set('Authorization', `Bearer ${request.api_key}`)
  requestHeaders.set('Accept', 'application/json')

  let response: Response
  try {
    response = await fetch(mapped.url, {
      method: 'POST',
      headers: requestHeaders,
      body: mapped.body as BodyInit,
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new BrowserDirectGenerationError('Browser direct mode failed. The upstream provider may not allow CORS.', true)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(parseFetchErrorBody(payload) || `Upstream image request failed (${response.status})`)
  }

  return normalizeImageStudioResults(payload, request.format)
}

export async function fetchImageStudioUsage(apiKey: string): Promise<ImageStudioUsageResponse> {
  const response = await fetch('/v1/usage', {
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Accept': 'application/json',
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(parseFetchErrorBody(payload) || `Usage request failed (${response.status})`)
  }

  return normalizeUsageResponse(payload)
}

export async function downloadRemoteImage(url: string, filename: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/image-studio/download', {
    params: { url, filename },
    responseType: 'blob',
  })
  return data
}

export function resolveImageStudioSize(
  aspectRatio: string,
  explicitSize?: string,
  resolutionPreset: ImageStudioResolutionPreset = 'standard'
): string {
  return resolveSizeFromAspect(aspectRatio, explicitSize, resolutionPreset)
}
