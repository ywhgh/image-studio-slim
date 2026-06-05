interface Env {
  PROMPT_BUCKET: R2Bucket
  PROMPT_LIBRARY_TOKEN?: string
  ALLOWED_ORIGINS?: string
}

interface PromptRecord {
  id: string
  title: string
  description: string
  prompt: string
  category: string
  imageKey?: string
  imageKeys?: string[]
  imageMimeType?: string
  imageMimeTypes?: string[]
  imageFilename?: string
  imageFilenames?: string[]
  createdAt: string
}

type PromptImageUpload = File

interface PromptImagePayload {
  size: number
  mimeType: string
  filename: string
  body: ReadableStream | ArrayBuffer
}

interface PromptPayload {
  title: string
  description: string
  prompt: string
  category: string
  removeImage: boolean
  image?: PromptImagePayload
  images: PromptImagePayload[]
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_COUNT = 5
const PROMPT_PREFIX = 'prompts/'
const IMAGE_PREFIX = 'images/'

function json(data: unknown, init: ResponseInit = {}, request?: Request, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
      ...init.headers,
    },
  })
}

function corsHeaders(request?: Request, env?: Env): HeadersInit {
  const origin = request?.headers.get('Origin') || ''
  const configured = (env?.ALLOWED_ORIGINS || '*').split(',').map((item) => item.trim()).filter(Boolean)
  const allowAny = configured.length === 0 || configured.includes('*')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Prompt-Library-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
  if (allowAny) {
    headers['Access-Control-Allow-Origin'] = '*'
  } else if (origin && configured.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function readToken(request: Request): string {
  const auth = request.headers.get('Authorization') || ''
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (bearer) return bearer
  const header = request.headers.get('X-Prompt-Library-Token') || ''
  if (header.trim()) return header.trim()
  return new URL(request.url).searchParams.get('token')?.trim() || ''
}

function isAuthorized(request: Request, env: Env): boolean {
  const expected = env.PROMPT_LIBRARY_TOKEN?.trim()
  if (!expected) return true
  return readToken(request) === expected
}

function requireAuth(request: Request, env: Env): Response | null {
  if (isAuthorized(request, env)) return null
  return json(
    { error: { code: 'unauthorized', message: 'Invalid prompt library token.' } },
    { status: 401 },
    request,
    env
  )
}

function cleanText(value: FormDataEntryValue | null, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function cleanJsonText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function objectKeyForPrompt(id: string): string {
  return `${PROMPT_PREFIX}${id}.json`
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'image/gif':
      return '.gif'
    case 'image/avif':
      return '.avif'
    default:
      return '.bin'
  }
}

function isPromptImageUpload(value: FormDataEntryValue | null): value is PromptImageUpload {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<PromptImageUpload>
  return (
    typeof candidate.size === 'number' &&
    typeof candidate.type === 'string' &&
    typeof candidate.stream === 'function'
  )
}

function promptImageFilename(image: PromptImageUpload, fallback: string): string {
  return typeof image.name === 'string' && image.name.trim()
    ? image.name.trim()
    : fallback
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function parseDataUrlImage(
  value: unknown,
  mimeType?: unknown,
  filename?: unknown
): PromptImagePayload | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined
  }

  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value.trim())
  if (!match) {
    return undefined
  }

  const resolvedMimeType = cleanJsonText(mimeType, match[1] || 'application/octet-stream')
  const rawData = match[3] || ''
  let bytes: Uint8Array
  if (match[2]) {
    const binary = atob(rawData)
    bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(rawData))
  }

  return {
    size: bytes.byteLength,
    mimeType: resolvedMimeType,
    filename: cleanJsonText(filename, `preview${extensionForMimeType(resolvedMimeType)}`),
    body: arrayBufferFromBytes(bytes),
  }
}

function parseDataUrlImages(
  values: unknown,
  mimeTypes?: unknown,
  filenames?: unknown
): PromptImagePayload[] {
  if (!Array.isArray(values)) {
    return []
  }
  return values
    .slice(0, MAX_IMAGE_COUNT)
    .map((value, index) => parseDataUrlImage(
      value,
      Array.isArray(mimeTypes) ? mimeTypes[index] : undefined,
      Array.isArray(filenames) ? filenames[index] : undefined
    ))
    .filter((image): image is PromptImagePayload => !!image)
}

