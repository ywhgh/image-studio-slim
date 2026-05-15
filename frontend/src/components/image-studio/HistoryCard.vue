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
      <img class="poster" :src="imageUrl" :alt="imageAlt" loading="lazy" />
    </div>

    <div class="content-wrapper">
      <div class="content-top">
        <h3 class="title" :title="title">{{ title }}</h3>
        <div class="micro-tags">
          <span class="m-tag primary">{{ provider }}</span>
          <span class="m-tag secondary">{{ model }}</span>
        </div>
        <div class="meta-info">
          <p>{{ timing }}</p>
          <p v-if="styleLabel">{{ styleLabel }}</p>
          <p class="file-size">{{ fileSizeText }}</p>
          <p v-if="seed" class="seed-row">
            <button
              type="button"
              class="seed-button"
              :title="seedCopyTitle"
              @click.stop="$emit('copy-seed')"
            >
              {{ seedText }}: {{ seed }}
            </button>
          </p>
        </div>
      </div>

      <div class="content-bottom">
        <span class="format">{{ format }}</span>
        <div class="actions">
          <button
            type="button"
            class="action-button"
            :title="restoreTitle"
            :aria-label="restoreTitle"
            @click.stop="$emit('restore')"
          >
            <Icon name="edit" size="xs" />
          </button>
          <button
            type="button"
            class="action-button danger"
            :title="deleteTitle"
            :aria-label="deleteTitle"
            @click.stop="$emit('delete')"
          >
            <Icon name="trash" size="xs" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/icons/Icon.vue'

withDefaults(defineProps<{
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
  active?: boolean
}>(), {
  styleLabel: '',
  seed: '',
  active: false,
})

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
  --accent: var(--studio-accent, #2563eb);
  --accent-deep: var(--studio-accent-deep, #1d4ed8);
  --accent-soft: var(--studio-accent-soft, rgba(37, 99, 235, 0.12));

  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  min-height: 160px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(var(--bg-rgb), 0.4);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.6),
    inset 0 -1px 1px rgba(255, 255, 255, 0.18),
    0 8px 24px rgba(0, 0, 0, 0.05);
  color: var(--text-main);
  cursor: pointer;
  overflow: visible;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.glass-card:hover {
  z-index: 10;
  transform: translateY(-4px);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.8),
    inset 0 -1px 1px rgba(255, 255, 255, 0.22),
    0 12px 32px rgba(0, 0, 0, 0.12);
}

.glass-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.glass-card.active {
  border-color: color-mix(in srgb, var(--accent) 60%, rgba(255, 255, 255, 0.4));
}

.image-wrapper {
  /* Core crop: lock the preview to 2:3 while img uses object-fit to avoid distortion. */
  position: relative;
  flex: 0 0 140px;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: 15px 0 0 15px;
  background: rgba(15, 23, 42, 0.08);
}

.poster {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.6s ease;
}

.glass-card:hover .poster {
  transform: scale(1.05);
}

.img-tags {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: flex;
  gap: 4px;
  max-width: calc(100% - 16px);
  pointer-events: none;
}

.tag-ratio,
.tag-res {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  padding: 3px 7px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.26);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.content-wrapper {
  /* Column rhythm: right-side content flows top to bottom and cannot blow out flex width. */
  flex: 1;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px;
}

.content-top {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 9px;
}

.title {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.36;
  letter-spacing: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.micro-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
}

.m-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--accent) 18%, rgba(255, 255, 255, 0.42));
  background: color-mix(in srgb, var(--accent-soft) 42%, rgba(255, 255, 255, 0.18));
  color: var(--accent-deep);
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.1;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.34),
    inset 0 -1px 0 rgba(15, 23, 42, 0.03);
}

.m-tag.secondary {
  color: color-mix(in srgb, var(--accent-deep) 74%, var(--text-main));
}

.meta-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.3;
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
  opacity: 0.72;
}

.seed-row {
  margin-top: 1px;
}

.seed-button {
  display: block;
  max-width: 100%;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: copy;
}

.seed-button:hover {
  color: var(--accent-deep);
}

.content-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.format {
  color: var(--accent-deep);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1;
}

.actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.action-button {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: color-mix(in srgb, var(--accent-deep) 46%, var(--text-muted));
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.action-button:hover {
  border-color: color-mix(in srgb, var(--accent) 22%, transparent);
  background: rgba(var(--bg-rgb), 0.22);
  color: var(--accent-deep);
  transform: translateY(-1px);
}

.action-button.danger:hover {
  color: #e11d48;
}

:global(.studio-shell.theme-night) .glass-card {
  --bg-rgb: 30, 30, 30;
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(var(--bg-rgb), 0.4);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.16),
    inset 0 -1px 1px rgba(255, 255, 255, 0.05),
    0 10px 26px rgba(0, 0, 0, 0.24);
}

:global(.studio-shell.theme-night) .glass-card:hover {
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.22),
    inset 0 -1px 1px rgba(255, 255, 255, 0.06),
    0 14px 34px rgba(0, 0, 0, 0.36);
}
</style>
