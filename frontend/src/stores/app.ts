/**
 * Application State Store (slim build)
 *
 * The original store talked to admin/auth/version APIs that no longer exist
 * in the image-studio-only deployment. We keep the same surface so that
 * workspace components compile, but most actions are no-ops.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Toast, ToastType, PublicSettings } from '@/types'

const SLIM_PUBLIC_SETTINGS: PublicSettings = {
  registration_enabled: false,
  email_verify_enabled: false,
  registration_email_suffix_whitelist: [],
  promo_code_enabled: false,
  password_reset_enabled: false,
  invitation_code_enabled: false,
  turnstile_enabled: false,
  turnstile_site_key: '',
  site_name: 'Image Studio',
  site_logo: '',
  site_subtitle: '',
  api_base_url: '',
  contact_info: '',
  doc_url: '',
  home_content: '',
  hide_ccs_import_button: true,
  purchase_subscription_enabled: false,
  purchase_subscription_url: '',
  image_studio_enabled: true,
  custom_menu_items: [],
  linuxdo_oauth_enabled: false,
  sora_client_enabled: false,
  version: ''
}

export const useAppStore = defineStore('app', () => {
  // ==================== State ====================
  const sidebarCollapsed = ref<boolean>(false)
  const mobileOpen = ref<boolean>(false)
  const loading = ref<boolean>(false)
  const toasts = ref<Toast[]>([])

  const publicSettingsLoaded = ref<boolean>(false)
  const publicSettingsLoading = ref<boolean>(false)
  const siteName = ref<string>('Image Studio')
  const siteLogo = ref<string>('')
  const siteVersion = ref<string>('')
  const contactInfo = ref<string>('')
  const apiBaseUrl = ref<string>('')
  const docUrl = ref<string>('')
  const cachedPublicSettings = ref<PublicSettings | null>(null)

  const versionLoaded = ref<boolean>(false)
  const versionLoading = ref<boolean>(false)
  const currentVersion = ref<string>('')
  const latestVersion = ref<string>('')
  const hasUpdate = ref<boolean>(false)
  const buildType = ref<string>('source')
  const releaseInfo = ref<unknown>(null)

  let toastIdCounter = 0
  const loadingCount = ref<number>(0)
  const hasActiveToasts = computed(() => toasts.value.length > 0)

  // ==================== UI helpers ====================
  function toggleSidebar(): void { sidebarCollapsed.value = !sidebarCollapsed.value }
  function setSidebarCollapsed(c: boolean): void { sidebarCollapsed.value = c }
  function toggleMobileSidebar(): void { mobileOpen.value = !mobileOpen.value }
  function setMobileOpen(o: boolean): void { mobileOpen.value = o }

  function setLoading(isLoading: boolean): void {
    if (isLoading) loadingCount.value++
    else loadingCount.value = Math.max(0, loadingCount.value - 1)
    loading.value = loadingCount.value > 0
  }

  function showToast(type: ToastType, message: string, duration?: number): string {
    const id = `toast-${++toastIdCounter}`
    toasts.value.push({
      id,
      type,
      message,
      duration,
      startTime: duration !== undefined ? Date.now() : undefined
    })
    if (duration !== undefined) {
      setTimeout(() => hideToast(id), duration)
    }
    return id
  }

  const showSuccess = (m: string, d = 3000) => showToast('success', m, d)
  const showError = (m: string, d = 5000) => showToast('error', m, d)
  const showInfo = (m: string, d = 3000) => showToast('info', m, d)
  const showWarning = (m: string, d = 4000) => showToast('warning', m, d)

  function hideToast(id: string): void {
    const i = toasts.value.findIndex((t) => t.id === id)
    if (i !== -1) toasts.value.splice(i, 1)
  }
  function clearAllToasts(): void { toasts.value = [] }

  async function withLoading<T>(op: () => Promise<T>): Promise<T> {
    setLoading(true)
    try { return await op() } finally { setLoading(false) }
  }

  async function withLoadingAndError<T>(op: () => Promise<T>, errorMessage?: string): Promise<T | null> {
    setLoading(true)
    try {
      return await op()
    } catch (error) {
      const message = errorMessage || (error as { message?: string }).message || 'An error occurred'
      showError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  function reset(): void {
    sidebarCollapsed.value = false
    loading.value = false
    loadingCount.value = 0
    toasts.value = []
  }

  // ==================== No-op stubs (slim build) ====================
  async function fetchVersion(): Promise<null> { return null }
  function clearVersionCache(): void { /* no-op */ }
  async function fetchPublicSettings(): Promise<PublicSettings> {
    applySlimDefaults()
    return SLIM_PUBLIC_SETTINGS
  }
  function clearPublicSettingsCache(): void {
    publicSettingsLoaded.value = false
    cachedPublicSettings.value = null
  }
  function initFromInjectedConfig(): boolean {
    if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
      applySettings(window.__APP_CONFIG__)
      return true
    }
    applySlimDefaults()
    return false
  }

  function applySettings(config: PublicSettings): void {
    cachedPublicSettings.value = config
    siteName.value = config.site_name || 'Image Studio'
    siteLogo.value = config.site_logo || ''
    siteVersion.value = config.version || ''
    contactInfo.value = config.contact_info || ''
    apiBaseUrl.value = config.api_base_url || ''
    docUrl.value = config.doc_url || ''
    publicSettingsLoaded.value = true
  }

  function applySlimDefaults(): void {
    applySettings(SLIM_PUBLIC_SETTINGS)
  }

  return {
    // State
    sidebarCollapsed,
    mobileOpen,
    loading,
    toasts,
    publicSettingsLoaded,
    publicSettingsLoading,
    siteName,
    siteLogo,
    siteVersion,
    contactInfo,
    apiBaseUrl,
    docUrl,
    cachedPublicSettings,
    versionLoaded,
    versionLoading,
    currentVersion,
    latestVersion,
    hasUpdate,
    buildType,
    releaseInfo,
    hasActiveToasts,
    // Actions
    toggleSidebar,
    setSidebarCollapsed,
    toggleMobileSidebar,
    setMobileOpen,
    setLoading,
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    hideToast,
    clearAllToasts,
    withLoading,
    withLoadingAndError,
    reset,
    fetchVersion,
    clearVersionCache,
    fetchPublicSettings,
    clearPublicSettingsCache,
    initFromInjectedConfig,
    applySlimDefaults
  }
})