async function readPromptPayload(request: Request): Promise<PromptPayload> {
  const contentType = request.headers.get('Content-Type') || ''
  if (contentType.toLowerCase().includes('application/json')) {
    const body = await request.json<Record<string, unknown>>()
    const images = parseDataUrlImages(body.imageDataUrls, body.imageMimeTypes, body.imageFilenames)
    const fallbackImage = parseDataUrlImage(body.imageDataUrl, body.imageMimeType, body.imageFilename)
    return {
      title: cleanJsonText(body.title, 'Uploaded prompt'),
      description: cleanJsonText(body.description),
      prompt: cleanJsonText(body.prompt),
      category: cleanJsonText(body.category),
      removeImage: body.removeImage === true || body.removeImage === '1',
      image: images[0] || fallbackImage,
      images: images.length ? images : (fallbackImage ? [fallbackImage] : []),
    }
  }

  const form = await request.formData()
  const images = form.getAll('image')
    .filter(isPromptImageUpload)
    .filter((image) => image.size > 0)
    .slice(0, MAX_IMAGE_COUNT)
    .map((image) => ({
      size: image.size,
      mimeType: image.type || 'application/octet-stream',
      filename: promptImageFilename(image, `preview${extensionForMimeType(image.type || 'application/octet-stream')}`),
      body: image.stream(),
    }))

  return {
    title: cleanText(form.get('title'), 'Uploaded prompt'),
    description: cleanText(form.get('description')),
    prompt: cleanText(form.get('prompt')),
    category: cleanText(form.get('category')),
    removeImage: cleanText(form.get('removeImage')) === '1',
    image: images[0],
    images,
  }
}

function validatePromptImage(image: PromptImagePayload, request: Request, env: Env): Response | null {
  if (!image.mimeType.startsWith('image/')) {
    return json({ error: { code: 'invalid_image', message: 'image must be an image file.' } }, { status: 400 }, request, env)
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return json({ error: { code: 'image_too_large', message: 'image exceeds 20 MB.' } }, { status: 413 }, request, env)
  }
  return null
}

async function savePromptImage(
  bucket: R2Bucket,
  id: string,
  image: PromptImagePayload,
  index = 0
): Promise<Pick<PromptRecord, 'imageKey' | 'imageMimeType' | 'imageFilename'>> {
  const suffix = index > 0 ? `-${index + 1}` : ''
  const imageKey = `${IMAGE_PREFIX}${id}${suffix}${extensionForMimeType(image.mimeType)}`
  await bucket.put(imageKey, image.body, {
    httpMetadata: {
      contentType: image.mimeType,
    },
  })
  return {
    imageKey,
    imageMimeType: image.mimeType,
    imageFilename: image.filename,
  }
}

async function savePromptImages(
  bucket: R2Bucket,
  id: string,
  images: PromptImagePayload[]
): Promise<Pick<PromptRecord, 'imageKey' | 'imageKeys' | 'imageMimeType' | 'imageMimeTypes' | 'imageFilename' | 'imageFilenames'>> {
  const storedImages = await Promise.all(images.slice(0, MAX_IMAGE_COUNT).map((image, index) => (
    savePromptImage(bucket, id, image, index)
  )))
  return {
    imageKey: storedImages[0]?.imageKey,
    imageKeys: storedImages.map((image) => image.imageKey).filter((key): key is string => !!key),
    imageMimeType: storedImages[0]?.imageMimeType,
    imageMimeTypes: storedImages.map((image) => image.imageMimeType || ''),
    imageFilename: storedImages[0]?.imageFilename,
    imageFilenames: storedImages.map((image) => image.imageFilename || ''),
  }
}

async function readPromptRecord(bucket: R2Bucket, id: string): Promise<PromptRecord | null> {
  const object = await bucket.get(objectKeyForPrompt(id))
  if (!object) return null
  return object.json<PromptRecord>()
}

