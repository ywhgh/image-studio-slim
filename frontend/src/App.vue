<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, watch } from 'vue'
import Toast from '@/components/common/Toast.vue'
import NavigationProgress from '@/components/common/NavigationProgress.vue'
import { useAppStore } from '@/stores'

const appStore = useAppStore()

/**
 * Update favicon dynamically
 * @param logoUrl - URL of the logo to use as favicon
 */
function updateFavicon(logoUrl: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = logoUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
  link.href = logoUrl
}

watch(
  () => appStore.siteLogo,
  (newLogo) => {
    if (newLogo) {
      updateFavicon(newLogo)
    }
  },
  { immediate: true }
)

onMounted(() => {
  // Slim build: no setup wizard, no public settings endpoint.
  // Seed cachedPublicSettings so workspace knows image_studio_enabled=true.
  appStore.applySlimDefaults()
})
</script>

<template>
  <NavigationProgress />
  <RouterView />
  <Toast />
</template>
