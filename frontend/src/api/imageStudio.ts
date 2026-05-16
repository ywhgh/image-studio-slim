import { apiClient } from './client'
import type {
  ExternalImageStudioRequest,
  ImageStudioApiKeyUsage,
  ImageStudioChatgpt2ApiImageQuota,
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

interface Chatgpt2ApiAccount {
  type?: string
  status?: string
  quota?: number
  image_quota_unknown?: boolean
}

type RelayImageJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

interface RelayImageJobError {
  code: number
  msg: string
  err_code?: string
}

interface RelayImageJobResponse {
  id: string
  status: RelayImageJobStatus
  profile?: string
  queue_position?: number
  queue_length: number
  running: number
  concurrency: number
  created_at: string
  started_at?: string
  finished_at?: string
  results?: RelayImageStudioResult[]
  error?: RelayImageJobError
}

export interface ImageStudioBatchProgress {
  total: number
  completed: number
  failed: number
  running: number
  queued: number
  queueLength?: number
  concurrency?: number
  items: ImageStudioBatchItemProgress[]
}

export interface ImageStudioBatchItemProgress {
  index: number
  status: BatchTaskStatus
  attempt: number
  startedAt?: number
  finishedAt?: number
  resultCount?: number
}

export interface ImageStudioBatchResultMeta {
  index: number
  total: number
  attempt: number
}

export class ImageGenerationJobCanceledError extends Error {
  constructor() {
    super('Image generation was canceled.')
    this.name = 'ImageGenerationJobCanceledError'
  }
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

function detectImageMimeType(bytes: Uint8Array): string | undefined {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return 'image/gif'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return undefined
}

function normalizeImageMimeType(mimeType: string | undefined, bytes: Uint8Array): string {
  const normalized = (mimeType || '').trim().toLowerCase()
  if (normalized.startsWith('image/')) {
    return normalized
  }
  return detectImageMimeType(bytes) || 'image/png'
}

function base64PrefixToBytes(payload: string): Uint8Array {
  try {
    const binary = atob(payload.slice(0, 96))
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  } catch {
    return new Uint8Array()
  }
}

function normalizeImageDataUrlMime(dataUrl: string): string {
  if (!dataUrl.startsWith('data:')) {
    return dataUrl
  }
  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex <= 5) {
    return dataUrl
  }
  const metadata = dataUrl.slice(5, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  const mimeType = metadata.split(';', 1)[0]
  if (mimeType.trim().toLowerCase().startsWith('image/')) {
    return dataUrl
  }
  const normalizedMimeType = normalizeImageMimeType(mimeType, base64PrefixToBytes(payload))
  return `data:${normalizedMimeType};base64,${payload}`
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

function normalizeChatgpt2ApiAccounts(payload: unknown): Chatgpt2ApiAccount[] {
  const root = getObject(payload)
  const rawItems = Array.isArray(root?.items)
    ? root.items
    : Array.isArray(payload) ? payload : []

  return rawItems
    .map((item) => getObject(item))
    .filter((item): item is Record<string, unknown> => !!item)
    .map((item) => ({
      type: getString(item.type).toLowerCase(),
      status: getString(item.status),
      quota: getNumber(item.quota) ?? 0,
      image_quota_unknown: Boolean(item.image_quota_unknown),
    }))
}

function normalizeChatgpt2ApiImageQuota(payload: unknown): ImageStudioChatgpt2ApiImageQuota {
  const accounts = normalizeChatgpt2ApiAccounts(payload)
  const availableAccounts = accounts.filter((account) => {
    const status = (account.status || '').trim()
    return status !== '禁用' && status !== '限流' && status !== '异常'
      && status.toLowerCase() !== 'disabled'
      && status.toLowerCase() !== 'limited'
      && status.toLowerCase() !== 'rate_limited'
      && status.toLowerCase() !== 'abnormal'
      && status.toLowerCase() !== 'error'
  })

  return {
    totalAccounts: accounts.length,
    availableAccounts: availableAccounts.length,
    remaining: availableAccounts.reduce((sum, account) => sum + Math.max(0, account.quota || 0), 0),
    unlimited: availableAccounts.some((account) => account.type === 'pro' || account.type === 'prolite'),
    unknown: availableAccounts.some((account) => account.image_quota_unknown),
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
      return 3840
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

  const addTextContent = (text: string, revisedPrompt?: string) => {
    const value = text.trim()
    if (!value) {
      return
    }

    try {
      const nested = getObject(JSON.parse(value))
      if (nested) {
        const nestedUrl = getString(nested.url) || getString(nested.image_url) || getString(nested.media_url)
        if (nestedUrl) {
          addResult(nestedUrl, 'remote-url', getString(nested.mime_type), revisedPrompt)
        }
        const nestedB64 = getString(nested.result) || getString(nested.b64_json)
        if (nestedB64) {
          const mimeType = getString(nested.mime_type) || defaultMime
          addResult(buildDataUrl(nestedB64, mimeType), 'data-url', mimeType, revisedPrompt)
        }
      }
    } catch {
      // Plain text chat responses often contain markdown or bare URLs.
    }

    value.split(/\s+/).forEach((part) => {
      const token = part.trim().replace(/^[`"'(<\[{]+|[`"')>\]}.,;!]+$/g, '')
      if (token.startsWith('data:image/')) {
        addResult(token, 'data-url', parseMimeTypeFromDataUrl(token), revisedPrompt)
        return
      }
      if (token.startsWith('http://') || token.startsWith('https://')) {
        addResult(token, 'remote-url', undefined, revisedPrompt)
      }
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

  if (Array.isArray(root.choices)) {
    root.choices.forEach((item) => {
      const record = getObject(item)
      const message = getObject(record?.message)
      if (!message) return

      const revisedPrompt = getString(message.revised_prompt) || getString(message.revisedPrompt)
      const content = message.content
      if (typeof content === 'string') {
        addTextContent(content, revisedPrompt)
        return
      }
      if (!Array.isArray(content)) {
        return
      }
      content.forEach((contentItem) => {
        const contentRecord = getObject(contentItem)
        if (!contentRecord) return

        const text = getString(contentRecord.text) || getString(contentRecord.content)
        if (text) {
          addTextContent(text, revisedPrompt)
        }

        const imageUrlValue = contentRecord.image_url
        const imageUrlRecord = getObject(imageUrlValue)
        const contentUrl =
          getString(contentRecord.url) ||
          getString(contentRecord.image_url) ||
          getString(imageUrlRecord?.url)
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
    return request.image_inputs
      .filter((s) => typeof s === 'string' && s.length > 0)
      .map(normalizeImageDataUrlMime)
  }
  return request.image_input ? [normalizeImageDataUrlMime(request.image_input)] : []
}

interface ExternalMappedPayload {
  url: string
  body: BodyInit | string
  headers: Record<string, string>
}

function createOpenAIImageEditFormData(
  request: ExternalImageStudioRequest,
  count: number,
  size: string,
  imageInputs: string[],
  imageFieldName: string,
): FormData {
  const formData = new FormData()
  formData.set('model', request.model)
  formData.set('prompt', request.prompt)
  formData.set('n', String(count))
  if (size) {
    formData.set('size', size)
  }
  if (request.seed) {
    formData.set('seed', request.seed)
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
      imageFieldName,
      new File([blob], `reference-${index + 1}.${extensionForMimeType(blob.type)}`, { type: blob.type })
    )
  })
  return formData
}

function buildChatCompletionImageFields(imageInputs: string[]): Record<string, unknown> {
  if (!imageInputs.length) {
    return {}
  }
  return {
    image_input: imageInputs[0],
    image_inputs: imageInputs,
    input_image: imageInputs[0],
    input_images: imageInputs,
  }
}

function buildChatCompletionMultimodalMessages(prompt: string, imageInputs: string[]) {
  return [{
    role: 'user',
    content: [
      { type: 'text', text: prompt },
      ...imageInputs.map((dataUrl) => ({
        type: 'image_url',
        image_url: { url: dataUrl },
      })),
    ],
  }]
}

function buildChatCompletionInputImageMessages(prompt: string, imageInputs: string[]) {
  return [{
    role: 'user',
    content: [
      { type: 'input_text', text: prompt },
      ...imageInputs.map((dataUrl) => ({
        type: 'input_image',
        image_url: dataUrl,
      })),
    ],
  }]
}

function clampImageResultsForRequest(
  results: NormalizedImageResult[],
  request: ExternalImageStudioRequest,
): NormalizedImageResult[] {
  const count = normalizeImageRequestCount(request.count)
  return results.length > count ? results.slice(0, count) : results
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

function isBrowserDirectFallbackError(error: unknown): boolean {
  if (error instanceof BrowserDirectGenerationError && error.fallbackSuggested) {
    return true
  }
  if (error instanceof TypeError) {
    return true
  }
  const message = error instanceof Error ? error.message : ''
  return /failed to fetch|network error|cors|load failed/i.test(message)
}

function mapExternalPayloads(request: ExternalImageStudioRequest): ExternalMappedPayload[] {
  const count = normalizeImageRequestCount(request.count)
  const size = resolveSizeFromAspect(request.aspect_ratio, request.size)
  const imageInputs = collectImageInputs(request)

  if (request.profile === 'openai-image-api' || request.profile === 'chatgpt2api') {
    if (imageInputs.length === 0) {
      return [{
        url: joinEndpoint(request.base_url, '/images/generations'),
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          n: count,
          ...(size ? { size } : {}),
          ...(request.seed ? { seed: request.seed } : {}),
          ...(request.quality ? { quality: request.quality } : {}),
          ...(request.background ? { background: request.background } : {}),
          ...(request.format ? { output_format: request.format } : {}),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }]
    }

    const editEndpoint = joinEndpoint(request.base_url, '/images/edits')
    const generationEndpoint = joinEndpoint(request.base_url, '/images/generations')
    const editPayloads = ['image', 'image[]'].map((imageFieldName) => ({
      url: editEndpoint,
      body: createOpenAIImageEditFormData(request, count, size, imageInputs, imageFieldName),
      headers: {},
    }))
    const generationPayload: ExternalMappedPayload = {
      url: generationEndpoint,
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        n: count,
        image_input: imageInputs[0],
        image_inputs: imageInputs,
        input_image: imageInputs[0],
        input_images: imageInputs,
        ...(size ? { size } : {}),
        ...(request.seed ? { seed: request.seed } : {}),
        ...(request.quality ? { quality: request.quality } : {}),
        ...(request.background ? { background: request.background } : {}),
        ...(request.format ? { output_format: request.format } : {}),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }
    return [...editPayloads, generationPayload]
  }

  if (request.profile === 'openai-responses') {
    const tool: Record<string, unknown> = {
      type: 'image_generation',
      ...(size ? { size } : {}),
      ...(request.quality ? { quality: request.quality } : {}),
      ...(request.background ? { background: request.background } : {}),
      ...(request.format ? { format: request.format } : {}),
      ...(request.seed ? { seed: request.seed } : {}),
      ...(count > 1 ? { n: count } : {}),
    }

    return [{
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
    }]
  }

  const chatEndpoint = joinEndpoint(request.base_url, '/chat/completions')
  const baseChatPayload: Record<string, unknown> = {
    model: request.model,
    stream: false,
    ...(request.seed ? { seed: request.seed } : {}),
    ...(count > 1 ? { n_variants: count } : {}),
  }
  const textPayload = {
    ...baseChatPayload,
    messages: [{ role: 'user', content: request.prompt }],
    ...buildChatCompletionImageFields(imageInputs),
  }
  if (imageInputs.length === 0) {
    return [{
      url: chatEndpoint,
      body: JSON.stringify(textPayload),
      headers: {
        'Content-Type': 'application/json',
      },
    }]
  }
  const multimodalPayload = {
    ...baseChatPayload,
    messages: buildChatCompletionMultimodalMessages(request.prompt, imageInputs),
    ...(count > 1 ? { n: count } : {}),
  }
  const inputImagePayload = {
    ...baseChatPayload,
    messages: buildChatCompletionInputImageMessages(request.prompt, imageInputs),
    ...(count > 1 ? { n: count } : {}),
  }
  return [textPayload, multimodalPayload, inputImagePayload].map((payload) => ({
    url: chatEndpoint,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  }))
}

function describeMappedPayload(payload: ExternalMappedPayload): string {
  try {
    const parsed = new URL(payload.url)
    return parsed.pathname || payload.url
  } catch {
    return payload.url
  }
}

async function fetchMappedImagePayload(
  mapped: ExternalMappedPayload,
  request: ExternalImageStudioRequest,
  signal?: AbortSignal,
): Promise<NormalizedImageResult[]> {
  const requestHeaders = new Headers()
  Object.entries(mapped.headers || {}).forEach(([key, value]) => {
    if (typeof value === 'string') {
      requestHeaders.set(key, value)
    }
  })
  requestHeaders.set('Authorization', `Bearer ${request.api_key}`)
  requestHeaders.set('Accept', 'application/json')

  const response = await fetch(mapped.url, {
    method: 'POST',
    headers: requestHeaders,
    body: mapped.body,
    signal,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(parseFetchErrorBody(payload) || `Upstream image request failed (${response.status})`)
  }

  return normalizeImageStudioResults(payload, request.format)
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const metadata = parts[0] || 'data:image/png;base64'
  const mimeTypeHint = metadata.split(':')[1]?.split(';')[0]
  const binary = atob(parts[1] || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const mimeType = normalizeImageMimeType(mimeTypeHint, bytes)
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
    getString(root.msg) ||
    getString(root.detail) ||
    getString(root.error)
  )
}

export interface ImageStudioGenerationOptions {
  signal?: AbortSignal
  onBatchProgress?: (progress: ImageStudioBatchProgress) => void
  onImageResult?: (
    results: NormalizedImageResult[],
    meta: ImageStudioBatchResultMeta
  ) => void | Promise<void>
}

interface InternalImageStudioGenerationOptions extends ImageStudioGenerationOptions {
  onJobProgress?: (job: RelayImageJobResponse) => void
}

const IMAGE_GENERATION_JOB_POLL_MS = 1500
const MAX_BATCH_IMAGE_COUNT = 5

export type BatchTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

interface BatchTaskState {
  status: BatchTaskStatus
  attempt: number
  startedAt?: number
  finishedAt?: number
  resultCount?: number
}

function normalizeImageRequestCount(count?: number): number {
  if (!Number.isFinite(count) || !count || count <= 0) {
    return 1
  }
  return Math.max(1, Math.min(MAX_BATCH_IMAGE_COUNT, Math.round(count)))
}

function createSingleImageRequest(request: ExternalImageStudioRequest): ExternalImageStudioRequest {
  return {
    ...request,
    count: 1,
  }
}

function batchStatusFromJob(status: RelayImageJobStatus): BatchTaskStatus {
  switch (status) {
    case 'succeeded':
      return 'succeeded'
    case 'failed':
      return 'failed'
    case 'canceled':
      return 'canceled'
    case 'running':
      return 'running'
    default:
      return 'queued'
  }
}

function emitBatchProgress(
  options: ImageStudioGenerationOptions,
  states: BatchTaskState[],
  meta: { queueLength?: number; concurrency?: number } = {}
) {
  if (!options.onBatchProgress) {
    return
  }
  const completed = states.filter((state) => state.status === 'succeeded').length
  const failed = states.filter((state) => state.status === 'failed' || state.status === 'canceled').length
  const running = states.filter((state) => state.status === 'running').length
  const queued = states.filter((state) => state.status === 'queued').length
  options.onBatchProgress({
    total: states.length,
    completed,
    failed,
    running,
    queued,
    queueLength: meta.queueLength,
    concurrency: meta.concurrency,
    items: states.map((state, index) => ({
      index,
      status: state.status,
      attempt: state.attempt,
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      resultCount: state.resultCount,
    })),
  })
}

function updateBatchTaskState(
  states: BatchTaskState[],
  index: number,
  status: BatchTaskStatus,
  options: ImageStudioGenerationOptions,
  meta: { queueLength?: number; concurrency?: number },
  patch: Partial<BatchTaskState> = {}
) {
  const now = Date.now()
  const current = states[index]
  const next: BatchTaskState = {
    ...current,
    ...patch,
    status,
  }
  if (status === 'queued') {
    next.startedAt = undefined
    next.finishedAt = undefined
    next.resultCount = undefined
  } else if (status === 'running' && !next.startedAt) {
    next.startedAt = now
    next.finishedAt = undefined
  } else if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
    next.finishedAt = now
  }
  states[index] = next
  emitBatchProgress(options, states, meta)
}

async function runExternalImageBatch(
  request: ExternalImageStudioRequest,
  options: ImageStudioGenerationOptions,
  runSingle: (
    request: ExternalImageStudioRequest,
    options: InternalImageStudioGenerationOptions
  ) => Promise<NormalizedImageResult[]>
): Promise<NormalizedImageResult[]> {
  const total = normalizeImageRequestCount(request.count)
  const states: BatchTaskState[] = Array.from({ length: total }, () => ({
    status: 'queued',
    attempt: 0,
  }))
  const meta: { queueLength?: number; concurrency?: number } = {}
  emitBatchProgress(options, states, meta)
  const maxAttempts = 2

  const tasks = states.map(async (_state, index) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      updateBatchTaskState(states, index, 'running', options, meta, { attempt })

      try {
        const results = await runSingle(createSingleImageRequest(request), {
          ...options,
          onJobProgress: (job) => {
            const status = batchStatusFromJob(job.status)
            meta.queueLength = job.queue_length
            meta.concurrency = job.concurrency
            if (status === 'queued' || status === 'running') {
              updateBatchTaskState(states, index, status, options, meta, { attempt })
            }
          },
        })
        if (!results.length) {
          throw new Error('Image generation returned no image.')
        }
        try {
          await options.onImageResult?.(results, { index, total, attempt })
        } catch {
          // The caller still receives final results even if early insertion fails.
        }
        updateBatchTaskState(states, index, 'succeeded', options, meta, {
          attempt,
          resultCount: results.length,
        })
        return results
      } catch (error) {
        if (options.signal?.aborted) {
          updateBatchTaskState(states, index, 'canceled', options, meta, { attempt })
          throw error
        }
        if (attempt < maxAttempts) {
          updateBatchTaskState(states, index, 'queued', options, meta, { attempt })
          continue
        }
        updateBatchTaskState(states, index, 'failed', options, meta, { attempt })
        throw error
      }
    }
    throw new Error('Image generation failed.')
  })

  const settled = await Promise.allSettled(tasks)
  const results = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : [])
  if (results.length > 0) {
    return results
  }
  const firstFailure = settled.find((item): item is PromiseRejectedResult => item.status === 'rejected')
  if (firstFailure) {
    throw firstFailure.reason
  }
  throw new Error('Image generation failed.')
}

function waitForJobPoll(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      cleanup()
      resolve()
    }, IMAGE_GENERATION_JOB_POLL_MS)
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function cancelRelayJob(jobId: string): Promise<void> {
  try {
    await apiClient.delete(`/image-studio/generate-external/jobs/${encodeURIComponent(jobId)}`)
  } catch {
    // Best-effort cancellation. The poll loop will still stop locally.
  }
}

async function generateImageWithExternalRelayJob(
  request: ExternalImageStudioRequest,
  options: InternalImageStudioGenerationOptions = {}
): Promise<NormalizedImageResult[]> {
  const { data: created } = await apiClient.post<RelayImageJobResponse>(
    '/image-studio/generate-external/jobs',
    request,
    {
      signal: options.signal,
      timeout: 30000,
    }
  )

  const jobId = created.id
  if (!jobId) {
    throw new Error('Image generation job was not created.')
  }
  options.onJobProgress?.(created)

  const abortHandler = () => {
    void cancelRelayJob(jobId)
  }
  options.signal?.addEventListener('abort', abortHandler, { once: true })

  try {
    let current = created
    while (current.status === 'queued' || current.status === 'running') {
      await waitForJobPoll(options.signal)
      const { data } = await apiClient.get<RelayImageJobResponse>(
        `/image-studio/generate-external/jobs/${encodeURIComponent(jobId)}`,
        {
          signal: options.signal,
          timeout: 30000,
        }
      )
      current = data
      options.onJobProgress?.(current)
    }

    if (current.status === 'succeeded') {
      return normalizeImageStudioResults({ results: current.results || [] }, request.format)
    }
    if (current.status === 'canceled') {
      throw new ImageGenerationJobCanceledError()
    }
    throw new Error(current.error?.msg || 'Image generation failed.')
  } finally {
    options.signal?.removeEventListener('abort', abortHandler)
  }
}

async function generateImageWithExternalRelaySingle(
  request: ExternalImageStudioRequest,
  options: InternalImageStudioGenerationOptions = {}
): Promise<NormalizedImageResult[]> {
  return generateImageWithExternalRelayJob(request, options)
}

export async function generateImageWithExternalRelay(
  request: ExternalImageStudioRequest,
  options: ImageStudioGenerationOptions = {}
): Promise<NormalizedImageResult[]> {
  const count = normalizeImageRequestCount(request.count)
  return runExternalImageBatch({ ...request, count }, options, generateImageWithExternalRelaySingle)
}

async function generateImageWithExternalBrowserSingle(
  request: ExternalImageStudioRequest,
  options: InternalImageStudioGenerationOptions = {}
): Promise<NormalizedImageResult[]> {
  const mappedPayloads = mapExternalPayloads(request)
  let lastError: unknown = null

  for (const mapped of mappedPayloads) {
    try {
      const results = await fetchMappedImagePayload(mapped, request, options.signal)
      if (results.length > 0) {
        return clampImageResultsForRequest(results, request)
      }
      lastError = new Error(`Upstream image request returned no image results from ${describeMappedPayload(mapped)}`)
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }
      lastError = error
    }
  }

  if (lastError instanceof Error) {
    if (isBrowserDirectFallbackError(lastError)) {
      throw new BrowserDirectGenerationError(lastError.message || 'Browser direct mode failed.', true)
    }
    throw lastError
  }
  throw new BrowserDirectGenerationError('Browser direct mode failed. The upstream provider may not allow CORS.', true)
}

export async function generateImageWithExternalBrowser(
  request: ExternalImageStudioRequest,
  options: ImageStudioGenerationOptions = {}
): Promise<NormalizedImageResult[]> {
  const count = normalizeImageRequestCount(request.count)
  if (count > 1) {
    return runExternalImageBatch({ ...request, count }, options, generateImageWithExternalBrowserSingle)
  }
  return generateImageWithExternalBrowserSingle({ ...request, count }, options)
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

export async function fetchChatgpt2ApiImageQuota(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<ImageStudioChatgpt2ApiImageQuota> {
  const rootUrl = baseUrl.trim().replace(/\/+$/, '').replace(/\/v1$/i, '')
  if (!rootUrl) {
    throw new Error('chatgpt2api base url is required')
  }

  const response = await fetch(`${rootUrl}/api/accounts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Accept': 'application/json',
    },
    signal,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(parseFetchErrorBody(payload) || `chatgpt2api quota request failed (${response.status})`)
  }

  return normalizeChatgpt2ApiImageQuota(payload)
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
