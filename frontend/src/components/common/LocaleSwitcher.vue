<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click="toggleDropdown"
      :disabled="switching"
      class="locale-switcher-trigger"
      :title="currentLocale?.name"
    >
      <span class="text-base">{{ currentLocale?.flag }}</span>
      <span class="hidden sm:inline">{{ currentLocale?.code.toUpperCase() }}</span>
      <Icon
        name="chevronDown"
        size="xs"
        class="locale-switcher-chevron"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <transition name="dropdown">
      <div
        v-if="isOpen"
        class="locale-switcher-menu"
      >
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          :disabled="switching"
          @click="selectLocale(locale.code)"
          class="locale-switcher-item"
          :class="{
            active:
              locale.code === currentLocaleCode
          }"
        >
          <span class="text-base">{{ locale.flag }}</span>
          <span>{{ locale.name }}</span>
          <Icon v-if="locale.code === currentLocaleCode" name="check" size="sm" class="ml-auto text-primary-500" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { setLocale, availableLocales } from '@/i18n'

const { locale } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const switching = ref(false)

const currentLocaleCode = computed(() => locale.value)
const currentLocale = computed(() => availableLocales.find((l) => l.code === locale.value))

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

async function selectLocale(code: string) {
  if (switching.value || code === currentLocaleCode.value) {
    isOpen.value = false
    return
  }
  switching.value = true
  try {
    await setLocale(code)
    isOpen.value = false
  } finally {
    switching.value = false
  }
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.locale-switcher-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: var(--studio-radius-control, 0.5rem);
  padding: 0.375rem 0.5rem;
  color: var(--studio-muted, #4b5563);
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 160ms ease, color 160ms ease;
}

.locale-switcher-trigger:hover {
  background: var(--studio-soft-background, #f3f4f6);
  color: var(--studio-text, #111827);
}

.locale-switcher-chevron {
  color: color-mix(in srgb, var(--studio-muted, #9ca3af) 76%, transparent);
  transition: transform 200ms ease;
}

.locale-switcher-menu {
  position: absolute;
  right: 0;
  z-index: 50;
  margin-top: 0.25rem;
  width: 8rem;
  overflow: hidden;
  border: 1px solid var(--studio-border, #e5e7eb);
  border-radius: var(--studio-radius-control, 0.5rem);
  background: var(--studio-card-background, #ffffff);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
}

.locale-switcher-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  color: var(--studio-text, #374151);
  font-size: 0.875rem;
  transition: background-color 160ms ease, color 160ms ease;
}

.locale-switcher-item:hover {
  background: var(--studio-soft-background, #f3f4f6);
}

.locale-switcher-item.active {
  background: var(--studio-accent-soft, #eff6ff);
  color: var(--studio-accent-deep, #2563eb);
}
</style>
