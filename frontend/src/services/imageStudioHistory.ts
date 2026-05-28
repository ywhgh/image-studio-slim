import type { ImageStudioHistoryItem, NormalizedImageResult } from '@/types/imageStudio'

const DB_NAME = 'sub2api-image-studio'
const DB_VERSION = 1
const STORE_NAME = 'generations'
const MAX_HISTORY_ITEMS = 50

export interface ImageStudioStoragePersistenceStatus {
  supported: boolean
  persisted: boolean
  granted?: boolean
  usage?: number
  quota?: number
}

interface StoredImageStudioResult {
  id: string
  source: 'remote-url' | 'data-url'
  mimeType?: string
  revisedPrompt?: string
  filename: string
  originalUrl?: string
  blob?: Blob
}

interface StoredImageStudioHistoryItem {
  id: string
  createdAt: string
  providerMode: ImageStudioHistoryItem['providerMode']
  profile: ImageStudioHistoryItem['profile']
  currentSiteProfile?: ImageStudioHistoryItem['profile']
  model: string
  prompt: string
  aspectRatio: string
  count: number
  resolutionPreset?: ImageStudioHistoryItem['resolutionPreset']
  requestedSize?: string
  actualSize?: string
  outputMode?: ImageStudioHistoryItem['outputMode']
  quality?: string
  background?: string
  format?: string
  seed?: string
  stylePresetId?: string
  stylePresetTitle?: string
  durationMs?: number
  referenceImageUrl?: string
  referenceImageUrls?: string[]
  parentHistoryId?: string
  parentTileId?: string
  results: StoredImageStudioResult[]
}

type HistoryStorageBlobPolicy = 'all' | 'remote-preferred' | 'remote-only'

export type ImageStudioHistorySaveMode =
  | 'full'
  | 'remote-preferred'
  | 'remote-only'
  | 'split'
  | 'partial-split'

export interface ImageStudioHistorySaveResult {
  mode: ImageStudioHistorySaveMode
  requestedResultCount: number
  storedResultCount: number
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

async function estimateStorage(): Promise<Pick<ImageStudioStoragePersistenceStatus, 'usage' | 'quota'>> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return {}
  }
  try {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage,
      quota: estimate.quota,
    }
  } catch {
    return {}
  }
}

export async function getImageStudioStoragePersistenceStatus(): Promise<ImageStudioStoragePersistenceStatus> {
  const supported = typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.persisted === 'function'
  const storageEstimate = await estimateStorage()

  if (!supported) {
    return {
      supported: false,
      persisted: false,
      ...storageEstimate,
    }
  }

  try {
    return {
      supported: true,
      persisted: await navigator.storage.persisted(),
      ...storageEstimate,
    }
  } catch {
    return {
      supported: true,
      persisted: false,
      ...storageEstimate,
    }
  }
}

export async function requestImageStudioPersistentStorage(): Promise<ImageStudioStoragePersistenceStatus> {
  const current = await getImageStudioStoragePersistenceStatus()
  const canRequest = typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.persist === 'function'

  if (!current.supported || current.persisted || !canRequest) {
    return current
  }

  try {
    const granted = await navigator.storage.persist()
    const next = await getImageStudioStoragePersistenceStatus()
    return {
      ...next,
      granted,
      persisted: next.persisted || granted,
    }
  } catch {
    return {
      ...current,
      granted: false,
    }
  }
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((db) =>
    new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const store = tx.objectStore(STORE_NAME)
      const request = fn(store)
      let result: T

      request.onerror = () => {
        reject(request.error)
      }
      request.onsuccess = () => {
        result = request.result
      }

      tx.oncomplete = () => {
        db.close()
        resolve(result)
      }
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
      tx.onabort = () => {
        db.close()
        reject(tx.error)
      }
    })
  )
}

function toStorableOriginalUrl(result: NormalizedImageResult): string | undefined {
  const originalUrl = (result.originalUrl || result.url || '').trim()
  if (!originalUrl || originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    return undefined
  }
  return originalUrl
}

