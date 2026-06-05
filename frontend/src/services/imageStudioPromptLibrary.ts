const DB_NAME = 'sub2api-image-studio-prompt-library'
const DB_VERSION = 2
const STORE_NAME = 'prompts'
const REMOTE_IMAGE_CACHE_STORE_NAME = 'remotePromptImages'
const REMOTE_API_BASE = (import.meta.env.VITE_PROMPT_LIBRARY_API_BASE || '').trim().replace(/\/+$/, '')
const REMOTE_API_TOKEN = (import.meta.env.VITE_PROMPT_LIBRARY_TOKEN || '').trim()
const PROMPT_LIBRARY_STORAGE_MODE = (import.meta.env.VITE_PROMPT_LIBRARY_STORAGE_MODE || 'remote').trim()
const REMOTE_READ_TIMEOUT_MS = 12000
const REMOTE_WRITE_TIMEOUT_MS = 180000

export interface ImageStudioPromptLibraryInput {
  title: string
  description?: string
  prompt: string
  category?: string
  imageBlob?: Blob
  imageBlobs?: Blob[]
  imageMimeType?: string
  imageMimeTypes?: string[]
  imageFilename?: string
  imageFilenames?: string[]
  removeImage?: boolean
}

interface StoredPromptLibraryItem extends ImageStudioPromptLibraryInput {
  id: string
  createdAt: string
}

interface StoredRemotePromptImageCache {
  id: string
  updatedAt: string
  imageBlob?: Blob
  imageBlobs?: Blob[]
  imageMimeType?: string
  imageMimeTypes?: string[]
  imageFilename?: string
  imageFilenames?: string[]
}

export interface ImageStudioPromptLibraryItem extends StoredPromptLibraryItem {
  imageKey?: string
  imageKeys?: string[]
  imageUrl?: string
  imageUrls?: string[]
  remote?: boolean
}

interface RemotePromptLibraryItem {
  id: string
  title?: string
  description?: string
  prompt?: string
  category?: string
  imageKey?: string
  imageKeys?: string[]
  imageUrl?: string
  imageUrls?: string[]
  imageMimeType?: string
  imageMimeTypes?: string[]
  imageFilename?: string
  imageFilenames?: string[]
  createdAt?: string
}

function normalizeRemotePromptLibraryItem(record: RemotePromptLibraryItem): ImageStudioPromptLibraryItem {
  const imageUrls = normalizeRemotePromptLibraryImageUrls(record)
    .map((url) => addRemoteTokenToUrl(url))
    .filter((url): url is string => !!url)
  return {
    id: record.id,
    createdAt: record.createdAt || new Date(0).toISOString(),
    title: record.title?.trim() || 'Uploaded prompt',
    description: record.description?.trim() || '',
    prompt: record.prompt?.trim() || '',
    category: record.category?.trim() || '',
    imageKey: record.imageKey || record.imageKeys?.[0],
    imageKeys: record.imageKeys,
    imageMimeType: record.imageMimeType || record.imageMimeTypes?.[0],
    imageMimeTypes: record.imageMimeTypes,
    imageFilename: record.imageFilename || record.imageFilenames?.[0],
    imageFilenames: record.imageFilenames,
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length ? imageUrls : undefined,
    remote: true,
  }
}

function normalizeRemotePromptLibraryImageUrls(record: RemotePromptLibraryItem): string[] {
  const urls = normalizePromptLibraryImageUrls(record.imageUrls, record.imageUrl)
  if (urls.length > 1 || !record.imageUrl) {
    return urls
  }

  const inferredCount = Math.max(
    Array.isArray(record.imageKeys) ? record.imageKeys.length : 0,
    Array.isArray(record.imageMimeTypes) ? record.imageMimeTypes.length : 0,
    Array.isArray(record.imageFilenames) ? record.imageFilenames.length : 0
  )
  if (inferredCount <= 1) {
    return urls
  }

  const inferredUrls = Array.from({ length: Math.min(inferredCount, 5) }, (_, index) => (
    deriveIndexedPromptImageUrl(record.imageUrl || '', index)
  )).filter((url): url is string => !!url)

  return inferredUrls.length > 1 ? inferredUrls : urls
}