function normalizeRecordImageKeys(record: PromptRecord): string[] {
  const keys = Array.isArray(record.imageKeys)
    ? record.imageKeys.filter((key) => typeof key === 'string' && key)
    : []
  if (!keys.length && record.imageKey) {
    keys.push(record.imageKey)
  }
  return keys.slice(0, MAX_IMAGE_COUNT)
}

function publicPrompt(record: PromptRecord, request: Request): PromptRecord & { imageUrl?: string; imageUrls?: string[] } {
  const url = new URL(request.url)
  const imageKeys = normalizeRecordImageKeys(record)
  const imageUrls = imageKeys.map((_, index) => (
    `${url.origin}/api/prompts/${encodeURIComponent(record.id)}/image/${index}`
  ))
  return {
    ...record,
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length ? imageUrls : undefined,
  }
}

async function listPrompts(request: Request, env: Env): Promise<Response> {
  const listed = await env.PROMPT_BUCKET.list({ prefix: PROMPT_PREFIX, limit: 1000 })
  const records = await Promise.all(
    listed.objects
      .filter((object) => object.key.endsWith('.json'))
      .map(async (object) => {
        const stored = await env.PROMPT_BUCKET.get(object.key)
        return stored ? stored.json<PromptRecord>() : null
      })
  )
  const data = records
    .filter((record): record is PromptRecord => !!record && !!record.prompt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((record) => publicPrompt(record, request))

  return json({ data }, undefined, request, env)
}

async function createPrompt(request: Request, env: Env): Promise<Response> {
  const payload = await readPromptPayload(request)
  if (!payload.prompt) {
    return json({ error: { code: 'invalid_request', message: 'prompt is required.' } }, { status: 400 }, request, env)
  }

  const id = crypto.randomUUID()
  let imageKey: string | undefined
  let imageKeys: string[] | undefined
  let imageMimeType: string | undefined
  let imageMimeTypes: string[] | undefined
  let imageFilename: string | undefined
  let imageFilenames: string[] | undefined

  if (payload.images.length) {
    for (const image of payload.images) {
      const imageError = validatePromptImage(image, request, env)
      if (imageError) return imageError
    }
    const storedImages = await savePromptImages(env.PROMPT_BUCKET, id, payload.images)
    imageKey = storedImages.imageKey
    imageKeys = storedImages.imageKeys
    imageMimeType = storedImages.imageMimeType
    imageMimeTypes = storedImages.imageMimeTypes
    imageFilename = storedImages.imageFilename
    imageFilenames = storedImages.imageFilenames
  }

  const record: PromptRecord = {
    id,
    title: payload.title || 'Uploaded prompt',
    description: payload.description,
    prompt: payload.prompt,
    category: payload.category,
    imageKey,
    imageKeys,
    imageMimeType,
    imageMimeTypes,
    imageFilename,
    imageFilenames,
    createdAt: new Date().toISOString(),
  }

  await env.PROMPT_BUCKET.put(objectKeyForPrompt(id), JSON.stringify(record), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
    },
  })

  return json({ data: publicPrompt(record, request) }, { status: 201 }, request, env)
}

