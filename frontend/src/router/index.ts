/**
 * Vue Router configuration for the image-studio-only frontend (slim build).
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useNavigationLoadingState } from '@/composables/useNavigationLoading'
import { resolveDocumentTitle } from './title'

const IMAGE_STUDIO_PATH = '/image-studio'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: IMAGE_STUDIO_PATH,
  },
  {
    path: IMAGE_STUDIO_PATH,
    alias: ['/embed/image-studio'],
    name: 'ImageStudio',
    component: () => import('@/views/embed/ImageStudioEmbedView.vue'),
    meta: {
      title: 'Image Studio',
      titleKey: 'imageStudio.title',
      descriptionKey: 'imageStudio.embedDescription',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: IMAGE_STUDIO_PATH,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

const navigationLoading = useNavigationLoadingState()

router.beforeEach((to, _from, next) => {
  navigationLoading.startNavigation()
  const appStore = useAppStore()
  document.title = resolveDocumentTitle(to.meta.title, appStore.siteName, to.meta.titleKey as string)
  next()
})

router.afterEach(() => {
  navigationLoading.endNavigation()
})

router.onError((error) => {
  console.error('Router error:', error)
  const isChunkLoadError =
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Loading CSS chunk') ||
    error.name === 'ChunkLoadError'

  if (isChunkLoadError) {
    const reloadKey = 'chunk_reload_attempted'
    const lastReload = sessionStorage.getItem(reloadKey)
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString())
      window.location.reload()
    }
  }
})

export default router
