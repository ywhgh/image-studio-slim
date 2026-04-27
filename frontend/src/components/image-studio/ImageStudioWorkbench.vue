<template>
  <section class="workbench-shell">
    <div class="workbench-header">
      <div>
        <p class="workbench-title">{{ t('imageStudio.workbench.title') }}</p>
        <p class="workbench-subtitle">{{ t('imageStudio.workbench.subtitle') }}</p>
      </div>
      <div class="workbench-header-badges">
        <span class="workbench-badge">{{ t('imageStudio.workbench.tileCount', { count: tiles.length }) }}</span>
        <span class="workbench-badge accent">{{ t('imageStudio.workbench.selectedCount', { count: selectedTileIds.length }) }}</span>
      </div>
    </div>

    <p class="workbench-tip">{{ t('imageStudio.workbench.dragTip') }}</p>

    <div
      ref="boardRef"
      class="workbench-board"
      @mousedown="handleBoardMouseDown"
    >
      <div v-if="!tiles.length && !generating" class="workbench-empty">
        <div class="workbench-empty-mark">GRID</div>
        <p class="workbench-empty-title">{{ t('imageStudio.workbench.emptyTitle') }}</p>
        <p class="workbench-empty-text">{{ t('imageStudio.workbench.emptyText') }}</p>
      </div>

      <VueDraggable
        v-model="localTiles"
        :animation="220"
        handle=".workbench-card-drag"
        class="workbench-grid"
      >
        <article
          v-for="tile in localTiles"
          :key="tile.id"
          :ref="(el) => setTileElement(tile.id, el as HTMLElement | null)"
          class="workbench-card"
          :class="{
            selected: selectedTileIdSet.has(tile.id),
            focused: tile.id === previewTileId,
          }"
        >
          <div class="workbench-card-top">
            <span class="workbench-card-provider">{{ providerLabel(tile.providerMode) }}</span>
            <button
              type="button"
              class="workbench-card-drag"
              :title="t('imageStudio.workbench.dragHandle')"
            >
              <span></span>
              <span></span>
            </button>
          </div>

          <button
            type="button"
            class="workbench-card-image"
            @click.stop="handleTileClick(tile.id, $event)"
          >
            <img :src="tile.result.url" :alt="tile.result.filename" />
          </button>

          <button
            type="button"
            class="workbench-card-select"
            :class="{ selected: selectedTileIdSet.has(tile.id) }"
            :title="t('imageStudio.workbench.toggleSelection')"
            @click.stop="toggleTileSelection(tile.id)"
          >
            {{ selectedTileIdSet.has(tile.id) ? '✓' : '+' }}
          </button>

          <div class="workbench-card-meta">
            <p class="workbench-card-model">{{ tile.model }}</p>
            <p class="workbench-card-prompt">{{ tile.prompt }}</p>
            <div class="workbench-card-foot">
              <span>{{ tile.aspectRatio }}</span>
              <span>{{ formatTime(tile.createdAt) }}</span>
            </div>
          </div>
        </article>
      </VueDraggable>

      <div v-if="generating" class="workbench-generating-card">
        <div class="workbench-generating-orb"></div>
        <p class="workbench-generating-title">{{ t('imageStudio.loading.generatingTitle') }}</p>
        <p class="workbench-generating-text">{{ t('imageStudio.workbench.generatingText') }}</p>
        <div class="workbench-generating-track">
          <div class="workbench-generating-bar" :style="{ width: `${Math.max(progress, 6)}%` }"></div>
        </div>
      </div>

      <div
        v-if="selectionBox.visible"
        class="workbench-selection-box"
        :style="selectionBoxStyle"
      ></div>
    </div>

    <Teleport to="body">
      <div
        v-if="previewTile"
        class="workbench-lightbox"
        @click.self="closePreview"
      >
        <div class="workbench-lightbox-panel">
          <div class="workbench-lightbox-header">
            <div class="min-w-0">
              <p class="workbench-lightbox-title">{{ previewTile.result.filename }}</p>
              <p class="workbench-lightbox-caption">{{ previewTile.prompt }}</p>
            </div>
            <div class="workbench-lightbox-actions">
              <button type="button" class="btn btn-secondary btn-sm" @click="$emit('download-one', previewTile.id)">
                {{ t('imageStudio.buttons.downloadCurrent') }}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" @click="zoomOut">-</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="resetZoom">100%</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="zoomIn">+</button>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                :disabled="!hasPreviousPreview"
                @click="showPrevious"
              >
                {{ t('imageStudio.workbench.previousPreview') }}
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                :disabled="!hasNextPreview"
                @click="showNext"
              >
                {{ t('imageStudio.workbench.nextPreview') }}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" @click="closePreview">
                {{ t('imageStudio.workbench.closePreview') }}
              </button>
            </div>
          </div>

          <div class="workbench-lightbox-stage" @wheel.prevent="handlePreviewWheel">
            <img
              :src="previewTile.result.url"
              :alt="previewTile.result.filename"
              class="workbench-lightbox-image"
              :style="{ transform: `scale(${previewZoom})` }"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueDraggable } from 'vue-draggable-plus'
