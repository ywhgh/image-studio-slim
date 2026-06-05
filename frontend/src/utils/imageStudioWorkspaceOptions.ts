import type { ImageStudioProtocolProfile, ImageStudioProviderMode } from '@/types/imageStudio'

export const IMAGE_STUDIO_RELEASE_VERSION = 'v1.3.3'

export type WorkspaceTranslate = (key: string) => string
export type TranslateLang = 'en' | 'ja' | 'de' | 'zh' | 'ru'
export type AccentTone = 'blue' | 'emerald' | 'amber' | 'rose'

export interface ImageStudioReleaseNotes {
  version: string
  title: string
  subtitle: string
  date: string
  items: string[]
}

export interface StylePresetOption {
  id: string
  title: string
  subtitle: string
  promptHint: string
}

export const accentPalette: Record<AccentTone, {
  color: string
  deep: string
  rgb: string
  soft: string
  ring: string
  shadow: string
  preview: string
}> = {
  blue: {
    color: '#2563eb',
    deep: '#1d4ed8',
    rgb: '37, 99, 235',
    soft: 'rgba(37, 99, 235, 0.12)',
    ring: 'rgba(37, 99, 235, 0.32)',
    shadow: 'rgba(37, 99, 235, 0.18)',
    preview: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
  },
  emerald: {
    color: '#059669',
    deep: '#047857',
    rgb: '5, 150, 105',
    soft: 'rgba(5, 150, 105, 0.14)',
    ring: 'rgba(5, 150, 105, 0.32)',
    shadow: 'rgba(5, 150, 105, 0.18)',
    preview: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  },
  amber: {
    color: '#d97706',
    deep: '#b45309',
    rgb: '217, 119, 6',
    soft: 'rgba(217, 119, 6, 0.14)',
    ring: 'rgba(217, 119, 6, 0.32)',
    shadow: 'rgba(217, 119, 6, 0.18)',
    preview: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  },
  rose: {
    color: '#e11d48',
    deep: '#be123c',
    rgb: '225, 29, 72',
    soft: 'rgba(225, 29, 72, 0.14)',
    ring: 'rgba(225, 29, 72, 0.32)',
    shadow: 'rgba(225, 29, 72, 0.18)',
    preview: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
  },
}

export function createCurrentRelease(locale: string): ImageStudioReleaseNotes {
  if (locale === 'zh') {
    return {
      version: IMAGE_STUDIO_RELEASE_VERSION,
      title: `${IMAGE_STUDIO_RELEASE_VERSION} 更新内容`,
      subtitle: '提示词库多图链路和生图流程反馈优化',
      date: '2026-06-05',
      items: [
        '修复提示词库多图保存、编辑和刷新读取链路，本地 IndexedDB 与 Cloudflare/R2 均保留 imageUrls 数组。',
        '上传提示词支持最多 5 张图片，单张最大 20MB，编辑已有提示词时不会丢失多图。',
        '优化详情页预览，支持多图键盘切换、磨砂玻璃指示器和全屏上下切换。',
        '优化上传/编辑弹窗的多图预览，补齐左右切换、单图删除和当前图片设为封面。',
        '新增生图流程实时反馈，展示排队、请求上游、重试、成功和失败步骤，并用动效标记当前阶段。',
        '修复上游短暂失败后最终成功时流程状态仍显示失败的问题。',
      ],
    }
  }

  return {
    version: IMAGE_STUDIO_RELEASE_VERSION,
    title: `${IMAGE_STUDIO_RELEASE_VERSION} Release Notes`,
    subtitle: 'Prompt-library multi-image flow and generation diagnostics',
    date: '2026-06-05',
    items: [
      'Fixed prompt-library multi-image save, edit, and refresh paths so IndexedDB and Cloudflare/R2 preserve imageUrls arrays.',
      'Added prompt uploads with up to 5 images, enforcing a 20MB limit per image while preserving existing images during edits.',
      'Improved prompt detail previews with keyboard image switching, frosted-glass indicators, and fullscreen vertical controls.',
      'Improved upload/edit modal previews with side controls, single-image deletion, and set-current-image-as-cover support.',
      'Added live generation-flow feedback for queueing, upstream requests, retries, success, and failure with animated current-step states.',
      'Fixed generation flow status so successful retries no longer remain marked as failed after an earlier upstream error.',
    ],
  }
}

