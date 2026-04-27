<template>
  <section class="history-panel">
    <div class="history-header">
      <div>
        <p class="history-title">{{ t('imageStudio.history.title') }}</p>
        <p class="history-subtitle">{{ t('imageStudio.history.subtitle') }}</p>
      </div>
      <div class="history-actions">
        <button type="button" class="btn btn-secondary btn-sm" @click="$emit('toggle')">
          {{ expanded ? t('imageStudio.buttons.collapse') : t('imageStudio.buttons.expand') }}
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm text-red-600"
          :disabled="items.length === 0"
          @click="$emit('clear')"
        >
          {{ t('imageStudio.buttons.clear') }}
        </button>
      </div>
    </div>

    <div v-if="expanded" class="history-list">
      <div v-if="items.length === 0" class="history-empty">
        {{ t('imageStudio.emptyStates.history') }}
      </div>

      <article
        v-for="item in items"
        :key="item.id"
        class="history-item"
      >
        <div class="history-item-head">
          <div>
            <p class="history-item-model">{{ item.model }}</p>
            <p class="history-item-time">{{ formatTime(item.createdAt) }}</p>
          </div>
          <span class="history-badge">{{ providerLabel(item.providerMode) }}</span>
        </div>

        <p class="history-item-prompt">{{ item.prompt }}</p>

        <div class="history-thumbs">
          <img
            v-for="result in item.results"
            :key="result.id"
            :src="result.url"
            :alt="result.filename"
          />
        </div>

        <div class="history-item-footer">
          <span>{{ item.aspectRatio }} | {{ t('imageStudio.history.itemCount', { count: item.count }) }}</span>
          <div class="history-item-actions">
            <button type="button" class="btn btn-secondary btn-sm" @click="$emit('restore', item.id)">
              {{ t('imageStudio.buttons.restore') }}
            </button>
            <button type="button" class="btn btn-secondary btn-sm text-red-600" @click="$emit('delete', item.id)">
              {{ t('imageStudio.buttons.delete') }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ImageStudioHistoryItem, ImageStudioProviderMode } from '@/types/imageStudio'

defineProps<{
  items: ImageStudioHistoryItem[]
  expanded: boolean
}>()

defineEmits<{
  restore: [id: string]
  delete: [id: string]
  clear: []
  toggle: []
}>()

const { t, locale } = useI18n()

function formatTime(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function providerLabel(mode: ImageStudioProviderMode): string {
  switch (mode) {
    case 'sub2api':
      return t('imageStudio.history.providerLabels.sub2api')
    case 'external-browser':
      return t('imageStudio.history.providerLabels.externalBrowser')
    default:
      return t('imageStudio.history.providerLabels.externalRelay')
  }
}
</script>

<style scoped>
.history-panel {
  @apply mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.07)] backdrop-blur;
  border-color: rgba(226, 232, 240, 0.7);
  background-color: rgba(255, 255, 255, 0.9);
}

.history-header {
  @apply flex flex-wrap items-start justify-between gap-4;
}

.history-title {
  @apply text-lg font-semibold text-slate-900;
}

.history-subtitle {
  @apply mt-1 text-sm text-slate-500;
}

.history-actions {
  @apply flex flex-wrap gap-2;
}

.history-list {
  @apply mt-4 space-y-3;
}

.history-empty {
  @apply rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500;
}

.history-item {
  @apply rounded-3xl border border-slate-200 bg-slate-50 p-4;
  background-color: rgba(248, 250, 252, 0.8);
}

.history-item-head {
  @apply flex flex-wrap items-start justify-between gap-3;
}

.history-item-model {
  @apply text-sm font-semibold text-slate-900;
}

.history-item-time {
  @apply mt-1 text-xs text-slate-500;
}

.history-badge {
  @apply rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700;
}

.history-item-prompt {
  @apply mt-3 line-clamp-2 text-sm leading-6 text-slate-600;
}

.history-thumbs {
  @apply mt-4 flex flex-wrap gap-2;
}

.history-thumbs img {
  @apply h-12 w-12 rounded-2xl border border-slate-200 object-cover;
}

.history-item-footer {
  @apply mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500;
}

.history-item-actions {
  @apply flex flex-wrap gap-2;
}

@media (max-width: 767px) {
  .history-panel {
    @apply p-4;
  }
}
</style>