import type { ImageStudioProviderMode, ImageStudioWorkspaceTile } from '@/types/imageStudio'

const props = defineProps<{
  tiles: ImageStudioWorkspaceTile[]
  selectedTileIds: string[]
  previewTileId: string | null
  generating: boolean
  progress: number
}>()

const emit = defineEmits<{
  'update:tiles': [tiles: ImageStudioWorkspaceTile[]]
  'update:selectedTileIds': [tileIds: string[]]
  'update:previewTileId': [tileId: string | null]
  'download-one': [tileId: string]
}>()

const { t, locale } = useI18n()

const boardRef = ref<HTMLElement | null>(null)
const tileElements = new Map<string, HTMLElement>()
const previewZoom = ref(1)

const selectionBox = ref({
  visible: false,
  startClientX: 0,
  startClientY: 0,
  currentClientX: 0,
  currentClientY: 0,
})

let selectionBaseIds: string[] = []

const localTiles = computed({
  get: () => props.tiles,
  set: (value) => emit('update:tiles', value),
})

const selectedTileIdSet = computed(() => new Set(props.selectedTileIds))

const previewIndex = computed(() => props.tiles.findIndex((tile) => tile.id === props.previewTileId))

const previewTile = computed(() => (
  previewIndex.value >= 0 ? props.tiles[previewIndex.value] : null
))

const hasPreviousPreview = computed(() => previewIndex.value > 0)
const hasNextPreview = computed(() => previewIndex.value >= 0 && previewIndex.value < props.tiles.length - 1)

