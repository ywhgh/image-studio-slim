const DB_NAME = 'sub2api-image-studio-prompt-library'
const DB_VERSION = 1
const STORE_NAME = 'prompts'
const REMOTE_API_BASE = (import.meta.env.VITE_PROMPT_LIBRARY_API_BASE || '').trim().replace(/\/+$/, '')
const REMOTE_API_TOKEN = (import.meta.env.VITE_PROMPT_LIBRARY_TOKEN || '').trim()
const REMOTE_READ_TIMEOUT_MS = 12000
const REMOTE_WRITE_TIMEOUT_MS = 60000

export interface ImageStudioPromptLibraryInput {
  title: string
  description?: string
  prompt: string
  category?: string
  imageBlob?: Blob
  imageMimeType?: string
  imageFilename?: string
  removeImage?: boolean
}

interface StoredPromptLibraryItem extends ImageStudioPromptLibraryInput {
  id: string
  createdAt: string
}

export interface ImageStudioPromptLibraryItem extends StoredPromptLibraryItem {
  imageUrl?: string
  remote?: boolean
}

interface RemotePromptLibraryItem {
  id: string
  title?: string
  description?: string
  prompt?: string
  category?: string
  imageUrl?: string
  imageMimeType?: string
  imageFilename?: string
  createdAt?: string
}

function remoteEnabled(): boolean {
  return REMOTE_API_BASE !== ''
}

function remoteHeaders(): HeadersInit {
  if (!REMOTE_API_TOKEN) return {}
  return {
    Authorization: `Bearer ${REMOTE_API_TOKEN}`,
  }
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
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

async function saveRemotePromptLibraryItem(input: ImageStudioPromptLibraryInput): Promise<string> {
  const form = new FormData()
  form.set('title', input.title.trim())
  form.set('description', input.description?.trim() || '')
  form.set('prompt', input.prompt.trim())
  form.set('category', input.category?.trim() || '')
  if (input.imageBlob) {
    form.set('image', input.imageBlob, input.imageFilename || 'preview-image')
  }

  const response = await fetchRemote(`${REMOTE_API_BASE}/prompts`, {
    method: 'POST',
    headers: remoteHeaders(),
    body: form,
  }, REMOTE_WRITE_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(await parseRemoteError(response))
  }
  const payload = await response.json()
  const id = payload?.data?.id || payload?.id
  if (typeof id !== 'string' || !id) {
    throw new Error('Prompt library did not return an id.')
  }
  return id
}

function buildPromptLibraryForm(input: ImageStudioPromptLibraryInput): FormData {
  const form = new FormData()
  form.set('title', input.title.trim())
  form.set('description', input.description?.trim() || '')
  form.set('prompt', input.prompt.trim())
  form.set('category', input.category?.trim() || '')
  if (input.removeImage) {
    form.set('removeImage', '1')
  }
  if (input.imageBlob) {
    form.set('image', input.imageBlob, input.imageFilename || 'preview-image')
  }
  return form
}

async function updateRemotePromptLibraryItem(id: string, input: ImageStudioPromptLibraryInput): Promise<void> {
  const response = await fetchRemote(`${REMOTE_API_BASE}/prompts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: remoteHeaders(),
    body: buildPromptLibraryForm(input),
  }, REMOTE_WRITE_TIMEOUT_MS)
  if (!response.ok) {
    throw new Error(await parseRemoteError(response))
  }
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

  return records
    .filter((record) => typeof record.prompt === 'string' && record.prompt.trim())
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map((record) => ({
      id: record.id,
      createdAt: record.createdAt || new Date(0).toISOString(),
      title: record.title?.trim() || 'Uploaded prompt',
      description: record.description?.trim() || '',
      prompt: record.prompt?.trim() || '',
      category: record.category?.trim() || '',
      imageMimeType: record.imageMimeType,
      imageFilename: record.imageFilename,
      imageUrl: addRemoteTokenToUrl(record.imageUrl),
      remote: true,
    }))
}

async function deleteRemotePromptLibraryItem(id: string): Promise<void> {
  const response = await fetchRemote(`${REMOTE_API_BASE}/prompts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: remoteHeaders(),
  }, REMOTE_READ_TIMEOUT_MS)
  if (!response.ok && response.status !== 404) {
    throw new Error(await parseRemoteError(response))
  }
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
      tx.onabort = () => {
        db.close()
        reject(tx.error)
      }
    })
  )
}

export async function saveImageStudioPromptLibraryItem(input: ImageStudioPromptLibraryInput): Promise<string> {
  if (remoteEnabled()) {
    return saveRemotePromptLibraryItem(input)
  }

  const payload: StoredPromptLibraryItem = {
    id: createId(),
    createdAt: new Date().toISOString(),
    title: input.title.trim(),
    description: input.description?.trim() || '',
    prompt: input.prompt.trim(),
    category: input.category?.trim() || '',
    imageBlob: input.imageBlob,
    imageMimeType: input.imageMimeType,
    imageFilename: input.imageFilename,
  }

  await withStore('readwrite', (store) => store.put(payload))
  return payload.id
}

export async function updateImageStudioPromptLibraryItem(id: string, input: ImageStudioPromptLibraryInput): Promise<void> {
  if (remoteEnabled()) {
    await updateRemotePromptLibraryItem(id, input)
    return
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
    delete payload.imageMimeType
    delete payload.imageFilename
  }

  if (input.imageBlob) {
    payload.imageBlob = input.imageBlob
    payload.imageMimeType = input.imageMimeType
    payload.imageFilename = input.imageFilename
  }

  await withStore('readwrite', (store) => store.put(payload))
}

export async function listImageStudioPromptLibraryItems(): Promise<ImageStudioPromptLibraryItem[]> {
  if (remoteEnabled()) {
    return listRemotePromptLibraryItems()
  }

  const records = await withStore<StoredPromptLibraryItem[]>('readonly', (store) => store.getAll())

  return (records || [])
    .filter((record) => record.prompt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((record) => ({
      ...record,
      imageUrl: record.imageBlob ? URL.createObjectURL(record.imageBlob) : undefined,
    }))
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
    if (item.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.imageUrl)
    }
  })
}
