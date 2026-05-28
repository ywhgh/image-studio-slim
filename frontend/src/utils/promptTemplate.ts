export interface PromptReplacementItem {
  id: string
  kind: 'argument' | 'smart'
  label: string
  source: string
  replacement: string
  start: number
  end: number
  raw?: string
}

export interface PromptReplacementSegment {
  key: string
  text: string
  item?: PromptReplacementItem
}

export interface PromptReplacementTarget {
  start: number
  end: number
  text: string
}

function unescapePromptTemplateAttribute(value: string): string {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .trim()
}

export function readPromptTemplateAttribute(attributes: string, key: 'name' | 'default'): string {
  const matcher = new RegExp(
    `${key}\\s*=\\s*(?:"((?:\\\\.|[^"\\\\])*)"|'((?:\\\\.|[^'\\\\])*)'|([^\\s}]+))`,
    'i'
  )
  const match = attributes.match(matcher)
  if (!match) {
    return ''
  }
  return unescapePromptTemplateAttribute(match[1] || match[2] || match[3] || '')
}

export function resolvePromptTemplateArguments(rawPrompt: string): string {
  return rawPrompt.replace(/\{\s*argument\b([^{}]*)\}/gi, (_match, attributes: string) => {
    const fallback = readPromptTemplateAttribute(attributes, 'name')
    return readPromptTemplateAttribute(attributes, 'default') || fallback
  })
}

export function parsePromptArgumentItems(rawPrompt: string, slotLabel: string): PromptReplacementItem[] {
  const source = rawPrompt || ''
  const matcher = /\{\s*argument\b([^{}]*)\}/gi
  const items: PromptReplacementItem[] = []
  let match: RegExpExecArray | null

  while ((match = matcher.exec(source)) && items.length < 20) {
    const raw = match[0]
    const attributes = match[1] || ''
    const name = readPromptTemplateAttribute(attributes, 'name')
    const defaultValue = readPromptTemplateAttribute(attributes, 'default')
    const label = (name || defaultValue || `${slotLabel} ${items.length + 1}`).trim()
    const replacement = (defaultValue || name || '').trim()
    items.push({
      id: `argument-${match.index}-${items.length}`,
      kind: 'argument',
      label,
      source: replacement || label,
      replacement: replacement || label,
      start: match.index,
      end: match.index + raw.length,
      raw,
    })
  }

  return items
}

function readUnknownString(root: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = root[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

export function normalizeSmartReplacementItems(
  payload: unknown,
  baseText: string,
  slotLabel: string,
): PromptReplacementItem[] {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
  const rawItems = Array.isArray(payload)
    ? payload
    : (Array.isArray(root?.items) ? root.items : [])
  const items: PromptReplacementItem[] = []
  const usedText = new Set<string>()

  rawItems.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || items.length >= 8) {
      return
    }
    const record = entry as Record<string, unknown>
    const original = readUnknownString(record, ['original', 'source', 'text', 'value'])
    if (!original || original.length < 2) {
      return
    }
    if (original.length > Math.max(120, Math.floor(baseText.length * 0.65))) {
      return
    }
    const start = baseText.indexOf(original)
    if (start < 0) {
      return
    }
    const end = start + original.length
    if (items.some((item) => start < item.end && end > item.start)) {
      return
    }
    const dedupeKey = original.toLowerCase()
    if (usedText.has(dedupeKey)) {
      return
    }
    usedText.add(dedupeKey)

    const label = readUnknownString(record, ['label', 'type', 'name', 'field'])
      || `${slotLabel} ${index + 1}`
    const replacement = readUnknownString(record, ['replacement', 'suggestion', 'default']) || original
    items.push({
      id: `smart-${start}-${items.length}`,
      kind: 'smart',
      label,
      source: original,
      replacement,
      start,
      end,
    })
  })

  return items.sort((left, right) => left.start - right.start)
}

export function resolvePromptReplacementTarget(
  item: PromptReplacementItem,
  text: string,
  preferStoredRange: boolean,
): PromptReplacementTarget | null {
  const storedTarget = item.raw || item.source
  if (
    preferStoredRange &&
    item.start >= 0 &&
    item.end <= text.length &&
    text.slice(item.start, item.end) === storedTarget
  ) {
    return {
      start: item.start,
      end: item.end,
      text: storedTarget,
    }
  }

  const rawIndex = item.raw ? text.indexOf(item.raw) : -1
  if (rawIndex >= 0 && item.raw) {
    return {
      start: rawIndex,
      end: rawIndex + item.raw.length,
      text: item.raw,
    }
  }

  const sourceIndex = text.indexOf(item.source)
  if (sourceIndex >= 0) {
    return {
      start: sourceIndex,
      end: sourceIndex + item.source.length,
      text: item.source,
    }
  }

  return null
}

export function buildPromptReplacementSegments(
  text: string,
  items: PromptReplacementItem[],
): PromptReplacementSegment[] {
  if (!text) {
    return []
  }

  const targets = items
    .map((item) => {
      const target = resolvePromptReplacementTarget(item, text, true)
      return target ? { ...target, item } : null
    })
    .filter((item): item is PromptReplacementTarget & { item: PromptReplacementItem } => !!item)
    .sort((left, right) => left.start - right.start)

  if (!targets.length) {
    return [{ key: 'plain-0', text }]
  }

  const segments: PromptReplacementSegment[] = []
  let cursor = 0
  targets.forEach((target, index) => {
    if (target.start < cursor) {
      return
    }
    if (target.start > cursor) {
      segments.push({
        key: `plain-${index}-${cursor}`,
        text: text.slice(cursor, target.start),
      })
    }
    segments.push({
      key: `hit-${target.item.id}`,
      text: text.slice(target.start, target.end),
      item: target.item,
    })
    cursor = target.end
  })
  if (cursor < text.length) {
    segments.push({
      key: `plain-end-${cursor}`,
      text: text.slice(cursor),
    })
  }
  return segments
}
