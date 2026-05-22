<template>
  <div
    class="glass-card"
    :class="{ active }"
    role="button"
    tabindex="0"
    @click="$emit('select')"
    @keydown.enter.self.prevent="$emit('select')"
    @keydown.space.self.prevent="$emit('select')"
  >
    <div class="image-wrapper">
      <div class="img-tags">
        <span class="tag-ratio">{{ ratio }}</span>
        <span class="tag-res">{{ resolution }}</span>
      </div>
      <img :class="['poster', posterPositionClass]" :src="imageUrl" :alt="imageAlt" loading="lazy" />
    </div>

    <div class="content-wrapper">
      <div class="content-top">
        <ImageStudioTextTooltip
          class="title-shell"
          :text="title"
          :variant="tooltipStyle"
          :accent-color="tooltipAccent"
          :accent-deep="tooltipAccentDeep"
          :accent-rgb="tooltipAccentRgb"
        >
          <h3 class="title">{{ title }}</h3>
        </ImageStudioTextTooltip>
        <div class="micro-tags">
          <span class="m-tag primary">{{ provider }}</span>
          <span class="m-tag secondary">
            <ImageStudioTextTooltip
              class="model-tooltip-trigger"
              :text="model"
              :variant="tooltipStyle"
              :accent-color="tooltipAccent"
              :accent-deep="tooltipAccentDeep"
              :accent-rgb="tooltipAccentRgb"
              :max-width="240"
            >
              <span class="tag-label">{{ model }}</span>
            </ImageStudioTextTooltip>
          </span>
        </div>
        <div class="meta-info">
          <p>{{ timing }}</p>
          <p v-if="seed" class="seed-row">
            <button
              type="button"
              class="seed-button"
              :aria-label="seedCopyTitle"
              @click.stop="$emit('copy-seed')"
            >
              {{ seedText }}: {{ seed }}
            </button>
          </p>
          <p v-if="styleLabel">{{ styleLabel }}</p>
          <p class="file-size">{{ fileSizeText }}</p>
        </div>
      </div>

      <div class="content-bottom">
        <span class="format">{{ format }}</span>
        <div class="actions">
          <button
            type="button"
            class="action-button"
            :aria-label="restoreTitle"
            @click.stop="$emit('restore')"
          >
            <Icon name="edit" size="xs" :stroke-width="1.15" />
          </button>
          <button
            type="button"
            class="action-button danger"
            :aria-label="deleteTitle"
            @click.stop="$emit('delete')"
          >
            <Icon name="trash" size="xs" :stroke-width="1.15" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import ImageStudioTextTooltip from '@/components/image-studio/ImageStudioTextTooltip.vue'

type PreviewOrientation = 'landscape' | 'portrait' | 'square' | 'unknown'
type TooltipStyle = 'outline' | 'plain' | 'soft'

const props = withDefaults(defineProps<{
  imageUrl: string
  imageAlt: string
  ratio: string
  resolution: string
  title: string
  provider: string
  model: string
  timing: string
  styleLabel?: string
  seed?: string
  seedText: string
  seedCopyTitle: string
  fileSizeText: string
  format: string
  restoreTitle: string
  deleteTitle: string
  tooltipStyle?: TooltipStyle
  tooltipAccent?: string
  tooltipAccentDeep?: string
  tooltipAccentRgb?: string
  active?: boolean
}>(), {
  styleLabel: '',
  seed: '',
  tooltipStyle: 'outline',
  tooltipAccent: '#2563eb',
  tooltipAccentDeep: '#1d4ed8',
  tooltipAccentRgb: '37, 99, 235',
  active: false,
})

function orientationFromDimensions(width: number, height: number): PreviewOrientation {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'unknown'
  }
  if (Math.abs(width - height) < 0.001) {
    return 'square'
  }
  return width > height ? 'landscape' : 'portrait'
}

function orientationFromRatio(value: string): PreviewOrientation {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(value.trim())
  if (!match) return 'unknown'
  return orientationFromDimensions(Number(match[1]), Number(match[2]))
}

