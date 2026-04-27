<!--
  @deprecated This component is unused. The real preview lives inline in
  ImageStudioWorkspace.vue (Teleport-mounted lightbox). Kept temporarily; remove
  in a future cleanup pass once dependents are confirmed gone.
-->
<template>
  <section class="preview-panel">
    <div class="preview-header">
      <div>
        <p class="preview-title">{{ t('imageStudio.preview.title') }}</p>
        <p class="preview-subtitle">{{ t('imageStudio.preview.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        :disabled="!activeResult"
        @click="$emit('download')"
      >
        {{ t('imageStudio.buttons.downloadPreview') }}
      </button>
    </div>

    <div class="preview-stage">
      <div v-if="generating" class="preview-loading">
        <div class="preview-spinner"></div>
        <p class="preview-loading-title">{{ t('imageStudio.loading.generatingTitle') }}</p>
        <p class="preview-loading-text">{{ t('imageStudio.loading.generatingText') }}</p>
        <div class="preview-progress-track">
          <div class="preview-progress-bar" :style="{ width: `${progress}%` }"></div>
        </div>
        <span class="preview-progress-label">{{ Math.round(progress) }}%</span>
      </div>

      <template v-else-if="activeResult">
        <img :src="activeResult.url" :alt="t('imageStudio.preview.alt')" class="preview-image" />
        <div class="preview-meta">
          <span>{{ activeResult.filename }}</span>
          <span v-if="activeResult.revisedPrompt">{{ activeResult.revisedPrompt }}</span>
        </div>
      </template>

      <div v-else class="preview-empty">
        <div class="preview-empty-icon">IMG</div>
        <p class="preview-empty-title">{{ t('imageStudio.emptyStates.previewTitle') }}</p>
        <p class="preview-empty-text">{{ t('imageStudio.emptyStates.previewText') }}</p>
      </div>
    </div>

    <div v-if="results.length > 1" class="preview-strip">
      <button
        v-for="result in results"
        :key="result.id"
        type="button"
        class="preview-thumb"
        :class="{ active: result.id === selectedResultId }"
        @click="$emit('select', result.id)"
      >
        <img :src="result.url" :alt="result.filename" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NormalizedImageResult } from '@/types/imageStudio'

const props = defineProps<{
  results: NormalizedImageResult[]
  selectedResultId: string | null
  generating: boolean
  progress: number
}>()

defineEmits<{
  select: [resultId: string]
  download: []
}>()

const { t } = useI18n()

const activeResult = computed(() => {
  if (!props.selectedResultId) {
    return props.results[0] || null
  }
  return props.results.find((result) => result.id === props.selectedResultId) || props.results[0] || null
})
</script>

<style scoped>
.preview-panel {
  @apply flex h-full min-h-[480px] flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur;
  border-color: rgba(226, 232, 240, 0.7);
  background-color: rgba(255, 255, 255, 0.9);
}

.preview-header {
  @apply mb-4 flex flex-wrap items-start justify-between gap-4;
}

.preview-title {
  @apply text-lg font-semibold text-slate-900;
}

.preview-subtitle {
  @apply mt-1 text-sm text-slate-500;
}

.preview-stage {
  @apply relative flex flex-1 items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)];
  min-height: 420px;
}

.preview-image {
  @apply h-full w-full object-contain p-6;
}

.preview-meta {
  @apply absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 rounded-2xl bg-white px-4 py-2 text-xs text-slate-600 shadow-sm backdrop-blur;
  background-color: rgba(255, 255, 255, 0.84);
}

.preview-loading,
.preview-empty {
  @apply flex max-w-md flex-col items-center text-center;
}

.preview-loading-title,
.preview-empty-title {
  @apply mt-5 text-xl font-semibold text-slate-900;
}

.preview-loading-text,
.preview-empty-text {
  @apply mt-2 text-sm leading-6 text-slate-500;
}

.preview-spinner {
  @apply h-16 w-16 rounded-full border-[5px] border-cyan-200 border-t-cyan-500;
  animation: studio-spin 1s linear infinite;
}

.preview-progress-track {
  @apply mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-200;
}

.preview-progress-bar {
  @apply h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#0f766e_100%)];
  transition: width 240ms ease;
}

.preview-progress-label {
  @apply mt-3 text-xs font-medium uppercase tracking-[0.24em] text-cyan-700;
}

.preview-empty-icon {
  @apply flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-sm font-bold tracking-[0.3em] text-slate-400 shadow-sm;
}

.preview-strip {
  @apply mt-4 flex flex-wrap gap-3;
}

.preview-thumb {
  @apply h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-0 transition;
}

.preview-thumb.active {
  @apply border-cyan-500 shadow-[0_10px_24px_rgba(8,145,178,0.22)];
}

.preview-thumb img {
  @apply h-full w-full object-cover;
}

@media (max-width: 767px) {
  .preview-panel {
    @apply min-h-[420px] p-4;
  }

  .preview-stage {
    min-height: 320px;
  }

  .preview-image {
    @apply p-4;
  }
}

@keyframes studio-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