export function createTranslateLanguages(t: WorkspaceTranslate): Array<{ value: TranslateLang; label: string }> {
  return [
    { value: 'en', label: t('imageStudio.translate.languages.en') },
    { value: 'ja', label: t('imageStudio.translate.languages.ja') },
    { value: 'de', label: t('imageStudio.translate.languages.de') },
    { value: 'zh', label: t('imageStudio.translate.languages.zh') },
    { value: 'ru', label: t('imageStudio.translate.languages.ru') },
  ]
}

export function getTranslateLanguageName(code: TranslateLang): string {
  switch (code) {
    case 'en': return 'English'
    case 'ja': return 'Japanese'
    case 'de': return 'German'
    case 'zh': return 'Simplified Chinese'
    case 'ru': return 'Russian'
  }
}

export function createProviderModes(t: WorkspaceTranslate): Array<{
  value: ImageStudioProviderMode
  label: string
  description: string
}> {
  return [
    {
      value: 'external-relay',
      label: t('imageStudio.providerModes.externalRelay.label'),
      description: t('imageStudio.providerModes.externalRelay.description'),
    },
    {
      value: 'external-browser',
      label: t('imageStudio.providerModes.externalBrowser.label'),
      description: t('imageStudio.providerModes.externalBrowser.description'),
    },
    {
      value: 'gpt-image-playground',
      label: t('imageStudio.providerModes.gptImagePlayground.label'),
      description: t('imageStudio.providerModes.gptImagePlayground.description'),
    },
    {
      value: 'sub2api',
      label: t('imageStudio.providerModes.sub2api.label'),
      description: t('imageStudio.providerModes.sub2api.description'),
    },
  ]
}

export function createThemeModeOptions(t: WorkspaceTranslate) {
  return [
    { value: 'day' as const, label: t('imageStudio.appearance.themeModes.day'), icon: 'sun' as const },
    { value: 'night' as const, label: t('imageStudio.appearance.themeModes.night'), icon: 'moon' as const },
  ]
}

export function createAccentOptions(t: WorkspaceTranslate) {
  return [
    { value: 'blue' as const, label: t('imageStudio.appearance.accents.blue'), preview: accentPalette.blue.preview },
    { value: 'emerald' as const, label: t('imageStudio.appearance.accents.emerald'), preview: accentPalette.emerald.preview },
    { value: 'amber' as const, label: t('imageStudio.appearance.accents.amber'), preview: accentPalette.amber.preview },
    { value: 'rose' as const, label: t('imageStudio.appearance.accents.rose'), preview: accentPalette.rose.preview },
  ]
}

export function createTextureOptions(t: WorkspaceTranslate) {
  return [
    {
      value: 'soft' as const,
      label: t('imageStudio.appearance.textures.soft'),
      description: t('imageStudio.appearance.textureDescriptions.soft'),
    },
    {
      value: 'glass' as const,
      label: t('imageStudio.appearance.textures.glass'),
      description: t('imageStudio.appearance.textureDescriptions.glass'),
    },
    {
      value: 'solid' as const,
      label: t('imageStudio.appearance.textures.solid'),
      description: t('imageStudio.appearance.textureDescriptions.solid'),
    },
  ]
}

export function createTooltipStyleOptions(locale: string) {
  return locale === 'zh'
    ? [
        {
          value: 'outline' as const,
          label: '描边主题色',
          description: '跟随当前主题色的描边提示，适合信息密集区。',
        },
        {
          value: 'plain' as const,
          label: '简约黑字',
          description: '白底黑字，无描边，视觉最轻。',
        },
        {
          value: 'soft' as const,
          label: '柔光主题色',
          description: '跟随当前主题色的柔光卡片，长文本可读性更强。',
        },
      ]
    : [
        {
          value: 'outline' as const,
          label: 'Theme outline',
          description: 'A bordered tooltip that follows the current theme color.',
        },
        {
          value: 'plain' as const,
          label: 'Plain text',
          description: 'White surface with black text and no border.',
        },
        {
          value: 'soft' as const,
          label: 'Theme glow',
          description: 'A theme-colored soft card for long readable text.',
        },
      ]
}

