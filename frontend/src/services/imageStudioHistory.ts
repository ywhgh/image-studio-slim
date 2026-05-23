import type { ImageStudioHistoryItem, NormalizedImageResult } from '@/types/imageStudio'

const DB_NAME = 'sub2api-image-studio'
const DB_VERSION = 1
const STORE_NAME = 'generations'

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
  blob: Blob
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

function toStoredResult(result: NormalizedImageResult): StoredImageStudioResult | null {
  if (!result.blob) {
    return null
  }

  const originalUrl = result.originalUrl || result.url
  const storableOriginalUrl = originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')
    ? undefined
    : originalUrl

  return {
    id: result.id,
    source: result.source,
    mimeType: result.mimeType,
    revisedPrompt: result.revisedPrompt,
    filename: result.filename,
    originalUrl: storableOriginalUrl,
    blob: result.blob,
  }
}

function normalizeReferenceImageUrls(item: ImageStudioHistoryItem): string[] {
  if (item.referenceImageUrls?.length) {
    return item.referenceImageUrls.filter((url) => typeof url === 'string' && url.length > 0)
  }
  return item.referenceImageUrl ? [item.referenceImageUrl] : []
}

export async function saveImageStudioHistoryItem(item: ImageStudioHistoryItem): Promise<void> {
  const storedResults = item.results
    .map(toStoredResult)
    .filter((result): result is StoredImageStudioResult => !!result)

  if (!storedResults.length) {
    throw new Error('No image blob is available for local history storage.')
  }

  const referenceImageUrls = normalizeReferenceImageUrls(item)

  const payload: StoredImageStudioHistoryItem = {
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
    outputMode: item.outputMode,
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

  await withStore('readwrite', (store) => store.put(payload))
}

export async function replaceImageStudioHistoryItems(items: ImageStudioHistoryItem[]): Promise<void> {
  const db = await openDatabase()

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    store.clear()

    items.forEach((item) => {
      const storedResults = item.results
        .map(toStoredResult)
        .filter((result): result is StoredImageStudioResult => !!result)

      if (!storedResults.length) {
        return
      }

      const referenceImageUrls = normalizeReferenceImageUrls(item)

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
        outputMode: item.outputMode,
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

  return (records || [])
    .filter((record) => record.results?.length)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((record) => ({
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
      outputMode: record.outputMode,
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
        url: URL.createObjectURL(result.blob),
      })),
    }))
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