function orientationFromResolution(value: string): PreviewOrientation {
  const match = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i.exec(value.trim())
  if (!match) return 'unknown'
  return orientationFromDimensions(Number(match[1]), Number(match[2]))
}

const posterOrientation = computed(() => {
  const ratioOrientation = orientationFromRatio(props.ratio)
  if (ratioOrientation !== 'unknown') {
    return ratioOrientation
  }
  return orientationFromResolution(props.resolution)
})

const posterPositionClass = computed(() => (
  posterOrientation.value === 'portrait'
    ? 'is-preview-portrait'
    : 'is-preview-centered'
))

defineEmits<{
  select: []
  restore: []
  delete: []
  'copy-seed': []
}>()
</script>

<style scoped>
.glass-card {
  --bg-rgb: 255, 255, 255;
  --text-main: var(--studio-text, #0f172a);
  --text-muted: var(--studio-muted, #64748b);
  --text-soft: color-mix(in srgb, var(--text-muted) 72%, transparent);
  --theme-color: var(--studio-accent, #2563eb);
  --theme-color-deep: var(--studio-accent-deep, #1d4ed8);
  --theme-rgb: var(--theme-color-rgb, 37, 99, 235);
  --card-bg: rgba(var(--bg-rgb), 0.38);
  --card-border: var(--studio-border, rgba(31, 41, 55, 0.08));
  --card-active-bg: rgba(var(--theme-rgb), 0.06);
  --card-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  --card-hover-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
  --card-active-shadow:
    0 0 0 1px rgba(var(--theme-rgb), 0.18),
    0 0 16px rgba(var(--theme-rgb), 0.1),
    0 10px 24px rgba(var(--theme-rgb), 0.1),
    0 18px 36px rgba(var(--theme-rgb), 0.07);
  --card-active-hover-shadow:
    0 0 0 1px rgba(var(--theme-rgb), 0.24),
    0 0 22px rgba(var(--theme-rgb), 0.14),
    0 14px 30px rgba(var(--theme-rgb), 0.12),
    0 22px 42px rgba(var(--theme-rgb), 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.66);
  --glass-lowlight: rgba(255, 255, 255, 0.08);
  --glass-side-highlight: rgba(255, 255, 255, 0.18);
  --glass-hover-highlight: rgba(255, 255, 255, 0.82);
  --glass-hover-lowlight: rgba(255, 255, 255, 0.1);
  --glass-hover-side: rgba(255, 255, 255, 0.2);
  --image-bg: rgba(15, 23, 42, 0.08);
  --image-tag-bg: rgba(0, 0, 0, 0.25);
  --image-tag-text: #fff;
  --image-tag-border: rgba(255, 255, 255, 0.15);
  --image-tag-shadow: rgba(0, 0, 0, 0.8);
  --image-tag-inset: rgba(255, 255, 255, 0.08);
  --tag-primary-bg: rgba(var(--theme-rgb), 0.1);
  --tag-primary-text: var(--theme-color);
  --tag-primary-border: rgba(var(--theme-rgb), 0.18);
  --tag-model-bg: var(--tag-primary-bg);
  --tag-model-text: var(--tag-primary-text);
  --tag-model-border: var(--tag-primary-border);
  --tag-inset-highlight: rgba(255, 255, 255, 0.18);
  --tag-inset-lowlight: rgba(15, 23, 42, 0.02);
  --tooltip-bg: color-mix(in srgb, rgba(var(--bg-rgb), 0.96) 90%, rgba(var(--theme-rgb), 0.1));
  --tooltip-border: rgba(var(--theme-rgb), 0.52);
  --tooltip-text: var(--theme-color-deep);
  --tooltip-shadow: 0 12px 28px rgba(15, 23, 42, 0.14), 0 8px 20px rgba(var(--theme-rgb), 0.18);
  --control-hover-bg: rgba(var(--theme-rgb), 0.08);
  --danger-color: #e11d48;

  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  width: 100%;
  align-self: flex-start;
  isolation: isolate;
  border-radius: 16px;
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  box-shadow:
    inset 0 1px 1px var(--glass-highlight),
    inset 0 -1px 1px var(--glass-lowlight),
    inset 1px 0 1px var(--glass-side-highlight),
    var(--card-shadow);
  color: var(--text-main);
  cursor: pointer;
  overflow: visible;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  will-change: transform;
}

.glass-card:hover {
  z-index: 10;
  transform: translateY(-4px);
  box-shadow:
    inset 0 1px 1px var(--glass-hover-highlight),
    inset 0 -1px 1px var(--glass-hover-lowlight),
    inset 1px 0 1px var(--glass-hover-side),
    var(--card-hover-shadow);
}

.glass-card:focus-visible {
  outline: 2px solid var(--theme-color);
  outline-offset: 3px;
}

.glass-card.active {
  border-color: var(--theme-color);
  background:
    radial-gradient(circle at 12% 22%, rgba(var(--theme-rgb), 0.22), transparent 48%),
    linear-gradient(var(--card-active-bg), var(--card-active-bg)),
    var(--card-bg);
  box-shadow:
    inset 0 1px 1px var(--glass-highlight),
    inset 0 -1px 1px var(--glass-lowlight),
    inset 1px 0 1px var(--glass-side-highlight),
    var(--card-active-shadow);
}

.glass-card.active:hover {
  box-shadow:
    inset 0 1px 1px var(--glass-hover-highlight),
    inset 0 -1px 1px var(--glass-hover-lowlight),
    inset 1px 0 1px var(--glass-hover-side),
    var(--card-active-hover-shadow);
}

.image-wrapper {
  /* Ratio lock: the card shrinks globally, while image/content keep a strict 3:2 width split. */
  position: relative;
  flex: 3 1 0;
  min-width: 0;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 15px 0 0 15px;
  background: var(--image-bg);
  transform: translateZ(0);
}

.poster {
  display: block;
  aspect-ratio: 1 / 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
  will-change: transform;
}

.poster.is-preview-portrait {
  object-position: center 18%;
}

.poster.is-preview-centered {
  object-position: center center;
}

.glass-card:hover .poster {
  transform: scale(1.05);
}

.img-tags {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  max-width: calc(100% - 12px);
  pointer-events: none;
}

.tag-ratio,
.tag-res {
  flex: 0 0 auto;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 6px;
  border: 1px solid var(--image-tag-border);
  background: var(--image-tag-bg);
  color: var(--image-tag-text);
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 400;
  line-height: 1.15;
  text-shadow: 0 1px 2px var(--image-tag-shadow);
  box-shadow: inset 0 1px 0 var(--image-tag-inset);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.content-wrapper {
  /* Column rhythm: right-side content keeps the 2-part width and clips instead of forcing layout wider. */
  flex: 2 1 0;
  display: flex;
  min-width: 0;
  overflow: visible;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  padding: 8px 10px;
}

.content-top {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.title-shell {
  position: relative;
  display: block;
  min-width: 0;
  overflow: visible;
}

.title {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.micro-tags {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: visible;
}

.m-tag {
  position: relative;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 4px;
  border: 1px solid var(--tag-primary-border);
  background: var(--tag-primary-bg);
  color: var(--tag-primary-text);
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 400;
  line-height: 1.15;
  box-shadow:
    inset 0 1px 0 var(--tag-inset-highlight),
    inset 0 -1px 0 var(--tag-inset-lowlight);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.m-tag.primary {
  flex: 0 0 auto;
}

.m-tag.secondary {
  flex: 1 1 auto;
  overflow: visible;
  border-color: var(--tag-model-border);
  background: var(--tag-model-bg);
  color: var(--tag-model-text);
}

.model-tooltip-trigger {
  display: block;
  min-width: 0;
  max-width: 100%;
}

.tag-label {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.meta-info p {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  margin-top: 1px;
  color: var(--text-soft);
}

.seed-row {
  margin-top: 2px;
}

.seed-button {
  display: block;
  max-width: 100%;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 400;
  padding: 0;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: copy;
}

.seed-button:hover {
  color: var(--theme-color-deep);
}

.content-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.format {
  color: var(--theme-color-deep);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1;
}

.actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;
}

.action-button {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-soft);
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.action-button :deep(svg) {
  width: 14px;
  height: 14px;
}

.action-button:hover {
  border-color: var(--tag-primary-border);
  background: var(--control-hover-bg);
  color: var(--theme-color-deep);
  transform: translateY(-1px);
}

.action-button.danger:hover {
  color: var(--danger-color);
}

:global(.studio-shell.theme-night) .glass-card {
  --bg-rgb: 30, 30, 30;
  --card-bg: rgba(var(--bg-rgb), 0.4);
  --card-border: var(--studio-border, rgba(255, 255, 255, 0.1));
  --card-shadow: 0 10px 26px rgba(0, 0, 0, 0.24);
  --card-hover-shadow: 0 14px 34px rgba(0, 0, 0, 0.36);
  --card-active-shadow:
    0 0 0 1px rgba(var(--theme-rgb), 0.22),
    0 0 18px rgba(var(--theme-rgb), 0.14),
    0 12px 28px rgba(var(--theme-rgb), 0.11),
    0 12px 30px rgba(0, 0, 0, 0.3);
  --card-active-hover-shadow:
    0 0 0 1px rgba(var(--theme-rgb), 0.3),
    0 0 24px rgba(var(--theme-rgb), 0.18),
    0 16px 34px rgba(var(--theme-rgb), 0.14),
    0 16px 34px rgba(0, 0, 0, 0.34);
  --glass-highlight: rgba(255, 255, 255, 0.16);
  --glass-lowlight: rgba(255, 255, 255, 0.04);
  --glass-side-highlight: rgba(255, 255, 255, 0.05);
  --glass-hover-highlight: rgba(255, 255, 255, 0.22);
  --glass-hover-lowlight: rgba(255, 255, 255, 0.06);
  --glass-hover-side: rgba(255, 255, 255, 0.08);
  --text-soft: color-mix(in srgb, var(--text-muted) 76%, transparent);
  --tooltip-bg: color-mix(in srgb, rgba(var(--bg-rgb), 0.94) 88%, rgba(var(--theme-rgb), 0.12));
  --tooltip-border: rgba(var(--theme-rgb), 0.6);
  --tooltip-text: color-mix(in srgb, var(--theme-color) 52%, #fff);
  --tooltip-shadow: 0 14px 30px rgba(0, 0, 0, 0.32), 0 8px 22px rgba(var(--theme-rgb), 0.22);
  background: var(--card-bg);
  box-shadow:
    inset 0 1px 1px var(--glass-highlight),
    inset 0 -1px 1px var(--glass-lowlight),
    inset 1px 0 1px var(--glass-side-highlight),
    var(--card-shadow);
}

:global(.studio-shell.theme-night) .glass-card:hover {
  box-shadow:
    inset 0 1px 1px var(--glass-hover-highlight),
    inset 0 -1px 1px var(--glass-hover-lowlight),
    inset 1px 0 1px var(--glass-hover-side),
    var(--card-hover-shadow);
}

:global(.studio-shell.theme-night) .glass-card.active {
  background:
    radial-gradient(circle at 12% 22%, rgba(var(--theme-rgb), 0.24), transparent 48%),
    linear-gradient(var(--card-active-bg), var(--card-active-bg)),
    var(--card-bg);
  box-shadow:
    inset 0 1px 1px var(--glass-highlight),
    inset 0 -1px 1px var(--glass-lowlight),
    inset 1px 0 1px var(--glass-side-highlight),
    var(--card-active-shadow);
}

:global(.studio-shell.theme-night) .glass-card.active:hover {
  box-shadow:
    inset 0 1px 1px var(--glass-hover-highlight),
    inset 0 -1px 1px var(--glass-hover-lowlight),
    inset 1px 0 1px var(--glass-hover-side),
    var(--card-active-hover-shadow);
}

:global(.studio-shell.motion-reduced) .glass-card,
:global(.studio-shell.motion-reduced) .poster,
:global(.studio-shell.motion-reduced) .action-button {
  transition: none;
}
</style>