const selectionBoxStyle = computed(() => {
  if (!selectionBox.value.visible || !boardRef.value) {
    return {}
  }

  const boardRect = boardRef.value.getBoundingClientRect()
  const left = Math.min(selectionBox.value.startClientX, selectionBox.value.currentClientX) - boardRect.left + boardRef.value.scrollLeft
  const top = Math.min(selectionBox.value.startClientY, selectionBox.value.currentClientY) - boardRect.top + boardRef.value.scrollTop
  const width = Math.abs(selectionBox.value.currentClientX - selectionBox.value.startClientX)
  const height = Math.abs(selectionBox.value.currentClientY - selectionBox.value.startClientY)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

function setTileElement(tileId: string, element: HTMLElement | null) {
  if (element) {
    tileElements.set(tileId, element)
    return
  }

  tileElements.delete(tileId)
}

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

function toggleTileSelection(tileId: string) {
  const next = new Set(props.selectedTileIds)
  if (next.has(tileId)) {
    next.delete(tileId)
  } else {
    next.add(tileId)
  }
  emit('update:selectedTileIds', Array.from(next))
}

function handleTileClick(tileId: string, event: MouseEvent) {
  if (event.metaKey || event.ctrlKey) {
    toggleTileSelection(tileId)
    return
  }

  emit('update:selectedTileIds', [tileId])
  emit('update:previewTileId', tileId)
}

function openPreviewFromIndex(index: number) {
  const tile = props.tiles[index]
  if (!tile) {
    return
  }

  emit('update:selectedTileIds', [tile.id])
  emit('update:previewTileId', tile.id)
  previewZoom.value = 1
}

function closePreview() {
  emit('update:previewTileId', null)
  previewZoom.value = 1
}

function showPrevious() {
  if (!hasPreviousPreview.value) {
    return
  }
  openPreviewFromIndex(previewIndex.value - 1)
}

function showNext() {
  if (!hasNextPreview.value) {
    return
  }
  openPreviewFromIndex(previewIndex.value + 1)
}

function resetZoom() {
  previewZoom.value = 1
}

function zoomIn() {
  previewZoom.value = Math.min(4, Number((previewZoom.value + 0.2).toFixed(2)))
}

function zoomOut() {
  previewZoom.value = Math.max(0.6, Number((previewZoom.value - 0.2).toFixed(2)))
}

function handlePreviewWheel(event: WheelEvent) {
  if (event.deltaY < 0) {
    zoomIn()
    return
  }
  zoomOut()
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (!previewTile.value) {
    return
  }

  if (event.key === 'Escape') {
    closePreview()
    return
  }

  if (event.key === 'ArrowLeft') {
    showPrevious()
    return
  }

  if (event.key === 'ArrowRight') {
    showNext()
  }
}

function handleBoardMouseDown(event: MouseEvent) {
  if (event.button !== 0) {
    return
  }

  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  if (target.closest('.workbench-card')) {
    return
  }

  event.preventDefault()

  selectionBaseIds = event.metaKey || event.ctrlKey ? [...props.selectedTileIds] : []
  selectionBox.value = {
    visible: true,
    startClientX: event.clientX,
    startClientY: event.clientY,
    currentClientX: event.clientX,
    currentClientY: event.clientY,
  }

  window.addEventListener('mousemove', handleBoardMouseMove)
  window.addEventListener('mouseup', handleBoardMouseUp)
}

function handleBoardMouseMove(event: MouseEvent) {
  selectionBox.value.currentClientX = event.clientX
  selectionBox.value.currentClientY = event.clientY
  updateSelectionFromBox()
}

function handleBoardMouseUp() {
  const width = Math.abs(selectionBox.value.currentClientX - selectionBox.value.startClientX)
  const height = Math.abs(selectionBox.value.currentClientY - selectionBox.value.startClientY)

  if (width < 4 && height < 4 && !selectionBaseIds.length) {
    emit('update:selectedTileIds', [])
  }

  selectionBox.value.visible = false
  window.removeEventListener('mousemove', handleBoardMouseMove)
  window.removeEventListener('mouseup', handleBoardMouseUp)
}

function updateSelectionFromBox() {
  const left = Math.min(selectionBox.value.startClientX, selectionBox.value.currentClientX)
  const right = Math.max(selectionBox.value.startClientX, selectionBox.value.currentClientX)
  const top = Math.min(selectionBox.value.startClientY, selectionBox.value.currentClientY)
  const bottom = Math.max(selectionBox.value.startClientY, selectionBox.value.currentClientY)

  const next = new Set(selectionBaseIds)

  tileElements.forEach((element, tileId) => {
    const rect = element.getBoundingClientRect()
    const intersects = !(rect.right < left || rect.left > right || rect.bottom < top || rect.top > bottom)
    if (intersects) {
      next.add(tileId)
    }
  })

  emit('update:selectedTileIds', Array.from(next))
}

onMounted(() => {
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleBoardMouseMove)
  window.removeEventListener('mouseup', handleBoardMouseUp)
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<style scoped>
.workbench-shell {
  @apply flex min-h-0 flex-1 flex-col rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur;
  background-color: rgba(255, 255, 255, 0.88);
}

.workbench-header {
  @apply flex flex-wrap items-start justify-between gap-4;
}

.workbench-title {
  @apply text-[24px] font-semibold leading-tight text-slate-900;
}

.workbench-subtitle {
  @apply mt-1 text-sm leading-6 text-slate-500;
}

.workbench-header-badges {
  @apply flex flex-wrap gap-2;
}

.workbench-badge {
  @apply inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600;
}

.workbench-badge.accent {
  @apply border-cyan-200 bg-cyan-50 text-cyan-700;
}

.workbench-tip {
  @apply mt-3 text-xs uppercase tracking-[0.22em] text-slate-400;
}

.workbench-board {
  @apply relative mt-4 min-h-[520px] flex-1 overflow-auto rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)];
}

.workbench-grid {
  @apply grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4;
}

.workbench-card {
  @apply relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition;
  background-color: rgba(255, 255, 255, 0.92);
}

.workbench-card:hover {
  transform: translateY(-2px);
}

.workbench-card.selected {
  @apply border-cyan-500 shadow-[0_18px_36px_rgba(8,145,178,0.18)];
}

.workbench-card.focused {
  @apply ring-2 ring-amber-300;
}

.workbench-card-top {
  @apply mb-3 flex items-center justify-between gap-3;
}

.workbench-card-provider {
  @apply inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600;
}

.workbench-card-drag {
  @apply flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white transition;
}

.workbench-card-drag span {
  @apply mx-[1px] inline-block h-3 w-[3px] rounded-full bg-slate-300;
}

.workbench-card-image {
  @apply block w-full overflow-hidden rounded-[18px] bg-slate-100 p-0;
  aspect-ratio: 1 / 1;
}

.workbench-card-image img {
  @apply h-full w-full object-cover transition;
}

.workbench-card-image:hover img {
  transform: scale(1.03);
}

.workbench-card-select {
  @apply absolute right-4 top-14 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-slate-900 text-sm font-semibold text-white backdrop-blur transition;
  border-color: rgba(255, 255, 255, 0.7);
  background-color: rgba(15, 23, 42, 0.72);
}

.workbench-card-select.selected {
  @apply bg-cyan-500;
}

.workbench-card-meta {
  @apply mt-3 space-y-2;
}

.workbench-card-model {
  @apply text-sm font-semibold text-slate-900;
}

.workbench-card-prompt {
  @apply text-sm leading-6 text-slate-500;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.workbench-card-foot {
  @apply flex items-center justify-between gap-3 text-xs font-medium text-slate-400;
}

.workbench-generating-card {
  @apply mx-5 mb-5 flex flex-col rounded-[24px] border border-dashed border-cyan-200 bg-white p-5 text-center shadow-sm;
  background-color: rgba(255, 255, 255, 0.84);
}

.workbench-generating-orb {
  @apply mx-auto h-14 w-14 rounded-full border-[4px] border-cyan-100 border-t-cyan-500;
  animation: workbench-spin 0.9s linear infinite;
}

.workbench-generating-title {
  @apply mt-4 text-base font-semibold text-slate-900;
}

.workbench-generating-text {
  @apply mt-1 text-sm text-slate-500;
}

.workbench-generating-track {
  @apply mt-4 h-2 overflow-hidden rounded-full bg-slate-200;
}

.workbench-generating-bar {
  @apply h-full rounded-full bg-[linear-gradient(90deg,#06b6d4_0%,#f59e0b_100%)];
  transition: width 220ms ease;
}

.workbench-empty {
  @apply flex min-h-[420px] flex-col items-center justify-center px-6 text-center;
}

.workbench-empty-mark {
  @apply flex h-16 w-16 items-center justify-center rounded-[18px] bg-white text-sm font-bold tracking-[0.28em] text-slate-400 shadow-sm;
}

.workbench-empty-title {
  @apply mt-5 text-xl font-semibold text-slate-900;
}

.workbench-empty-text {
  @apply mt-2 max-w-md text-sm leading-7 text-slate-500;
}

.workbench-selection-box {
  @apply pointer-events-none absolute z-20 rounded-[18px] border border-cyan-400 bg-cyan-300;
  background-color: rgba(103, 232, 249, 0.12);
}

.workbench-lightbox {
  @apply fixed inset-0 z-[80] flex items-center justify-center bg-slate-950 p-4 backdrop-blur-sm;
  background-color: rgba(2, 6, 23, 0.72);
}

.workbench-lightbox-panel {
  @apply flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white bg-slate-950 text-white shadow-[0_30px_100px_rgba(15,23,42,0.48)];
  border-color: rgba(255, 255, 255, 0.12);
}

.workbench-lightbox-header {
  @apply flex flex-wrap items-start justify-between gap-4 border-b border-white px-5 py-4;
  border-color: rgba(255, 255, 255, 0.1);
}

.workbench-lightbox-title {
  @apply text-base font-semibold;
}

.workbench-lightbox-caption {
  @apply mt-1 text-sm leading-6 text-slate-300;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.workbench-lightbox-actions {
  @apply flex flex-wrap gap-2;
}

.workbench-lightbox-stage {
  @apply flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,#020617_0%,#111827_100%)] p-6;
}

.workbench-lightbox-image {
  @apply mx-auto block max-h-none max-w-none rounded-[24px] shadow-[0_24px_60px_rgba(15,23,42,0.32)];
  transform-origin: center top;
  transition: transform 160ms ease;
}

@media (max-width: 1279px) {
  .workbench-grid {
    @apply xl:grid-cols-2;
  }
}

@media (max-width: 767px) {
  .workbench-shell {
    @apply p-4;
  }

  .workbench-board {
    min-height: 420px;
  }

  .workbench-grid {
    @apply grid-cols-1 p-4;
  }

  .workbench-lightbox-stage {
    @apply p-4;
  }
}

@keyframes workbench-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
