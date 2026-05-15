const DB_NAME = 'sub2api-image-studio-prompt-library'
const DB_VERSION = 1
const STORE_NAME = 'prompts'

export interface ImageStudioPromptLibraryInput {
  title: string
  description?: string
  prompt: string
  category?: string
  imageBlob?: Blob
  imageMimeType?: string
  imageFilename?: string
}

interface StoredPromptLibraryItem extends ImageStudioPromptLibraryInput {
  id: string
  createdAt: string
}

export interface ImageStudioPromptLibraryItem extends StoredPromptLibraryItem {
  imageUrl?: string
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

export async function listImageStudioPromptLibraryItems(): Promise<ImageStudioPromptLibraryItem[]> {
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
  await withStore('readwrite', (store) => store.delete(id))
}

export function revokeImageStudioPromptLibraryItems(items: ImageStudioPromptLibraryItem[]): void {
  items.forEach((item) => {
    if (item.imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.imageUrl)
    }
  })
}