export function createCompatibilityProfiles(t: WorkspaceTranslate): Array<{
  value: Exclude<ImageStudioProtocolProfile, 'chatgpt2api'>
  label: string
  description: string
}> {
  return [
    {
      value: 'openai-image-api',
      label: t('imageStudio.profiles.openaiImageApi'),
      description: t('imageStudio.profileDescriptions.openaiImageApi'),
    },
    {
      value: 'openai-responses',
      label: t('imageStudio.profiles.openaiResponses'),
      description: t('imageStudio.profileDescriptions.openaiResponses'),
    },
    {
      value: 'xai-grok-image',
      label: t('imageStudio.profiles.xaiGrokImage'),
      description: t('imageStudio.profileDescriptions.xaiGrokImage'),
    },
    {
      value: 'sub2api-sora-compatible',
      label: t('imageStudio.profiles.sub2apiCompatible'),
      description: t('imageStudio.profileDescriptions.sub2apiCompatible'),
    },
  ]
}

export function createCurrentSiteProfileOptions(t: WorkspaceTranslate): Array<{
  value: Extract<ImageStudioProtocolProfile, 'sub2api-sora-compatible' | 'chatgpt2api'>
  label: string
  description: string
}> {
  return [
    {
      value: 'sub2api-sora-compatible',
      label: t('imageStudio.currentSiteProfiles.sub2apiCompatible.label'),
      description: t('imageStudio.currentSiteProfiles.sub2apiCompatible.description'),
    },
    {
      value: 'chatgpt2api',
      label: t('imageStudio.currentSiteProfiles.chatgpt2api.label'),
      description: t('imageStudio.currentSiteProfiles.chatgpt2api.description'),
    },
  ]
}

export function createQualityOptions(t: WorkspaceTranslate) {
  return [
    { value: 'high', label: t('imageStudio.qualities.high'), icon: 'sparkles' as const },
    { value: 'medium', label: t('imageStudio.qualities.medium'), icon: 'bolt' as const },
    { value: 'low', label: t('imageStudio.qualities.low'), icon: 'cloud' as const },
  ]
}

export function createBackgroundOptions(t: WorkspaceTranslate) {
  return [
    { value: 'auto', label: t('imageStudio.backgrounds.auto') },
    { value: 'transparent', label: t('imageStudio.backgrounds.transparent') },
    { value: 'opaque', label: t('imageStudio.backgrounds.opaque') },
  ]
}

export function createFormatOptions(t: WorkspaceTranslate) {
  return [
    { value: 'png', label: t('imageStudio.formats.png') },
    { value: 'jpeg', label: t('imageStudio.formats.jpeg') },
    { value: 'webp', label: t('imageStudio.formats.webp') },
  ]
}

export function getPromptChips(locale: string): string[] {
  return locale === 'zh'
    ? ['清晨', '湖泊', '雪山', '倒影', '木栈道', '薄雾', '超写实']
    : ['Dawn', 'Lake', 'Snow Peak', 'Reflection', 'Boardwalk', 'Mist', 'Photoreal']
}

