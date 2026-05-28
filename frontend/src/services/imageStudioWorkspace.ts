const WORKSPACE_ID_STORAGE_KEY = 'image-studio.workspace-id'
const WORKSPACE_TOKEN_STORAGE_KEY = 'image-studio.workspace-token'

export interface ImageStudioWorkspaceIdentity {
  id: string
  token: string
}

function createRandomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`
}

function readStorageValue(key: string): string {
  if (typeof window === 'undefined') {
    return ''
  }
  try {
    return window.localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function writeStorageValue(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* ignore unavailable local storage */
  }
}

export function getImageStudioWorkspaceIdentity(): ImageStudioWorkspaceIdentity {
  const id = readStorageValue(WORKSPACE_ID_STORAGE_KEY) || createRandomId('ws')
  const token = readStorageValue(WORKSPACE_TOKEN_STORAGE_KEY) || createRandomId('wst')

  writeStorageValue(WORKSPACE_ID_STORAGE_KEY, id)
  writeStorageValue(WORKSPACE_TOKEN_STORAGE_KEY, token)

  return { id, token }
}

export function maskImageStudioWorkspaceId(id: string): string {
  if (id.length <= 16) {
    return id
  }
  return `${id.slice(0, 10)}...${id.slice(-6)}`
}