async function updatePrompt(request: Request, env: Env, id: string): Promise<Response> {
  const existing = await readPromptRecord(env.PROMPT_BUCKET, id)
  if (!existing) {
    return json({ error: { code: 'not_found', message: 'prompt not found.' } }, { status: 404 }, request, env)
  }

  const payload = await readPromptPayload(request)
  if (!payload.prompt) {
    return json({ error: { code: 'invalid_request', message: 'prompt is required.' } }, { status: 400 }, request, env)
  }

  let imageKey = existing.imageKey
  let imageKeys = existing.imageKeys
  let imageMimeType = existing.imageMimeType
  let imageMimeTypes = existing.imageMimeTypes
  let imageFilename = existing.imageFilename
  let imageFilenames = existing.imageFilenames
  const existingImageKeys = normalizeRecordImageKeys(existing)

  if (payload.removeImage && existingImageKeys.length) {
    await Promise.all(existingImageKeys.map((key) => env.PROMPT_BUCKET.delete(key)))
    imageKey = undefined
    imageKeys = undefined
    imageMimeType = undefined
    imageMimeTypes = undefined
    imageFilename = undefined
    imageFilenames = undefined
  }

  if (payload.images.length) {
    for (const image of payload.images) {
      const imageError = validatePromptImage(image, request, env)
      if (imageError) return imageError
    }
    if (existingImageKeys.length) {
      await Promise.all(existingImageKeys.map((key) => env.PROMPT_BUCKET.delete(key)))
    }
    const storedImages = await savePromptImages(env.PROMPT_BUCKET, id, payload.images)
    imageKey = storedImages.imageKey
    imageKeys = storedImages.imageKeys
    imageMimeType = storedImages.imageMimeType
    imageMimeTypes = storedImages.imageMimeTypes
    imageFilename = storedImages.imageFilename
    imageFilenames = storedImages.imageFilenames
  }

  const record: PromptRecord = {
    ...existing,
    title: payload.title || 'Uploaded prompt',
    description: payload.description,
    prompt: payload.prompt,
    category: payload.category,
    imageKey,
    imageKeys: imageKeys?.length ? imageKeys : undefined,
    imageMimeType,
    imageMimeTypes: imageMimeTypes?.length ? imageMimeTypes : undefined,
    imageFilename,
    imageFilenames: imageFilenames?.length ? imageFilenames : undefined,
  }

  await env.PROMPT_BUCKET.put(objectKeyForPrompt(id), JSON.stringify(record), {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
    },
  })

  return json({ data: publicPrompt(record, request) }, undefined, request, env)
}

async function deletePrompt(request: Request, env: Env, id: string): Promise<Response> {
  const record = await readPromptRecord(env.PROMPT_BUCKET, id)
  const imageKeys = record ? normalizeRecordImageKeys(record) : []
  if (imageKeys.length) {
    await Promise.all(imageKeys.map((key) => env.PROMPT_BUCKET.delete(key)))
  }
  await env.PROMPT_BUCKET.delete(objectKeyForPrompt(id))
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  })
}

async function getPromptImage(request: Request, env: Env, id: string, index = 0): Promise<Response> {
  const record = await readPromptRecord(env.PROMPT_BUCKET, id)
  const imageKeys = record ? normalizeRecordImageKeys(record) : []
  const imageKey = imageKeys[index] || imageKeys[0]
  if (!record || !imageKey) {
    return json({ error: { code: 'not_found', message: 'image not found.' } }, { status: 404 }, request, env)
  }
  const object = await env.PROMPT_BUCKET.get(imageKey)
  if (!object) {
    return json({ error: { code: 'not_found', message: 'image not found.' } }, { status: 404 }, request, env)
  }
  return new Response(object.body, {
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': record.imageMimeTypes?.[index] || record.imageMimeType || object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    const authError = requireAuth(request, env)
    if (authError) return authError

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    try {
      if (request.method === 'GET' && path === '/api/prompts') {
        return listPrompts(request, env)
      }
      if (request.method === 'POST' && path === '/api/prompts') {
        return createPrompt(request, env)
      }

      const imageMatch = path.match(/^\/api\/prompts\/([^/]+)\/image$/)
      if (request.method === 'GET' && imageMatch) {
        return getPromptImage(request, env, decodeURIComponent(imageMatch[1]))
      }

      const indexedImageMatch = path.match(/^\/api\/prompts\/([^/]+)\/image\/(\d+)$/)
      if (request.method === 'GET' && indexedImageMatch) {
        return getPromptImage(
          request,
          env,
          decodeURIComponent(indexedImageMatch[1]),
          Number(indexedImageMatch[2])
        )
      }

      const promptMatch = path.match(/^\/api\/prompts\/([^/]+)$/)
      if (request.method === 'PUT' && promptMatch) {
        return updatePrompt(request, env, decodeURIComponent(promptMatch[1]))
      }
      if (request.method === 'DELETE' && promptMatch) {
        return deletePrompt(request, env, decodeURIComponent(promptMatch[1]))
      }

      return json({ error: { code: 'not_found', message: 'not found.' } }, { status: 404 }, request, env)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected prompt library error.'
      return json({ error: { code: 'internal_error', message } }, { status: 500 }, request, env)
    }
  },
}
