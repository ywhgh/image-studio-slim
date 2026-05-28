import { describe, expect, it } from 'vitest'
import {
  IMAGE_STUDIO_RELEASE_VERSION,
  createCurrentRelease,
  createProviderModes,
  getStylePresets,
  getTranslateLanguageName,
} from './imageStudioWorkspaceOptions'

const t = (key: string) => key

describe('imageStudioWorkspaceOptions', () => {
  it('returns localized release notes with the current version', () => {
    expect(createCurrentRelease('zh')).toMatchObject({
      version: IMAGE_STUDIO_RELEASE_VERSION,
      title: `${IMAGE_STUDIO_RELEASE_VERSION} 更新内容`,
    })
    expect(createCurrentRelease('en').title).toBe(`${IMAGE_STUDIO_RELEASE_VERSION} Release Notes`)
  })

  it('keeps provider mode ordering stable', () => {
    expect(createProviderModes(t).map((mode) => mode.value)).toEqual([
      'external-relay',
      'external-browser',
      'gpt-image-playground',
      'sub2api',
    ])
  })

  it('keeps built-in style preset ids aligned across locales', () => {
    expect(getStylePresets('zh').map((preset) => preset.id)).toEqual(
      getStylePresets('en').map((preset) => preset.id)
    )
  })

  it('resolves translation target names for prompt translation', () => {
    expect(getTranslateLanguageName('zh')).toBe('Simplified Chinese')
    expect(getTranslateLanguageName('ja')).toBe('Japanese')
  })
})