function dataUrlToBlob(dataUrl: string): Blob | undefined {
  const commaIndex = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || commaIndex <= 5) {
    return undefined
  }

  const metadata = dataUrl.slice(5, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  const mimeType = metadata.split(';', 1)[0] || 'image/png'
  const isBase64 = metadata.toLowerCase().includes(';base64')

  try {
    const binary = isBase64
      ? atob(payload)
      : decodeURIComponent(payload)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], {
      type: mimeType.startsWith('image/') ? mimeType : 'image/png',
    })
  } catch {
    return undefined
  }
}

function resultUrlCandidates(result: NormalizedImageResult): string[] {
  return [result.originalUrl, result.url]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
}

async function recoverLocalBlobForStorage(result: NormalizedImageResult): Promise<NormalizedImageResult> {
  if (result.blob) {
    return result
  }

  const dataUrl = resultUrlCandidates(result).find((url) => url.startsWith('data:image/'))
  if (dataUrl) {
    const blob = dataUrlToBlob(dataUrl)
    if (blob) {
      return {
        ...result,
        blob,
        mimeType: result.mimeType || blob.type,
      }
    }
  }

  const blobUrl = resultUrlCandidates(result).find((url) => url.startsWith('blob:'))
  if (blobUrl && typeof fetch === 'function') {
    try {
      const response = await fetch(blobUrl)
      if (response.ok) {
        const blob = await response.blob()
        return {
          ...result,
          blob,
          mimeType: result.mimeType || blob.type,
        }
      }
    } catch {
      // The object URL may already have been revoked; the remote URL fallback
      // below still keeps history recoverable when the upstream returned one.
    }
  }

  return result
}

async function prepareResultsForStorage(results: NormalizedImageResult[]): Promise<NormalizedImageResult[]> {
  return Promise.all(results.map((result) => recoverLocalBlobForStorage(result)))
}

function toStoredResult(
  result: NormalizedImageResult,
  blobPolicy: HistoryStorageBlobPolicy = 'all'
): StoredImageStudioResult | null {
  const storableOriginalUrl = toStorableOriginalUrl(result)
  const shouldStoreBlob =
    blobPolicy === 'all' ||
    (blobPolicy === 'remote-preferred' && !storableOriginalUrl)
  const blob = shouldStoreBlob ? result.blob : undefined

  if (!blob && !storableOriginalUrl) {
    return null
  }

  return {
    id: result.id,
    source: result.source,
    mimeType: result.mimeType,
    revisedPrompt: result.revisedPrompt,
    filename: result.filename,
    originalUrl: storableOriginalUrl,
    blob,
  }
}

function toStoredResults(
  results: NormalizedImageResult[],
  blobPolicy: HistoryStorageBlobPolicy = 'all'
): StoredImageStudioResult[] {
  return results
    .map((result) => toStoredResult(result, blobPolicy))
    .filter((result): result is StoredImageStudioResult => !!result)
}

function normalizeReferenceImageUrls(item: ImageStudioHistoryItem): string[] {
  if (item.referenceImageUrls?.length) {
    return item.referenceImageUrls.filter((url) => typeof url === 'string' && url.length > 0)
  }
  return item.referenceImageUrl ? [item.referenceImageUrl] : []
}

function parsePixelSize(value?: string): { width: number; height: number } | null {
  const match = /^\s*(\d+)\s*[x×]\s*(\d+)\s*$/i.exec((value || '').trim())
  if (!match) {
    return null
  }
  const width = Number(match[1])
  const height = Number(match[2])
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : null
}

async function readImageBlobSize(blob?: Blob): Promise<string | undefined> {
  if (!blob || typeof createImageBitmap !== 'function') {
    return undefined
  }
  try {
    const bitmap = await createImageBitmap(blob)
    try {
      return `${bitmap.width}x${bitmap.height}`
    } finally {
      bitmap.close()
    }
  } catch {
    return undefined
  }
}

