import { describe, expect, it } from 'vitest'
import {
  buildPromptReplacementSegments,
  normalizeSmartReplacementItems,
  parsePromptArgumentItems,
  resolvePromptReplacementTarget,
  resolvePromptTemplateArguments,
} from './promptTemplate'

describe('promptTemplate utilities', () => {
  it('parses argument slots and resolves defaults', () => {
    const prompt = 'A {argument name="subject" default="red car"} under {argument name="light"}.'

    const items = parsePromptArgumentItems(prompt, 'Slot')

    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      kind: 'argument',
      label: 'subject',
      source: 'red car',
      replacement: 'red car',
    })
    expect(items[1]).toMatchObject({
      label: 'light',
      source: 'light',
    })
    expect(resolvePromptTemplateArguments(prompt)).toBe('A red car under light.')
  })

  it('keeps quoted and escaped attribute values intact', () => {
    const prompt = 'A {argument name=\'subject role\' default="red \\"sports\\" car"} in frame.'

    const [item] = parsePromptArgumentItems(prompt, 'Slot')

    expect(item.label).toBe('subject role')
    expect(item.source).toBe('red "sports" car')
    expect(resolvePromptTemplateArguments(prompt)).toBe('A red "sports" car in frame.')
  })

  it('normalizes exact smart replacement spans', () => {
    const prompt = 'A red car beside a glass tower at sunset.'
    const items = normalizeSmartReplacementItems({
      items: [
        { label: 'subject', original: 'red car', replacement: 'blue truck' },
        { label: 'scene', original: 'glass tower', replacement: 'old library' },
        { label: 'missing', original: 'ocean', replacement: 'forest' },
      ],
    }, prompt, 'Slot')

    expect(items.map((item) => item.source)).toEqual(['red car', 'glass tower'])
    expect(items[0].start).toBe(prompt.indexOf('red car'))
    expect(items[1].replacement).toBe('old library')
  })

  it('builds stable preview segments', () => {
    const prompt = 'A red car at sunset.'
    const [item] = normalizeSmartReplacementItems([
      { label: 'subject', original: 'red car', replacement: 'blue truck' },
    ], prompt, 'Slot')

    const segments = buildPromptReplacementSegments(prompt, [item])

    expect(segments).toHaveLength(3)
    expect(segments[1]).toMatchObject({ text: 'red car', item })
  })

  it('falls back to current source text when stored range no longer matches', () => {
    const prompt = 'A red car at sunset.'
    const [item] = normalizeSmartReplacementItems([
      { label: 'subject', original: 'red car', replacement: 'blue truck' },
    ], prompt, 'Slot')
    const editedPrompt = 'Scene: A red car at sunset.'

    const target = resolvePromptReplacementTarget(item, editedPrompt, true)

    expect(target).toMatchObject({
      start: editedPrompt.indexOf('red car'),
      text: 'red car',
    })
  })

  it('skips overlapping or duplicate smart replacement spans', () => {
    const prompt = 'A red car with red car reflections.'
    const items = normalizeSmartReplacementItems([
      { label: 'subject', original: 'red car', replacement: 'blue truck' },
      { label: 'duplicate', original: 'red car', replacement: 'green coupe' },
      { label: 'overlap', original: 'A red car', replacement: 'A blue truck' },
    ], prompt, 'Slot')

    expect(items).toHaveLength(1)
    expect(items[0].replacement).toBe('blue truck')
  })
})
