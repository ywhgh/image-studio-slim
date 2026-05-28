<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed right-4 top-4 z-[9999] space-y-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <TransitionGroup
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-full"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="[
            'studio-toast',
            `type-${toast.type}`,
            { 'theme-night': studioToastAppearance.themeMode === 'night' }
          ]"
          :style="toastAppearanceStyle"
        >
          <div class="studio-toast-body">
            <div class="studio-toast-content-row">
              <!-- Icon -->
              <div class="studio-toast-icon-wrap">
                <Icon
                  :name="getToastIconName(toast.type)"
                  size="md"
                  class="studio-toast-icon"
                  aria-hidden="true"
                />
              </div>

              <!-- Content -->
              <div class="studio-toast-copy">
                <p v-if="toast.title" class="studio-toast-title">
                  {{ toast.title }}
                </p>
                <p
                  :class="[
                    'studio-toast-message',
                    { 'has-title': toast.title }
                  ]"
                >
                  {{ toast.message }}
                </p>
              </div>

              <!-- Close button -->
              <button
                @click="removeToast(toast.id)"
                class="studio-toast-close"
                aria-label="Close notification"
              >
                <Icon name="x" size="sm" />
              </button>
            </div>
          </div>

          <!-- Progress bar -->
          <div v-if="toast.duration" class="studio-toast-progress-track">
            <div
              class="studio-toast-progress"
              :style="{ animationDuration: `${toast.duration}ms` }"
            ></div>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const STUDIO_APPEARANCE_STORAGE_KEY = 'image-studio.appearance'

interface StudioToastAppearance {
  themeMode: 'day' | 'night'
  radiusScale: number
}

const toasts = computed(() => appStore.toasts)
const studioToastAppearance = ref<StudioToastAppearance>(readStudioToastAppearance())

const toastAppearanceStyle = computed(() => {
  const radius = Math.min(24, Math.max(0, studioToastAppearance.value.radiusScale))
  const radiusOrZero = (value: number) => radius === 0 ? 0 : value

  return {
    '--studio-radius-control': `${radiusOrZero(Math.max(10, radius - 1))}px`,
    '--studio-radius-soft': `${radiusOrZero(Math.max(8, radius - 5))}px`,
  }
})

function readStudioToastAppearance(): StudioToastAppearance {
  if (typeof window === 'undefined') {
    return {
      themeMode: 'day',
      radiusScale: 14,
    }
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STUDIO_APPEARANCE_STORAGE_KEY) || '{}') as Partial<StudioToastAppearance>
    return {
      themeMode: parsed.themeMode === 'night' ? 'night' : 'day',
      radiusScale: typeof parsed.radiusScale === 'number' && Number.isFinite(parsed.radiusScale)
        ? Math.min(24, Math.max(0, Math.round(parsed.radiusScale)))
        : 14,
    }
  } catch {
    return {
      themeMode: 'day',
      radiusScale: 14,
    }
  }
}

function refreshStudioToastAppearance() {
  studioToastAppearance.value = readStudioToastAppearance()
}

function handleStudioAppearanceChanged(event: Event) {
  const detail = (event as CustomEvent<Partial<StudioToastAppearance>>).detail
  if (!detail) {
    refreshStudioToastAppearance()
    return
  }

  studioToastAppearance.value = {
    themeMode: detail.themeMode === 'night' ? 'night' : 'day',
    radiusScale: typeof detail.radiusScale === 'number' && Number.isFinite(detail.radiusScale)
      ? Math.min(24, Math.max(0, Math.round(detail.radiusScale)))
      : studioToastAppearance.value.radiusScale,
  }
}

function handleStorage(event: StorageEvent) {
  if (event.key === STUDIO_APPEARANCE_STORAGE_KEY) {
    refreshStudioToastAppearance()
  }
}

const getToastIconName = (type: string): 'checkCircle' | 'xCircle' | 'exclamationTriangle' | 'infoCircle' => {
  switch (type) {
    case 'success':
      return 'checkCircle'
    case 'error':
      return 'xCircle'
    case 'warning':
      return 'exclamationTriangle'
    case 'info':
    default:
      return 'infoCircle'
  }
}

const removeToast = (id: string) => {
  appStore.hideToast(id)
}

onMounted(() => {
  refreshStudioToastAppearance()
  window.addEventListener('image-studio-appearance-changed', handleStudioAppearanceChanged)
  window.addEventListener('storage', handleStorage)
})

onBeforeUnmount(() => {
  window.removeEventListener('image-studio-appearance-changed', handleStudioAppearanceChanged)
  window.removeEventListener('storage', handleStorage)
})
</script>

<style scoped>
.studio-toast {
  --toast-accent: #2563eb;
  pointer-events: auto;
  min-width: 320px;
  max-width: 28rem;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-left: 4px solid var(--toast-accent);
  border-radius: var(--studio-radius-control, 12px);
  background: rgba(255, 255, 255, 0.96);
  color: #111827;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);
}

.studio-toast.type-success {
  --toast-accent: #22c55e;
}

.studio-toast.type-error {
  --toast-accent: #ef4444;
}

.studio-toast.type-warning {
  --toast-accent: #eab308;
}

.studio-toast.type-info {
  --toast-accent: #3b82f6;
}

.studio-toast-body {
  padding: 16px;
}

.studio-toast-content-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.studio-toast-icon-wrap {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--toast-accent);
}

.studio-toast-icon {
  color: currentColor;
}

.studio-toast-copy {
  min-width: 0;
  flex: 1;
}

.studio-toast-title {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.studio-toast-message {
  color: #111827;
  font-size: 14px;
  line-height: 1.65;
}

.studio-toast-message.has-title {
  margin-top: 4px;
  color: #4b5563;
}

.studio-toast-close {
  margin: -4px;
  flex-shrink: 0;
  border-radius: var(--studio-radius-soft, 6px);
  padding: 4px;
  color: #9ca3af;
  transition: background 160ms ease, color 160ms ease;
}

.studio-toast-close:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #4b5563;
}

.studio-toast-progress-track {
  height: 4px;
  background: rgba(15, 23, 42, 0.06);
}

.studio-toast-progress {
  height: 100%;
  width: 100%;
  background: var(--toast-accent);
  animation-name: toast-progress-shrink;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

.studio-toast.theme-night {
  border-color: rgba(255, 255, 255, 0.10);
  border-left-color: var(--toast-accent);
  background: rgba(24, 26, 34, 0.96);
  color: #e5eefc;
  box-shadow: 0 22px 56px rgba(0, 0, 0, 0.42);
}

.studio-toast.theme-night .studio-toast-title,
.studio-toast.theme-night .studio-toast-message {
  color: #e5eefc;
}

.studio-toast.theme-night .studio-toast-message.has-title {
  color: #a9b5c7;
}

.studio-toast.theme-night .studio-toast-close {
  color: #9aa6b8;
}

.studio-toast.theme-night .studio-toast-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e5eefc;
}

.studio-toast.theme-night .studio-toast-progress-track {
  background: rgba(255, 255, 255, 0.08);
}

@keyframes toast-progress-shrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
</style>