function readImageUrlSize(url?: string): Promise<string | undefined> {
  const source = (url || '').trim()
  if (!source || typeof Image === 'undefined') {
    return Promise.resolve(undefined)
  }

  return new Promise((resolve) => {
    const image = new Image()
    const timeout = window.setTimeout(() => {
      cleanup()
      resolve(undefined)
    }, 15000)

    function cleanup() {
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      cleanup()
      resolve(width > 0 && height > 0 ? `${width}x${height}` : undefined)
    }
    image.onerror = () => {
      cleanup()
      resolve(undefined)
    }
    image.src = source
  })
}

async function readStoredResultSize(result?: StoredImageStudioResult): Promise<string | undefined> {
  if (!result) {
    return undefined
  }

  const blobSize = await readImageBlobSize(result.blob)
  if (blobSize) {
    return blobSize
  }

  if (result.blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(result.blob)
    try {
      const urlSize = await readImageUrlSize(url)
      if (urlSize) {
        return urlSize
      }
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return readImageUrlSize(result.originalUrl)
}

function isProviderScaledOutput(requestedSize?: string, actualSize?: string): boolean {
  const requested = parsePixelSize(requestedSize)
  const actual = parsePixelSize(actualSize)
  return Boolean(
    requested &&
    actual &&
    actual.width * actual.height < requested.width * requested.height
  )
}

function resolveStoredOutputMode(
  item: Pick<ImageStudioHistoryItem, 'outputMode' | 'requestedSize' | 'actualSize'>
): ImageStudioHistoryItem['outputMode'] {
  if (
    (!item.outputMode || item.outputMode === 'native') &&
    isProviderScaledOutput(item.requestedSize, item.actualSize)
  ) {
    return 'provider-scaled'
  }
  return item.outputMode
}

function buildStoredHistoryPayload(
  item: ImageStudioHistoryItem,
  storedResults: StoredImageStudioResult[],
  actualSize?: string,
  id = item.id,
): StoredImageStudioHistoryItem {
  const referenceImageUrls = normalizeReferenceImageUrls(item)
  const outputMode = resolveStoredOutputMode({
    outputMode: item.outputMode,
    requestedSize: item.requestedSize,
    actualSize,
  })

  return {
    id,
    createdAt: item.createdAt,
    providerMode: item.providerMode,
    profile: item.profile,
    currentSiteProfile: item.currentSiteProfile,
    model: item.model,
    prompt: item.prompt,
    aspectRatio: item.aspectRatio,
    count: storedResults.length,
    resolutionPreset: item.resolutionPreset,
    requestedSize: item.requestedSize,
    actualSize,
    outputMode,
    quality: item.quality,
    background: item.background,
    format: item.format,
    seed: item.seed,
    stylePresetId: item.stylePresetId,
    stylePresetTitle: item.stylePresetTitle,
    durationMs: item.durationMs,
    referenceImageUrl: referenceImageUrls[0],
    referenceImageUrls: referenceImageUrls.length ? referenceImageUrls : undefined,
    parentHistoryId: item.parentHistoryId,
    parentTileId: item.parentTileId,
    results: storedResults,
  }
}

async function putStoredHistoryPayload(payload: StoredImageStudioHistoryItem): Promise<void> {
  await withStore('readwrite', (store) => store.put(payload))
}

function sortStoredHistoryItems<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

async function trimImageStudioHistory(maxItems = MAX_HISTORY_ITEMS): Promise<void> {
  const records = await withStore<StoredImageStudioHistoryItem[]>('readonly', (store) => store.getAll())
  const staleIds = sortStoredHistoryItems(records || [])
    .slice(maxItems)
    .map((record) => record.id)
    .filter(Boolean)

  if (!staleIds.length) {
    return
  }

  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    staleIds.forEach((id) => store.delete(id))

    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error)
    }
  })
}

