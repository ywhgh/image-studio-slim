import type { ImageStudioHistoryItem, NormalizedImageResult } from '@/types/imageStudio'

const DB_NAME = 'sub2api-image-studio'
const DB_VERSION = 1
const STORE_NAME = 'generations'

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
  model: string
  prompt: string
  aspectRatio: string
  count: number
  referenceImageUrl?: string
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

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((db) =>
    new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const store = tx.objectStore(STORE_NAME)
      const request = fn(store)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      tx.oncomplete = () => db.close()
      tx.onerror = () => {
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

  return {
    id: result.id,
    source: result.source,
    mimeType: result.mimeType,
    revisedPrompt: result.revisedPrompt,
    filename: result.filename,
    originalUrl: result.originalUrl || result.url,
    blob: result.blob,
  }
}

export async function saveImageStudioHistoryItem(item: ImageStudioHistoryItem): Promise<void> {
  const storedResults = item.results
    .map(toStoredResult)
    .filter((result): result is StoredImageStudioResult => !!result)

  const payload: StoredImageStudioHistoryItem = {
    id: item.id,
    createdAt: item.createdAt,
    providerMode: item.providerMode,
    profile: item.profile,
    model: item.model,
    prompt: item.prompt,
    aspectRatio: item.aspectRatio,
    count: item.count,
    referenceImageUrl: item.referenceImageUrl,
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

      store.put({
        id: item.id,
        createdAt: item.createdAt,
        providerMode: item.providerMode,
        profile: item.profile,
        model: item.model,
        prompt: item.prompt,
        aspectRatio: item.aspectRatio,
        count: storedResults.length,
        referenceImageUrl: item.referenceImageUrl,
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((record) => ({
      id: record.id,
      createdAt: record.createdAt,
      providerMode: record.providerMode,
      profile: record.profile,
      model: record.model,
      prompt: record.prompt,
      aspectRatio: record.aspectRatio,
      count: record.count,
      referenceImageUrl: record.referenceImageUrl,
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