function deriveIndexedPromptImageUrl(rawUrl: string, index: number): string {
  if (!rawUrl.trim()) return ''
  try {
    const url = new URL(rawUrl, window.location.origin)
    if (/\/image\/\d+$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/image\/\d+$/i, `/image/${index}`)
      return url.toString()
    }
    if (/\/image$/i.test(url.pathname)) {
      url.pathname = `${url.pathname}/${index}`
      return url.toString()
    }
  } catch {
    if (/\/image\/\d+($|[?#])/i.test(rawUrl)) {
      return rawUrl.replace(/\/image\/\d+($|[?#])/i, `/image/${index}$1`)
    }
    if (/\/image($|[?#])/i.test(rawUrl)) {
      return rawUrl.replace(/\/image($|[?#])/i, `/image/${index}$1`)
    }
  }
  return index === 0 ? rawUrl : ''
}

function remoteEnabled(): boolean {
  return PROMPT_LIBRARY_STORAGE_MODE !== 'local' && REMOTE_API_BASE !== ''
}

export function isImageStudioPromptLibraryRemoteEnabled(): boolean {
  return remoteEnabled()
}

function remoteHeaders(): HeadersInit {
  if (!REMOTE_API_TOKEN) return {}
  return {
    Authorization: `Bearer ${REMOTE_API_TOKEN}`,
  }
}

function remoteJsonHeaders(): HeadersInit {
  return {
    ...remoteHeaders(),
    'Content-Type': 'application/json',
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Failed to read prompt preview image.'))
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read prompt preview image.'))
    reader.readAsDataURL(blob)
  })
}

async function buildPromptLibraryJson(input: ImageStudioPromptLibraryInput) {
  const imageBlobs = normalizePromptLibraryImageBlobs(input)
  const imageDataUrls = await Promise.all(imageBlobs.map((blob) => blobToDataUrl(blob)))
  const imageMimeTypes = imageBlobs.map((blob, index) => (
    input.imageMimeTypes?.[index] || blob.type || input.imageMimeType || ''
  ))
  const imageFilenames = imageBlobs.map((_, index) => (
    input.imageFilenames?.[index]
      || (index === 0 ? input.imageFilename : '')
      || `preview-image-${index + 1}`
  ))
  return {
    title: input.title.trim(),
    description: input.description?.trim() || '',
    prompt: input.prompt.trim(),
    category: input.category?.trim() || '',
    removeImage: !!input.removeImage,
    imageDataUrl: imageDataUrls[0],
    imageDataUrls: imageDataUrls.length ? imageDataUrls : undefined,
    imageMimeType: imageMimeTypes[0],
    imageMimeTypes: imageMimeTypes.length ? imageMimeTypes : undefined,
    imageFilename: imageFilenames[0] || 'preview-image',
    imageFilenames: imageFilenames.length ? imageFilenames : undefined,
  }
}

function normalizePromptLibraryImageBlobs(input: ImageStudioPromptLibraryInput): Blob[] {
  if (input.imageBlobs?.length) {
    return input.imageBlobs.filter((blob): blob is Blob => blob instanceof Blob).slice(0, 5)
  }
  return input.imageBlob ? [input.imageBlob] : []
}

function addRemoteTokenToUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl || !REMOTE_API_TOKEN) return rawUrl
  try {
    const url = new URL(rawUrl, window.location.origin)
    url.searchParams.set('token', REMOTE_API_TOKEN)
    return url.toString()
  } catch {
    return rawUrl
  }
}

async function parseRemoteError(response: Response): Promise<string> {
  try {
    const payload = await response.json()
    const message = payload?.error?.message || payload?.message || payload?.error
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  } catch {
    /* ignore body parse errors */
  }
  return `Prompt library request failed (${response.status})`
}

async function fetchRemote(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (timedOut || controller.signal.aborted) {
      throw new Error(`Prompt library request timed out after ${Math.round(timeoutMs / 1000)}s.`)
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

async function buildRemotePromptLibraryRequest(input: ImageStudioPromptLibraryInput): Promise<{
  body: BodyInit
  headers: HeadersInit
}> {
  return {
    body: JSON.stringify(await buildPromptLibraryJson(input)),
    headers: remoteJsonHeaders(),
  }
}

async function saveRemotePromptLibraryItem(input: ImageStudioPromptLibraryInput): Promise<ImageStudioPromptLibraryItem> {
  const request = await buildRemotePromptLibraryRequest(input)
  const response = await fetchRemote(`${REMOTE_API_BASE}/prompts`, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  }, REMOTE_WRITE_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(await parseRemoteError(response))
  }
  const payload = await response.json()
  const id = payload?.data?.id || payload?.id
  if (typeof id !== 'string' || !id) {
    throw new Error('Prompt library did not return an id.')
  }
  await saveRemotePromptImageCache(id, input)
  const item = normalizeRemotePromptLibraryItem({
    ...payload?.data,
    ...payload,
    id,
  })
  const cache = await listRemotePromptImageCache()
  return mergePromptWithCachedImages(item, cache.get(id))
}

async function updateRemotePromptLibraryItem(id: string, input: ImageStudioPromptLibraryInput): Promise<ImageStudioPromptLibraryItem> {
  const request = await buildRemotePromptLibraryRequest(input)
  const response = await fetchRemote(`${REMOTE_API_BASE}/prompts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: request.headers,
    body: request.body,
  }, REMOTE_WRITE_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(await parseRemoteError(response))
  }
  await saveRemotePromptImageCache(id, input)
  const payload = await response.json()
  const item = normalizeRemotePromptLibraryItem({
    ...payload?.data,
    ...payload,
    id,
  })
  const cache = await listRemotePromptImageCache()
  return mergePromptWithCachedImages(item, cache.get(id))
}

async function listRemotePromptLibraryItems(): Promise<ImageStudioPromptLibraryItem[]> {
  const response = await fetchRemote(`${REMOTE_API_BASE}/prompts`, {
    headers: remoteHeaders(),
  }, REMOTE_READ_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(await parseRemoteError(response))
  }
  const payload = await response.json()
  const records: RemotePromptLibraryItem[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : []

  const cache = await listRemotePromptImageCache()
  return records
    .filter((record) => typeof record.prompt === 'string' && record.prompt.trim())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map(normalizeRemotePromptLibraryItem)
    .map((item) => mergePromptWithCachedImages(item, cache.get(item.id)))
}

function normalizePromptLibraryImageUrls(imageUrls?: string[], imageUrl?: string): string[] {
  const urls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === 'string' && url.trim()).map((url) => url.trim())
    : []
  if (!urls.length && imageUrl?.trim()) {
    urls.push(imageUrl.trim())
  }
  return urls.slice(0, 5)
}

async function saveRemotePromptImageCache(id: string, input: ImageStudioPromptLibraryInput): Promise<void> {
  try {
    const imageBlobs = normalizePromptLibraryImageBlobs(input)
    if (input.removeImage) {
      await withRemoteImageCacheStore('readwrite', (store) => store.delete(id))
      return
    }
    if (!imageBlobs.length) {
      return
    }

    const payload: StoredRemotePromptImageCache = {
      id,
      updatedAt: new Date().toISOString(),
      imageBlob: imageBlobs[0],
      imageBlobs,
      imageMimeType: input.imageMimeType || input.imageMimeTypes?.[0],
      imageMimeTypes: input.imageMimeTypes,
      imageFilename: input.imageFilename || input.imageFilenames?.[0],
      imageFilenames: input.imageFilenames,
    }
    await withRemoteImageCacheStore('readwrite', (store) => store.put(payload))
  } catch {
    /* Remote image cache is a local fallback; remote writes should not fail because of it. */
  }
}

async function deleteRemotePromptImageCache(id: string): Promise<void> {
  try {
    await withRemoteImageCacheStore('readwrite', (store) => store.delete(id))
  } catch {
    /* ignore local cache cleanup errors */
  }
}

async function listRemotePromptImageCache(): Promise<Map<string, ImageStudioPromptLibraryItem>> {
  const cache = new Map<string, ImageStudioPromptLibraryItem>()
  let records: StoredRemotePromptImageCache[] = []
  try {
    records = await withRemoteImageCacheStore<StoredRemotePromptImageCache[]>('readonly', (store) => store.getAll())
  } catch {
    return cache
  }
  ;(records || []).forEach((record) => {
    const imageBlobs = record.imageBlobs?.length
      ? record.imageBlobs
      : (record.imageBlob ? [record.imageBlob] : [])
    if (!imageBlobs.length) return
    const imageUrls = imageBlobs.map((blob) => URL.createObjectURL(blob))
    cache.set(record.id, {
      id: record.id,
      createdAt: record.updatedAt,
      title: '',
      prompt: '',
      imageBlob: imageBlobs[0],
      imageBlobs,
      imageMimeType: record.imageMimeType || record.imageMimeTypes?.[0],
      imageMimeTypes: record.imageMimeTypes,
      imageFilename: record.imageFilename || record.imageFilenames?.[0],
      imageFilenames: record.imageFilenames,
      imageUrl: imageUrls[0],
      imageUrls: imageUrls.length ? imageUrls : undefined,
      remote: true,
    })
  })
  return cache
}

function mergePromptWithCachedImages(
  item: ImageStudioPromptLibraryItem,
  cached: ImageStudioPromptLibraryItem | undefined
): ImageStudioPromptLibraryItem {
  if (!cached?.imageUrls || cached.imageUrls.length <= 1) return item
  const remoteImageCount = item.imageUrls?.length || (item.imageUrl ? 1 : 0)
  if (remoteImageCount > 1) return item
  return {
    ...item,
    imageBlob: cached.imageBlob,
    imageBlobs: cached.imageBlobs,
    imageMimeType: cached.imageMimeType || item.imageMimeType,
    imageMimeTypes: cached.imageMimeTypes || item.imageMimeTypes,
    imageFilename: cached.imageFilename || item.imageFilename,
    imageFilenames: cached.imageFilenames || item.imageFilenames,
    imageUrl: cached.imageUrl || item.imageUrl,
    imageUrls: cached.imageUrls,
  }
}

async function deleteRemotePromptLibraryItem(id: string): Promise<void> {
  const response = await fetchRemote(`${REMOTE_API_BASE}/prompts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: remoteHeaders(),
  }, REMOTE_READ_TIMEOUT_MS)
  if (!response.ok && response.status !== 404) {
    throw new Error(await parseRemoteError(response))
  }
  await deleteRemotePromptImageCache(id)
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `prompt-${Date.now()}-${Math.random().toString(16).slice(2)}`
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
      if (!db.objectStoreNames.contains(REMOTE_IMAGE_CACHE_STORE_NAME)) {
        db.createObjectStore(REMOTE_IMAGE_CACHE_STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

function withNamedStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then((db) =>
    new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode)
      const store = tx.objectStore(storeName)
      const request = fn(store)
      let result: T

      request.onerror = () => reject(request.error)
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

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return withNamedStore(STORE_NAME, mode, fn)
}

function withRemoteImageCacheStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return withNamedStore(REMOTE_IMAGE_CACHE_STORE_NAME, mode, fn)
}

export async function saveImageStudioPromptLibraryItem(input: ImageStudioPromptLibraryInput): Promise<ImageStudioPromptLibraryItem> {
  if (remoteEnabled()) {
    return saveRemotePromptLibraryItem(input)
  }

  const imageBlobs = normalizePromptLibraryImageBlobs(input)
  const payload: StoredPromptLibraryItem = {
    id: createId(),
    createdAt: new Date().toISOString(),
    title: input.title.trim(),
    description: input.description?.trim() || '',
    prompt: input.prompt.trim(),
    category: input.category?.trim() || '',
    imageBlob: imageBlobs[0],
    imageBlobs,
    imageMimeType: input.imageMimeType || input.imageMimeTypes?.[0],
    imageMimeTypes: input.imageMimeTypes,
    imageFilename: input.imageFilename || input.imageFilenames?.[0],
    imageFilenames: input.imageFilenames,
  }

  await withStore('readwrite', (store) => store.put(payload))
  const imageUrls = imageBlobs.map((blob) => URL.createObjectURL(blob))
  return {
    ...payload,
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length ? imageUrls : undefined,
  }
}

export async function updateImageStudioPromptLibraryItem(id: string, input: ImageStudioPromptLibraryInput): Promise<ImageStudioPromptLibraryItem> {
  if (remoteEnabled()) {
    return updateRemotePromptLibraryItem(id, input)
  }

  const existing = await withStore<StoredPromptLibraryItem | undefined>('readonly', (store) => store.get(id))
  if (!existing) {
    throw new Error('Prompt library item not found.')
  }

  const payload: StoredPromptLibraryItem = {
    ...existing,
    title: input.title.trim(),
    description: input.description?.trim() || '',
    prompt: input.prompt.trim(),
    category: input.category?.trim() || '',
  }

  if (input.removeImage) {
    delete payload.imageBlob
    delete payload.imageBlobs
    delete payload.imageMimeType
    delete payload.imageMimeTypes
    delete payload.imageFilename
    delete payload.imageFilenames
  }

  const imageBlobs = normalizePromptLibraryImageBlobs(input)
  if (imageBlobs.length) {
    payload.imageBlob = imageBlobs[0]
    payload.imageBlobs = imageBlobs
    payload.imageMimeType = input.imageMimeType || input.imageMimeTypes?.[0]
    payload.imageMimeTypes = input.imageMimeTypes
    payload.imageFilename = input.imageFilename || input.imageFilenames?.[0]
    payload.imageFilenames = input.imageFilenames
  }

  await withStore('readwrite', (store) => store.put(payload))
  const imageBlobsForUrls = payload.imageBlobs?.length
    ? payload.imageBlobs
    : (payload.imageBlob ? [payload.imageBlob] : [])
  const imageUrls = imageBlobsForUrls.map((blob) => URL.createObjectURL(blob))
  return {
    ...payload,
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length ? imageUrls : undefined,
  }
}

export async function listImageStudioPromptLibraryItems(): Promise<ImageStudioPromptLibraryItem[]> {
  if (remoteEnabled()) {
    return listRemotePromptLibraryItems()
  }

  const records = await withStore<StoredPromptLibraryItem[]>('readonly', (store) => store.getAll())

  return (records || [])
    .filter((record) => record.prompt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((record) => {
      const imageBlobs = record.imageBlobs?.length
        ? record.imageBlobs
        : (record.imageBlob ? [record.imageBlob] : [])
      const imageUrls = imageBlobs.map((blob) => URL.createObjectURL(blob))
      return {
        ...record,
        imageUrl: imageUrls[0],
        imageUrls: imageUrls.length ? imageUrls : undefined,
      }
    })
}

export async function deleteImageStudioPromptLibraryItem(id: string): Promise<void> {
  if (remoteEnabled()) {
    await deleteRemotePromptLibraryItem(id)
    return
  }

  await withStore('readwrite', (store) => store.delete(id))
}

export function revokeImageStudioPromptLibraryItems(items: ImageStudioPromptLibraryItem[]): void {
  items.forEach((item) => {
    const urls = item.imageUrls?.length ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : [])
    urls.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
  })
}