function storedResultsEqual(left: StoredImageStudioResult[], right: StoredImageStudioResult[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  return left.every((result, index) => (
    result.id === right[index]?.id &&
    result.originalUrl === right[index]?.originalUrl &&
    result.blob === right[index]?.blob
  ))
}

function buildSplitHistoryPayloads(
  item: ImageStudioHistoryItem,
  storedResults: StoredImageStudioResult[],
  actualSize?: string,
): StoredImageStudioHistoryItem[] {
  return storedResults.map((result, index) => buildStoredHistoryPayload(
    item,
    [result],
    actualSize,
    index === 0 ? item.id : `${item.id}-part-${index + 1}`,
  ))
}

async function saveSplitHistoryPayloads(
  payloads: StoredImageStudioHistoryItem[],
  requestedResultCount: number,
  originalError: unknown,
): Promise<ImageStudioHistorySaveResult> {
  let storedResultCount = 0

  for (const payload of payloads) {
    try {
      await putStoredHistoryPayload(payload)
      storedResultCount += payload.results.length
    } catch {
      // Keep going; one oversized image should not prevent the rest of the batch from being recoverable.
    }
  }

  if (!storedResultCount) {
    throw originalError instanceof Error
      ? originalError
      : new Error('Local history storage failed.')
  }

  await trimImageStudioHistory()

  return {
    mode: storedResultCount === requestedResultCount ? 'split' : 'partial-split',
    requestedResultCount,
    storedResultCount,
  }
}

export async function saveImageStudioHistoryItem(
  item: ImageStudioHistoryItem
): Promise<ImageStudioHistorySaveResult> {
  const preparedItem: ImageStudioHistoryItem = {
    ...item,
    results: await prepareResultsForStorage(item.results),
  }
  const fullResults = toStoredResults(preparedItem.results, 'all')

  if (!fullResults.length) {
    throw new Error('No image data or remote image URL is available for local history storage.')
  }

  const actualSize = preparedItem.actualSize || await readStoredResultSize(fullResults[0])
  const fullPayload = buildStoredHistoryPayload(preparedItem, fullResults, actualSize)
  const requestedResultCount = item.results.length

  try {
    await putStoredHistoryPayload(fullPayload)
    await trimImageStudioHistory()
    return {
      mode: 'full',
      requestedResultCount,
      storedResultCount: fullResults.length,
    }
  } catch (error) {
    const remotePreferredResults = toStoredResults(preparedItem.results, 'remote-preferred')
    if (
      remotePreferredResults.length &&
      !storedResultsEqual(fullResults, remotePreferredResults)
    ) {
      try {
        await putStoredHistoryPayload(buildStoredHistoryPayload(preparedItem, remotePreferredResults, actualSize))
        await trimImageStudioHistory()
        return {
          mode: 'remote-preferred',
          requestedResultCount,
          storedResultCount: remotePreferredResults.length,
        }
      } catch {
        // Try the next, smaller shape below.
      }
    }

    const remoteOnlyResults = toStoredResults(preparedItem.results, 'remote-only')
    if (
      remoteOnlyResults.length &&
      !storedResultsEqual(fullResults, remoteOnlyResults) &&
      !storedResultsEqual(remotePreferredResults, remoteOnlyResults)
    ) {
      try {
        await putStoredHistoryPayload(buildStoredHistoryPayload(preparedItem, remoteOnlyResults, actualSize))
        await trimImageStudioHistory()
        return {
          mode: 'remote-only',
          requestedResultCount,
          storedResultCount: remoteOnlyResults.length,
        }
      } catch {
        // Split blob-heavy batches as a final recovery path.
      }
    }

    if (fullResults.length > 1) {
      return saveSplitHistoryPayloads(
        buildSplitHistoryPayloads(preparedItem, fullResults, actualSize),
        requestedResultCount,
        error,
      )
    }

    throw error
  }
}

export async function replaceImageStudioHistoryItems(items: ImageStudioHistoryItem[]): Promise<void> {
  const db = await openDatabase()
  const itemsForStorage = sortStoredHistoryItems(items).slice(0, MAX_HISTORY_ITEMS)

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    store.clear()

    itemsForStorage.forEach((item) => {
      const storedResults = toStoredResults(item.results)

      if (!storedResults.length) {
        return
      }

      const referenceImageUrls = normalizeReferenceImageUrls(item)
      const actualSize = item.actualSize
      const outputMode = resolveStoredOutputMode({
        outputMode: item.outputMode,
        requestedSize: item.requestedSize,
        actualSize,
      })

      store.put({
        id: item.id,
        createdAt: item.createdAt,
        providerMode: item.providerMode,
        profile: item.profile,
        currentSiteProfile: item.currentSiteProfile,
        model: item.model,
        prompt: item.prompt,
        aspectRatio: item.aspectRatio,
        count: storedResults.length,
        resolutionPreset: item.resolutionPreset,
        requestedSize: item.requestedSize,
        actualSize,
        outputMode,
        quality: item.quality,
        background: item.background,
        format: item.format,
        seed: item.seed,
        stylePresetId: item.stylePresetId,
        stylePresetTitle: item.stylePresetTitle,
        durationMs: item.durationMs,
        referenceImageUrl: referenceImageUrls[0],
        referenceImageUrls: referenceImageUrls.length ? referenceImageUrls : undefined,
        parentHistoryId: item.parentHistoryId,
        parentTileId: item.parentTileId,
        results: storedResults,
      } satisfies StoredImageStudioHistoryItem)
    })

    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function listImageStudioHistoryItems(): Promise<ImageStudioHistoryItem[]> {
  const records = await withStore<StoredImageStudioHistoryItem[]>('readonly', (store) => store.getAll())

  const mapped = await Promise.all(sortStoredHistoryItems(records || [])
    .filter((record) => record.results?.length)
    .slice(0, MAX_HISTORY_ITEMS)
    .map(async (record) => {
      const actualSize = record.actualSize || await readStoredResultSize(record.results[0])
      return {
        id: record.id,
        createdAt: record.createdAt,
        providerMode: record.providerMode,
        profile: record.profile,
        currentSiteProfile: record.currentSiteProfile,
        model: record.model,
        prompt: record.prompt,
        aspectRatio: record.aspectRatio,
        count: record.count,
        resolutionPreset: record.resolutionPreset,
        requestedSize: record.requestedSize,
        actualSize,
        outputMode: resolveStoredOutputMode({
          outputMode: record.outputMode,
          requestedSize: record.requestedSize,
          actualSize,
        }),
        quality: record.quality,
        background: record.background,
        format: record.format,
        seed: record.seed,
        stylePresetId: record.stylePresetId,
        stylePresetTitle: record.stylePresetTitle,
        durationMs: record.durationMs,
        referenceImageUrl: record.referenceImageUrl,
        referenceImageUrls: record.referenceImageUrls?.length
          ? record.referenceImageUrls
          : (record.referenceImageUrl ? [record.referenceImageUrl] : undefined),
        parentHistoryId: record.parentHistoryId,
        parentTileId: record.parentTileId,
        results: record.results.map((result) => ({
          id: result.id,
          source: result.source,
          mimeType: result.mimeType,
          revisedPrompt: result.revisedPrompt,
          filename: result.filename,
          originalUrl: result.originalUrl,
          blob: result.blob,
          url: result.blob ? URL.createObjectURL(result.blob) : (result.originalUrl || ''),
        })).filter((result) => !!result.url),
      } satisfies ImageStudioHistoryItem
    }))

  return mapped
}

export async function deleteImageStudioHistoryItem(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}

export async function clearImageStudioHistory(): Promise<void> {
  await withStore('readwrite', (store) => store.clear())
}

export function revokeImageStudioHistoryItems(items: ImageStudioHistoryItem[]): void {
  items.forEach((item) => {
    item.results.forEach((result) => {
      if (result.url.startsWith('blob:')) {
        URL.revokeObjectURL(result.url)
      }
    })
  })
}
