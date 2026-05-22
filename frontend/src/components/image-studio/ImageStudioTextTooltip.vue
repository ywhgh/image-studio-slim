<template>
  <span
    ref="triggerRef"
    class="studio-text-tooltip-trigger"
    v-bind="$attrs"
    :aria-describedby="visible ? tooltipId : undefined"
    @focusin="openNow"
    @focusout="scheduleClose"
    @keydown.esc="closeNow"
    @pointerenter="scheduleOpen"
    @pointerleave="scheduleClose"
  >
    <slot />
  </span>

  <Teleport to="body">
    <div
      v-if="visible && normalizedText"
      :id="tooltipId"
      ref="tooltipRef"
      class="studio-text-tooltip"
      :class="[`is-${variant}`, { 'is-ready': positioned }]"
      :style="resolvedTooltipStyle"
      role="tooltip"
      @pointerenter="cancelClose"
      @pointerleave="scheduleClose"
    >
      {{ normalizedText }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

defineOptions({
  inheritAttrs: false,
})

type TooltipVariant = 'outline' | 'plain' | 'soft'
type TooltipPlacement = 'auto' | 'top' | 'bottom'

const props = withDefaults(defineProps<{
  text?: string
  variant?: TooltipVariant
  placement?: TooltipPlacement
  maxWidth?: number
  openDelay?: number
  disabled?: boolean
  accentColor?: string
  accentDeep?: string
  accentRgb?: string
}>(), {
  text: '',
  variant: 'outline',
  placement: 'auto',
  maxWidth: 420,
  openDelay: 160,
  disabled: false,
  accentColor: '#2563eb',
  accentDeep: '#1d4ed8',
  accentRgb: '37, 99, 235',
})

const triggerRef = ref<HTMLElement | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const positioned = ref(false)
const tooltipStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
  maxWidth: '420px',
  '--tooltip-origin': 'top center',
})
const tooltipId = `studio-text-tooltip-${Math.random().toString(36).slice(2)}`
let openTimer = 0
let closeTimer = 0

const normalizedText = computed(() => props.text.trim())
const resolvedTooltipStyle = computed(() => ({
  ...tooltipStyle.value,
  '--tooltip-accent': props.accentColor,
  '--tooltip-accent-deep': props.accentDeep,
  '--tooltip-accent-rgb': props.accentRgb,
}))

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function clearOpenTimer(): void {
  if (!openTimer) return
  window.clearTimeout(openTimer)
  openTimer = 0
}

function clearCloseTimer(): void {
  if (!closeTimer) return
  window.clearTimeout(closeTimer)
  closeTimer = 0
}

function updatePosition(): void {
  const trigger = triggerRef.value
  const tooltip = tooltipRef.value
  if (!trigger || !tooltip) return

  const margin = 30
  const triggerRect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxWidth = Math.max(180, Math.min(props.maxWidth, 460, viewportWidth - margin * 2))

  tooltipStyle.value = {
    ...tooltipStyle.value,
    maxWidth: `${maxWidth}px`,
  }

  const tooltipRect = tooltip.getBoundingClientRect()
  const tooltipWidth = Math.min(tooltipRect.width || maxWidth, maxWidth)
  const tooltipHeight = tooltipRect.height || 1
  const centeredLeft = triggerRect.left + triggerRect.width / 2
  const left = clampValue(
    centeredLeft,
    margin + tooltipWidth / 2,
    viewportWidth - margin - tooltipWidth / 2,
  )

  const gap = 10
  const topPosition = triggerRect.top - tooltipHeight - gap
  const bottomPosition = triggerRect.bottom + gap
  const hasRoomAbove = topPosition >= margin
  const hasRoomBelow = bottomPosition + tooltipHeight <= viewportHeight - margin
  const preferAbove = props.placement === 'top'
    ? true
    : props.placement === 'bottom'
      ? false
      : hasRoomAbove || !hasRoomBelow

  const unclampedTop = preferAbove ? topPosition : bottomPosition
  const top = clampValue(
    unclampedTop,
    margin,
    Math.max(margin, viewportHeight - tooltipHeight - margin),
  )

  tooltipStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    maxWidth: `${maxWidth}px`,
    '--tooltip-origin': preferAbove ? 'bottom center' : 'top center',
  }
  positioned.value = true
}

async function openNow(): Promise<void> {
  if (props.disabled || !normalizedText.value) return
  clearOpenTimer()
  clearCloseTimer()
  positioned.value = false
  visible.value = true
  await nextTick()
  updatePosition()
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)
}

function scheduleOpen(): void {
  if (props.disabled || !normalizedText.value) return
  clearOpenTimer()
  clearCloseTimer()
  openTimer = window.setTimeout(() => {
    openTimer = 0
    void openNow()
  }, props.openDelay)
}

function closeNow(): void {
  clearOpenTimer()
  clearCloseTimer()
  visible.value = false
  positioned.value = false
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
}

function scheduleClose(): void {
  clearOpenTimer()
  clearCloseTimer()
  closeTimer = window.setTimeout(closeNow, 90)
}

function cancelClose(): void {
  clearCloseTimer()
}

onBeforeUnmount(closeNow)
</script>

<style scoped>
.studio-text-tooltip-trigger {
  display: inline-block;
  min-width: 0;
  max-width: 100%;
}

.studio-text-tooltip {
  position: fixed;
  z-index: 2147483000;
  width: max-content;
  max-height: min(42vh, 320px);
  overflow: auto;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  opacity: 0;
  overflow-wrap: anywhere;
  pointer-events: auto;
  scrollbar-width: thin;
  text-align: left;
  transform: translate(-50%, 4px) scale(0.98);
  transform-origin: var(--tooltip-origin);
  transition: opacity 140ms ease, transform 140ms ease;
  white-space: pre-wrap;
}

.studio-text-tooltip.is-ready {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

.studio-text-tooltip.is-outline {
  border: 1px solid color-mix(in srgb, var(--tooltip-accent) 58%, transparent);
  background: rgba(255, 255, 255, 0.94);
  color: var(--tooltip-accent-deep);
  box-shadow: 0 14px 34px rgba(var(--tooltip-accent-rgb), 0.18), 0 8px 18px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.studio-text-tooltip.is-plain {
  border: 0;
  background: rgba(255, 255, 255, 0.98);
  color: #111827;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
}

.studio-text-tooltip.is-soft {
  border: 1px solid rgba(255, 255, 255, 0.46);
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.26), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, #0f172a 72%, var(--tooltip-accent)), color-mix(in srgb, var(--tooltip-accent-deep) 86%, #0f172a));
  color: #ffffff;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.26), 0 10px 24px rgba(var(--tooltip-accent-rgb), 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

@media (prefers-reduced-motion: reduce) {
  .studio-text-tooltip {
    transition: none;
  }
}
</style>