export function getInspirationPrompts(locale: string): string[] {
  return locale === 'zh'
    ? [
        '清晨的湖边，远处雪山在朝阳下泛着金色，湖水清澈如镜，倒映着山峰与森林，湖边有木栈道通往远方，天空有薄雾和几缕云彩，宁静而治愈，超写实风格，高清摄影。',
        '赛博朋克城市夜景，雨后的街道反射霓虹灯光，远处高楼林立，空气中有薄雾，镜头语言电影感，细节丰富，适合海报构图。',
        '未来科幻空间站内部场景，银白金属结构与蓝色光带，中心区域有悬浮装置，空间感强烈，光影精致，超高细节。',
        '日式庭院，樱花飘落，小桥和池塘构成前景，柔和晨光穿过树影，氛围安静温暖，插画与写实融合。',
      ]
    : [
        'A tranquil lake at dawn with snow mountains glowing in sunrise light, mirror reflections, forest shoreline, a wooden boardwalk, soft mist, ultra realistic photography.',
        'A cyberpunk city at night after rain, neon reflections on wet streets, cinematic framing, layered skyscrapers, rich atmosphere and crisp detail.',
        'A futuristic space station interior with silver architecture, blue light bands, a floating central device, dramatic depth and ultra-detailed lighting.',
        'A Japanese garden with falling cherry blossoms, a small bridge over a pond, gentle morning light and a calm painterly-realistic mood.',
      ]
}

export function getStylePresets(locale: string): StylePresetOption[] {
  return locale === 'zh'
    ? [
        { id: 'default', title: '默认', subtitle: '不限风格 · 仅按提示词', promptHint: '' },
        { id: 'realistic', title: '写实', subtitle: '自然光影 · 细节丰富', promptHint: '写实摄影，光影自然，真实材质，细节丰富' },
        { id: 'photo', title: '摄影', subtitle: '镜头质感 · 真实纪录', promptHint: '专业摄影，镜头景深，胶片颗粒，自然色调' },
        { id: 'anime', title: '动漫', subtitle: '高对比 · 清晰轮廓', promptHint: '动漫风格，清晰线条，高对比配色，角色感强' },
        { id: 'manga', title: '漫画', subtitle: '黑白线条 · 强烈分镜', promptHint: '日式漫画风格，黑白网点，强烈分镜，墨线明显' },
        { id: 'illustration', title: '插画', subtitle: '柔和叙事 · 画面干净', promptHint: '插画风格，构图完整，色彩柔和，叙事感明确' },
        { id: 'render3d', title: '3D 渲染', subtitle: '材质通透 · 体积感强', promptHint: '3D 渲染，体积光，真实材质，空间层次分明' },
        { id: 'watercolor', title: '水彩', subtitle: '晕染边缘 · 轻盈通透', promptHint: '水彩质感，柔和晕染，轻盈色块，手工笔触' },
        { id: 'oil', title: '油画', subtitle: '厚涂纹理 · 色彩沉稳', promptHint: '油画质感，厚涂笔触，肌理明显，色彩沉稳' },
      ]
    : [
        { id: 'default', title: 'Default', subtitle: 'No style · Prompt only', promptHint: '' },
        { id: 'realistic', title: 'Realistic', subtitle: 'Natural light · Rich detail', promptHint: 'photorealistic, natural lighting, realistic surfaces, rich detail' },
        { id: 'photo', title: 'Photography', subtitle: 'Lens feel · Documentary', promptHint: 'professional photography, depth of field, film grain, natural color grading' },
        { id: 'anime', title: 'Anime', subtitle: 'Bold contrast · Clean lines', promptHint: 'anime style, clean line art, bold contrast, expressive color palette' },
        { id: 'manga', title: 'Manga', subtitle: 'Black & white · Sharp panels', promptHint: 'Japanese manga style, black-and-white screentones, dynamic paneling, strong inking' },
        { id: 'illustration', title: 'Illustration', subtitle: 'Soft narrative · Clean frame', promptHint: 'illustration style, balanced composition, soft palette, narrative clarity' },
        { id: 'render3d', title: '3D Render', subtitle: 'Dimensional light · Polished surfaces', promptHint: '3d render, volumetric light, polished materials, strong depth' },
        { id: 'watercolor', title: 'Watercolor', subtitle: 'Soft bleed · Airy mood', promptHint: 'watercolor texture, soft bleeds, airy atmosphere, handcrafted brushwork' },
        { id: 'oil', title: 'Oil Painting', subtitle: 'Thick brushwork · Mature tones', promptHint: 'oil painting texture, thick brush strokes, visible canvas grain, mature tones' },
      ]
}
