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
  imageMimeType?: string
  imageFilename?: string
  createdAt: string
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
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
  const allowedOrigin = allowAny ? '*' : configured.includes(origin) ? origin : configured[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Prompt-Library-Token',
    'Access-Control-Max-Age': '86400',
  }
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

async function readPromptRecord(bucket: R2Bucket, id: string): Promise<PromptRecord | null> {
  const object = await bucket.get(objectKeyForPrompt(id))
  if (!object) return null
  return object.json<PromptRecord>()
}

function publicPrompt(record: PromptRecord, request: Request): PromptRecord & { imageUrl?: string } {
  const url = new URL(request.url)
  return {
    ...record,
    imageUrl: record.imageKey ? `${url.origin}/api/prompts/${encodeURIComponent(record.id)}/image` : undefined,
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
  const form = await request.formData()
  const prompt = cleanText(form.get('prompt'))
  if (!prompt) {
    return json({ error: { code: 'invalid_request', message: 'prompt is required.' } }, { status: 400 }, request, env)
  }

  const id = crypto.randomUUID()
  const image = form.get('image')
  let imageKey: string | undefined
  let imageMimeType: string | undefined
  let imageFilename: string | undefined

  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith('image/')) {
      return json({ error: { code: 'invalid_image', message: 'image must be an image file.' } }, { status: 400 }, request, env)
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return json({ error: { code: 'image_too_large', message: 'image exceeds 20 MB.' } }, { status: 413 }, request, env)
    }
    imageMimeType = image.type || 'application/octet-stream'
    imageFilename = image.name || `preview${extensionForMimeType(imageMimeType)}`
    imageKey = `${IMAGE_PREFIX}${id}${extensionForMimeType(imageMimeType)}`
    await env.PROMPT_BUCKET.put(imageKey, image.stream(), {
      httpMetadata: {
        contentType: imageMimeType,
      },
    })
  }

  const record: PromptRecord = {
    id,
    title: cleanText(form.get('title'), 'Uploaded prompt'),
    description: cleanText(form.get('description')),
    prompt,
    category: cleanText(form.get('category')),
    imageKey,
    imageMimeType,
    imageFilename,
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

  const form = await request.formData()
  const prompt = cleanText(form.get('prompt'))
  if (!prompt) {
    return json({ error: { code: 'invalid_request', message: 'prompt is required.' } }, { status: 400 }, request, env)
  }

  const image = form.get('image')
  const removeImage = cleanText(form.get('removeImage')) === '1'
  let imageKey = existing.imageKey
  let imageMimeType = existing.imageMimeType
  let imageFilename = existing.imageFilename

  if (removeImage && existing.imageKey) {
    await env.PROMPT_BUCKET.delete(existing.imageKey)
    imageKey = undefined
    imageMimeType = undefined
    imageFilename = undefined
  }

  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith('image/')) {
      return json({ error: { code: 'invalid_image', message: 'image must be an image file.' } }, { status: 400 }, request, env)
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return json({ error: { code: 'image_too_large', message: 'image exceeds 20 MB.' } }, { status: 413 }, request, env)
    }
    if (existing.imageKey) {
      await env.PROMPT_BUCKET.delete(existing.imageKey)
    }
    imageMimeType = image.type || 'application/octet-stream'
    imageFilename = image.name || `preview${extensionForMimeType(imageMimeType)}`
    imageKey = `${IMAGE_PREFIX}${id}${extensionForMimeType(imageMimeType)}`
    await env.PROMPT_BUCKET.put(imageKey, image.stream(), {
      httpMetadata: {
        contentType: imageMimeType,
      },
    })
  }

  const record: PromptRecord = {
    ...existing,
    title: cleanText(form.get('title'), 'Uploaded prompt'),
    description: cleanText(form.get('description')),
    prompt,
    category: cleanText(form.get('category')),
    imageKey,
    imageMimeType,
    imageFilename,
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
  if (record?.imageKey) {
    await env.PROMPT_BUCKET.delete(record.imageKey)
  }
  await env.PROMPT_BUCKET.delete(objectKeyForPrompt(id))
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env),
  })
}

async function getPromptImage(request: Request, env: Env, id: string): Promise<Response> {
  const record = await readPromptRecord(env.PROMPT_BUCKET, id)
  if (!record?.imageKey) {
    return json({ error: { code: 'not_found', message: 'image not found.' } }, { status: 404 }, request, env)
  }
  const object = await env.PROMPT_BUCKET.get(record.imageKey)
  if (!object) {
    return json({ error: { code: 'not_found', message: 'image not found.' } }, { status: 404 }, request, env)
  }
  return new Response(object.body, {
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': record.imageMimeType || object.httpMetadata?.contentType || 'application/octet-stream',
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
