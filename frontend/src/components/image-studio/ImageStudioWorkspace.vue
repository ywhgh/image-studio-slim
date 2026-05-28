<template>
  <div
    v-if="appStore.cachedPublicSettings?.image_studio_enabled === false"
    class="studio-disabled"
  >
    <div class="studio-disabled-card">
      <p class="studio-disabled-title">{{ t('imageStudio.disabledCardTitle') }}</p>
      <p class="studio-disabled-text">{{ t('imageStudio.disabledCardText') }}</p>
    </div>
  </div>

  <div
    v-else
    ref="studioShellRef"
    class="studio-shell"
    :class="[
      { embedded: props.embedded, 'motion-reduced': !studioAppearance.motionEnabled },
      `theme-${studioAppearance.themeMode}`,
      `texture-${studioAppearance.textureMode}`,
    ]"
    :style="studioAppearanceStyle"
    @focusin.capture="handleStudioTitleTooltipFocusIn"
    @focusout.capture="handleStudioTitleTooltipFocusOut"
    @keydown.esc.capture="hideStudioTitleTooltip"
    @pointerout.capture="handleStudioTitleTooltipPointerOut"
    @pointerover.capture="handleStudioTitleTooltipPointerOver"
  >
    <div class="studio-window">
      <header class="studio-header">
        <div class="studio-brand">
          <div class="studio-brand-mark">
            <Icon name="sparkles" size="md" />
          </div>
          <div class="min-w-0">
            <p class="studio-brand-kicker">{{ t('imageStudio.header.kicker') }}</p>
            <h1 class="studio-brand-title">{{ t('imageStudio.workspaceTitle') }}</h1>
          </div>
        </div>

        <div class="studio-header-actions">
          <div class="studio-header-pill" :class="`tone-${headerStatusTone}`">
            <span class="studio-pill-dot" :class="{ 'is-pulsing': generating }"></span>
            <div class="studio-pill-stack">
              <span class="studio-pill-label">{{ headerStatusText }}</span>
              <strong class="studio-pill-value">{{ headerRemainingText }}</strong>
            </div>
          </div>
          <button
            v-if="preferences.providerMode === 'sub2api'"
            type="button"
            class="studio-icon-button"
            :disabled="currentSiteUsageLoading || !hasSub2ApiKey"
            :title="t('imageStudio.buttons.checkUsage')"
            @click="refreshCurrentSiteUsage()"
          >
            <Icon name="refresh" size="sm" />
          </button>
          <a
            v-if="!props.embedded"
            href="/embed/image-studio"
            target="_blank"
            rel="noopener noreferrer"
            class="studio-icon-button"
            :title="t('imageStudio.openBareEmbedPage')"
          >
            <Icon name="externalLink" size="sm" />
          </a>
          <div ref="appearancePanelRef" class="studio-appearance-popover">
            <button
              type="button"
              class="studio-theme-trigger"
              :class="{ 'is-open': appearancePanelOpen }"
              data-testid="studio-theme-trigger"
              :title="t('imageStudio.appearance.button')"
              @click.stop="appearancePanelOpen = !appearancePanelOpen"
            >
              <Icon :name="studioAppearance.themeMode === 'night' ? 'moon' : 'sun'" size="sm" />
              <span>{{ t('imageStudio.appearance.button') }}</span>
            </button>

            <transition name="studio-popover">
              <div
                v-if="appearancePanelOpen"
                class="studio-appearance-panel"
              >
                <div class="studio-appearance-head">
                  <div>
                    <p class="studio-appearance-title">{{ t('imageStudio.appearance.title') }}</p>
                    <p class="studio-appearance-subtitle">{{ t('imageStudio.appearance.subtitle') }}</p>
                  </div>
                  <button
                    type="button"
                    class="studio-panel-link-button"
                    @click="resetStudioAppearance"
                  >
                    {{ t('imageStudio.appearance.reset') }}
                  </button>
                </div>

                <div class="studio-appearance-section">
                  <p class="studio-appearance-label">{{ t('imageStudio.appearance.themeMode') }}</p>
                  <div class="studio-appearance-segmented">
                    <button
                      v-for="option in themeModeOptions"
                      :key="option.value"
                      type="button"
                      class="studio-appearance-segment"
                      :class="{ active: studioAppearance.themeMode === option.value }"
                      @click="studioAppearance.themeMode = option.value"
                    >
                      <Icon :name="option.icon" size="sm" />
                      <span>{{ option.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="studio-appearance-section">
                  <div class="studio-appearance-row">
                  <p class="studio-appearance-label">{{ t('imageStudio.appearance.radius') }}</p>
                    <span class="studio-appearance-value">{{ studioAppearance.radiusScale }}px</span>
                  </div>
                  <input
                    v-model.number="studioAppearance.radiusScale"
                    type="range"
                    min="0"
                    max="24"
                    class="studio-range"
                  />
                </div>

                <div class="studio-appearance-section">
                  <p class="studio-appearance-label">{{ t('imageStudio.appearance.accent') }}</p>
                  <div class="studio-accent-grid">
                    <button
                      v-for="option in accentOptions"
                      :key="option.value"
                      type="button"
                      class="studio-accent-card"
                      :class="{ active: studioAppearance.accentTone === option.value }"
                      @click="studioAppearance.accentTone = option.value"
                    >
                      <span class="studio-accent-swatch" :style="{ background: option.preview }"></span>
                      <span>{{ option.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="studio-appearance-section">
                  <p class="studio-appearance-label">{{ t('imageStudio.appearance.texture') }}</p>
                  <div class="studio-appearance-segmented is-stack">
                    <button
                      v-for="option in textureOptions"
                      :key="option.value"
                      type="button"
                      class="studio-appearance-segment is-column"
                      :class="{ active: studioAppearance.textureMode === option.value }"
                      @click="studioAppearance.textureMode = option.value"
                    >
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.description }}</small>
                    </button>
                  </div>
                </div>

                <div class="studio-appearance-section">
                  <p class="studio-appearance-label">{{ tooltipStyleSectionLabel }}</p>
                  <div class="studio-appearance-segmented is-stack">
                    <button
                      v-for="option in tooltipStyleOptions"
                      :key="option.value"
                      type="button"
                      class="studio-appearance-segment is-column"
                      :class="{ active: studioAppearance.tooltipStyle === option.value }"
                      @click="studioAppearance.tooltipStyle = option.value"
                    >
                      <strong>{{ option.label }}</strong>
                      <small>{{ option.description }}</small>
                    </button>
                  </div>
                </div>

                <div class="studio-appearance-section">
                  <p class="studio-appearance-label">{{ t('imageStudio.appearance.motion') }}</p>
                  <button
                    type="button"
                    class="studio-appearance-toggle"
                    :class="{ active: studioAppearance.motionEnabled }"
                    @click="studioAppearance.motionEnabled = !studioAppearance.motionEnabled"
                  >
                    <span>{{ studioAppearance.motionEnabled ? t('imageStudio.appearance.motionOn') : t('imageStudio.appearance.motionOff') }}</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>
          <LocaleSwitcher />
          <div ref="releasePanelRef" class="studio-avatar-popover">
            <button
              type="button"
              class="studio-avatar"
              :title="locale === 'zh' ? '我的菜单' : 'My menu'"
              @click.stop="toggleAvatarMenu"
            >
              <Icon name="userCircle" size="md" />
            </button>

            <transition name="studio-popover">
              <div v-if="avatarMenuOpen" class="studio-avatar-menu">
                <button
                  type="button"
                  class="studio-avatar-menu-item"
                  @click.stop="openReleasePanelFromAvatar"
                >
                  <span class="studio-avatar-menu-icon">
                    <Icon name="gift" size="sm" />
                  </span>
                  <span>{{ currentRelease.title }}</span>
                </button>
                <button
                  type="button"
                  class="studio-avatar-menu-item"
                  @click.stop="openGitHubProject"
                >
                  <span class="studio-avatar-menu-icon">
                    <Icon name="externalLink" size="sm" />
                  </span>
                  <span>{{ locale === 'zh' ? 'GitHub 项目地址' : 'GitHub Project' }}</span>
                </button>
                <button
                  type="button"
                  class="studio-avatar-menu-item"
                  @click.stop="openWorkspacePanelFromAvatar"
                >
                  <span class="studio-avatar-menu-icon">
                    <Icon name="database" size="sm" />
                  </span>
                  <span>{{ locale === 'zh' ? '工作区管理' : 'Workspace' }}</span>
                </button>
              </div>
            </transition>

            <transition name="studio-popover">
              <div v-if="releasePanelOpen" class="studio-release-panel is-avatar-release">
                <div class="studio-release-head">
                  <div>
                    <p class="studio-release-title">{{ currentRelease.title }}</p>
                    <p class="studio-release-subtitle">{{ currentRelease.subtitle }}</p>
                  </div>
                  <span class="studio-release-date">{{ currentRelease.date }}</span>
                </div>
                <ul class="studio-release-list">
                  <li v-for="item in currentRelease.items" :key="item">{{ item }}</li>
                </ul>
              </div>
            </transition>

            <transition name="studio-popover">
              <div v-if="workspacePanelOpen" class="studio-workspace-panel">
                <div class="studio-workspace-panel-head">
                  <div>
                    <p>{{ locale === 'zh' ? '工作区管理' : 'Workspace' }}</p>
                    <span>{{ locale === 'zh' ? '本地身份，后续可用于服务器同步。' : 'Local identity for future server sync.' }}</span>
                  </div>
                  <button type="button" class="studio-popover-close" @click="workspacePanelOpen = false">
                    <Icon name="x" size="xs" />
                  </button>
                </div>
                <div class="studio-workspace-field">
                  <span>Workspace ID</span>
                  <code>{{ workspaceIdentity.id }}</code>
                </div>
                <div class="studio-workspace-field">
                  <span>Token</span>
                  <code>{{ workspaceTokenLabel }}</code>
                </div>
                <div class="studio-workspace-actions">
                  <button type="button" @click="copyWorkspaceId">
                    <Icon name="copy" size="xs" />
                    <span>{{ locale === 'zh' ? '复制 ID' : 'Copy ID' }}</span>
                  </button>
                  <button type="button" @click="exportWorkspaceIdentity">
                    <Icon name="download" size="xs" />
                    <span>{{ locale === 'zh' ? '导出身份' : 'Export' }}</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </header>

      <div class="studio-layout">
        <aside class="studio-left-column">
          <section class="studio-panel">
            <div class="studio-panel-heading">
              <p class="studio-panel-title">{{ t('imageStudio.settings.title') }}</p>
              <span class="studio-panel-link">{{ t('imageStudio.settings.subtitle') }}</span>
            </div>

            <div class="studio-provider-switch">
              <button
                v-for="mode in providerModes"
                :key="mode.value"
                type="button"
                class="studio-provider-pill"
                :class="{ active: preferences.providerMode === mode.value }"
                @click="changeProviderMode(mode.value)"
              >
                <span>{{ mode.label }}</span>
                <small>{{ mode.description }}</small>
              </button>
            </div>

            <div class="studio-field-group">
              <label class="studio-field-label">
                {{ t('imageStudio.fields.model') }}
                <span class="studio-inline-tip">
                  {{ detectingModels
                    ? t('imageStudio.settings.modelDetecting')
                    : (externalImageControlsVisible && detectedImageModels.length
                      ? t('imageStudio.settings.modelDetected', { count: detectedImageModels.length })
                      : t('imageStudio.settings.modelHint')) }}
                </span>
              </label>
              <div class="studio-model-row">
                <select v-model="preferences.model" class="input studio-select">
                  <option v-for="option in modelOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button
                  v-if="externalImageControlsVisible"
                  type="button"
                  class="studio-icon-button inset tone-violet"
                  :disabled="detectingModels"
                  :title="t('imageStudio.settings.modelRefresh')"
                  @click="fetchUpstreamImageModels(false)"
                >
                  <Icon :name="detectingModels ? 'sync' : 'refresh'" size="sm" />
                </button>
              </div>
            </div>

            <div class="studio-popover-row">
              <div ref="connectionPanelRef" class="studio-popover-host">
                <button
                  type="button"
                  class="studio-popover-trigger tone-cyan"
                  :class="{ 'is-open': connectionPanelOpen, 'is-incomplete': connectionConfigIncomplete }"
                  @click.stop="connectionPanelOpen = !connectionPanelOpen"
                >
                  <Icon name="key" size="sm" />
                  <span class="studio-popover-trigger-label">{{ t('imageStudio.popovers.connectionTitle') }}</span>
                  <span class="studio-popover-trigger-meta">{{ connectionTriggerMeta }}</span>
                </button>
                <transition name="studio-popover">
                  <div v-if="connectionPanelOpen" class="studio-popover-panel is-upward">
                    <div class="studio-popover-head">
                      <div>
                        <p class="studio-popover-title">{{ t('imageStudio.popovers.connectionTitle') }}</p>
                        <p class="studio-popover-subtitle">{{ t('imageStudio.popovers.connectionSubtitle') }}</p>
                      </div>
                      <button type="button" class="studio-popover-close" @click="connectionPanelOpen = false">
                        <Icon name="x" size="xs" />
                      </button>
                    </div>

                    <template v-if="preferences.providerMode === 'sub2api'">
                      <div class="studio-field-group">
                        <label class="studio-field-label">{{ t('imageStudio.fields.currentSiteProfile') }}</label>
                        <select v-model="preferences.currentSiteProfile" class="input studio-select">
                          <option
                            v-for="option in currentSiteProfileOptions"
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                        <p class="studio-helper">{{ currentSiteProfileDescription }}</p>
                      </div>

                      <div class="studio-field-group">
                        <label class="studio-field-label">{{ t('imageStudio.fields.currentSiteEndpoint') }}</label>
                        <input
                          v-model.trim="preferences.currentSiteBaseUrl"
                          type="url"
                          class="input font-mono text-sm"
                          :placeholder="currentSiteEndpointPlaceholder"
                        />
                        <p class="studio-helper">{{ t('imageStudio.hints.currentSiteEndpoint') }}</p>
                      </div>

                      <div class="studio-field-group">
                        <label class="studio-field-label">{{ currentSiteKeyLabel }}</label>
                        <input
                          v-model.trim="sub2apiApiKey"
                          type="password"
                          class="input font-mono text-sm"
                          :placeholder="currentSiteKeyPlaceholder"
                          autocomplete="off"
                          @blur="refreshCurrentSiteUsage({ silent: true })"
                          @keyup.enter="refreshCurrentSiteUsage({ silent: true })"
                        />
                        <p class="studio-helper">{{ currentSiteKeyHint }}</p>
                      </div>

                      <div v-if="isCurrentSiteChatgpt2Api" class="studio-quota-card">
                        <div>
                          <span>{{ t('imageStudio.header.imageQuota') }}</span>
                          <strong>{{ chatgpt2ApiQuotaText }}</strong>
                        </div>
                        <small>{{ chatgpt2ApiQuotaDetailText }}</small>
                      </div>

                      <button
                        type="button"
                        class="studio-test-connection"
                        :class="{
                          'is-ok': testConnectionState.kind === 'ok',
                          'is-fail': testConnectionState.kind === 'fail',
                          'is-busy': testConnectionState.kind === 'busy',
                        }"
                        :disabled="!sub2apiApiKey.trim() || testConnectionState.kind === 'busy'"
                        @click="testCurrentSiteConnection"
                      >
                        <Icon
                          :name="testConnectionState.kind === 'ok' ? 'checkCircle'
                            : testConnectionState.kind === 'fail' ? 'exclamationCircle'
                            : testConnectionState.kind === 'busy' ? 'sync'
                            : 'bolt'"
                          size="sm"
                        />
                        <span>{{ testConnectionLabel }}</span>
                      </button>
                    </template>

                    <template v-else>
                      <div class="studio-field-group">
                        <label class="studio-field-label">{{ t('imageStudio.fields.baseUrl') }}</label>
                        <input
                          v-model.trim="preferences.externalBaseUrl"
                          type="url"
                          class="input font-mono text-sm"
                          :placeholder="t('imageStudio.placeholders.baseUrl')"
                        />
                      </div>

                      <div class="studio-field-group">
                        <label class="studio-field-label">{{ t('imageStudio.fields.apiKey') }}</label>
                        <input
                          v-model.trim="externalApiKey"
                          type="password"
                          class="input font-mono text-sm"
                          :placeholder="t('imageStudio.placeholders.apiKey')"
                          autocomplete="off"
                        />
                      </div>

                      <div class="studio-field-group">
                        <label class="studio-field-label">{{ t('imageStudio.fields.profile') }}</label>
                        <select v-model="preferences.profile" class="input studio-select">
                          <option
                            v-for="option in compatibilityProfiles"
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                        <p class="studio-helper">{{ selectedCompatibilityProfileDescription }}</p>
                        <div v-if="externalProfileWarning" class="studio-profile-advice">
                          <Icon name="infoCircle" size="sm" />
                          <span>{{ externalProfileWarning }}</span>
                          <button type="button" @click="switchExternalProfileToOpenAIImageApi">
                            {{ locale === 'zh' ? '切换到图片接口' : 'Use Images API' }}
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        class="studio-test-connection"
                        :class="{
                          'is-ok': testConnectionState.kind === 'ok',
                          'is-fail': testConnectionState.kind === 'fail',
                          'is-busy': testConnectionState.kind === 'busy',
                        }"
                        :disabled="!preferences.externalBaseUrl.trim() || !externalApiKey.trim() || testConnectionState.kind === 'busy'"
                        @click="testUpstreamConnection"
                      >
                        <Icon
                          :name="testConnectionState.kind === 'ok' ? 'checkCircle'
                            : testConnectionState.kind === 'fail' ? 'exclamationCircle'
                            : testConnectionState.kind === 'busy' ? 'sync'
                            : 'bolt'"
                          size="sm"
                        />
                        <span>{{ testConnectionLabel }}</span>
                      </button>
                    </template>

                    <div class="studio-api-presets">
                      <div class="studio-api-presets-head">
                        <div>
                          <span>{{ locale === 'zh' ? 'API 渠道库' : 'API Channel Library' }}</span>
                          <small>{{ locale === 'zh'
                            ? '保存多个 Base URL + Key，点击应用切换生图渠道。'
                            : 'Save multiple Base URLs + keys, then apply to switch generation channels.' }}</small>
                        </div>
                      </div>
                      <div class="studio-api-preset-save-row">
                        <input
                          v-model.trim="apiPresetDraftName"
                          type="text"
                          class="input"
                          :placeholder="locale === 'zh'
                            ? `渠道名称，例如 ${apiPresetSuggestedName || '备用 API'}`
                            : `Channel name, e.g. ${apiPresetSuggestedName || 'Backup API'}`"
                        />
                        <button type="button" class="studio-api-preset-save" @click="saveCurrentApiPreset">
                          <Icon name="plus" size="xs" />
                          <span>{{ locale === 'zh' ? '保存为渠道' : 'Save Channel' }}</span>
                        </button>
                      </div>
                      <div v-if="apiPresets.length" class="studio-api-preset-list">
                        <div
                          v-for="preset in apiPresets"
                          :key="preset.id"
                          class="studio-api-preset-item"
                          :class="{ active: isApiPresetActive(preset) }"
                        >
                          <div class="studio-api-preset-info">
                            <strong>{{ preset.name }}</strong>
                            <small>{{ apiPresetSummary(preset) }}</small>
                          </div>
                          <button type="button" class="studio-api-preset-apply" @click="applyApiPreset(preset)">
                            {{ isApiPresetActive(preset)
                              ? (locale === 'zh' ? '当前' : 'Active')
                              : (locale === 'zh' ? '应用' : 'Apply') }}
                          </button>
                          <button
                            type="button"
                            class="studio-api-preset-delete"
                            :title="locale === 'zh' ? '删除预设' : 'Delete preset'"
                            @click.stop="removeApiPreset(preset)"
                          >
                            <Icon name="trash" size="xs" />
                          </button>
                        </div>
                      </div>
                      <p v-else class="studio-helper">
                        {{ locale === 'zh' ? '可以预存多个 API 地址、Key、模型和通道模式，后面一键切换生图渠道。' : 'Save multiple API URLs, keys, models, and channel modes, then switch generation channels with one click.' }}
                      </p>
                    </div>
                  </div>
                </transition>
              </div>

              <div
                v-if="externalImageControlsVisible"
                ref="advancedPanelRef"
                class="studio-popover-host"
              >
                <button
                  type="button"
                  class="studio-popover-trigger tone-violet"
                  :class="{ 'is-open': advancedPanelOpen }"
                  @click.stop="advancedPanelOpen = !advancedPanelOpen"
                >
                  <Icon name="cog" size="sm" />
                  <span class="studio-popover-trigger-label">{{ t('imageStudio.popovers.advancedTitle') }}</span>
                </button>
                <transition name="studio-popover">
                  <div v-if="advancedPanelOpen" class="studio-popover-panel is-wide is-upward">
                    <div class="studio-popover-head">
                      <div>
                        <p class="studio-popover-title">{{ t('imageStudio.popovers.advancedTitle') }}</p>
                        <p class="studio-popover-subtitle">{{ t('imageStudio.popovers.advancedSubtitle') }}</p>
                      </div>
                      <button type="button" class="studio-popover-close" @click="advancedPanelOpen = false">
                        <Icon name="x" size="xs" />
                      </button>
                    </div>

                    <div class="studio-advanced-stack">
                      <div class="studio-field-group">
                        <label class="studio-field-label">{{ t('imageStudio.sections.resolution') }}</label>
                        <div class="studio-resolution-grid">
                          <button
                            v-for="option in resolutionOptions"
                            :key="option.value"
                            type="button"
                            class="studio-resolution-card"
                            :class="{ active: preferences.resolutionPreset === option.value }"
                            :disabled="!supportsCustomResolution"
                            @click="preferences.resolutionPreset = option.value"
                          >
                            <span class="studio-resolution-name">{{ option.label }}</span>
                            <span class="studio-resolution-size">{{ option.size || t('imageStudio.settings.defaultLabel') }}</span>
                          </button>
                        </div>
                        <div
                          v-if="preferences.providerMode === 'external-relay'"
                          class="studio-local-upscale-control"
                        >
                          <button
                            type="button"
                            class="studio-local-upscale-toggle"
                            :class="{ active: preferences.externalRelayLocalUpscale }"
                            :aria-pressed="preferences.externalRelayLocalUpscale"
                            @click="preferences.externalRelayLocalUpscale = !preferences.externalRelayLocalUpscale"
                          >
                            <Icon :name="preferences.externalRelayLocalUpscale ? 'check' : 'x'" size="sm" />
                            <span>{{ preferences.externalRelayLocalUpscale
                              ? t('imageStudio.settings.localUpscaleOn')
                              : t('imageStudio.settings.localUpscaleOff') }}</span>
                          </button>
                          <p class="studio-helper">{{ preferences.externalRelayLocalUpscale
                            ? t('imageStudio.settings.localUpscaleHintOn')
                            : t('imageStudio.settings.localUpscaleHintOff') }}</p>
                        </div>
                        <p class="studio-helper">{{ resolutionHint }}</p>
                      </div>

                      <div class="studio-field-grid">
                        <div class="studio-field-group">
                          <label class="studio-field-label">{{ t('imageStudio.fields.background') }}</label>
                          <select v-model="preferences.background" class="input studio-select">
                            <option v-for="option in backgroundOptions" :key="option.value" :value="option.value">
                              {{ option.label }}
                            </option>
                          </select>
                        </div>

                        <div class="studio-field-group">
                          <label class="studio-field-label">{{ t('imageStudio.fields.format') }}</label>
                          <select v-model="preferences.format" class="input studio-select">
                            <option v-for="option in formatOptions" :key="option.value" :value="option.value">
                              {{ option.label }}
                            </option>
                          </select>
                        </div>
                      </div>

                      <div v-if="!countSliderDisabled" class="studio-field-group">
                        <label class="studio-field-label">{{ t('imageStudio.fields.imageCount') }}</label>
                        <div class="studio-inline-meta">
                          <strong>{{ effectiveCount }}</strong>
                          <template v-if="resolvedSize">
                            <span>×</span>
                            <span>{{ resolvedSize }}</span>
                          </template>
                        </div>
                        <input
                          v-model.number="preferences.count"
                          type="range"
                          min="1"
                          max="5"
                          class="studio-range"
                        />
                      </div>

                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </section>

        </aside>

        <main class="studio-main-column">
          <section class="studio-panel studio-prompt-card">
            <div class="studio-prompt-header">
              <div>
                <p class="studio-panel-title">{{ t('imageStudio.promptPanel.title') }}</p>
                <p class="studio-helper">{{ t('imageStudio.promptPanel.subtitle') }}</p>
              </div>
              <div class="studio-prompt-header-actions">
                <button type="button" class="studio-clear-button" @click="clearPromptComposer">
                  <Icon name="x" size="sm" />
                  <span>{{ t('imageStudio.promptPanel.clear') }}</span>
                </button>
              </div>
            </div>

            <div class="studio-prompt-layout">
              <!-- LEFT side: text-editing flow -->
              <div class="studio-prompt-side">
                <div class="studio-prompt-form">
                  <label class="studio-field-label">{{ t('imageStudio.sections.prompt') }}</label>
                  <textarea
                    ref="promptTextareaRef"
                    v-model.trim="prompt"
                    rows="4"
                    class="input studio-prompt-textarea"
                    :placeholder="t('imageStudio.placeholders.prompt')"
                  ></textarea>

                  <div class="studio-prompt-tools">
                    <button
                      type="button"
                      class="studio-chip accent"
                      :disabled="promptHelperBusy === 'optimize'"
                      @click="applyPromptOptimization"
                    >
                      <Icon :name="promptHelperBusy === 'optimize' ? 'sync' : 'sparkles'" size="sm" />
                      <span>{{ promptHelperBusy === 'optimize'
                        ? t('imageStudio.promptPanel.optimizing')
                        : t('imageStudio.promptPanel.optimize') }}</span>
                    </button>

                    <button
                      type="button"
                      class="studio-chip"
                      :class="{ active: upstreamCompatibilityEnabled }"
                      :aria-pressed="upstreamCompatibilityEnabled"
                      :disabled="promptHelperBusy === 'compatibility'"
                      :title="upstreamCompatibilityEnabled
                        ? t('imageStudio.promptPanel.upstreamCompatibilityOn')
                        : t('imageStudio.promptPanel.upstreamCompatibilityOff')"
                      @click="toggleUpstreamCompatibility"
                    >
                      <Icon
                        :name="promptHelperBusy === 'compatibility'
                          ? 'sync'
                          : (upstreamCompatibilityEnabled ? 'shield' : 'x')"
                        size="sm"
                      />
                      <span>{{ promptHelperBusy === 'compatibility'
                        ? t('imageStudio.promptPanel.upstreamCompatibilityRewriting')
                        : t('imageStudio.promptPanel.upstreamCompatibility') }}</span>
                    </button>

                    <button
                      type="button"
                      class="studio-chip"
                      :class="{ active: autoCleanPlaceholders }"
                      :aria-pressed="autoCleanPlaceholders"
                      :title="autoCleanPlaceholders
                        ? t('imageStudio.promptPanel.autoCleanPlaceholdersOn')
                        : t('imageStudio.promptPanel.autoCleanPlaceholdersOff')"
                      @click="autoCleanPlaceholders = !autoCleanPlaceholders"
                    >
                      <Icon :name="autoCleanPlaceholders ? 'check' : 'x'" size="sm" />
                      <span>{{ t('imageStudio.promptPanel.autoCleanPlaceholders') }}</span>
                    </button>

                    <button
                      type="button"
                      class="studio-chip"
                      :class="{ active: promptReplacementModalOpen || promptTemplateArgumentCount > 0 }"
                      :disabled="!prompt.trim() || promptHelperBusy === 'template'"
                      :title="promptReplacementButtonTitle"
                      @click="openPromptReplacementModal"
                    >
                      <Icon :name="promptHelperBusy === 'template' ? 'sync' : 'edit'" size="sm" />
                      <span>{{ t('imageStudio.promptPanel.replacementEditor') }}</span>
                      <small v-if="promptTemplateArgumentCount">{{ promptTemplateArgumentCount }}</small>
                    </button>

                    <button
                      type="button"
                      class="studio-chip"
                      :class="{ active: super4kEnabled }"
                      :aria-pressed="super4kEnabled"
                      :title="super4kTitle"
                      @click="toggleSuper4k"
                    >
                      <Icon :name="super4kEnabled ? 'check' : 'x'" size="sm" />
                      <span>{{ t('imageStudio.promptPanel.super4k') }}</span>
                    </button>

                    <button
                      v-for="chip in promptChips"
                      :key="chip"
                      type="button"
                      class="studio-chip"
                      @click="applyPromptChip(chip)"
                    >
                      {{ chip }}
                    </button>
                  </div>
                  <p
                    class="studio-compatibility-note"
                    :class="{ 'is-warning': upstreamCompatibilityEnabled && !promptHelperConfigured }"
                  >
                    {{ upstreamCompatibilityEnabled && !promptHelperConfigured
                      ? t('imageStudio.promptPanel.upstreamCompatibilityMissing')
                      : t('imageStudio.promptPanel.upstreamCompatibilityHint') }}
                  </p>

                  <template v-if="externalImageControlsVisible">
                    <div class="studio-negative-header">
                      <label class="studio-field-label">{{ t('imageStudio.promptPanel.negativeTitle') }}</label>
                      <span class="studio-character-count">
                        {{ negativePromptCharacterCount }}/500
                      </span>
                    </div>

                    <div class="studio-negative-input">
                      <input
                        v-model.trim="negativePrompt"
                        type="text"
                        class="input"
                        maxlength="500"
                        :placeholder="t('imageStudio.promptPanel.negativePlaceholder')"
                      />
                      <button
                        v-if="negativePrompt"
                        type="button"
                        class="studio-icon-button inset"
                        @click="negativePrompt = ''"
                      >
                        <Icon name="x" size="sm" />
                      </button>
                    </div>
                  </template>
                </div>

                <div
                  v-if="generationError"
                  class="studio-generation-banner"
                  :class="{ 'is-recoverable': generationError.kind === 'backend-unreachable' }"
                  role="alert"
                >
                  <div class="studio-generation-banner-body">
                    <Icon name="exclamationTriangle" size="sm" />
                    <span class="studio-generation-banner-copy">
                      <span class="studio-generation-banner-title">{{ generationError.title }}</span>
                      <span class="studio-generation-banner-message">{{ generationError.message }}</span>
                      <span v-if="generationError.detail" class="studio-generation-banner-detail">
                        {{ generationError.detail }}
                      </span>
                      <span v-if="generationError.rawMessage" class="studio-generation-banner-raw">
                        {{ t('imageStudio.generationErrors.rawPrefix', { value: generationError.rawMessage }) }}
                      </span>
                    </span>
                  </div>
                  <div class="studio-generation-banner-actions">
                    <button
                      v-if="generationError.kind === 'backend-unreachable' && preferences.providerMode !== 'external-browser'"
                      type="button"
                      class="studio-banner-action"
                      @click="recoverWithBrowserDirect"
                    >
                      {{ t('imageStudio.banner.switchToBrowserDirect') }}
                    </button>
                    <button
                      type="button"
                      class="studio-banner-dismiss"
                      :title="t('imageStudio.banner.dismiss')"
                      @click="dismissGenerationError"
                    >
                      <Icon name="x" size="xs" />
                    </button>
                  </div>
                </div>

                <div class="studio-prompt-actions">
                  <div v-if="!countSliderDisabled" class="studio-count-quick">
                    <span class="studio-count-quick-label">{{ t('imageStudio.promptPanel.quickCountLabel') }}</span>
                    <button
                      v-for="countOption in quickCountOptions"
                      :key="countOption"
                      type="button"
                      class="studio-count-quick-button"
                      :class="{ active: effectiveCount === countOption }"
                      :aria-pressed="effectiveCount === countOption"
                      :disabled="generating"
                      @click="preferences.count = countOption"
                    >
                      {{ t('imageStudio.promptPanel.quickCountOption', { count: countOption }) }}
                    </button>
                    <span class="studio-count-quick-hint">
                      {{ t('imageStudio.promptPanel.quickCountHint') }}
                    </span>
                  </div>

                  <button
                    v-if="!generating"
                    type="button"
                    class="studio-generate-button"
                    @click="generateImages()"
                  >
                    <Icon name="play" size="sm" />
                    <span>{{ t('imageStudio.buttons.start') }}</span>
                  </button>
                  <button
                    v-else
                    type="button"
                    class="studio-generate-button is-cancel"
                    @click="cancelGeneration"
                  >
                    <Icon name="x" size="sm" />
                    <span>{{ t('imageStudio.buttons.cancel', { value: generationElapsedSeconds }) }}</span>
                  </button>

                  <button
                    type="button"
                    class="studio-secondary-action"
                    :disabled="promptHelperBusy === 'inspire'"
                    @click="applyRandomInspiration"
                  >
                    <Icon :name="promptHelperBusy === 'inspire' ? 'sync' : 'lightbulb'" size="sm" />
                    <span>{{ promptHelperBusy === 'inspire'
                      ? t('imageStudio.promptPanel.inspiring')
                      : t('imageStudio.promptPanel.randomIdea') }}</span>
                  </button>

                  <div class="studio-character-badge">
                    {{ promptCharacterCount }}/1000
                  </div>
                </div>
              </div>

              <!-- RIGHT side: settings + reference images + translate -->
              <div class="studio-prompt-controls">
                <div class="studio-settings-strip">
                <div class="studio-strip-row studio-strip-aspect">
                  <button
                    v-for="option in aspectOptions"
                    :key="option.value"
                    type="button"
                    class="studio-strip-chip"
                    :class="{ active: preferences.aspectRatio === option.value }"
                    :title="aspectChipLabel(option.value)"
                    @click="preferences.aspectRatio = option.value"
                  >
                    <span class="studio-ratio-icon" :class="option.frameClass"></span>
                    <span>{{ aspectChipLabel(option.value) }}</span>
                  </button>
                  <button
                    type="button"
                    class="studio-strip-chip ghost"
                    :class="{ active: isCustomAspectRatio }"
                    :title="t('imageStudio.settings.customRatio')"
                    @click="openCustomRatioModal"
                  >
                    <span class="studio-ratio-icon is-custom"></span>
                    <span>{{ customRatioChipLabel }}</span>
                  </button>
                </div>

                <div class="studio-strip-row studio-strip-actions">
                  <div ref="stylePanelRef" class="studio-strip-popover">
                    <button
                      type="button"
                      class="studio-strip-trigger"
                      :class="{ 'is-open': stylePanelOpen, active: !!selectedStylePreset }"
                      @click.stop="stylePanelOpen = !stylePanelOpen"
                    >
                      <Icon name="sparkles" size="sm" />
                      <span>{{ selectedStylePreset?.title || t('imageStudio.settings.styleTitle') }}</span>
                      <Icon name="chevronDown" size="xs" />
                    </button>
                    <transition name="studio-popover">
                      <div v-if="stylePanelOpen" class="studio-popover-panel">
                        <div class="studio-popover-head">
                          <p class="studio-popover-title">{{ t('imageStudio.settings.styleTitle') }}</p>
                          <button
                            type="button"
                            class="studio-panel-link-button"
                            @click="stylePanelOpen = false"
                          >
                            {{ t('imageStudio.settings.viewAll') }}
                          </button>
                        </div>
                        <div class="studio-style-grid">
                          <button
                            v-for="preset in stylePresets"
                            :key="preset.id"
                            type="button"
                            class="studio-style-card"
                            :class="[
                              `preset-${preset.id}`,
                              { active: selectedStylePresetId === preset.id },
                            ]"
                            @click="selectedStylePresetId = preset.id; stylePanelOpen = false"
                          >
                            <span class="studio-style-preview">
                              <img
                                :src="`/style-presets/${preset.id}.png`"
                                :alt="preset.title"
                                loading="lazy"
                                @error="(event) => ((event.target as HTMLImageElement).style.opacity = '0')"
                              />
                            </span>
                            <strong>{{ preset.title }}</strong>
                            <small>{{ preset.subtitle }}</small>
                          </button>
                        </div>
                      </div>
                    </transition>
                  </div>

                  <div ref="qualityPanelRef" class="studio-strip-popover">
                    <button
                      type="button"
                      class="studio-strip-trigger"
                      :class="{ 'is-open': qualityPanelOpen, active: !!preferences.quality }"
                      @click.stop="qualityPanelOpen = !qualityPanelOpen"
                    >
                      <Icon name="bolt" size="sm" />
                      <span>{{ activeQualityLabel }}</span>
                      <Icon name="chevronDown" size="xs" />
                    </button>
                    <transition name="studio-popover">
                      <div v-if="qualityPanelOpen" class="studio-popover-panel studio-popover-narrow">
                        <p class="studio-popover-title">{{ t('imageStudio.fields.quality') }}</p>
                        <div class="studio-quality-row">
                          <button
                            v-for="option in qualityOptions"
                            :key="option.value"
                            type="button"
                            class="studio-quality-pill"
                            :class="{ active: preferences.quality === option.value }"
                            @click="preferences.quality = option.value; qualityPanelOpen = false"
                          >
                            <Icon :name="option.icon" size="xs" />
                            <span>{{ option.label }}</span>
                          </button>
                        </div>
                      </div>
                    </transition>
                  </div>

                  <div
                    v-if="externalImageControlsVisible"
                    ref="seedPanelRef"
                    class="studio-strip-popover"
                  >
                    <button
                      type="button"
                      class="studio-strip-trigger"
                      :class="{ 'is-open': seedPanelOpen, active: !!randomSeed }"
                      @click.stop="seedPanelOpen = !seedPanelOpen"
                    >
                      <Icon name="cube" size="sm" />
                      <span>{{ randomSeed || t('imageStudio.settings.seedTitle') }}</span>
                      <Icon name="chevronDown" size="xs" />
                    </button>
                    <transition name="studio-popover">
                      <div v-if="seedPanelOpen" class="studio-popover-panel studio-popover-narrow">
                        <p class="studio-popover-title">
                          {{ t('imageStudio.settings.seedTitle') }}
                          <span class="studio-inline-tip">{{ t('imageStudio.settings.seedHint') }}</span>
                        </p>
                        <div class="studio-seed-input">
                          <input
                            v-model.trim="randomSeed"
                            type="text"
                            class="input"
                            :placeholder="t('imageStudio.settings.seedPlaceholder')"
                          />
                          <button type="button" class="studio-icon-button inset" @click="randomizeSeed">
                            <Icon name="refresh" size="sm" />
                          </button>
                        </div>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>

              <div class="studio-reference-images">
                <div class="studio-reference-head">
                  <div>
                    <p class="studio-field-label">{{ t('imageStudio.referenceImages.title') }}</p>
                    <p class="studio-helper">
                      {{ t('imageStudio.referenceImages.hint', { max: REFERENCE_IMAGE_MAX_COUNT, bytes: 8 }) }}
                    </p>
                  </div>
                  <button
                    v-if="referenceImages.length"
                    type="button"
                    class="studio-panel-link-button"
                    @click="clearReferenceImages"
                  >
                    {{ t('imageStudio.promptPanel.clear') }}
                  </button>
                </div>
                <div class="studio-reference-grid">
                  <div
                    v-for="(src, index) in referenceImages"
                    :key="`ref-${index}-${src.slice(-12)}`"
                    class="studio-reference-tile"
                  >
                    <button
                      type="button"
                      class="studio-reference-preview-trigger"
                      :title="t('imageStudio.referenceImages.preview')"
                      @click="openReferencePreview(index)"
                    >
                      <img :src="src" :alt="`reference ${index + 1}`" />
                    </button>
                    <button
                      type="button"
                      class="studio-reference-remove"
                      :title="t('imageStudio.referenceImages.remove')"
                      @click.stop="removeReferenceImage(index)"
                    >
                      <Icon name="x" size="xs" />
                    </button>
                  </div>
                  <label
                    v-if="referenceImages.length < REFERENCE_IMAGE_MAX_COUNT"
                    class="studio-reference-add"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      class="hidden"
                      @change="handleReferenceFileSelect"
                    />
                    <Icon name="plus" size="md" />
                    <span>{{ t('imageStudio.referenceImages.add') }}</span>
                  </label>
                </div>
                <p v-if="referenceImageError" class="studio-reference-error">
                  {{ referenceImageError }}
                </p>
              </div>

              <div class="studio-translate-row">
                <select v-model="translateLang" class="studio-translate-lang">
                  <option v-for="lang in translateLanguages" :key="lang.value" :value="lang.value">
                    {{ lang.label }}
                  </option>
                </select>
                <button
                  type="button"
                  class="studio-translate-btn"
                  :disabled="translating || !prompt.trim()"
                  @click="translatePromptAction"
                >
                  <Icon :name="translating ? 'sync' : 'sparkles'" size="sm" />
                  <span>
                    {{ translating
                      ? t('imageStudio.translate.busy')
                      : t('imageStudio.translate.action') }}
                  </span>
                </button>
              </div>

              <div class="studio-prompt-template-panel">
                <button
                  type="button"
                  class="studio-prompt-template-preview"
                  @click="selectedPromptLibraryOption ? openPromptLibraryDetails(selectedPromptLibraryOption) : openPromptLibrary()"
                >
                  <img
                    v-if="selectedPromptTemplateImage"
                    :class="selectedPromptTemplateImageClass"
                    :src="selectedPromptTemplateImage"
                    :alt="selectedPromptTemplateTitle"
                    loading="lazy"
                    @load="handleSelectedPromptTemplateImageLoad"
                    @error="resetSelectedPromptTemplateImageMeta"
                  />
                  <div v-else class="studio-prompt-template-empty">
                    <Icon name="grid" size="md" />
                    <span>{{ selectedPromptTemplateDescription }}</span>
                  </div>
                  <span v-if="selectedPromptTemplateMetaText" class="studio-prompt-template-badge">
                    {{ selectedPromptTemplateMetaText }}
                  </span>
                  <span class="studio-prompt-template-caption">
                    {{ selectedPromptTemplateDescription }}
                  </span>
                </button>

                <div class="studio-prompt-template-info">
                  <div class="studio-prompt-template-title">
                    <Icon name="book" size="sm" />
                    <span>{{ t('imageStudio.promptWorkspace.templateTitle') }}</span>
                  </div>

                  <div class="studio-template-info-rows">
                    <div class="studio-template-info-row">
                      <span>标题</span>
                      <strong :title="selectedPromptTemplateTitle">{{ selectedPromptTemplateTitle }}</strong>
                    </div>
                    <div class="studio-template-info-row">
                      <span>分类</span>
                      <strong :title="selectedPromptTemplateCategory">{{ selectedPromptTemplateCategory }}</strong>
                    </div>
                  </div>

                  <div class="studio-prompt-template-actions">
                    <button type="button" class="studio-prompt-template-button" @click="openSelectedPromptTemplateEditor">
                      <Icon name="edit" size="sm" />
                      <span>{{ t('imageStudio.promptWorkspace.editShort') }}</span>
                    </button>
                    <button type="button" class="studio-prompt-template-button primary" @click="openPromptLibrary">
                      <Icon name="book" size="sm" />
                      <span>{{ t('imageStudio.promptWorkspace.chooseShort') }}</span>
                    </button>
                  </div>
                </div>
              </div>
              </div>

              <!-- FOOTER spans both columns -->
              <div class="studio-prompt-footer">
                <div class="studio-generate-target studio-generate-target-compact">
                  <span class="studio-generate-target-mode">
                    <span class="studio-generate-target-dot"></span>
                    {{ generateTargetSummary.modeLabel }}
                  </span>
                  <span
                    v-if="generateTargetSummary.endpointLabel"
                    class="studio-generate-target-host"
                    :title="generateTargetSummary.endpointLabel"
                  >
                    → {{ generateTargetSummary.endpointLabel }}
                  </span>
                  <span v-if="generating" class="studio-generate-target-elapsed">
                    {{ t('imageStudio.workbench.elapsedSeconds', { value: generationElapsedSeconds }) }}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section class="studio-panel studio-preview-card">
            <div class="studio-preview-header">
              <div class="studio-preview-tabs">
                <button
                  type="button"
                  class="studio-preview-tab"
                  :class="{ active: previewMode === 'original' }"
                  @click="previewMode = 'original'"
                >
                  {{ t('imageStudio.previewCanvas.originalTab') }}
                </button>
                <button
                  type="button"
                  class="studio-preview-tab"
                  :class="{ active: previewMode === 'compare' }"
                  :disabled="!compareAvailable"
                  @click="previewMode = 'compare'"
                >
                  {{ t('imageStudio.previewCanvas.compareTab') }}
                </button>
              </div>

              <div class="studio-preview-tools">
                <span class="studio-preview-meta">
                  {{ previewMetaText }}
                </span>

                <span class="studio-preview-help" tabindex="0">
                  <Icon name="infoCircle" size="sm" />
                  <span class="studio-preview-help-tip" role="tooltip">
                    <strong>{{ t('imageStudio.previewCanvas.helpTitle') }}</strong>
                    <span class="studio-preview-help-row">
                      <kbd>{{ t('imageStudio.previewCanvas.helpKeyClick') }}</kbd>
                      <span>{{ t('imageStudio.previewCanvas.helpClickDesc') }}</span>
                    </span>
                    <span class="studio-preview-help-row">
                      <kbd>{{ t('imageStudio.previewCanvas.helpKeyHold') }}</kbd>
                      <span>{{ t('imageStudio.previewCanvas.helpHoldDesc') }}</span>
                    </span>
                    <span class="studio-preview-help-row">
                      <kbd>{{ t('imageStudio.previewCanvas.helpKeyWheel') }}</kbd>
                      <span>{{ t('imageStudio.previewCanvas.helpWheelDesc') }}</span>
                    </span>
                    <span class="studio-preview-help-row">
                      <kbd>← →</kbd>
                      <span>{{ t('imageStudio.previewCanvas.helpArrowDesc') }}</span>
                    </span>
                    <span class="studio-preview-help-row">
                      <kbd>Esc</kbd>
                      <span>{{ t('imageStudio.previewCanvas.helpEscDesc') }}</span>
                    </span>
                  </span>
                </span>

                <button
                  type="button"
                  class="studio-icon-button tone-blue"
                  :disabled="!previewTile"
                  :title="t('imageStudio.buttons.downloadCurrent')"
                  @click="downloadCurrentTile"
                >
                  <Icon name="download" size="sm" />
                </button>
                <button
                  type="button"
                  class="studio-icon-button tone-emerald"
                  :disabled="!previewTile"
                  :title="t('imageStudio.sidebar.copyImage')"
                  @click="copyCurrentTileImage"
                >
                  <Icon name="copy" size="sm" />
                </button>
                <button
                  type="button"
                  class="studio-icon-button tone-slate"
                  :disabled="!previewTile"
                  :title="t('imageStudio.previewCanvas.openOverview')"
                  @click="openPreviewLightbox('fit')"
                >
                  <Icon name="eye" size="sm" />
                </button>
                <button
                  type="button"
                  class="studio-icon-button tone-slate"
                  :disabled="!previewTile"
                  :title="t('imageStudio.previewCanvas.expandPreview')"
                  @click="openPreviewLightbox('natural')"
                >
                  <Icon name="externalLink" size="sm" />
                </button>
                <button
                  type="button"
                  class="studio-icon-button tone-violet"
                  :disabled="generating || !previewTile"
                  :title="t('imageStudio.previewCanvas.variantGenerate')"
                  @click="generateVariantFromPreview"
                >
                  <Icon name="sparkles" size="sm" />
                </button>
              </div>
            </div>

            <div
              v-if="previewTile && previewMode === 'original'"
              class="studio-preview-stage studio-preview-stage-single"
              :class="{ 'is-generating': generating }"
            >
              <button
                type="button"
                class="studio-preview-single-cell"
                :title="previewTile.result.filename"
                @click="openTileLightbox(previewTile.id, 'fit')"
              >
                <img
                  :src="previewTile.result.url"
                  :alt="previewTile.result.filename"
                  class="studio-preview-single-image"
                  :class="{ 'is-generating-shimmer': generating }"
                />
              </button>

              <div v-if="generating" class="studio-preview-generating-overlay">
                <div class="studio-preview-generating-shine"></div>
                <div class="studio-preview-generating-label">
                  <Icon name="sparkles" size="sm" />
                  <span>{{ generationPreviewLabel }}</span>
                </div>
              </div>
            </div>

            <div
              v-else-if="previewTile && previewMode === 'compare'"
              class="studio-preview-stage studio-preview-stage-compare"
            >
              <!-- Mode toggle: side-by-side vs slider overlay -->
              <div class="studio-compare-mode-toggle">
                <button
                  type="button"
                  class="studio-compare-mode-btn"
                  :class="{ active: compareViewMode === 'side-by-side' }"
                  @click="compareViewMode = 'side-by-side'"
                >
                  <Icon name="grid" size="xs" />
                  <span>{{ t('imageStudio.previewCanvas.compareSideBySide') }}</span>
                </button>
                <button
                  type="button"
                  class="studio-compare-mode-btn"
                  :class="{ active: compareViewMode === 'slider' }"
                  @click="compareViewMode = 'slider'"
                >
                  <Icon name="swap" size="xs" />
                  <span>{{ t('imageStudio.previewCanvas.compareSlider') }}</span>
                </button>
              </div>

              <!-- Side-by-side -->
              <div
                v-if="compareViewMode === 'side-by-side'"
                class="studio-compare-grid"
              >
                <button
                  type="button"
                  class="studio-compare-cell"
                  :title="compareTile ? compareTile.result.filename : ''"
                  @click="compareTile && openTileLightbox(compareTile.id, 'fit')"
                >
                  <img
                    v-if="compareTile"
                    :src="compareTile.result.url"
                    :alt="compareTile.result.filename"
                  />
                  <span class="studio-compare-tag tone-slate">
                    <Icon name="clock" size="xs" />
                    {{ t('imageStudio.previewCanvas.compareSource') }}
                  </span>
                </button>
                <button
                  type="button"
                  class="studio-compare-cell is-current"
                  :title="previewTile.result.filename"
                  @click="openTileLightbox(previewTile.id, 'fit')"
                >
                  <img
                    :src="previewTile.result.url"
                    :alt="previewTile.result.filename"
                  />
                  <span class="studio-compare-tag tone-blue">
                    <Icon name="sparkles" size="xs" />
                    {{ t('imageStudio.previewCanvas.compareVariant') }}
                  </span>
                </button>
              </div>

              <!-- Slider overlay (the original implementation) -->
              <div v-else class="studio-compare-stage">
                <img
                  :src="compareTile?.result.url || previewTile.result.url"
                  :alt="compareTile?.result.filename || previewTile.result.filename"
                  class="studio-preview-image base"
                />
                <div class="studio-compare-overlay" :style="{ width: `${comparePosition}%` }">
                  <img
                    :src="previewTile.result.url"
                    :alt="previewTile.result.filename"
                    class="studio-preview-image overlay"
                  />
                </div>
                <div class="studio-compare-divider" :style="{ left: `${comparePosition}%` }">
                  <span class="studio-compare-handle">
                    <Icon name="swap" size="sm" />
                  </span>
                </div>
                <span class="studio-compare-corner-tag tone-slate corner-left">
                  {{ t('imageStudio.previewCanvas.compareSource') }}
                </span>
                <span class="studio-compare-corner-tag tone-blue corner-right">
                  {{ t('imageStudio.previewCanvas.compareVariant') }}
                </span>
                <input
                  v-model.number="comparePosition"
                  type="range"
                  min="5"
                  max="95"
                  class="studio-compare-range"
                />
              </div>
            </div>

            <div
              v-else
              class="studio-preview-stage"
              :class="{ 'is-generating-empty': generating, 'is-empty': !generating }"
            >
              <div v-if="generating" class="studio-preview-skeleton">
                <div class="studio-preview-skeleton-shine"></div>
                <div class="studio-preview-generating-label">
                  <Icon name="sparkles" size="sm" />
                  <span>{{ generationPreviewLabel }}</span>
                </div>
              </div>
              <div v-else class="studio-empty-preview">
                <div class="studio-empty-mark">
                  <Icon name="sparkles" size="lg" />
                </div>
                <p class="studio-empty-title">{{ t('imageStudio.emptyStates.previewTitle') }}</p>
                <p class="studio-empty-text">{{ t('imageStudio.emptyStates.previewText') }}</p>
              </div>
            </div>
          </section>

          <section class="studio-panel studio-workbench-panel">
            <div class="studio-workbench-header">
              <div>
                <p class="studio-panel-title">{{ t('imageStudio.workbench.title') }}</p>
                <p class="studio-helper">{{ t('imageStudio.workbench.subtitle') }}</p>
              </div>
              <div class="studio-workbench-summary">
                <span class="studio-workbench-pill">
                  {{ t('imageStudio.workbench.tileCount', { count: workspaceTiles.length }) }}
                </span>
                <span class="studio-workbench-pill accent">
                  {{ t('imageStudio.workbench.selectedCount', { count: selectedTileIds.length }) }}
                </span>
                <strong class="studio-progress-value">
                  {{ generationProgressLabel }}
                </strong>
              </div>
            </div>

            <div
              v-if="undoableDelete"
              class="studio-undo-bar"
              role="status"
            >
              <Icon name="trash" size="sm" />
              <span class="studio-undo-bar-text">
                {{ t(undoableDelete.kind === 'workspace'
                  ? 'imageStudio.workbench.undoCleared'
                  : 'imageStudio.workbench.undoDeleted',
                  { count: undoableDelete.count }) }}
              </span>
              <button type="button" class="studio-undo-bar-action" @click="undoDelete">
                {{ t('imageStudio.workbench.undo') }} ({{ undoableDeleteCountdown }}s)
              </button>
            </div>

            <div class="studio-progress-track">
              <div
                class="studio-progress-bar"
                :style="{ width: `${generating ? generationProgressPercent : 100}%` }"
              ></div>
            </div>

            <div v-if="generating" class="studio-progress-info">
              <div class="studio-progress-info-text">
                <strong>{{ generationPreviewLabel }}</strong>
                <span v-if="generationJobActive">{{ generationBatchDetailText }}</span>
                <template v-else>
                  <span v-if="estimatedRemainingSeconds != null">
                    {{ t('imageStudio.workbench.etaSeconds', { value: estimatedRemainingSeconds }) }}
                  </span>
                  <span v-else>{{ t('imageStudio.workbench.etaUnknown') }}</span>
                </template>
                <div class="studio-current-progress">
                  <div class="studio-current-progress-meta">
                    <span>{{ currentImageProgressText }}</span>
                    <strong>{{ Math.round(currentImageProgressPercent) }}%</strong>
                  </div>
                  <div class="studio-current-progress-track">
                    <span :style="{ width: `${currentImageProgressPercent}%` }"></span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                class="studio-progress-cancel"
                @click="cancelGeneration"
              >
                <Icon name="x" size="sm" />
                <span>{{ t('imageStudio.buttons.cancelShort') }}</span>
              </button>
            </div>

            <div class="studio-workbench-toolbar">
              <div class="min-w-0">
                <p class="studio-workbench-toolbar-title">{{ t('imageStudio.workbench.toolbarTitle') }}</p>
                <p class="studio-helper">
                  {{ generating ? t('imageStudio.workbench.generatingText') : t('imageStudio.workbench.toolbarSubtitle') }}
                </p>
              </div>
              <p class="studio-workbench-tip">{{ t('imageStudio.workbench.dragTip') }}</p>
              <div class="studio-workbench-actions">
                <button
                  type="button"
                  class="studio-inline-button"
                  :disabled="selectedTileIds.length === 0"
                  @click="downloadSelectedTiles"
                >
                  <Icon name="download" size="sm" />
                  <span>{{ t('imageStudio.workbench.downloadSelected') }}</span>
                </button>
                <button
                  type="button"
                  class="studio-inline-button danger"
                  :disabled="selectedTileIds.length === 0"
                  @click="deleteSelectedTiles"
                >
                  <Icon name="trash" size="sm" />
                  <span>{{ t('imageStudio.workbench.deleteSelected') }}</span>
                </button>
                <button
                  type="button"
                  class="studio-inline-button"
                  :disabled="workspaceTiles.length === 0"
                  @click="clearWorkspace"
                >
                  <Icon name="x" size="sm" />
                  <span>{{ t('imageStudio.workbench.clearWorkspace') }}</span>
                </button>
              </div>
            </div>

            <div class="studio-progress-footer">
              <span>{{ generating ? generationSummaryText : generationFootnote }}</span>
              <button
                type="button"
                class="studio-inline-button"
                :disabled="!previewTile"
                @click="openPreviewLightbox('natural')"
              >
                {{ t('imageStudio.previewCanvas.expandPreview') }}
              </button>
            </div>

            <div
              ref="workbenchSurfaceRef"
              data-testid="studio-workbench-surface"
              class="studio-workbench-surface"
              :class="{ 'is-selecting': workbenchSelectionActive }"
              :style="workbenchSurfaceStyle"
              @mousedown="handleWorkbenchSurfaceMouseDown"
            >
              <div v-if="!workspaceTiles.length" class="studio-workbench-empty">
                <div class="studio-empty-mark">
                  <Icon name="grid" size="lg" />
                </div>
                <p class="studio-empty-title">{{ t('imageStudio.workbench.emptyTitle') }}</p>
                <p class="studio-empty-text">{{ t('imageStudio.workbench.emptyText') }}</p>
              </div>

              <div v-else class="studio-workbench-grid">
                <article
                  v-for="tile in workspaceTiles"
                  :key="tile.id"
                  :ref="(element) => setWorkbenchTileRef(tile.id, element)"
                  class="studio-workbench-tile"
                  :class="{
                    active: previewTile?.id === tile.id,
                    selected: selectedTileIds.includes(tile.id),
                    'is-drop-target': workbenchDropTileId === tile.id,
                    'is-dragging': workbenchDragTileId === tile.id,
                  }"
                  :data-workbench-tile="tile.id"
                  draggable="true"
                  @mousedown.stop
                  @dragstart="handleWorkbenchTileDragStart(tile.id, $event)"
                  @dragover="handleWorkbenchTileDragOver(tile.id, $event)"
                  @dragleave="handleWorkbenchTileDragLeave(tile.id)"
                  @drop="handleWorkbenchTileDrop(tile.id, $event)"
                  @dragend="handleWorkbenchTileDragEnd"
                >
                  <button
                    type="button"
                    class="studio-workbench-tile-button"
                    @click="handleWorkbenchTileClick(tile.id, $event)"
                    @dblclick.stop="openTileLightbox(tile.id, 'fit')"
                  >
                    <img
                      :src="tile.result.url"
                      :alt="tile.result.filename"
                      class="studio-workbench-image"
                      draggable="false"
                    />
                    <div class="studio-workbench-tile-gradient"></div>
                    <div class="studio-workbench-tile-copy">
                      <p class="studio-workbench-tile-name">{{ tile.result.filename }}</p>
                      <p class="studio-workbench-tile-meta">
                        {{ tile.aspectRatio }} · {{ formatTime(tile.createdAt) }}
                      </p>
                    </div>
                  </button>

                  <div class="studio-workbench-tile-actions">
                    <span class="studio-workbench-drag-hotzone" aria-hidden="true">
                      <Icon name="grid" size="xs" />
                    </span>
                    <button
                      type="button"
                      class="studio-workbench-icon"
                      :aria-label="t('imageStudio.previewCanvas.expandPreview')"
                      @click.stop="openTileLightbox(tile.id, 'fit')"
                    >
                      <Icon name="eye" size="xs" />
                    </button>
                    <button
                      type="button"
                      class="studio-workbench-icon"
                      :aria-label="t('imageStudio.workbench.toggleSelection')"
                      @click.stop="toggleTileSelection(tile.id)"
                    >
                      <Icon :name="selectedTileIds.includes(tile.id) ? 'check' : 'plus'" size="xs" />
                    </button>
                  </div>
                </article>
              </div>

              <div
                v-if="workbenchSelectionActive"
                class="studio-workbench-marquee"
                :style="workbenchSelectionRectStyle"
              ></div>
            </div>
          </section>

        </main>

        <aside class="studio-right-column">
          <section class="studio-panel studio-side-panel studio-history-panel">
            <div class="studio-history-header">
              <div class="studio-history-title-row">
                <div class="studio-history-title-wrap">
                  <p
                    class="studio-panel-title studio-history-title"
                    tabindex="0"
                    :title="t('imageStudio.sidebar.historySubtitle')"
                  >
                    {{ t('imageStudio.sidebar.historyTitle') }}
                  </p>
                </div>
                <p v-if="historySummary.total" class="studio-history-stats">
                  <span class="is-total">{{ locale === 'zh' ? `共${historySummary.total}条` : `${historySummary.total}` }}</span>
                  <span class="is-native">{{ locale === 'zh' ? `原生${historySummary.native}` : `N${historySummary.native}` }}</span>
                  <span class="is-upscaled">{{ locale === 'zh' ? `放大${historySummary.upscaled}` : `U${historySummary.upscaled}` }}</span>
                  <span class="is-degraded">{{ locale === 'zh' ? `降级${historySummary.degraded}` : `D${historySummary.degraded}` }}</span>
                </p>
                <button
                  type="button"
                  class="studio-history-clear"
                  :disabled="historyItems.length === 0"
                  @click="confirmClearHistory"
                >
                  {{ t('imageStudio.promptPanel.clear') }}
                </button>
              </div>
            </div>

            <div v-if="!historyItems.length" class="studio-side-empty">
              {{ t('imageStudio.emptyStates.history') }}
            </div>

            <div v-else ref="historyListRef" class="studio-history-list" :style="historyListStyle">
              <HistoryCard
                v-for="item in historyItems"
                :key="item.id"
                :active="activeHistoryRecord?.id === item.id"
                :image-url="item.results[0]?.url || ''"
                :image-alt="item.results[0]?.filename || item.model"
                :ratio="item.aspectRatio"
                :resolution="historyResolutionLabel(item)"
                :title="item.prompt"
                :provider="historyProviderLabel(item)"
                :model="item.model"
                :timing="historyTimingLabel(item)"
                :style-label="historyStyleLabel(item)"
                :seed="historySeedLabel(item)"
                :seed-text="historySeedText()"
                :seed-copy-title="historySeedCopyTitle(item)"
                :file-size-text="historyFileSizeLabel(item)"
                :format="historyFormatLabel(item)"
                :output-mode="item.outputMode"
                :output-mode-title="outputModeLabel(item.outputMode)"
                :restore-title="t('imageStudio.buttons.restore')"
                :delete-title="t('imageStudio.buttons.delete')"
                :tooltip-style="studioAppearance.tooltipStyle"
                :tooltip-accent="accentPalette[studioAppearance.accentTone].color"
                :tooltip-accent-deep="accentPalette[studioAppearance.accentTone].deep"
                :tooltip-accent-rgb="accentPalette[studioAppearance.accentTone].rgb"
                :tooltip-radius="studioAppearance.radiusScale"
                :night-mode="studioAppearance.themeMode === 'night'"
                @select="selectHistoryRecord(item.id)"
                @restore="restoreHistoryRecord(item.id)"
                @delete="removeHistoryRecord(item.id)"
                @copy-seed="copyHistorySeed(item)"
              />
            </div>
          </section>

          <section ref="promptHelperPanelRef" class="studio-panel studio-side-panel studio-helper-panel">
            <div class="studio-side-header">
              <div>
                <p class="studio-panel-title">{{ t('imageStudio.sidebar.helperTitle') }}</p>
                <p class="studio-helper">{{ t('imageStudio.sidebar.helperSubtitle') }}</p>
              </div>
            </div>

            <button
              type="button"
              class="studio-popover-trigger tone-violet"
              :class="{ 'is-open': promptHelperPanelOpen, 'is-incomplete': !promptHelperConfigured }"
              @click.stop="promptHelperPanelOpen = !promptHelperPanelOpen"
            >
              <Icon name="brain" size="sm" />
              <span class="studio-popover-trigger-label">{{ t('imageStudio.sidebar.helperConfigure') }}</span>
              <span class="studio-popover-trigger-meta">{{ promptHelperTriggerMeta }}</span>
            </button>

            <transition name="studio-popover">
              <div v-if="promptHelperPanelOpen" class="studio-popover-panel is-wide studio-helper-popover">
                <div class="studio-popover-head">
                  <div>
                    <p class="studio-popover-title">{{ t('imageStudio.sidebar.helperTitle') }}</p>
                    <p class="studio-popover-subtitle">{{ t('imageStudio.sidebar.helperHint') }}</p>
                  </div>
                  <button type="button" class="studio-popover-close" @click="promptHelperPanelOpen = false">
                    <Icon name="x" size="xs" />
                  </button>
                </div>

                <p class="studio-helper">{{ t('imageStudio.sidebar.helperCompatibilityNote') }}</p>

                <div class="studio-field-group">
                  <label class="studio-field-label">{{ t('imageStudio.sidebar.helperBaseUrl') }}</label>
                  <input
                    v-model.trim="promptHelperConfig.baseUrl"
                    type="url"
                    class="input font-mono text-sm"
                    :placeholder="t('imageStudio.sidebar.helperBaseUrlPlaceholder')"
                  />
                </div>

                <div class="studio-field-group">
                  <label class="studio-field-label">{{ t('imageStudio.sidebar.helperApiKey') }}</label>
                  <input
                    v-model.trim="promptHelperConfig.apiKey"
                    type="password"
                    class="input font-mono text-sm"
                    :placeholder="t('imageStudio.sidebar.helperApiKeyPlaceholder')"
                    autocomplete="off"
                  />
                </div>

                <div class="studio-field-group">
                  <label class="studio-field-label">
                    {{ t('imageStudio.sidebar.helperModel') }}
                    <span class="studio-inline-tip">{{ promptHelperProbeHint }}</span>
                  </label>
                  <div class="studio-model-row">
                    <input
                      v-model.trim="promptHelperConfig.model"
                      type="text"
                      class="input font-mono text-sm"
                      list="prompt-helper-models"
                      :placeholder="t('imageStudio.sidebar.helperModelPlaceholder')"
                    />
                    <button
                      type="button"
                      class="studio-icon-button inset tone-violet"
                      :disabled="!promptHelperConfig.baseUrl.trim() || !promptHelperConfig.apiKey.trim() || detectingPromptHelperModels"
                      :title="t('imageStudio.sidebar.helperModelRefresh')"
                      @click="fetchPromptHelperModels(false)"
                    >
                      <Icon :name="detectingPromptHelperModels ? 'sync' : 'refresh'" size="sm" />
                    </button>
                  </div>
                  <datalist id="prompt-helper-models">
                    <option v-for="m in promptHelperModelHints" :key="m" :value="m" />
                  </datalist>
                  <p
                    class="studio-helper studio-helper-quality"
                    :class="{ 'is-warning': promptHelperQualityWarning }"
                  >
                    {{ promptHelperQualityHint }}
                  </p>
                </div>

                <div class="studio-helper-actions">
                  <button
                    type="button"
                    class="studio-secondary-action"
                    @click="resetPromptHelperConfig"
                  >
                    {{ t('imageStudio.sidebar.helperReset') }}
                  </button>
                  <button
                    type="button"
                    class="studio-generate-button"
                    @click="promptHelperPanelOpen = false"
                  >
                    {{ t('imageStudio.sidebar.helperConfirm') }}
                  </button>
                </div>
              </div>
            </transition>
          </section>

          <section
            v-if="evolutionTimeline.length"
            class="studio-panel studio-side-panel studio-evolution-panel"
          >
            <div class="studio-side-header">
              <div>
                <p class="studio-panel-title">{{ t('imageStudio.sidebar.evolutionTitle') }}</p>
                <p class="studio-helper">{{ t('imageStudio.sidebar.evolutionSubtitle') }}</p>
              </div>
            </div>

            <ol class="studio-evolution-timeline">
              <li
                v-for="(tile, index) in evolutionTimeline"
                :key="tile.id"
                class="studio-evolution-step"
                :class="{ 'is-current': previewTile?.id === tile.id, 'is-head': index === 0 }"
              >
                <button
                  type="button"
                  class="studio-evolution-step-card"
                  :title="tile.prompt || tile.result.filename"
                  @click="openTileLightbox(tile.id, 'fit')"
                >
                  <img :src="tile.result.url" :alt="tile.result.filename" />
                  <div class="studio-evolution-step-meta">
                    <span
                      class="studio-evolution-step-model"
                      :title="tile.result.filename"
                    >{{ tile.result.filename }}</span>
                    <span class="studio-evolution-step-time">{{ formatTime(tile.createdAt) }}</span>
                  </div>
                  <span class="studio-evolution-step-arrow">
                    <Icon name="chevronRight" size="xs" />
                  </span>
                </button>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="previewLightboxOpen && previewTile"
        class="studio-lightbox"
        :class="{
          'is-immersive': lightboxImmersive,
          'theme-night': studioAppearance.themeMode === 'night',
        }"
        :style="studioAppearanceStyle"
        @click.self="closePreviewLightbox"
      >
        <div class="studio-lightbox-panel">
          <div class="studio-lightbox-header">
            <div class="studio-lightbox-copy">
              <p class="studio-lightbox-title">{{ previewTile.result.filename }}</p>
              <div class="studio-lightbox-prompt">
                {{ previewTile.prompt }}
              </div>
              <div class="studio-lightbox-meta" aria-label="Image metadata">
                <template v-for="(item, index) in lightboxMetaItems" :key="item.key">
                  <span v-if="index" class="studio-lightbox-meta-dot">·</span>
                  <span :class="{ primary: item.primary }">{{ item.label }}</span>
                </template>
              </div>
            </div>
            <div class="studio-lightbox-actions">
              <button
                type="button"
                class="studio-lightbox-button"
                :aria-label="t('imageStudio.workbench.previousPreview')"
                @click="stepPreview(-1)"
              >
                <Icon name="chevronLeft" size="sm" />
                <span class="studio-lightbox-button-label">{{ t('imageStudio.workbench.previousPreview') }}</span>
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :aria-label="t('imageStudio.workbench.nextPreview')"
                @click="stepPreview(1)"
              >
                <Icon name="chevronRight" size="sm" />
                <span class="studio-lightbox-button-label">{{ t('imageStudio.workbench.nextPreview') }}</span>
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :class="{ active: lightboxMagnifierEnabled }"
                data-testid="studio-lightbox-magnifier"
                :aria-label="lightboxMagnifierLabel"
                @click="toggleLightboxMagnifier"
              >
                <Icon :name="lightboxMagnifierEnabled ? 'eyeOff' : 'search'" size="sm" />
                <span class="studio-lightbox-button-label">{{ lightboxMagnifierLabel }}</span>
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :aria-label="t('imageStudio.buttons.downloadCurrent')"
                @click="downloadCurrentTile"
              >
                <Icon name="download" size="sm" />
                <span class="studio-lightbox-button-label">{{ t('imageStudio.buttons.downloadCurrent') }}</span>
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :aria-label="locale === 'zh' ? '复制参数' : 'Copy Details'"
                @click="copyCurrentTileDetails"
              >
                <Icon name="clipboard" size="sm" />
                <span class="studio-lightbox-button-label">{{ locale === 'zh' ? '复制参数' : 'Copy Details' }}</span>
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :aria-label="t('imageStudio.sidebar.copyImage')"
                @click="copyCurrentTileImage"
              >
                <Icon name="copy" size="sm" />
                <span class="studio-lightbox-button-label">{{ t('imageStudio.sidebar.copyImage') }}</span>
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :aria-label="t('imageStudio.workbench.closePreview')"
                @click="closePreviewLightbox"
              >
                <Icon name="x" size="sm" />
                <span class="studio-lightbox-button-label">{{ t('imageStudio.workbench.closePreview') }}</span>
              </button>
            </div>
          </div>

          <div
            ref="lightboxStageRef"
            class="studio-lightbox-stage"
            :class="[
              {
                'is-fit': lightboxViewMode === 'fit',
                'is-magnifier-active': lightboxMagnifierEnabled,
                'is-zoomed': lightboxZoom > 1.02,
                'is-dragging': lightboxPointerDown && lightboxDragStarted,
              },
            ]"
            @mousedown="handleLightboxStageMouseDown"
            @mousemove="handleLightboxPointerMove"
            @mouseleave="hideLightboxMagnifier"
            @wheel.prevent="handleLightboxWheel"
            @contextmenu.prevent
          >
            <div
              ref="lightboxFrameRef"
              class="studio-lightbox-frame"
              :style="lightboxFrameStyle"
            >
              <img
                ref="lightboxImageRef"
                :src="previewTile.result.url"
                :alt="previewTile.result.filename"
                class="studio-lightbox-image"
                :class="{ 'is-fit': lightboxViewMode === 'fit' }"
                draggable="false"
                @load="handleLightboxImageLoad"
              />
            </div>
            <div
              v-if="lightboxMagnifierEnabled && lightboxLensVisible"
              class="studio-lightbox-lens"
              :style="lightboxLensStyle"
            ></div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="referencePreviewOpen && referencePreviewSrc"
        class="studio-lightbox studio-reference-preview"
        :class="{ 'theme-night': studioAppearance.themeMode === 'night' }"
        :style="studioAppearanceStyle"
        @click.self="closeReferencePreview"
      >
        <div class="studio-reference-preview-panel">
          <div class="studio-lightbox-header">
            <div class="min-w-0">
              <p class="studio-lightbox-title">
                {{ t('imageStudio.referenceImages.previewTitle', {
                  current: referencePreviewDisplayIndex,
                  total: referenceImages.length,
                }) }}
              </p>
              <p class="studio-lightbox-caption">{{ t('imageStudio.referenceImages.previewHint') }}</p>
            </div>
            <div class="studio-lightbox-actions">
              <button
                type="button"
                class="studio-lightbox-button"
                :disabled="referenceImages.length <= 1"
                @click="stepReferencePreview(-1)"
              >
                <Icon name="chevronLeft" size="sm" />
                {{ t('imageStudio.workbench.previousPreview') }}
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :disabled="referenceImages.length <= 1"
                @click="stepReferencePreview(1)"
              >
                <Icon name="chevronRight" size="sm" />
                {{ t('imageStudio.workbench.nextPreview') }}
              </button>
              <button type="button" class="studio-lightbox-button" @click="closeReferencePreview">
                <Icon name="x" size="sm" />
                {{ t('imageStudio.workbench.closePreview') }}
              </button>
            </div>
          </div>
          <div class="studio-reference-preview-stage">
            <img
              :src="referencePreviewSrc"
              :alt="t('imageStudio.referenceImages.previewAlt')"
              class="studio-reference-preview-image"
            />
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="promptReplacementModalOpen"
        class="studio-prompt-modal-backdrop"
        :style="studioModalThemeStyle"
        role="dialog"
        aria-modal="true"
        @click.self="closePromptReplacementModal"
      >
        <div class="studio-prompt-modal-panel is-replacements">
          <div class="studio-prompt-modal-head">
            <div>
              <p class="studio-prompt-modal-title">{{ t('imageStudio.promptReplacements.title') }}</p>
              <p class="studio-prompt-modal-text">{{ promptReplacementSubtitle }}</p>
            </div>
            <button type="button" class="studio-popover-close" @click="closePromptReplacementModal">
              <Icon name="x" size="xs" />
            </button>
          </div>

          <div class="studio-replacement-body">
            <div class="studio-replacement-toolbar">
              <div class="studio-replacement-mode">
                <Icon :name="promptReplacementMode === 'template' ? 'edit' : 'sparkles'" size="sm" />
                <span>{{ promptReplacementModeLabel }}</span>
                <strong>{{ promptReplacementItems.length }}</strong>
              </div>
              <button
                type="button"
                class="studio-replacement-smart-button"
                :disabled="promptHelperBusy === 'template'"
                @click="analyzePromptReplacementItems"
              >
                <Icon :name="promptHelperBusy === 'template' ? 'sync' : 'sparkles'" size="sm" />
                <span>{{ promptHelperBusy === 'template'
                  ? t('imageStudio.promptReplacements.analyzing')
                  : t('imageStudio.promptReplacements.smartAnalyze') }}</span>
              </button>
            </div>

            <div v-if="promptReplacementError" class="studio-replacement-error">
              {{ promptReplacementError }}
            </div>

            <div v-if="promptReplacementItems.length" class="studio-replacement-layout">
              <section class="studio-replacement-preview-panel">
                <div class="studio-replacement-panel-head">
                  <div>
                    <p>{{ t('imageStudio.promptReplacements.fullPrompt') }}</p>
                    <span>{{ t('imageStudio.promptReplacements.hoverHint') }}</span>
                  </div>
                  <strong>{{ promptReplacementItems.length }}</strong>
                </div>
                <div class="studio-replacement-prompt-view">
                  <template v-for="segment in promptReplacementSegments" :key="segment.key">
                    <button
                      v-if="segment.item"
                      type="button"
                      class="studio-replacement-highlight"
                      :class="{ active: selectedPromptReplacementItemId === segment.item.id }"
                      @click="selectPromptReplacementItem(segment.item.id)"
                      @focus="selectPromptReplacementItem(segment.item.id)"
                      @mouseenter="selectPromptReplacementItem(segment.item.id)"
                    >
                      {{ segment.text }}
                    </button>
                    <span v-else>{{ segment.text }}</span>
                  </template>
                </div>
              </section>

              <aside v-if="selectedPromptReplacementItem" class="studio-replacement-editor-panel">
                <div class="studio-replacement-panel-head">
                  <div>
                    <p>{{ selectedPromptReplacementItem.label }}</p>
                    <span>
                      {{ selectedPromptReplacementPositionLabel }}
                      ·
                      {{ selectedPromptReplacementItem.kind === 'argument'
                        ? t('imageStudio.promptReplacements.templateSlot')
                        : t('imageStudio.promptReplacements.smartSlot') }}
                    </span>
                  </div>
                  <Icon :name="selectedPromptReplacementItem.kind === 'argument' ? 'edit' : 'sparkles'" size="sm" />
                </div>

                <label class="studio-replacement-editor-field">
                  <span>{{ t('imageStudio.promptReplacements.currentText') }}</span>
                  <code>{{ selectedPromptReplacementItem.source }}</code>
                </label>

                <label class="studio-replacement-editor-field">
                  <span>{{ t('imageStudio.promptReplacements.replacementText') }}</span>
                  <textarea
                    v-model="selectedPromptReplacementItem.replacement"
                    class="input studio-replacement-editor-input"
                    :placeholder="selectedPromptReplacementItem.source"
                  ></textarea>
                </label>

                <div class="studio-replacement-editor-actions">
                  <button type="button" @click="resetSelectedPromptReplacement">
                    <Icon name="refresh" size="xs" />
                    <span>{{ t('imageStudio.promptReplacements.resetCurrent') }}</span>
                  </button>
                </div>

                <div class="studio-replacement-context">
                  <div class="studio-replacement-context-head">
                    <Icon name="search" size="sm" />
                    <span>{{ t('imageStudio.promptReplacements.contextTitle') }}</span>
                  </div>
                  <p>
                    <span>{{ promptReplacementPreview.before }}</span>
                    <mark>{{ promptReplacementPreview.hit }}</mark>
                    <span>{{ promptReplacementPreview.after }}</span>
                  </p>
                </div>
              </aside>
            </div>

            <div v-else class="studio-replacement-empty">
              <Icon name="sparkles" size="lg" />
              <p>{{ t('imageStudio.promptReplacements.emptyTitle') }}</p>
              <span>{{ t('imageStudio.promptReplacements.emptyText') }}</span>
            </div>
          </div>

          <div class="studio-prompt-modal-actions is-upload-actions">
            <button type="button" class="studio-prompt-upload-cancel" @click="closePromptReplacementModal">
              {{ t('imageStudio.promptReplacements.cancel') }}
            </button>
            <button
              type="button"
              class="studio-prompt-upload-save"
              :disabled="!promptReplacementItems.length"
              @click="applyPromptReplacements"
            >
              {{ t('imageStudio.promptReplacements.apply') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="compatibilityPreviewOpen"
        class="studio-prompt-modal-backdrop is-nested"
        :style="studioModalThemeStyle"
        role="dialog"
        aria-modal="true"
        @click.self="closeCompatibilityPreview"
      >
        <div class="studio-compatibility-modal">
          <div class="studio-prompt-modal-head">
            <div>
              <p class="studio-prompt-modal-title">{{ t('imageStudio.promptCompatibility.title') }}</p>
              <p class="studio-prompt-modal-text">{{ t('imageStudio.promptCompatibility.description') }}</p>
            </div>
            <button type="button" class="studio-popover-close" @click="closeCompatibilityPreview">
              <Icon name="x" size="xs" />
            </button>
          </div>

          <div class="studio-compatibility-preview-grid">
            <section class="studio-compatibility-preview-card">
              <div>
                <p>{{ t('imageStudio.promptCompatibility.originalTitle') }}</p>
                <span>{{ t('imageStudio.promptCompatibility.originalHint') }}</span>
              </div>
              <textarea
                class="input studio-compatibility-preview-textarea"
                :value="compatibilityPreviewOriginal"
                readonly
              ></textarea>
            </section>

            <section class="studio-compatibility-preview-card is-compatible">
              <div>
                <p>{{ t('imageStudio.promptCompatibility.compatibleTitle') }}</p>
                <span>{{ t('imageStudio.promptCompatibility.compatibleHint') }}</span>
              </div>
              <textarea
                v-model.trim="compatibilityPreviewPrompt"
                class="input studio-compatibility-preview-textarea"
              ></textarea>
            </section>
          </div>

          <div class="studio-prompt-modal-actions">
            <button type="button" class="studio-secondary-action" @click="closeCompatibilityPreview">
              {{ t('imageStudio.promptCompatibility.cancel') }}
            </button>
            <button type="button" class="studio-secondary-action" @click="keepOriginalCompatibilityPrompt">
              {{ t('imageStudio.promptCompatibility.useOriginal') }}
            </button>
            <button type="button" class="studio-generate-button" @click="confirmCompatibilityPrompt">
              {{ t('imageStudio.promptCompatibility.useCompatible') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="customRatioModalOpen"
        class="studio-prompt-modal-backdrop is-nested"
        :style="studioModalThemeStyle"
        role="dialog"
        aria-modal="true"
        @click.self="closeCustomRatioModal"
      >
        <div class="studio-custom-ratio-modal">
          <div class="studio-prompt-modal-head">
            <div>
              <h3>{{ t('imageStudio.settings.customRatio') }}</h3>
              <p>{{ t('imageStudio.hints.aspectRatio') }}</p>
            </div>
            <button type="button" class="studio-popover-close" @click="closeCustomRatioModal">
              <Icon name="x" size="xs" />
            </button>
          </div>

          <div class="studio-custom-ratio-form">
            <label>
              <span>W</span>
              <input v-model="customRatioWidth" type="number" min="1" max="99" class="input" />
            </label>
            <strong>:</strong>
            <label>
              <span>H</span>
              <input v-model="customRatioHeight" type="number" min="1" max="99" class="input" />
            </label>
          </div>

          <div class="studio-prompt-modal-actions is-inline">
            <button type="button" class="studio-secondary-action" @click="closeCustomRatioModal">
              {{ t('imageStudio.buttons.cancelShort') }}
            </button>
            <button type="button" class="studio-generate-button" @click="applyCustomRatio">
              {{ t('imageStudio.sidebar.helperConfirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="promptLibraryOpen"
        class="studio-prompt-modal-backdrop"
        :style="studioModalThemeStyle"
        role="dialog"
        aria-modal="true"
        @click.self="closePromptLibrary"
      >
        <div class="studio-prompt-modal-panel is-library">
          <div class="studio-prompt-modal-head">
            <div>
              <p class="studio-prompt-modal-title">{{ t('imageStudio.promptWorkspace.libraryTitle') }}</p>
              <p class="studio-prompt-modal-text">{{ t('imageStudio.promptWorkspace.librarySubtitle') }}</p>
            </div>
            <button type="button" class="studio-popover-close" @click="closePromptLibrary">
              <Icon name="x" size="xs" />
            </button>
          </div>

          <div class="studio-prompt-library-toolbar">
            <label class="studio-prompt-library-search">
              <Icon name="search" size="sm" />
              <input
                v-model.trim="promptLibrarySearch"
                type="search"
                :placeholder="t('imageStudio.promptWorkspace.searchPlaceholder')"
              />
            </label>
            <div ref="promptLibraryCategoryMenuRef" class="studio-prompt-library-category-wrap">
              <button
                type="button"
                class="studio-prompt-library-category-trigger"
                :class="{ active: promptLibraryCategoryMenuOpen }"
                @click.stop="promptLibraryCategoryMenuOpen = !promptLibraryCategoryMenuOpen"
              >
                <span>{{ activePromptLibraryCategoryLabel }}</span>
                <Icon name="chevronDown" size="sm" />
              </button>

              <div v-if="promptLibraryCategoryMenuOpen" class="studio-prompt-category-menu" @click.stop>
                <label class="studio-prompt-category-search">
                  <Icon name="search" size="xs" />
                  <input
                    v-model.trim="promptLibraryCategorySearch"
                    type="search"
                    placeholder="搜索分类"
                  />
                </label>

                <div class="studio-prompt-category-section">
                  <p class="studio-prompt-category-section-title">默认分类</p>
                  <button
                    v-for="category in filteredDefaultPromptLibraryCategories"
                    :key="category.value"
                    type="button"
                    class="studio-prompt-category-option"
                    :class="{ active: promptLibraryCategory === category.value }"
                    @click="selectPromptLibraryCategory(category.value)"
                  >
                    <span class="studio-prompt-category-icon">
                      <Icon :name="category.icon" size="xs" />
                    </span>
                    <span>{{ category.label }}</span>
                    <small v-if="category.defaultTag">默认</small>
                  </button>
                </div>

                <div class="studio-prompt-category-section">
                  <p class="studio-prompt-category-section-title">自定义分类</p>
                  <button
                    v-for="category in filteredCustomPromptLibraryCategories"
                    :key="category.value"
                    type="button"
                    class="studio-prompt-category-option"
                    :class="{ active: promptLibraryCategory === category.value }"
                    @click="selectPromptLibraryCategory(category.value)"
                  >
                    <span class="studio-prompt-category-icon is-custom">
                      <Icon :name="category.icon" size="xs" />
                    </span>
                    <span>{{ category.label }}</span>
                  </button>

                  <button
                    type="button"
                    class="studio-prompt-category-add"
                    @click="startPromptLibraryCategoryAdd"
                  >
                    <Icon name="plus" size="xs" />
                    <span>添加新分类</span>
                  </button>
                </div>
              </div>
            </div>
            <button type="button" class="studio-prompt-library-command studio-prompt-library-upload" @click="openPromptUploadModal">
              <Icon name="upload" size="sm" />
              <span>上传提示词</span>
            </button>
            <button
              type="button"
              class="studio-prompt-library-command studio-prompt-library-batch"
              :class="{ active: promptLibraryBatchMode }"
              @click="togglePromptLibraryBatchMode"
            >
              <Icon name="check" size="sm" />
              <span>批量管理</span>
            </button>
          </div>

          <div v-if="promptLibraryBatchMode" class="studio-prompt-library-batchbar">
            <span>已选 {{ promptLibrarySelectedIds.length }} 个</span>
            <button
              type="button"
              :disabled="!promptLibrarySelectedIds.length"
              @click="deleteSelectedPromptLibraryOptions"
            >
              删除选中
            </button>
          </div>

          <TransitionGroup name="studio-prompt-card" tag="div" class="studio-prompt-library-list">
            <button
              v-for="option in filteredPromptLibraryOptions"
              :key="option.id"
              type="button"
              class="studio-prompt-library-item"
              :class="{
                'is-selectable': promptLibraryBatchMode,
                selected: promptLibrarySelectedIds.includes(option.id),
                'is-applying': promptLibraryApplyingId === option.id,
              }"
              :style="{ '--card-index': String(filteredPromptLibraryOptions.indexOf(option)) }"
              @click="handlePromptLibraryCardClick(option)"
              @contextmenu.prevent="openPromptLibraryDetails(option)"
              @pointerdown="startPromptLibraryLongPress(option)"
              @pointerup="clearPromptLibraryLongPress"
              @pointerleave="clearPromptLibraryLongPress"
            >
              <span
                v-if="promptLibraryBatchMode"
                class="studio-prompt-library-check"
                :class="{ active: promptLibrarySelectedIds.includes(option.id) }"
              >
                <Icon name="check" size="xs" />
              </span>
              <span class="studio-prompt-library-card-visual">
                <img
                  v-if="option.imageUrl"
                  :src="option.imageUrl"
                  :alt="option.title"
                  @load="handlePromptPreviewImageLoad"
                  @error="(event) => ((event.target as HTMLImageElement).style.opacity = '0')"
                />
                <span v-else class="studio-prompt-library-card-fallback">
                  <Icon name="sparkles" size="md" />
                </span>
                <span class="studio-prompt-library-card-prompt">
                  <strong>{{ option.title }}</strong>
                  <span>{{ option.description || option.prompt }}</span>
                </span>
              </span>
            </button>
            <div v-if="!filteredPromptLibraryOptions.length" class="studio-prompt-library-empty">
              <Icon name="search" size="md" />
              <p>{{ t('imageStudio.promptWorkspace.noPromptResults') }}</p>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="promptUploadModalOpen"
        class="studio-prompt-modal-backdrop is-nested"
        :style="studioModalThemeStyle"
        role="dialog"
        aria-modal="true"
        @click.self="closePromptUploadModal"
      >
        <div class="studio-prompt-modal-panel is-upload">
          <div class="studio-prompt-modal-head">
            <div>
              <p class="studio-prompt-modal-title">
                {{ promptLibraryDraftMode === 'edit'
                  ? (locale === 'zh' ? '编辑提示词' : 'Edit Prompt')
                  : t('imageStudio.promptWorkspace.uploadPrompt') }}
              </p>
              <p class="studio-prompt-modal-text">{{ promptLibraryUploadSubtitle }}</p>
            </div>
            <button type="button" class="studio-popover-close" @click="closePromptUploadModal">
              <Icon name="x" size="xs" />
            </button>
          </div>
          <div class="studio-prompt-upload-body">
            <label
              class="studio-prompt-image-drop is-modal"
              @dragover.prevent
              @drop.prevent="handlePromptLibraryImageDrop"
            >
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="handlePromptLibraryImageSelect"
              />
              <img
                v-if="promptLibraryDraftImageUrl && !promptLibraryDraftRemoveImage"
                :src="promptLibraryDraftImageUrl"
                alt=""
              />
              <span v-else>
                <Icon name="upload" size="md" />
                <strong>{{ t('imageStudio.promptWorkspace.uploadImage') }}</strong>
                <small>支持拖拽或点击上传，最高 20MB</small>
              </span>
            </label>

            <div class="studio-prompt-upload-fields">
              <input
                v-model.trim="promptLibraryDraftTitle"
                class="input"
                type="text"
                :placeholder="t('imageStudio.promptWorkspace.localTitlePlaceholder')"
              />
              <input
                v-model.trim="promptLibraryDraftCategory"
                class="input"
                type="text"
                placeholder="分类，例如：人物、场景、写实"
              />
              <textarea
                v-model.trim="promptLibraryDraftDescription"
                class="input studio-prompt-upload-textarea is-description"
                placeholder="描述"
              ></textarea>
              <textarea
                v-model.trim="promptLibraryDraftPrompt"
                class="input studio-prompt-upload-textarea"
                :placeholder="t('imageStudio.promptWorkspace.localPromptPlaceholder')"
              ></textarea>
              <p v-if="promptLibraryDraftError" class="studio-prompt-upload-error">
                {{ promptLibraryDraftError }}
              </p>
              <button
                v-if="promptLibraryDraftImageUrl && !promptLibraryDraftRemoveImage"
                type="button"
                class="studio-prompt-upload-remove-image"
                @click="removePromptLibraryDraftImage"
              >
                {{ locale === 'zh' ? '移除预览图' : 'Remove preview image' }}
              </button>
            </div>
          </div>
          <div class="studio-prompt-modal-actions is-upload-actions">
            <button type="button" class="studio-prompt-upload-cancel" @click="closePromptUploadModal">
              {{ t('imageStudio.promptWorkspace.cancel') }}
            </button>
            <button
              type="button"
              class="studio-prompt-upload-save"
              :disabled="promptLibraryDraftSaving"
              @click="savePromptLibraryDraft"
            >
              {{ promptLibrarySaveButtonLabel }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="promptLibraryDetailsItem"
        class="studio-prompt-modal-backdrop is-nested"
        :style="studioModalThemeStyle"
        role="dialog"
        aria-modal="true"
        @click.self="closePromptLibraryDetails"
      >
        <div class="studio-prompt-modal-panel is-details">
          <button type="button" class="studio-prompt-details-close" @click="closePromptLibraryDetails">
            <Icon name="x" size="xs" />
          </button>
          <div
            class="studio-prompt-details-visual"
            @pointerdown="startPromptLibraryDetailsPreviewPress"
            @pointerup="clearPromptLibraryDetailsPreviewPress"
            @pointerleave="clearPromptLibraryDetailsPreviewPress"
          >
            <img
              v-if="promptLibraryDetailsItem.imageUrl"
              :src="promptLibraryDetailsItem.imageUrl"
              :alt="promptLibraryDetailsItem.title"
              @load="handlePromptPreviewImageLoad"
            />
            <Icon v-else name="sparkles" size="lg" />
          </div>
          <div class="studio-prompt-details-body">
            <h3>{{ promptLibraryDetailsItem.title }}</h3>
            <div class="studio-prompt-details-meta">
              <span>{{ promptLibraryDetailsItem.category || t('imageStudio.promptWorkspace.localStorage') }}</span>
              <span v-if="promptLibraryDetailsItem.description">{{ promptLibraryDetailsItem.description }}</span>
            </div>
            <div
              class="studio-prompt-details-prompt"
              @pointerenter="burstPromptDetailsParticles"
              @pointermove="emitPromptDetailsParticles"
            >
              <div class="studio-prompt-details-prompt-scroll">
                <div class="studio-prompt-details-particles" aria-hidden="true">
                  <span
                    v-for="particle in promptDetailsParticles"
                    :key="particle.id"
                    class="studio-prompt-details-particle"
                    :data-symbol="particle.text"
                    :style="{
                      left: `${particle.x}px`,
                      top: `${particle.y}px`,
                      '--particle-dx': `${particle.dx}px`,
                      '--particle-dy': `${particle.dy}px`,
                      '--particle-size': `${particle.size}px`,
                      '--particle-color': particle.color,
                    }"
                  ></span>
                </div>
                <p>{{ promptLibraryDetailsItem.prompt }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="promptLibraryDetailsLightboxOpen && promptLibraryDetailsItem?.imageUrl"
        class="studio-prompt-full-preview-backdrop"
        :class="{ 'theme-night': studioAppearance.themeMode === 'night' }"
        :style="studioAppearanceStyle"
        role="dialog"
        aria-modal="true"
        @click.self="closePromptLibraryDetailsLightbox"
        @wheel.prevent="handlePromptLibraryDetailsLightboxWheel"
      >
        <button type="button" class="studio-prompt-full-preview-close" @click="closePromptLibraryDetailsLightbox">
          <Icon name="x" size="sm" />
        </button>
        <img
          :src="promptLibraryDetailsItem.imageUrl"
          :alt="promptLibraryDetailsItem.title"
          class="studio-prompt-full-preview-image"
          :style="{ transform: `scale(${promptLibraryDetailsLightboxScale})` }"
        />
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="studioTitleTooltipVisible && studioTitleTooltipText"
        ref="studioTitleTooltipRef"
        class="studio-title-tooltip"
        :class="[`is-${studioAppearance.tooltipStyle}`, { 'is-ready': studioTitleTooltipReady }]"
        :style="studioTitleTooltipResolvedStyle"
        role="tooltip"
      >
        {{ studioTitleTooltipText }}
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import HistoryCard from '@/components/image-studio/HistoryCard.vue'
import Icon from '@/components/icons/Icon.vue'
import {
  BrowserDirectGenerationError,
  callImageStudioPromptHelper,
  downloadRemoteImage,
  fetchChatgpt2ApiImageQuota,
  fetchImageStudioUsage,
  generateImageWithExternalBrowser,
  generateImageWithExternalRelay,
  probeImageStudioUpstreamModels,
  resolveImageStudioSize,
} from '@/api/imageStudio'
import type { ImageStudioBatchProgress, ImageStudioGenerationOptions, PromptHelperChatMessage } from '@/api/imageStudio'
import { useImageStudioAppearance } from '@/composables/useImageStudioAppearance'
import { useImageStudioPreferences } from '@/composables/useImageStudioPreferences'
import { calculateGptImagePlaygroundSize } from '@/utils/gptImagePlaygroundSize'
import {
  buildPromptReplacementSegments,
  normalizeSmartReplacementItems,
  parsePromptArgumentItems,
  resolvePromptReplacementTarget,
  resolvePromptTemplateArguments,
  type PromptReplacementItem,
  type PromptReplacementSegment,
} from '@/utils/promptTemplate'
import {
  accentPalette,
  createAccentOptions,
  createBackgroundOptions,
  createCompatibilityProfiles,
  createCurrentRelease,
  createCurrentSiteProfileOptions,
  createFormatOptions,
  createProviderModes,
  createQualityOptions,
  createTextureOptions,
  createThemeModeOptions,
  createTooltipStyleOptions,
  createTranslateLanguages,
  getInspirationPrompts,
  getPromptChips,
  getStylePresets,
  getTranslateLanguageName,
  type StylePresetOption,
  type TranslateLang,
} from '@/utils/imageStudioWorkspaceOptions'
import {
  clearImageStudioHistory,
  deleteImageStudioHistoryItem,
  listImageStudioHistoryItems,
  replaceImageStudioHistoryItems,
  requestImageStudioPersistentStorage,
  revokeImageStudioHistoryItems,
  saveImageStudioHistoryItem,
} from '@/services/imageStudioHistory'
import {
  deleteImageStudioPromptLibraryItem,
  isImageStudioPromptLibraryRemoteEnabled,
  listImageStudioPromptLibraryItems,
  revokeImageStudioPromptLibraryItems,
  saveImageStudioPromptLibraryItem,
  updateImageStudioPromptLibraryItem,
} from '@/services/imageStudioPromptLibrary'
import {
  deleteImageStudioApiPreset,
  listImageStudioApiPresets,
  maskImageStudioApiKey,
  saveImageStudioApiPreset,
  type ImageStudioApiPreset,
} from '@/services/imageStudioApiPresets'
import {
  getImageStudioWorkspaceIdentity,
} from '@/services/imageStudioWorkspace'
import { useAppStore } from '@/stores'
import type {
  ExternalImageStudioRequest,
  ImageStudioChatgpt2ApiImageQuota,
  ImageStudioHistoryItem,
  ImageStudioProtocolProfile,
  ImageStudioProviderMode,
  ImageStudioResolutionPreset,
  ImageStudioUsageResponse,
  ImageStudioWorkspaceTile,
  NormalizedImageResult,
} from '@/types/imageStudio'
import type { ImageStudioPromptLibraryItem } from '@/services/imageStudioPromptLibrary'

const WORKSPACE_ORDER_STORAGE_KEY = 'image-studio.workspace-order'
const PROMPT_LIBRARY_SELECTED_STORAGE_KEY = 'image-studio.prompt-library-selected-id'
const LIGHTBOX_LENS_SIZE = 184
const LIGHTBOX_ZOOM_FACTOR = 1.9
const LIGHTBOX_ZOOM_MIN = 1
const LIGHTBOX_ZOOM_MAX = 4
const LIGHTBOX_ZOOM_STEP = 0.35
const PROMPT_LIBRARY_IMAGE_MAX_BYTES = 20 * 1024 * 1024
const GITHUB_PROJECT_URL = 'https://github.com/ywhgh/image-studio-slim'
const IMAGE_STUDIO_DEBUG = false

interface WorkspaceSyncOptions {
  prioritizedTileIds?: string[]
  selectedTileIds?: string[]
  previewTileId?: string | null
  activeHistoryId?: string | null
}

interface PromptLibraryOption {
  id: string
  title: string
  description: string
  prompt: string
  imageUrl?: string
  category?: string
}

type PreviewOrientation = 'landscape' | 'portrait' | 'square' | 'unknown'

interface PromptTemplateImageMeta {
  ratio: string
  resolution: string
  orientation: PreviewOrientation
}

type PromptLibraryCategoryIcon = 'grid' | 'book' | 'upload' | 'userCircle' | 'cube' | 'sparkles'

interface PromptLibraryCategoryOption {
  value: string
  label: string
  icon: PromptLibraryCategoryIcon
  defaultTag?: boolean
}

interface PromptDetailParticle {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  size: number
  color: string
  text: string
}

const props = withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false,
})

const { t, locale } = useI18n()
const appStore = useAppStore()
const preferences = useImageStudioPreferences()
const workspaceIdentity = getImageStudioWorkspaceIdentity()
const {
  appearance: studioAppearance,
  resetAppearance: resetStudioAppearance,
} = useImageStudioAppearance()

const sub2apiApiKey = ref('')
const externalApiKey = ref('')
const apiPresets = ref<ImageStudioApiPreset[]>([])
const apiPresetDraftName = ref('')
const prompt = ref('')
const studioShellRef = ref<HTMLElement | null>(null)
const historyListRef = ref<HTMLElement | null>(null)
const historyListMaxHeight = ref('')
const promptTextareaRef = ref<HTMLTextAreaElement | null>(null)
const studioTitleTooltipRef = ref<HTMLElement | null>(null)
const studioTitleTooltipVisible = ref(false)
const studioTitleTooltipReady = ref(false)
const studioTitleTooltipText = ref('')
const studioTitleTooltipStyle = ref<Record<string, string>>({
  left: '0px',
  top: '0px',
  maxWidth: '460px',
  '--tooltip-origin': 'top center',
})
const studioTitleTooltipTarget = ref<HTMLElement | null>(null)
let studioTitleTooltipOpenTimer = 0
let historyListResizeObserver: ResizeObserver | null = null
let workbenchResizeObserver: ResizeObserver | null = null
const HISTORY_VISIBLE_CARD_LIMIT = 3
const WORKBENCH_VISIBLE_ROW_LIMIT = 3
const negativePrompt = ref('')
const promptLibraryOpen = ref(false)
const promptLibrarySearch = ref('')
const promptLibraryCategory = ref('all')
const promptLibraryCategoryMenuOpen = ref(false)
const promptLibraryCategorySearch = ref('')
const promptLibraryBatchMode = ref(false)
const promptLibrarySelectedIds = ref<string[]>([])
const promptLibraryApplyingId = ref<string | null>(null)
const promptUploadModalOpen = ref(false)
const promptLibraryDraftMode = ref<'create' | 'edit'>('create')
const promptLibraryEditingId = ref('')
const promptLibraryDraftTitle = ref('')
const promptLibraryDraftDescription = ref('')
const promptLibraryDraftPrompt = ref('')
const promptLibraryDraftCategory = ref('')
const promptLibraryDraftImageFile = ref<File | null>(null)
const promptLibraryDraftImageUrl = ref('')
const promptLibraryDraftRemoveImage = ref(false)
const promptLibraryDraftError = ref('')
const promptLibraryDraftSaving = ref(false)
const promptLibraryDetailsItem = ref<PromptLibraryOption | null>(null)
const selectedPromptLibraryOption = ref<PromptLibraryOption | null>(null)
const promptLibraryDetailsLightboxOpen = ref(false)
const promptLibraryDetailsLightboxScale = ref(1)
const promptDetailsParticles = ref<PromptDetailParticle[]>([])
const upstreamCompatibilityEnabled = ref(false)
const compatibilityPreviewOpen = ref(false)
const compatibilityPreviewOriginal = ref('')
const compatibilityPreviewPrompt = ref('')
const confirmedCompatibilityPrompt = ref('')
const autoCleanPlaceholders = ref(false)
const promptReplacementModalOpen = ref(false)
const promptReplacementMode = ref<'template' | 'smart'>('template')
const promptReplacementBaseText = ref('')
const promptReplacementItems = ref<PromptReplacementItem[]>([])
const selectedPromptReplacementItemId = ref('')
const promptReplacementError = ref('')
const super4kEnabled = ref(false)
const referenceImages = ref<string[]>([])
const REFERENCE_IMAGE_MAX_COUNT = 6
const REFERENCE_IMAGE_MAX_BYTES = 8 * 1024 * 1024
const referenceImageError = ref('')
const referencePreviewIndex = ref<number | null>(null)
const savedPromptLibraryItems = ref<ImageStudioPromptLibraryItem[]>([])
const promptLibraryUsesRemoteStorage = isImageStudioPromptLibraryRemoteEnabled()
let promptLibraryDetailsPreviewTimer: number | null = null
let promptLibraryLongPressTimer: number | null = null
let promptDetailsParticleId = 0
let promptDetailsParticleFrame = 0

function readSelectedPromptLibraryOptionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(PROMPT_LIBRARY_SELECTED_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function writeSelectedPromptLibraryOptionId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    if (id) {
      window.localStorage.setItem(PROMPT_LIBRARY_SELECTED_STORAGE_KEY, id)
    } else {
      window.localStorage.removeItem(PROMPT_LIBRARY_SELECTED_STORAGE_KEY)
    }
  } catch {
    /* ignore storage errors */
  }
}

function handleReferenceFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  referenceImageError.value = ''
  if (!files.length) return

  const remaining = REFERENCE_IMAGE_MAX_COUNT - referenceImages.value.length
  if (remaining <= 0) {
    referenceImageError.value = t('imageStudio.referenceImages.tooMany', { max: REFERENCE_IMAGE_MAX_COUNT })
    return
  }

  if (files.length > remaining) {
    referenceImageError.value = t('imageStudio.referenceImages.tooMany', { max: REFERENCE_IMAGE_MAX_COUNT })
  }

  files.slice(0, remaining).forEach((file) => {
    if (!file.type.startsWith('image/')) {
      referenceImageError.value = t('imageStudio.referenceImages.notImage')
      return
    }
    if (file.size > REFERENCE_IMAGE_MAX_BYTES) {
      referenceImageError.value = t('imageStudio.referenceImages.tooLarge', {
        max: Math.round(REFERENCE_IMAGE_MAX_BYTES / 1024 / 1024),
      })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result
      if (typeof dataUrl === 'string' && referenceImages.value.length < REFERENCE_IMAGE_MAX_COUNT) {
        referenceImages.value.push(dataUrl)
      }
    }
    reader.onerror = () => {
      referenceImageError.value = t('imageStudio.referenceImages.readFailed')
    }
    reader.readAsDataURL(file)
  })
}

function removeReferenceImage(index: number) {
  if (index >= 0 && index < referenceImages.value.length) {
    referenceImages.value.splice(index, 1)
    if (referencePreviewIndex.value !== null) {
      if (!referenceImages.value.length) {
        referencePreviewIndex.value = null
      } else if (referencePreviewIndex.value >= referenceImages.value.length) {
        referencePreviewIndex.value = referenceImages.value.length - 1
      }
    }
  }
  referenceImageError.value = ''
}

function clearReferenceImages() {
  referenceImages.value = []
  referencePreviewIndex.value = null
  referenceImageError.value = ''
}

const referencePreviewOpen = computed(() => referencePreviewIndex.value !== null)

const referencePreviewSrc = computed(() => {
  const index = referencePreviewIndex.value
  return index === null ? '' : referenceImages.value[index] || ''
})

const referencePreviewDisplayIndex = computed(() => (
  referencePreviewIndex.value === null ? 0 : referencePreviewIndex.value + 1
))

function openReferencePreview(index: number) {
  if (index >= 0 && index < referenceImages.value.length) {
    referencePreviewIndex.value = index
  }
}

function closeReferencePreview() {
  referencePreviewIndex.value = null
}

function stepReferencePreview(direction: -1 | 1) {
  if (referencePreviewIndex.value === null || referenceImages.value.length <= 1) {
    return
  }
  const next = referencePreviewIndex.value + direction
  referencePreviewIndex.value = (next + referenceImages.value.length) % referenceImages.value.length
}

const randomSeed = ref('')
const generating = ref(false)
const progress = ref(0)
let progressResetTimer: number | null = null
const generationAbort = ref<AbortController | null>(null)
const generationStartedAt = ref<number | null>(null)
const generationElapsedMs = ref(0)
const lastGenerationDurationMs = ref<number | null>(null)
const lastGenerationImageCount = ref(1)
const generationBatchProgress = ref<ImageStudioBatchProgress | null>(null)
const transientTiles = ref<ImageStudioWorkspaceTile[]>([])
type GenerationErrorKind = 'backend-unreachable' | 'generic'
type GenerationErrorDescription = {
  title: string
  message: string
  detail?: string
  rawMessage?: string
  kind: GenerationErrorKind
}
const generationError = ref<GenerationErrorDescription | null>(null)
const lightboxNaturalSize = ref<{ width: number; height: number } | null>(null)
const sessionStats = ref({
  successCount: 0,
  failureCount: 0,
  lastDurationMs: null as number | null,
  lastFailureMessage: '' as string,
  lastSuccessAt: null as number | null,
})
const testConnectionState = ref<{ kind: 'idle' | 'busy' | 'ok' | 'fail'; message?: string }>({ kind: 'idle' })
const undoableDelete = ref<{ snapshot: ImageStudioHistoryItem[]; count: number; kind: 'selected' | 'workspace'; expiresAt: number; timerId: number } | null>(null)
const undoableDeleteCountdown = ref(0)
const historyItems = ref<ImageStudioHistoryItem[]>([])
const workspaceTiles = ref<ImageStudioWorkspaceTile[]>([])
const selectedTileIds = ref<string[]>([])
const previewTileId = ref<string | null>(null)
const activeHistoryId = ref<string | null>(null)
let storagePersistenceWarningShown = false
const previewMode = ref<'original' | 'compare'>('original')
const previewLightboxOpen = ref(false)
const lightboxViewMode = ref<'natural' | 'fit'>('natural')
const lightboxMagnifierEnabled = ref(false)
const lightboxLensVisible = ref(false)
const lightboxLensX = ref(0)
const lightboxLensY = ref(0)
const lightboxLensBackgroundX = ref(0)
const lightboxLensBackgroundY = ref(0)
const lightboxLensBackgroundWidth = ref(0)
const lightboxLensBackgroundHeight = ref(0)
const lightboxZoom = ref(1)
const lightboxPanX = ref(0)
const lightboxPanY = ref(0)
const lightboxNaturalWidth = ref(0)
const lightboxNaturalHeight = ref(0)
const lightboxViewportWidth = ref(0)
const lightboxViewportHeight = ref(0)
const lightboxViewportOffsetX = ref(0)
const lightboxViewportOffsetY = ref(0)
const lightboxPointerDown = ref(false)
const lightboxPointerButton = ref<number | null>(null)
const lightboxDragStarted = ref(false)
const lightboxPointerStartX = ref(0)
const lightboxPointerStartY = ref(0)
const lightboxPanStartX = ref(0)
const lightboxPanStartY = ref(0)
const lightboxImmersive = ref(false)
const lightboxLongPressTimer = ref<number | null>(null)
const lightboxPendingPan = ref<{ x: number; y: number } | null>(null)
let lightboxPanFrame = 0
const LIGHTBOX_LONG_PRESS_MS = 420
const comparePosition = ref(50)
const compareViewMode = ref<'side-by-side' | 'slider'>('side-by-side')
const selectedStylePresetId = ref('default')
const avatarMenuOpen = ref(false)
const releasePanelOpen = ref(false)
const workspacePanelOpen = ref(false)
const releasePanelRef = ref<HTMLElement | null>(null)
const appearancePanelOpen = ref(false)
const appearancePanelRef = ref<HTMLElement | null>(null)
const connectionPanelOpen = ref(false)
const connectionPanelRef = ref<HTMLElement | null>(null)
const advancedPanelOpen = ref(false)
const advancedPanelRef = ref<HTMLElement | null>(null)
const promptHelperPanelOpen = ref(false)
const promptHelperPanelRef = ref<HTMLElement | null>(null)
const stylePanelOpen = ref(false)
const stylePanelRef = ref<HTMLElement | null>(null)
const qualityPanelOpen = ref(false)
const qualityPanelRef = ref<HTMLElement | null>(null)
const seedPanelOpen = ref(false)
const seedPanelRef = ref<HTMLElement | null>(null)
const promptLibraryCategoryMenuRef = ref<HTMLElement | null>(null)

const translateLang = ref<TranslateLang>('en')
const translating = ref(false)
const translateLanguages = computed(() => createTranslateLanguages(t))
const currentRelease = computed(() => createCurrentRelease(locale.value))

function toggleAvatarMenu() {
  avatarMenuOpen.value = !avatarMenuOpen.value
  if (avatarMenuOpen.value) {
    releasePanelOpen.value = false
    workspacePanelOpen.value = false
  }
}

function openReleasePanelFromAvatar() {
  avatarMenuOpen.value = false
  releasePanelOpen.value = true
  workspacePanelOpen.value = false
}

function openGitHubProject() {
  avatarMenuOpen.value = false
  window.open(GITHUB_PROJECT_URL, '_blank', 'noopener,noreferrer')
}

function openWorkspacePanelFromAvatar() {
  avatarMenuOpen.value = false
  releasePanelOpen.value = false
  workspacePanelOpen.value = true
}

const workspaceTokenLabel = computed(() => {
  const token = workspaceIdentity.token
  if (token.length <= 14) {
    return token ? '********' : ''
  }
  return `${token.slice(0, 6)}...${token.slice(-6)}`
})

async function copyWorkspaceId() {
  try {
    await navigator.clipboard.writeText(workspaceIdentity.id)
    appStore.showSuccess(locale.value === 'zh' ? '工作区 ID 已复制。' : 'Workspace ID copied.')
  } catch {
    appStore.showError(locale.value === 'zh' ? '复制工作区 ID 失败。' : 'Failed to copy workspace ID.')
  }
}

function exportWorkspaceIdentity() {
  const payload = {
    workspaceId: workspaceIdentity.id,
    workspaceToken: workspaceIdentity.token,
    exportedAt: new Date().toISOString(),
    note: 'Keep this file private. The token is used to restore or sync this workspace later.',
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  triggerBlobDownload(blob, `image-studio-workspace-${workspaceIdentity.id}.json`)
  appStore.showSuccess(locale.value === 'zh' ? '工作区身份已导出。' : 'Workspace identity exported.')
}

function translateLanguageName(code: TranslateLang): string {
  return getTranslateLanguageName(code)
}

async function translatePromptAction() {
  const text = resolvePromptTemplateArguments(prompt.value).trim()
  if (!text) {
    appStore.showWarning(t('imageStudio.toasts.promptRequired'))
    return
  }
  if (translating.value) return

  // Translation uses the SAME 提示词模型 (prompt helper) account the user
  // already configured for "优化提示词" / "随机灵感" — i.e. promptHelperConfig
  // (separate from the image-generation model). callPromptHelper throws a
  // clean error if the panel hasn't been filled in.
  if (!promptHelperConfigured.value) {
    appStore.showWarning(t('imageStudio.toasts.helperConfigure'))
    return
  }

  translating.value = true
  try {
    const targetLang = translateLanguageName(translateLang.value)
    const translated = await callPromptHelper([
      {
        role: 'system',
        content: `You are a translator. Translate the user's text into ${targetLang}. Output ONLY the translated text — no preamble, no quotes, no explanation. Preserve line breaks.`,
      },
      { role: 'user', content: text },
    ])
    if (!translated) {
      throw new Error(t('imageStudio.translate.emptyResponse'))
    }
    prompt.value = translated
    appStore.showSuccess(t('imageStudio.translate.success'))
  } catch (error) {
    const message = error instanceof Error ? error.message : t('imageStudio.translate.failure')
    appStore.showError(`${t('imageStudio.translate.failure')}: ${message}`)
  } finally {
    translating.value = false
  }
}

const PROMPT_HELPER_STORAGE_KEY = 'image-studio.prompt-helper'

interface PromptHelperConfig {
  baseUrl: string
  apiKey: string
  model: string
}

const PROMPT_HELPER_DEFAULTS: PromptHelperConfig = {
  baseUrl: '',
  apiKey: '',
  model: '',
}

const PROMPT_HELPER_MODEL_HINTS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4-turbo',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'gemini-2.0-flash',
  'deepseek-chat',
  'qwen-plus',
]

function loadPromptHelperConfig(): PromptHelperConfig {
  if (typeof window === 'undefined') return { ...PROMPT_HELPER_DEFAULTS }
  try {
    const raw = window.localStorage.getItem(PROMPT_HELPER_STORAGE_KEY)
    if (!raw) return { ...PROMPT_HELPER_DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<PromptHelperConfig>
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
    }
  } catch {
    return { ...PROMPT_HELPER_DEFAULTS }
  }
}

const promptHelperConfig = reactive<PromptHelperConfig>(loadPromptHelperConfig())

watch(
  promptHelperConfig,
  (value) => {
    try {
      window.localStorage.setItem(PROMPT_HELPER_STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* ignore storage errors */
    }
  },
  { deep: true }
)

const promptHelperConfigured = computed(() => (
  promptHelperConfig.baseUrl.trim() !== '' &&
  promptHelperConfig.apiKey.trim() !== '' &&
  promptHelperConfig.model.trim() !== ''
))

const promptHelperTriggerMeta = computed(() => {
  if (!promptHelperConfigured.value) return t('imageStudio.sidebar.helperMissing')
  return promptHelperConfig.model
})

const promptHelperModelValue = computed(() => promptHelperConfig.model.trim().toLowerCase())

const promptHelperUsesImageModel = computed(() => (
  /(?:gpt-image|dall[-_ ]?e|sora|flux|midjourney|stable[-_ ]?diffusion|sdxl)/i.test(promptHelperModelValue.value)
))

const promptHelperUsesStrongTextModel = computed(() => (
  /(?:gpt-4|gpt-4o|gpt-4\.1|o3|o4|claude|sonnet|opus|gemini|qwen|deepseek|kimi|glm|doubao)/i.test(promptHelperModelValue.value)
))

const promptHelperQualityWarning = computed(() => (
  !!promptHelperModelValue.value && promptHelperUsesImageModel.value
))

const promptHelperQualityHint = computed(() => {
  if (!promptHelperConfigured.value) {
    return t('imageStudio.sidebar.helperQualityMissing')
  }
  if (
    promptHelperModelProbeState.value.kind === 'ok' &&
    detectedPromptHelperModels.value.length > 0 &&
    promptHelperConfig.model.trim() &&
    !detectedPromptHelperModels.value.includes(promptHelperConfig.model.trim())
  ) {
    return t('imageStudio.sidebar.helperModelNotDetected')
  }
  if (promptHelperUsesImageModel.value) {
    return t('imageStudio.sidebar.helperQualityImageModel')
  }
  if (promptHelperUsesStrongTextModel.value) {
    return t('imageStudio.sidebar.helperQualityStrong')
  }
  return t('imageStudio.sidebar.helperQualityGeneric')
})

const promptHelperModelHints = computed(() => Array.from(new Set([
  ...detectedPromptHelperModels.value,
  ...PROMPT_HELPER_MODEL_HINTS,
])))

const promptHelperProbeHint = computed(() => {
  if (detectingPromptHelperModels.value || promptHelperModelProbeState.value.kind === 'busy') {
    return t('imageStudio.sidebar.helperModelDetecting')
  }
  if (promptHelperModelProbeState.value.kind === 'ok') {
    const count = promptHelperModelProbeState.value.count || detectedPromptHelperModels.value.length
    return count > 0
      ? t('imageStudio.sidebar.helperModelDetected', { count })
      : t('imageStudio.sidebar.helperModelProbeNoModels')
  }
  if (promptHelperModelProbeState.value.kind === 'fail') {
    return promptHelperModelProbeState.value.message || t('imageStudio.sidebar.helperModelProbeFailed')
  }
  return t('imageStudio.sidebar.helperModelHint')
})

function resetPromptHelperConfig() {
  promptHelperConfig.baseUrl = ''
  promptHelperConfig.apiKey = ''
  promptHelperConfig.model = ''
  detectedPromptHelperModels.value = []
  promptHelperModelProbeState.value = { kind: 'idle' }
}

const promptHelperBusy = ref<'optimize' | 'inspire' | 'compatibility' | 'template' | null>(null)

async function callPromptHelper(messages: PromptHelperChatMessage[], signal?: AbortSignal): Promise<string> {
  const baseUrl = promptHelperConfig.baseUrl.trim().replace(/\/+$/, '')
  const apiKey = promptHelperConfig.apiKey.trim()
  const model = promptHelperConfig.model.trim()
  if (!baseUrl || !apiKey || !model) {
    throw new Error(t('imageStudio.sidebar.helperMissing'))
  }
  const content = await callImageStudioPromptHelper({
    baseUrl,
    apiKey,
    model,
    messages,
    temperature: 0.85,
    maxTokens: 600,
  }, signal)
  if (!content) {
    throw new Error(t('imageStudio.toasts.helperEmpty'))
  }
  return content
}

const workbenchSurfaceRef = ref<HTMLElement | null>(null)
const workbenchSurfaceMaxHeight = ref('')
const lightboxStageRef = ref<HTMLElement | null>(null)
const lightboxFrameRef = ref<HTMLElement | null>(null)
const lightboxImageRef = ref<HTMLImageElement | null>(null)
const workbenchSelectionActive = ref(false)
const workbenchSelectionAppend = ref(false)
const workbenchSelectionBaseIds = ref<string[]>([])
const workbenchSelectionStartX = ref(0)
const workbenchSelectionStartY = ref(0)
const workbenchSelectionCurrentX = ref(0)
const workbenchSelectionCurrentY = ref(0)
const workbenchDragTileId = ref<string | null>(null)
const workbenchDropTileId = ref<string | null>(null)
const workbenchIgnoreClickUntil = ref(0)
const sub2apiBaseUrl = new URL('/api/v1', window.location.origin).toString()
const sub2apiUsage = ref<ImageStudioUsageResponse | null>(null)
const sub2apiUsageLoading = ref(false)
const sub2apiUsageError = ref('')
const chatgpt2ApiQuota = ref<ImageStudioChatgpt2ApiImageQuota | null>(null)
const chatgpt2ApiQuotaLoading = ref(false)
const chatgpt2ApiQuotaError = ref('')
const workbenchTileElements = new Map<string, HTMLElement>()

const providerModes = computed(() => createProviderModes(t))
const themeModeOptions = computed(() => createThemeModeOptions(t))
const accentOptions = computed(() => createAccentOptions(t))
const textureOptions = computed(() => createTextureOptions(t))

const tooltipStyleSectionLabel = computed(() => (
  locale.value === 'zh' ? '文字提示' : 'Text tooltip'
))

const tooltipStyleOptions = computed(() => createTooltipStyleOptions(locale.value))

const studioTitleTooltipResolvedStyle = computed(() => {
  const accent = accentPalette[studioAppearance.accentTone]
  const radius = Math.min(24, Math.max(0, studioAppearance.radiusScale))
  const tooltipRadius = radius === 0 ? 0 : Math.max(10, radius - 1)
  const outlineText = studioAppearance.accentTone === 'blue'
    ? `color-mix(in srgb, #1e293b 72%, ${accent.deep} 28%)`
    : accent.deep
  return {
    ...studioTitleTooltipStyle.value,
    '--tooltip-accent': accent.color,
    '--tooltip-accent-deep': accent.deep,
    '--tooltip-accent-rgb': accent.rgb,
    '--tooltip-accent-soft': accent.soft,
    '--tooltip-outline-text': outlineText,
    '--studio-radius-control': `${tooltipRadius}px`,
  }
})


const studioAppearanceStyle = computed(() => {
  const accent = accentPalette[studioAppearance.accentTone]
  const radius = Math.min(24, Math.max(0, studioAppearance.radiusScale))
  const radiusOrZero = (value: number) => radius === 0 ? 0 : value

  return {
    '--studio-accent': accent.color,
    '--studio-accent-deep': accent.deep,
    '--studio-accent-soft': accent.soft,
    '--studio-border-strong': accent.ring,
    '--studio-accent-shadow': accent.shadow,
    '--theme-color': accent.color,
    '--theme-color-rgb': accent.rgb,
    '--theme-text-on-primary': '#ffffff',
    '--studio-radius-window': `${radiusOrZero(radius + 8)}px`,
    '--studio-radius-panel': `${radiusOrZero(radius + 2)}px`,
    '--studio-radius-control': `${radiusOrZero(Math.max(10, radius - 1))}px`,
    '--studio-radius-soft': `${radiusOrZero(Math.max(8, radius - 5))}px`,
    '--studio-radius-image': `${radiusOrZero(radius + 4)}px`,
  } as Record<string, string>
})

const studioModalThemeStyle = computed(() => {
  const accent = accentPalette[studioAppearance.accentTone]
  const isNight = studioAppearance.themeMode === 'night'
  const radius = Math.min(24, Math.max(0, studioAppearance.radiusScale))
  const radiusOrZero = (value: number) => radius === 0 ? 0 : value

  return {
    '--studio-accent': accent.color,
    '--studio-accent-deep': accent.deep,
    '--studio-accent-soft': accent.soft,
    '--studio-border-strong': accent.ring,
    '--studio-accent-shadow': accent.shadow,
    '--theme-color': accent.color,
    '--theme-color-rgb': accent.rgb,
    '--theme-text-on-primary': '#ffffff',
    '--studio-card-background': isNight ? 'rgba(24, 26, 34, 0.94)' : 'rgba(255, 255, 255, 0.66)',
    '--studio-soft-background': isNight ? 'rgba(17, 19, 27, 0.90)' : 'rgba(248, 250, 252, 0.58)',
    '--studio-text': isNight ? '#e5eefc' : '#111827',
    '--studio-muted': isNight ? '#a9b5c7' : '#64748b',
    '--studio-border': isNight ? 'rgba(255, 255, 255, 0.10)' : 'rgba(31, 41, 55, 0.08)',
    '--studio-radius-window': `${radiusOrZero(radius + 8)}px`,
    '--studio-radius-panel': `${radiusOrZero(radius + 2)}px`,
    '--studio-radius-control': `${radiusOrZero(Math.max(10, radius - 1))}px`,
    '--studio-radius-soft': `${radiusOrZero(Math.max(8, radius - 5))}px`,
    '--studio-radius-image': `${radiusOrZero(radius + 4)}px`,
    '--modal-glass-bg': isNight ? 'rgba(24, 26, 34, 0.94)' : 'rgba(255, 255, 255, 0.68)',
    '--modal-glass-head': isNight ? 'rgba(24, 26, 34, 0.90)' : 'rgba(255, 255, 255, 0.54)',
    '--modal-glass-veil': isNight ? 'rgba(7, 10, 18, 0.72)' : 'rgba(247, 249, 252, 0.54)',
  } as Record<string, string>
})

const GLOBAL_STUDIO_APPEARANCE_VARS = [
  '--studio-accent',
  '--studio-accent-deep',
  '--studio-accent-soft',
  '--studio-border-strong',
  '--studio-accent-shadow',
  '--theme-color',
  '--theme-color-rgb',
  '--theme-text-on-primary',
  '--studio-radius-window',
  '--studio-radius-panel',
  '--studio-radius-control',
  '--studio-radius-soft',
  '--studio-radius-image',
] as const

function syncDocumentStudioAppearance(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.dataset.studioTheme = studioAppearance.themeMode
  Object.entries(studioAppearanceStyle.value).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  window.dispatchEvent(new CustomEvent('image-studio-appearance-changed', {
    detail: {
      themeMode: studioAppearance.themeMode,
      radiusScale: studioAppearance.radiusScale,
      style: studioAppearanceStyle.value,
    },
  }))
}

function clearDocumentStudioAppearance(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  delete root.dataset.studioTheme
  GLOBAL_STUDIO_APPEARANCE_VARS.forEach((key) => {
    root.style.removeProperty(key)
  })
}

const stopDocumentStudioAppearanceSync = typeof window !== 'undefined'
  ? watch(studioAppearance, syncDocumentStudioAppearance, { deep: true, immediate: true })
  : undefined

const compatibilityProfiles = computed(() => createCompatibilityProfiles(t))

const selectedCompatibilityProfileDescription = computed(() => (
  compatibilityProfiles.value.find((option) => option.value === preferences.profile)?.description
  || t('imageStudio.hints.external')
))

const selectedExternalModelLooksLikeImageApi = computed(() => (
  /^gpt-image(?:[-.\w]*)?$/i.test(preferences.model.trim()) ||
  detectedImageModels.value.some((modelId) => /^gpt-image(?:[-.\w]*)?$/i.test(modelId))
))

const externalProfileWarning = computed(() => {
  if (preferences.providerMode === 'sub2api' || preferences.profile !== 'sub2api-sora-compatible') {
    return ''
  }
  if (!selectedExternalModelLooksLikeImageApi.value) {
    return ''
  }
  return locale.value === 'zh'
    ? '检测到 gpt-image 图片模型。这个上游通常应选择“OpenAI 图片接口”，否则会请求 /chat/completions 并导致 404 或无图片。'
    : 'A gpt-image model was detected. This upstream usually needs the OpenAI Images API; otherwise /chat/completions may return 404 or no image.'
})

function switchExternalProfileToOpenAIImageApi() {
  preferences.profile = 'openai-image-api'
}

function activeImageProbeProfile(): ImageStudioProtocolProfile {
  return isCurrentSiteChatgpt2Api.value ? 'chatgpt2api' : preferences.profile
}

const currentSiteProfileOptions = computed(() => createCurrentSiteProfileOptions(t))

const isCurrentSiteChatgpt2Api = computed(() => (
  preferences.providerMode === 'sub2api' && preferences.currentSiteProfile === 'chatgpt2api'
))

const isGptImagePlaygroundMode = computed(() => preferences.providerMode === 'gpt-image-playground')

const externalImageControlsVisible = computed(() => (
  preferences.providerMode !== 'sub2api' || isCurrentSiteChatgpt2Api.value
))

const currentSiteBaseUrl = computed(() => {
  const custom = preferences.currentSiteBaseUrl.trim()
  if (custom) {
    return custom.replace(/\/+$/, '')
  }
  return isCurrentSiteChatgpt2Api.value
    ? new URL('/v1', window.location.origin).toString().replace(/\/+$/, '')
    : sub2apiBaseUrl
})

const currentSiteEndpointPlaceholder = computed(() => (
  isCurrentSiteChatgpt2Api.value
    ? new URL('/v1', window.location.origin).toString()
    : sub2apiBaseUrl
))

const currentSiteProfileDescription = computed(() => (
  currentSiteProfileOptions.value.find((option) => option.value === preferences.currentSiteProfile)?.description || ''
))

const currentSiteKeyLabel = computed(() => (
  isCurrentSiteChatgpt2Api.value
    ? t('imageStudio.fields.currentSiteKeyChatgpt2api')
    : t('imageStudio.fields.currentSiteKeySub2api')
))

const currentSiteKeyPlaceholder = computed(() => (
  isCurrentSiteChatgpt2Api.value
    ? t('imageStudio.placeholders.currentSiteKeyChatgpt2api')
    : t('imageStudio.placeholders.currentSiteKeySub2api')
))

const currentSiteKeyHint = computed(() => (
  isCurrentSiteChatgpt2Api.value
    ? t('imageStudio.hints.currentSiteKeyChatgpt2api')
    : t('imageStudio.hints.currentSiteKeySub2api')
))

function aspectChipLabel(value: string): string {
  return value === 'default' ? t('imageStudio.settings.defaultLabel') : value
}

const aspectOptions = [
  { value: 'default', frameClass: 'is-default' },
  { value: '1:1', frameClass: 'is-square' },
  { value: '16:9', frameClass: 'is-wide' },
  { value: '9:16', frameClass: 'is-tall' },
  { value: '4:3', frameClass: 'is-classic' },
  { value: '3:4', frameClass: 'is-portrait' },
  { value: '21:9', frameClass: 'is-cinema' },
  { value: '3:2', frameClass: 'is-photo' },
  { value: '2:3', frameClass: 'is-book' },
]

const builtinAspectValues = new Set(aspectOptions.map((option) => option.value))
const customRatioModalOpen = ref(false)
const customRatioWidth = ref('2')
const customRatioHeight = ref('3')
const isCustomAspectRatio = computed(() => !builtinAspectValues.has(preferences.aspectRatio))
const customRatioChipLabel = computed(() => (
  isCustomAspectRatio.value ? preferences.aspectRatio : t('imageStudio.settings.customRatio')
))

const supportsCustomResolution = computed(() => externalImageControlsVisible.value)

function resolveGptImage2StandardSize(aspectRatio: string): string {
  switch (aspectRatio.trim()) {
    case '1:1':
      return '1024x1024'
    case '16:9':
    case '21:9':
    case '4:3':
    case '3:2':
    case '5:4':
      return '1792x1024'
    case '9:16':
    case '3:4':
    case '2:3':
    case '4:5':
      return '1024x1792'
    default:
      return ''
  }
}

const usesGptImage2SizeProfile = computed(() => /(^|[/:])gpt-image-2$/i.test(preferences.model.trim()))

function resolveNativeFourKSize(aspectRatio: string): string {
  const parsed = parseAspectRatioValue(aspectRatio)
  if (!parsed || Math.max(parsed.width, parsed.height) / Math.min(parsed.width, parsed.height) > 3) {
    return ''
  }
  return resolveImageStudioSize(aspectRatio, undefined, '4k')
}

function resolveWorkspaceImageSize(preset: ImageStudioResolutionPreset): string {
  if (isGptImagePlaygroundMode.value) {
    const tier = preset === '2k' ? '2K' : preset === '4k' ? '4K' : '1K'
    return calculateGptImagePlaygroundSize(tier, preferences.aspectRatio)
  }
  if (preset === '4k') {
    return resolveNativeFourKSize(preferences.aspectRatio)
  }
  if (preset === 'standard' && usesGptImage2SizeProfile.value) {
    return resolveGptImage2StandardSize(preferences.aspectRatio)
  }
  return resolveImageStudioSize(preferences.aspectRatio, undefined, preset)
}

function parseAspectRatioValue(value: string): { width: number; height: number } | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(value)
  if (!match) {
    return null
  }
  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  return { width, height }
}

const SUPER_4K_LONG_EDGE = 5120

function roundToMultiple(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step)
}

function resolveLongEdgeImageSize(aspectRatio: string, longEdge: number): string {
  const parsed = parseAspectRatioValue(aspectRatio)
  if (!parsed) {
    return ''
  }
  if (Math.max(parsed.width, parsed.height) / Math.min(parsed.width, parsed.height) > 3) {
    return ''
  }
  if (parsed.width === parsed.height) {
    return `${longEdge}x${longEdge}`
  }
  if (parsed.width > parsed.height) {
    return `${longEdge}x${roundToMultiple((longEdge * parsed.height) / parsed.width, 16)}`
  }
  return `${roundToMultiple((longEdge * parsed.width) / parsed.height, 16)}x${longEdge}`
}

function resolveSuperFourKSize(aspectRatio: string): string {
  return resolveLongEdgeImageSize(aspectRatio, SUPER_4K_LONG_EDGE)
}

const native4kSize = computed(() => resolveWorkspaceImageSize('4k'))
const localUpscaleAllowed = computed(() => (
  !isGptImagePlaygroundMode.value &&
  (preferences.providerMode !== 'external-relay' || preferences.externalRelayLocalUpscale)
))
const super4kAvailable = computed(() => localUpscaleAllowed.value && !!resolveSuperFourKSize(preferences.aspectRatio))
const super4kTargetSize = computed(() => (
  super4kEnabled.value && super4kAvailable.value ? resolveSuperFourKSize(preferences.aspectRatio) : ''
))

const super4kTitle = computed(() => {
  if (!super4kAvailable.value) {
    return t('imageStudio.promptPanel.super4kNeedsRatio')
  }
  return super4kEnabled.value
    ? t('imageStudio.promptPanel.super4kOn', { size: super4kTargetSize.value })
    : t('imageStudio.promptPanel.super4kOff')
})

watch(super4kAvailable, (available) => {
  if (!available && super4kEnabled.value) {
    super4kEnabled.value = false
  }
})

function toggleSuper4k() {
  if (!super4kEnabled.value && !super4kAvailable.value) {
    appStore.showWarning(t('imageStudio.promptPanel.super4kNeedsRatio'))
    return
  }
  super4kEnabled.value = !super4kEnabled.value
}

const resolutionOptions = computed(() => {
  const buildOption = (
    value: ImageStudioResolutionPreset,
    labelKey: string,
    descriptionKey: string
  ) => ({
    value,
    label: t(labelKey),
    description: t(descriptionKey),
    size: resolveWorkspaceImageSize(value),
  })

  return [
    buildOption('standard', 'imageStudio.resolutionPresets.standard', 'imageStudio.resolutionDescriptions.standard'),
    buildOption('2k', 'imageStudio.resolutionPresets.twoK', 'imageStudio.resolutionDescriptions.twoK'),
    buildOption('4k', 'imageStudio.resolutionPresets.fourK', 'imageStudio.resolutionDescriptions.fourK'),
  ]
})

const qualityOptions = computed(() => createQualityOptions(t))

const activeQualityLabel = computed(() => (
  qualityOptions.value.find((option) => option.value === preferences.quality)?.label
    || t('imageStudio.fields.quality')
))

const backgroundOptions = computed(() => createBackgroundOptions(t))
const formatOptions = computed(() => createFormatOptions(t))

const quickCountOptions = [1, 2, 3, 4, 5]

const promptChips = computed(() => getPromptChips(locale.value))
const inspirationPrompts = computed(() => getInspirationPrompts(locale.value))
const stylePresets = computed<StylePresetOption[]>(() => getStylePresets(locale.value))

const builtinPromptLibraryOptions = computed<PromptLibraryOption[]>(() => stylePresets.value.map((preset) => ({
  id: `builtin-${preset.id}`,
  title: preset.title,
  description: preset.subtitle,
  prompt: preset.promptHint || preset.title,
  imageUrl: `/style-presets/${preset.id}.png`,
  category: t('imageStudio.promptWorkspace.builtinSource'),
})))

const promptLibraryOptions = computed<PromptLibraryOption[]>(() => [
  ...savedPromptLibraryItems.value.map((item) => ({
    id: item.id,
    title: item.title || t('imageStudio.promptWorkspace.uploadedPrompt'),
    description: item.description || t('imageStudio.promptWorkspace.localStorage'),
    prompt: item.prompt,
    imageUrl: item.imageUrl,
    category: item.category || t('imageStudio.promptWorkspace.uploadedSource'),
  })),
  ...builtinPromptLibraryOptions.value,
])

function restoreSelectedPromptLibraryOption(): void {
  const storedId = readSelectedPromptLibraryOptionId()
  if (!storedId) return
  const match = promptLibraryOptions.value.find((option) => option.id === storedId)
  if (match) {
    selectedPromptLibraryOption.value = match
  }
}

const defaultPromptLibraryCategories = computed<PromptLibraryCategoryOption[]>(() => [
  { value: 'all', label: '全部分类', icon: 'grid', defaultTag: true },
  { value: t('imageStudio.promptWorkspace.uploadedSource'), label: t('imageStudio.promptWorkspace.uploadedSource'), icon: 'upload' },
  { value: t('imageStudio.promptWorkspace.builtinSource'), label: t('imageStudio.promptWorkspace.builtinSource'), icon: 'book' },
])

const customPromptLibraryCategories = computed<PromptLibraryCategoryOption[]>(() => {
  const defaultValues = new Set(defaultPromptLibraryCategories.value.map((category) => category.value))
  const uploadedCategories = savedPromptLibraryItems.value
    .map((item) => item.category?.trim())
    .filter((category): category is string => !!category && !defaultValues.has(category))

  const categories = Array.from(new Set(uploadedCategories))
  const fallbackCategories = categories.length ? categories : ['角色模型', '场景资产']

  return fallbackCategories.map((category, index) => ({
    value: category,
    label: category,
    icon: (index % 2 === 0 ? 'userCircle' : 'cube') as PromptLibraryCategoryIcon,
  }))
})

const activePromptLibraryCategoryLabel = computed(() => {
  if (promptLibraryCategory.value === 'all') {
    return '全部分类'
  }

  const category = [
    ...defaultPromptLibraryCategories.value,
    ...customPromptLibraryCategories.value,
  ].find((item) => item.value === promptLibraryCategory.value)

  return category?.label || promptLibraryCategory.value
})

const promptLibraryCategoryQuery = computed(() => promptLibraryCategorySearch.value.trim().toLowerCase())

function matchesPromptLibraryCategoryQuery(category: PromptLibraryCategoryOption): boolean {
  const query = promptLibraryCategoryQuery.value
  if (!query) return true
  return category.label.toLowerCase().includes(query)
}

const filteredDefaultPromptLibraryCategories = computed(() => (
  defaultPromptLibraryCategories.value.filter(matchesPromptLibraryCategoryQuery)
))

const filteredCustomPromptLibraryCategories = computed(() => (
  customPromptLibraryCategories.value.filter(matchesPromptLibraryCategoryQuery)
))

const filteredPromptLibraryOptions = computed(() => {
  const query = promptLibrarySearch.value.trim().toLowerCase()
  return promptLibraryOptions.value.filter((option) => {
    const categoryMatched = promptLibraryCategory.value === 'all' || option.category === promptLibraryCategory.value
    if (!categoryMatched) return false
    if (!query) return true
    return (
      option.title.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.prompt.toLowerCase().includes(query)
    )
  })
})

const selectedPromptTemplateTitle = computed(() => (
  selectedPromptLibraryOption.value?.title || t('imageStudio.promptWorkspace.noTemplateSelected')
))

const selectedPromptTemplateCategory = computed(() => (
  selectedPromptLibraryOption.value?.category || t('imageStudio.promptWorkspace.waitingForTemplate')
))

const selectedPromptTemplateDescription = computed(() => (
  selectedPromptLibraryOption.value?.description
  || t('imageStudio.promptWorkspace.templateImagePlaceholder')
))

const promptTemplateArgumentItems = computed(() => (
  parsePromptArgumentItems(prompt.value, t('imageStudio.promptReplacements.slot'))
))
const promptTemplateArgumentCount = computed(() => promptTemplateArgumentItems.value.length)

const promptReplacementButtonTitle = computed(() => (
  promptTemplateArgumentCount.value
    ? t('imageStudio.promptPanel.replacementEditorWithCount', { count: promptTemplateArgumentCount.value })
    : t('imageStudio.promptPanel.replacementEditorSmart')
))

const promptReplacementSubtitle = computed(() => (
  promptReplacementMode.value === 'template'
    ? t('imageStudio.promptReplacements.templateSubtitle')
    : t('imageStudio.promptReplacements.smartSubtitle')
))

const promptReplacementModeLabel = computed(() => (
  promptReplacementMode.value === 'template'
    ? t('imageStudio.promptReplacements.templateMode')
    : t('imageStudio.promptReplacements.smartMode')
))

const selectedPromptReplacementItem = computed(() => (
  promptReplacementItems.value.find((item) => item.id === selectedPromptReplacementItemId.value)
  || promptReplacementItems.value[0]
  || null
))

const selectedPromptReplacementPositionLabel = computed(() => {
  const total = promptReplacementItems.value.length
  if (!total) {
    return ''
  }
  const index = promptReplacementItems.value.findIndex((item) => item.id === selectedPromptReplacementItem.value?.id)
  return `${Math.max(0, index) + 1}/${total}`
})

const promptReplacementSegments = computed<PromptReplacementSegment[]>(() => {
  const text = promptReplacementBaseText.value || prompt.value
  if (!text) {
    return []
  }

  return buildPromptReplacementSegments(text, promptReplacementItems.value)
})

const promptReplacementPreview = computed(() => {
  const item = selectedPromptReplacementItem.value
  const text = promptReplacementBaseText.value || prompt.value
  if (!item || !text) {
    return { before: '', hit: '', after: '' }
  }
  const target = resolvePromptReplacementTarget(item, text, text === promptReplacementBaseText.value)
  const start = target?.start ?? Math.max(0, item.start)
  const end = target?.end ?? Math.min(text.length, item.end)
  const hit = target?.text || text.slice(start, end) || item.source
  const contextSize = 90
  const beforeStart = Math.max(0, start - contextSize)
  const afterEnd = Math.min(text.length, end + contextSize)
  return {
    before: `${beforeStart > 0 ? '...' : ''}${text.slice(beforeStart, start)}`,
    hit,
    after: `${text.slice(end, afterEnd)}${afterEnd < text.length ? '...' : ''}`,
  }
})

const promptLibraryUploadSubtitle = computed(() => {
  if (promptLibraryDraftMode.value === 'edit') {
    return locale.value === 'zh'
      ? '修改你上传的预览图、标题、描述、提示词和分类。'
      : 'Update the preview image, title, description, prompt, and category you uploaded.'
  }
  if (promptLibraryUsesRemoteStorage) {
    return locale.value === 'zh'
      ? '保存到 CF 云端提示词库，预览图、标题、描述、提示词和分类会同步存储。'
      : 'Save to the Cloudflare prompt library with preview image, title, description, prompt, and category.'
  }
  return locale.value === 'zh'
    ? '本地保存预览图、标题、描述、提示词和分类。'
    : 'Save the preview image, title, description, prompt, and category locally.'
})

const promptLibrarySaveButtonLabel = computed(() => {
  if (promptLibraryDraftSaving.value) {
    return locale.value === 'zh' ? '保存中...' : 'Saving...'
  }
  if (promptLibraryDraftMode.value === 'edit') {
    return locale.value === 'zh' ? '保存修改' : 'Save Changes'
  }
  if (promptLibraryUsesRemoteStorage) {
    return locale.value === 'zh' ? '保存到云端' : 'Save to Cloud'
  }
  return t('imageStudio.promptWorkspace.saveLocalPrompt')
})

const selectedPromptTemplateImage = computed(() => (
  selectedPromptLibraryOption.value?.imageUrl
  || ''
))

function activeApiKeyValue(): string {
  return preferences.providerMode === 'sub2api'
    ? sub2apiApiKey.value.trim()
    : externalApiKey.value.trim()
}

function activeApiEndpointValue(): string {
  if (preferences.providerMode === 'sub2api') {
    return preferences.currentSiteProfile === 'chatgpt2api'
      ? currentSiteBaseUrl.value
      : sub2apiBaseUrl
  }
  return preferences.externalBaseUrl.trim()
}

function endpointHostLabel(value: string): string {
  try {
    return new URL(value).host
  } catch {
    return value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') || value
  }
}

function normalizeApiEndpointValue(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase()
}

function apiPresetEndpointValue(preset: ImageStudioApiPreset): string {
  if (preset.providerMode === 'sub2api') {
    return preset.currentSiteProfile === 'chatgpt2api'
      ? preset.currentSiteBaseUrl
      : sub2apiBaseUrl
  }
  return preset.externalBaseUrl
}

const apiPresetSuggestedName = computed(() => {
  const endpoint = endpointHostLabel(activeApiEndpointValue())
  const mode = providerLabel(preferences.providerMode)
  return [mode, endpoint || preferences.model].filter(Boolean).join(' / ')
})

function refreshApiPresets() {
  apiPresets.value = listImageStudioApiPresets()
}

function apiPresetSummary(preset: ImageStudioApiPreset): string {
  const endpoint = apiPresetEndpointValue(preset)
  return [
    providerLabel(preset.providerMode),
    endpointHostLabel(endpoint),
    preset.model,
    maskImageStudioApiKey(preset.apiKey),
  ].filter(Boolean).join(' · ')
}

function isApiPresetActive(preset: ImageStudioApiPreset): boolean {
  return (
    preset.providerMode === preferences.providerMode &&
    preset.profile === preferences.profile &&
    normalizeApiEndpointValue(apiPresetEndpointValue(preset)) === normalizeApiEndpointValue(activeApiEndpointValue()) &&
    preset.apiKey.trim() === activeApiKeyValue() &&
    preset.model.trim() === preferences.model.trim()
  )
}

function saveCurrentApiPreset() {
  const apiKey = activeApiKeyValue()
  if (!apiKey) {
    appStore.showWarning(locale.value === 'zh' ? '先填写当前通道的 API Key。' : 'Enter the API key for the current channel first.')
    return
  }

  try {
    const saved = saveImageStudioApiPreset({
      name: apiPresetDraftName.value.trim() || apiPresetSuggestedName.value || (locale.value === 'zh' ? '未命名通道' : 'Untitled channel'),
      providerMode: preferences.providerMode,
      profile: preferences.profile,
      currentSiteProfile: preferences.currentSiteProfile,
      currentSiteBaseUrl: preferences.currentSiteBaseUrl,
      externalBaseUrl: preferences.externalBaseUrl,
      apiKey,
      model: preferences.model,
      externalRelayLocalUpscale: preferences.externalRelayLocalUpscale,
    })
    apiPresetDraftName.value = ''
    refreshApiPresets()
    appStore.showSuccess(locale.value === 'zh' ? `已保存通道：${saved.name}` : `Saved channel: ${saved.name}`)
  } catch {
    appStore.showError(locale.value === 'zh'
      ? '通道预设保存失败，请检查浏览器本地存储权限或可用空间。'
      : 'Failed to save the channel preset. Check browser local storage permissions or free space.')
  }
}

function applyApiPreset(preset: ImageStudioApiPreset) {
  preferences.providerMode = preset.providerMode
  preferences.currentSiteProfile = preset.currentSiteProfile
  preferences.currentSiteBaseUrl = preset.currentSiteBaseUrl
  preferences.externalBaseUrl = preset.externalBaseUrl || preferences.externalBaseUrl
  preferences.profile = preset.profile
  preferences.model = preset.model || preferences.model
  preferences.externalRelayLocalUpscale = preset.externalRelayLocalUpscale

  if (preset.providerMode === 'sub2api') {
    sub2apiApiKey.value = preset.apiKey
  } else {
    externalApiKey.value = preset.apiKey
  }

  appStore.showSuccess(locale.value === 'zh' ? `已应用通道：${preset.name}` : `Applied channel: ${preset.name}`)
}

function removeApiPreset(preset: ImageStudioApiPreset) {
  try {
    deleteImageStudioApiPreset(preset.id)
    refreshApiPresets()
    appStore.showSuccess(locale.value === 'zh' ? '已删除通道预设。' : 'Channel preset deleted.')
  } catch {
    appStore.showError(locale.value === 'zh'
      ? '通道预设删除失败，请检查浏览器本地存储权限。'
      : 'Failed to delete the channel preset. Check browser local storage permissions.')
  }
}

function openPromptReplacementModal() {
  if (!prompt.value.trim()) {
    appStore.showWarning(t('imageStudio.toasts.promptRequired'))
    return
  }

  const templateItems = parsePromptArgumentItems(prompt.value, t('imageStudio.promptReplacements.slot'))
  promptReplacementBaseText.value = prompt.value
  promptReplacementItems.value = templateItems
  promptReplacementMode.value = templateItems.length ? 'template' : 'smart'
  selectedPromptReplacementItemId.value = templateItems[0]?.id || ''
  promptReplacementError.value = ''
  promptReplacementModalOpen.value = true
}

function closePromptReplacementModal() {
  promptReplacementModalOpen.value = false
  promptReplacementError.value = ''
}

function selectPromptReplacementItem(id: string) {
  selectedPromptReplacementItemId.value = id
}

function resetSelectedPromptReplacement() {
  const item = selectedPromptReplacementItem.value
  if (!item) {
    return
  }
  item.replacement = item.source
}

function stripJsonCodeFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function parsePromptHelperJson(value: string): unknown {
  const cleaned = stripJsonCodeFence(value)
  try {
    return JSON.parse(cleaned)
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0])
    }
    const objectMatch = cleaned.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      return JSON.parse(objectMatch[0])
    }
    throw new Error(t('imageStudio.promptReplacements.smartParseFailed'))
  }
}

async function analyzePromptReplacementItems() {
  if (promptHelperBusy.value) {
    return
  }
  const baseText = (promptReplacementBaseText.value || prompt.value).trim()
  if (!baseText) {
    appStore.showWarning(t('imageStudio.toasts.promptRequired'))
    return
  }
  if (!promptHelperConfigured.value) {
    promptReplacementError.value = t('imageStudio.toasts.helperConfigure')
    appStore.showWarning(t('imageStudio.toasts.helperConfigure'))
    return
  }

  promptHelperBusy.value = 'template'
  promptReplacementError.value = ''
  promptReplacementBaseText.value = prompt.value
  const localeHint = locale.value === 'zh' ? '中文' : 'English'
  const systemPrompt = [
    'You identify editable spans in text-to-image prompts.',
    `Return JSON only, in ${localeHint}.`,
    'Schema: {"items":[{"label":"short field name","original":"exact substring copied from the prompt","replacement":"same text by default"}]}',
    'Pick 3-8 concise, useful editable spans such as subject, scene, outfit, action, style, lighting, camera, color, or mood.',
    'The original value must be an exact contiguous substring from the prompt.',
    'Do not rewrite the whole prompt. Do not include explanations or markdown.',
  ].join('\n')
  const userMessage = `Prompt:\n${promptReplacementBaseText.value}`

  try {
    const result = await callPromptHelper([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ])
    const parsed = parsePromptHelperJson(result)
    const items = normalizeSmartReplacementItems(
      parsed,
      promptReplacementBaseText.value,
      t('imageStudio.promptReplacements.slot'),
    )
    if (!items.length) {
      promptReplacementError.value = t('imageStudio.promptReplacements.noSmartItems')
      return
    }
    promptReplacementItems.value = items
    promptReplacementMode.value = 'smart'
    selectedPromptReplacementItemId.value = items[0].id
  } catch (error) {
    promptReplacementError.value = error instanceof Error
      ? error.message
      : t('imageStudio.toasts.helperFailed')
  } finally {
    promptHelperBusy.value = null
  }
}

function applyPromptReplacements() {
  const baseText = prompt.value
  const preferStoredRange = baseText === promptReplacementBaseText.value
  const updates = promptReplacementItems.value
    .map((item) => {
      const target = resolvePromptReplacementTarget(item, baseText, preferStoredRange)
      const replacement = item.replacement.trim() || item.source
      if (!target || !replacement || target.text === replacement) {
        return null
      }
      return { ...target, replacement }
    })
    .filter((item): item is { start: number; end: number; text: string; replacement: string } => !!item)
    .sort((left, right) => right.start - left.start)

  let nextText = baseText
  let nextBoundary = Number.POSITIVE_INFINITY
  let appliedCount = 0
  updates.forEach((update) => {
    if (update.end > nextBoundary) {
      return
    }
    nextText = `${nextText.slice(0, update.start)}${update.replacement}${nextText.slice(update.end)}`
    nextBoundary = update.start
    appliedCount += 1
  })

  if (!appliedCount || nextText === baseText) {
    appStore.showWarning(t('imageStudio.promptReplacements.noChanges'))
    return
  }

  prompt.value = nextText
  appStore.showSuccess(t('imageStudio.promptReplacements.applied', { count: appliedCount }))
  closePromptReplacementModal()
  focusPromptTextarea()
}

function createEmptyPromptTemplateImageMeta(): PromptTemplateImageMeta {
  return {
    ratio: '',
    resolution: '',
    orientation: 'unknown',
  }
}

const selectedPromptTemplateImageMeta = ref<PromptTemplateImageMeta>(createEmptyPromptTemplateImageMeta())

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(Math.round(left))
  let b = Math.abs(Math.round(right))
  while (b !== 0) {
    const next = a % b
    a = b
    b = next
  }
  return a || 1
}

function resolvePreviewOrientation(width: number, height: number): PreviewOrientation {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'unknown'
  }
  if (Math.abs(width - height) < 1) {
    return 'square'
  }
  return width > height ? 'landscape' : 'portrait'
}

function buildPromptTemplateImageMeta(width: number, height: number): PromptTemplateImageMeta {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return createEmptyPromptTemplateImageMeta()
  }
  const safeWidth = Math.round(width)
  const safeHeight = Math.round(height)
  const divisor = greatestCommonDivisor(safeWidth, safeHeight)
  return {
    ratio: `${safeWidth / divisor}:${safeHeight / divisor}`,
    resolution: `${safeWidth}x${safeHeight}`,
    orientation: resolvePreviewOrientation(safeWidth, safeHeight),
  }
}

function previewImagePositionClass(orientation: PreviewOrientation): string {
  return orientation === 'portrait' ? 'is-preview-portrait' : 'is-preview-centered'
}

const selectedPromptTemplateImageClass = computed(() => (
  previewImagePositionClass(selectedPromptTemplateImageMeta.value.orientation)
))

const selectedPromptTemplateMetaText = computed(() => (
  [
    selectedPromptTemplateImageMeta.value.ratio,
    selectedPromptTemplateImageMeta.value.resolution,
  ].filter(Boolean).join(' ')
))

function applyPreviewImageOrientation(image: HTMLImageElement, orientation: PreviewOrientation): void {
  image.classList.remove('is-preview-portrait', 'is-preview-centered')
  image.classList.add(previewImagePositionClass(orientation))
}

function handlePromptPreviewImageLoad(event: Event): void {
  const image = event.currentTarget as HTMLImageElement | null
  if (!image) return
  const meta = buildPromptTemplateImageMeta(image.naturalWidth, image.naturalHeight)
  applyPreviewImageOrientation(image, meta.orientation)
}

function handleSelectedPromptTemplateImageLoad(event: Event): void {
  const image = event.currentTarget as HTMLImageElement | null
  if (!image) return
  const meta = buildPromptTemplateImageMeta(image.naturalWidth, image.naturalHeight)
  selectedPromptTemplateImageMeta.value = meta
  applyPreviewImageOrientation(image, meta.orientation)
}

function resetSelectedPromptTemplateImageMeta(): void {
  selectedPromptTemplateImageMeta.value = createEmptyPromptTemplateImageMeta()
}

watch(selectedPromptTemplateImage, resetSelectedPromptTemplateImageMeta)

watch(
  () => selectedPromptLibraryOption.value?.id || '',
  (id) => {
    writeSelectedPromptLibraryOptionId(id)
  }
)

watch(
  promptLibraryOptions,
  (options) => {
    const selectedId = selectedPromptLibraryOption.value?.id
    if (selectedId) {
      const refreshed = options.find((option) => option.id === selectedId)
      if (refreshed && refreshed !== selectedPromptLibraryOption.value) {
        selectedPromptLibraryOption.value = refreshed
      }
      return
    }
    restoreSelectedPromptLibraryOption()
  },
  { immediate: true }
)

const FALLBACK_IMAGE_MODELS = ['gpt-image-1', 'gpt-image-2', 'dall-e-3', 'dall-e-2']
const FALLBACK_XAI_GROK_IMAGE_MODELS = ['grok-imagine-image-quality', 'grok-imagine-image']
const IMAGE_MODEL_KEYWORDS = /(image|imagine|grok|sora|dall[-_]?e|flux|sdxl|stable[-_]?diffusion|midjourney|imagen|kling|mj|wan-?\d|pika|ideogram|firefly)/i

const detectedImageModels = ref<string[]>([])
const detectingModels = ref(false)
const detectModelsAbort = ref<AbortController | null>(null)
const detectedPromptHelperModels = ref<string[]>([])
const detectingPromptHelperModels = ref(false)
const detectPromptHelperModelsAbort = ref<AbortController | null>(null)
const promptHelperModelProbeState = ref<{ kind: 'idle' | 'busy' | 'ok' | 'fail'; message?: string; count?: number }>({ kind: 'idle' })

function externalApiBaseCandidates(rawBaseUrl: string): string[] {
  const baseUrl = rawBaseUrl.trim().replace(/\/+$/, '')
  if (!baseUrl) {
    return []
  }

  const candidates = [baseUrl]
  try {
    const parsed = new URL(baseUrl)
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/v1'
      candidates.push(parsed.toString().replace(/\/+$/, ''))
    }
  } catch {
    // Keep the original value; the fetch call will surface the URL error.
  }

  return Array.from(new Set(candidates))
}

function currentSiteApiBaseCandidates(): string[] {
  return externalApiBaseCandidates(currentSiteBaseUrl.value)
}

function getProbeErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status
  return typeof status === 'number' ? status : undefined
}

function isPrivateUpstreamBlockedError(error: unknown): boolean {
  return /private\/loopback|private.*hosts|loopback hosts|ALLOW_PRIVATE_UPSTREAM|INVALID_BASE_URL/i.test(errorMessageText(error))
}

function shouldUseRelayProbeError(error: unknown): boolean {
  const status = getProbeErrorStatus(error)
  if (isPrivateUpstreamBlockedError(error)) {
    return false
  }
  if (activeImageProbeProfile() === 'xai-grok-image' && (status === 400 || status === 404 || status === 405)) {
    return false
  }
  if (!status || status === 0 || status === 404) {
    return false
  }
  return true
}

function shouldFallbackModelProbe(status: number, detail: string): boolean {
  if (status === 400 || status === 404 || status === 405 || status === 415) {
    return true
  }
  return /not found|unknown endpoint|unsupported|not support/i.test(detail)
}

function extractUpstreamModelIds(payload: unknown): string[] {
  const root = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as { data?: unknown; models?: unknown }
    : null
  const list: unknown = root?.data || root?.models || payload
  if (!Array.isArray(list)) {
    return []
  }

  return Array.from(new Set(list
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim()
      if (entry && typeof entry === 'object') {
        const obj = entry as { id?: unknown; name?: unknown; model?: unknown }
        if (typeof obj.id === 'string') return obj.id.trim()
        if (typeof obj.name === 'string') return obj.name.trim()
        if (typeof obj.model === 'string') return obj.model.trim()
      }
      return ''
    })
    .filter((id) => typeof id === 'string' && id.length > 0)))
}

async function fetchUpstreamModelIds(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
  profile: ImageStudioProtocolProfile = activeImageProbeProfile()
): Promise<string[]> {
  let relayError: unknown = null
  try {
    const relayModels = await probeImageStudioUpstreamModels(baseUrl, apiKey, profile, signal)
    if (relayModels.length) {
      return Array.from(new Set(relayModels.map((id) => id.trim()).filter(Boolean)))
    }
  } catch (error) {
    relayError = error
    if ((error as { name?: string })?.name === 'AbortError') {
      throw error
    }
    if (shouldUseRelayProbeError(error)) {
      throw error
    }
  }

  const modelPaths = profile === 'xai-grok-image' ? ['/image-generation-models', '/models'] : ['/models']
  let lastModelError: unknown = relayError
  let response: Response
  for (let index = 0; index < modelPaths.length; index += 1) {
    const modelPath = modelPaths[index]
    try {
      response = await fetch(`${baseUrl}${modelPath}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
        signal,
      })
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') {
        throw error
      }
      lastModelError = error
      if (index < modelPaths.length - 1) {
        continue
      }
      if (relayError) {
        throw relayError
      }
      throw error
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const detail = parseUpstreamModelProbeError(payload)
      lastModelError = new Error(detail || `HTTP ${response.status}`)
      if (index < modelPaths.length - 1 && shouldFallbackModelProbe(response.status, detail)) {
        continue
      }
      throw lastModelError
    }

    const payload = await response.json().catch(() => null)
    const modelIds = extractUpstreamModelIds(payload)
    if (modelIds.length) {
      return modelIds
    }
    lastModelError = new Error('unexpected response shape')
  }

  if (lastModelError instanceof Error) {
    throw lastModelError
  }
  throw new Error('unexpected response shape')
}

async function fetchImageModelIds(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
  profile: ImageStudioProtocolProfile = activeImageProbeProfile()
): Promise<string[]> {
  const modelIds = await fetchUpstreamModelIds(baseUrl, apiKey, signal, profile)
  return Array.from(new Set(modelIds.filter((id) => IMAGE_MODEL_KEYWORDS.test(id))))
}

function filterPromptHelperModelIds(modelIds: string[]): string[] {
  const unique = Array.from(new Set(modelIds.map((id) => id.trim()).filter(Boolean)))
  const textLike = unique.filter((id) => !IMAGE_MODEL_KEYWORDS.test(id))
  return textLike.length ? textLike : unique
}

function parseUpstreamModelProbeError(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return ''
  }
  const root = payload as Record<string, unknown>
  const nested = root.error && typeof root.error === 'object'
    ? root.error as Record<string, unknown>
    : null
  const candidates = [
    nested?.message,
    nested?.msg,
    root.message,
    root.msg,
    root.detail,
    root.error,
    root.err_code,
    root.code,
  ]
  const found = candidates.find((value) => typeof value === 'string' && value.trim())
  return typeof found === 'string' ? found.trim() : ''
}

const modelOptions = computed(() => {
  if (preferences.providerMode === 'sub2api') {
    if (isCurrentSiteChatgpt2Api.value) {
      if (detectedImageModels.value.length) {
        return detectedImageModels.value
      }
      return ['gpt-image-2', 'gpt-image-1', 'dall-e-3']
    }
    return ['gpt-image']
  }
  if (detectedImageModels.value.length) {
    return detectedImageModels.value
  }
  if (preferences.profile === 'xai-grok-image') {
    return FALLBACK_XAI_GROK_IMAGE_MODELS
  }
  return FALLBACK_IMAGE_MODELS
})

let detectModelsDebounce = 0
async function fetchUpstreamImageModels(silent = true) {
  if (preferences.providerMode === 'sub2api' && !isCurrentSiteChatgpt2Api.value) return
  const candidates = isCurrentSiteChatgpt2Api.value
    ? currentSiteApiBaseCandidates()
    : externalApiBaseCandidates(preferences.externalBaseUrl)
  const apiKey = isCurrentSiteChatgpt2Api.value ? sub2apiApiKey.value.trim() : externalApiKey.value.trim()
  if (!candidates.length || !apiKey) {
    detectedImageModels.value = []
    return
  }

  if (detectModelsAbort.value) {
    detectModelsAbort.value.abort()
  }
  const controller = new AbortController()
  detectModelsAbort.value = controller
  detectingModels.value = true
  try {
    let unique: string[] = []
    let resolvedBaseUrl = candidates[0]
    let lastError: unknown = null
    for (const candidate of candidates) {
      try {
        unique = await fetchImageModelIds(candidate, apiKey, controller.signal, activeImageProbeProfile())
        resolvedBaseUrl = candidate
        break
      } catch (error) {
        lastError = error
      }
    }
    if (!unique.length && lastError) {
      throw lastError
    }
    if (unique.length) {
      detectedImageModels.value = unique
      if (isCurrentSiteChatgpt2Api.value) {
        if (resolvedBaseUrl !== currentSiteBaseUrl.value) {
          preferences.currentSiteBaseUrl = resolvedBaseUrl
        }
      } else if (resolvedBaseUrl !== preferences.externalBaseUrl.trim().replace(/\/+$/, '')) {
        preferences.externalBaseUrl = resolvedBaseUrl
      }
      if (!unique.includes(preferences.model)) {
        preferences.model = unique[0]
      }
      if (
        preferences.providerMode !== 'sub2api' &&
        preferences.profile === 'sub2api-sora-compatible' &&
        unique.some((modelId) => /^gpt-image(?:[-.\w]*)?$/i.test(modelId))
      ) {
        preferences.profile = 'openai-image-api'
        if (!silent) {
          appStore.showWarning(locale.value === 'zh'
            ? '检测到 gpt-image 图片接口，已切换为 OpenAI 图片接口。'
            : 'Detected a gpt-image Images API upstream and switched to OpenAI Images API.')
        }
      }
    } else {
      detectedImageModels.value = isCurrentSiteChatgpt2Api.value ? ['gpt-image-2'] : []
      if (isCurrentSiteChatgpt2Api.value) {
        preferences.model = 'gpt-image-2'
      }
    }
  } catch (error) {
    if ((error as { name?: string })?.name !== 'AbortError') {
      detectedImageModels.value = isCurrentSiteChatgpt2Api.value ? ['gpt-image-2'] : []
      if (isCurrentSiteChatgpt2Api.value) {
        preferences.model = 'gpt-image-2'
      }
      if (!silent) {
        appStore.showError(error instanceof Error ? error.message : 'Failed to load model list')
      }
    }
  } finally {
    detectingModels.value = false
    detectModelsAbort.value = null
  }
}

let detectPromptHelperModelsDebounce = 0

async function fetchPromptHelperModels(silent = true) {
  const candidates = externalApiBaseCandidates(promptHelperConfig.baseUrl)
  const apiKey = promptHelperConfig.apiKey.trim()
  if (!candidates.length || !apiKey) {
    detectedPromptHelperModels.value = []
    promptHelperModelProbeState.value = { kind: 'idle' }
    return
  }

  if (detectPromptHelperModelsAbort.value) {
    detectPromptHelperModelsAbort.value.abort()
  }
  const controller = new AbortController()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 12000)
  detectPromptHelperModelsAbort.value = controller
  detectingPromptHelperModels.value = true
  promptHelperModelProbeState.value = { kind: 'busy' }

  try {
    let modelIds: string[] = []
    let resolvedBaseUrl = candidates[0]
    let lastError: unknown = null
    for (const candidate of candidates) {
      try {
        modelIds = await fetchUpstreamModelIds(candidate, apiKey, controller.signal, 'openai-image-api')
        resolvedBaseUrl = candidate
        break
      } catch (error) {
        lastError = error
      }
    }
    if (!modelIds.length && lastError) {
      throw lastError
    }

    const promptModels = filterPromptHelperModelIds(modelIds)
    detectedPromptHelperModels.value = promptModels
    if (resolvedBaseUrl !== promptHelperConfig.baseUrl.trim().replace(/\/+$/, '')) {
      promptHelperConfig.baseUrl = resolvedBaseUrl
    }
    if (!promptHelperConfig.model.trim() && promptModels.length) {
      promptHelperConfig.model = promptModels[0]
    }
    promptHelperModelProbeState.value = { kind: 'ok', count: promptModels.length }
    if (!silent) {
      if (promptModels.length) {
        appStore.showSuccess(t('imageStudio.sidebar.helperModelDetected', { count: promptModels.length }))
      } else {
        appStore.showWarning(t('imageStudio.sidebar.helperModelProbeNoModels'))
      }
    }
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError' && !timedOut) {
      return
    }
    const message = timedOut
      ? t('imageStudio.sidebar.helperModelProbeTimeout')
      : (error instanceof Error ? error.message : t('imageStudio.sidebar.helperModelProbeFailed'))
    detectedPromptHelperModels.value = []
    promptHelperModelProbeState.value = { kind: 'fail', message }
    if (!silent) {
      appStore.showError(message)
    }
  } finally {
    window.clearTimeout(timeout)
    if (detectPromptHelperModelsAbort.value === controller) {
      detectingPromptHelperModels.value = false
      detectPromptHelperModelsAbort.value = null
    }
  }
}

function scheduleFetchUpstreamImageModels() {
  if (detectModelsDebounce) {
    window.clearTimeout(detectModelsDebounce)
  }
  detectModelsDebounce = window.setTimeout(() => {
    detectModelsDebounce = 0
    void fetchUpstreamImageModels(true)
  }, 350)
}

function scheduleFetchPromptHelperModels() {
  if (detectPromptHelperModelsDebounce) {
    window.clearTimeout(detectPromptHelperModelsDebounce)
  }
  detectPromptHelperModelsDebounce = window.setTimeout(() => {
    detectPromptHelperModelsDebounce = 0
    void fetchPromptHelperModels(true)
  }, 450)
}

function normalizeCustomRatioPart(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1
  }
  return Math.min(99, Math.max(1, Math.round(parsed)))
}

function openCustomRatioModal() {
  const match = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(preferences.aspectRatio)
  customRatioWidth.value = match?.[1] || customRatioWidth.value || '2'
  customRatioHeight.value = match?.[2] || customRatioHeight.value || '3'
  customRatioModalOpen.value = true
}

function closeCustomRatioModal() {
  customRatioModalOpen.value = false
}

function applyCustomRatio() {
  const width = normalizeCustomRatioPart(customRatioWidth.value)
  const height = normalizeCustomRatioPart(customRatioHeight.value)
  preferences.aspectRatio = `${width}:${height}`
  customRatioWidth.value = String(width)
  customRatioHeight.value = String(height)
  customRatioModalOpen.value = false
}

const effectiveCount = computed(() => {
  if (!isCurrentSiteChatgpt2Api.value && preferences.providerMode !== 'sub2api' && preferences.profile === 'openai-responses') {
    return 1
  }
  return Math.max(1, Math.min(5, preferences.count))
})

const countSliderDisabled = computed(() => (
  preferences.profile === 'openai-responses' && preferences.providerMode !== 'sub2api'
))

const resolvedSize = computed(() => {
  if (super4kTargetSize.value) {
    return super4kTargetSize.value
  }
  if (!supportsCustomResolution.value) {
    return ''
  }
  return resolveWorkspaceImageSize(preferences.resolutionPreset)
})

const standardGenerationSize = computed(() => {
  if (!supportsCustomResolution.value) {
    return ''
  }
  return resolveWorkspaceImageSize('standard')
})

const upstreamGenerationSize = computed(() => {
  if (super4kTargetSize.value) {
    return native4kSize.value || standardGenerationSize.value
  }
  return resolvedSize.value
})

const resolutionHint = computed(() => (
  preferences.providerMode === 'external-relay' && !preferences.externalRelayLocalUpscale
    ? t('imageStudio.hints.resolutionNoLocalUpscale')
    : supportsCustomResolution.value
    ? t('imageStudio.hints.resolution')
    : t('imageStudio.hints.resolutionSub2api')
))

const hasSub2ApiKey = computed(() => !!sub2apiApiKey.value.trim())
const currentSiteUsageLoading = computed(() => (
  isCurrentSiteChatgpt2Api.value ? chatgpt2ApiQuotaLoading.value : sub2apiUsageLoading.value
))

const chatgpt2ApiQuotaText = computed(() => {
  if (!hasSub2ApiKey.value) {
    return t('imageStudio.header.awaitingKey')
  }
  if (chatgpt2ApiQuotaLoading.value) {
    return t('imageStudio.header.queryingImageQuota')
  }
  if (chatgpt2ApiQuotaError.value) {
    return t('imageStudio.header.imageQuotaUnavailable')
  }
  const quota = chatgpt2ApiQuota.value
  if (!quota) {
    return t('imageStudio.header.awaitingImageQuota')
  }
  if (quota.unlimited) {
    return t('imageStudio.header.imageQuotaUnlimited')
  }
  if (quota.unknown) {
    return t('imageStudio.header.imageQuotaUnknown')
  }
  return t('imageStudio.header.imageQuotaCount', { count: formatNumber(Math.max(0, quota.remaining), 0) })
})

const chatgpt2ApiQuotaDetailText = computed(() => {
  if (chatgpt2ApiQuotaError.value) {
    return chatgpt2ApiQuotaError.value
  }
  const quota = chatgpt2ApiQuota.value
  if (!quota) {
    return t('imageStudio.usage.readyHint')
  }
  return t('imageStudio.header.imageQuotaDetail', {
    available: quota.availableAccounts,
    total: quota.totalAccounts,
  })
})

const selectedStylePreset = computed(() => (
  stylePresets.value.find((preset) => preset.id === selectedStylePresetId.value) || stylePresets.value[0]
))

const promptCharacterCount = computed(() => prompt.value.length)
const negativePromptCharacterCount = computed(() => negativePrompt.value.length)

const activeHistoryRecord = computed(() => (
  historyItems.value.find((item) => item.id === activeHistoryId.value) || historyItems.value[0] || null
))

const historySummary = computed(() => {
  const total = historyItems.value.length
  const native = historyItems.value.filter((item) => !item.outputMode || item.outputMode === 'native').length
  const upscaled = historyItems.value.filter((item) => (
    item.outputMode === 'upscaled' || item.outputMode === 'super-4k'
  )).length
  const degraded = historyItems.value.filter((item) => item.outputMode === 'provider-scaled').length
  return { total, native, upscaled, degraded }
})

const historyListStyle = computed<Record<string, string>>(() => (
  historyListMaxHeight.value ? { maxHeight: historyListMaxHeight.value } : ({} as Record<string, string>)
))

const workbenchSurfaceStyle = computed<Record<string, string>>(() => (
  workbenchSurfaceMaxHeight.value
    ? { maxHeight: workbenchSurfaceMaxHeight.value }
    : ({} as Record<string, string>)
))

const activeHistoryTiles = computed(() => {
  const historyId = activeHistoryRecord.value?.id
  return historyId
    ? workspaceTiles.value.filter((tile) => tile.historyId === historyId)
    : []
})

const previewTile = computed(() => {
  const tileById = previewTileId.value
    ? workspaceTiles.value.find((tile) => tile.id === previewTileId.value)
    : null

  return tileById || activeHistoryTiles.value[0] || workspaceTiles.value[0] || null
})

const previewGroupTiles = computed(() => {
  const historyId = previewTile.value?.historyId
  return historyId
    ? workspaceTiles.value.filter((tile) => tile.historyId === historyId)
    : []
})

const sortedTilesByDate = computed(() => (
  [...workspaceTiles.value].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
))

const EVOLUTION_TIMELINE_LIMIT = 6
const hasAnyVariant = computed(() =>
  workspaceTiles.value.some((tile) => !!tile.parentHistoryId || !!tile.parentTileId)
)
const evolutionTimeline = computed<ImageStudioWorkspaceTile[]>(() => {
  // Only surface the variant-evolution panel after the user has actually
  // generated at least one variant. Without that, the panel is just a
  // duplicate of the recent-tiles strip and clutters the side column.
  if (!hasAnyVariant.value) return []
  return sortedTilesByDate.value.slice(0, EVOLUTION_TIMELINE_LIMIT)
})

const compareTile = computed<ImageStudioWorkspaceTile | null>(() => {
  const current = previewTile.value
  if (!current) return null
  // Compare is only meaningful when the current tile is a variant of an
  // earlier tile. We follow the explicit parent linkage written by
  // generateVariantFromPreview / persistCurrentResults.
  if (!current.parentHistoryId && !current.parentTileId) return null
  if (current.parentTileId) {
    const byTile = workspaceTiles.value.find((tile) => tile.id === current.parentTileId)
    if (byTile) return byTile
  }
  if (current.parentHistoryId) {
    const byHistory = sortedTilesByDate.value.find((tile) => tile.historyId === current.parentHistoryId)
    if (byHistory) return byHistory
  }
  return null
})

const compareAvailable = computed(() => compareTile.value !== null && compareTile.value.id !== previewTile.value?.id)

const previewMetaText = computed(() => {
  if (!previewTile.value) {
    return t('imageStudio.previewCanvas.metaEmpty')
  }

  return `${previewTile.value.aspectRatio} · ${previewTile.value.model} · ${formatTime(previewTile.value.createdAt)}`
})

const previewHistoryRecord = computed(() => {
  const tile = previewTile.value
  if (!tile) return null
  return historyItems.value.find((item) => item.id === tile.historyId) || null
})

function formatLightboxFileSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) {
    return locale.value === 'zh' ? '大小 -' : 'Size -'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

function formatLightboxTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return new Intl.DateTimeFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const lightboxResolutionText = computed(() => {
  if (lightboxNaturalSize.value) {
    return `${lightboxNaturalSize.value.width} × ${lightboxNaturalSize.value.height}`
  }
  return previewHistoryRecord.value?.requestedSize?.trim() || '-'
})

function outputModeLabel(mode?: ImageStudioHistoryItem['outputMode']): string {
  switch (mode) {
    case 'super-4k':
      return locale.value === 'zh' ? '超4K输出' : 'Super 4K output'
    case 'upscaled':
      return locale.value === 'zh' ? '本地放大' : 'Local upscale'
    case 'provider-scaled':
      return locale.value === 'zh' ? '上游降级' : 'Provider scaled'
    case 'native':
      return locale.value === 'zh' ? '上游原生' : 'Native upstream'
    default:
      return ''
  }
}

const lightboxDurationText = computed(() => {
  const duration = previewHistoryRecord.value?.durationMs
    ?? (previewIsTransient.value ? lastGenerationDurationMs.value : null)
  const formatted = formatDurationMs(duration)
  if (!formatted) return locale.value === 'zh' ? '耗时 -' : 'Took -'
  return locale.value === 'zh' ? `耗时 ${formatted}` : `Took ${formatted}`
})

const lightboxMetaItems = computed(() => {
  const tile = previewTile.value
  if (!tile) return []
  return [
    { key: 'resolution', label: lightboxResolutionText.value, primary: true },
    { key: 'ratio', label: tile.aspectRatio || '-', primary: true },
    { key: 'output', label: outputModeLabel(previewHistoryRecord.value?.outputMode), primary: false },
    { key: 'size', label: formatLightboxFileSize(tile.result.blob?.size), primary: false },
    { key: 'duration', label: lightboxDurationText.value, primary: false },
    { key: 'time', label: formatLightboxTime(tile.createdAt), primary: false },
  ].filter((item) => item.label)
})

const headerRemainingText = computed(() => {
  if (preferences.providerMode === 'sub2api') {
    if (isCurrentSiteChatgpt2Api.value) {
      return chatgpt2ApiQuotaText.value
    }
    if (!hasSub2ApiKey.value) {
      return t('imageStudio.header.awaitingKey')
    }
    if (!sub2apiUsage.value) {
      return t('imageStudio.header.awaitingUsage')
    }
    const data = sub2apiUsage.value
    const remainingAmount = data.quota?.remaining ?? data.remaining ?? data.balance
    return formatUsageAmount(remainingAmount, data.quota?.unit || data.unit)
  }

  return t('imageStudio.header.sessionStats', {
    success: sessionStats.value.successCount,
    failure: sessionStats.value.failureCount,
  })
})

const headerStatusText = computed(() => {
  if (preferences.providerMode === 'sub2api') {
    if (isCurrentSiteChatgpt2Api.value) {
      return t('imageStudio.header.imageQuota')
    }
    return usageStatusText.value
  }
  if (generating.value) {
    return t('imageStudio.header.statusRunning', { value: generationElapsedSeconds.value })
  }
  if (sessionStats.value.lastFailureMessage && sessionStats.value.successCount === 0) {
    return t('imageStudio.header.statusError')
  }
  if (sessionStats.value.lastDurationMs != null) {
    return t('imageStudio.header.statusLastDuration', {
      value: (sessionStats.value.lastDurationMs / 1000).toFixed(1),
    })
  }
  return t('imageStudio.header.statusReady')
})

const headerStatusTone = computed<'blue' | 'emerald' | 'amber' | 'rose' | 'slate'>(() => {
  if (generating.value) {
    return 'blue'
  }
  if (preferences.providerMode === 'sub2api') {
    if (isCurrentSiteChatgpt2Api.value) {
      if (chatgpt2ApiQuotaLoading.value) return 'blue'
      if (chatgpt2ApiQuotaError.value) return 'amber'
      if (chatgpt2ApiQuota.value) return 'emerald'
      return 'slate'
    }
    if (!sub2apiUsage.value) {
      return 'slate'
    }
    const status = sub2apiUsage.value.status || (sub2apiUsage.value.isValid ? 'active' : 'invalid')
    if (status === 'active') return 'emerald'
    if (status === 'quota_exhausted' || status === 'expired' || status === 'disabled') return 'amber'
    return 'rose'
  }
  if (sessionStats.value.lastFailureMessage && sessionStats.value.successCount === 0) {
    return 'rose'
  }
  if (sessionStats.value.lastDurationMs != null) {
    return 'emerald'
  }
  return 'slate'
})

const currentProviderLabel = computed(() => (
  providerModes.value.find((mode) => mode.value === preferences.providerMode)?.label || preferences.providerMode
))

function describeEndpointHost(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim()
  if (!trimmed) {
    return ''
  }
  try {
    const parsed = new URL(trimmed)
    const path = parsed.pathname.replace(/\/+$/, '')
    return `${parsed.host}${path}`
  } catch {
    return trimmed.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  }
}

const generateTargetSummary = computed(() => {
  const modeLabel = currentProviderLabel.value
  if (preferences.providerMode === 'sub2api') {
    const endpoint = isCurrentSiteChatgpt2Api.value ? currentSiteBaseUrl.value : sub2apiBaseUrl
    return {
      modeLabel,
      endpointLabel: describeEndpointHost(endpoint) || endpoint,
    }
  }
  return {
    modeLabel,
    endpointLabel: describeEndpointHost(preferences.externalBaseUrl),
  }
})

const generationElapsedSeconds = computed(() => (generationElapsedMs.value / 1000).toFixed(1))

const estimatedRemainingSeconds = computed<number | null>(() => {
  if (!generating.value || lastGenerationDurationMs.value == null) {
    return null
  }
  const remaining = (lastGenerationDurationMs.value - generationElapsedMs.value) / 1000
  return Math.max(0, Math.round(remaining))
})

const generationBatchActive = computed(() => (
  generating.value && !!generationBatchProgress.value && generationBatchProgress.value.total > 1
))

const generationJobActive = computed(() => (
  generating.value && !!generationBatchProgress.value
))

const generationBatchFinishedCount = computed(() => {
  const batch = generationBatchProgress.value
  return batch ? batch.completed + batch.failed : 0
})

const generationBatchTotalCount = computed(() => (
  generationBatchProgress.value?.total || effectiveCount.value
))

const generationCurrentBatchItem = computed(() => {
  const items = generationBatchProgress.value?.items || []
  return (
    items.find((item) => item.status === 'running') ||
    items.find((item) => item.status === 'queued') ||
    null
  )
})

const currentImageEstimateMs = computed(() => {
  const items = generationBatchProgress.value?.items || []
  const finishedDurations = items
    .filter((item) => item.startedAt && item.finishedAt)
    .map((item) => Math.max(1000, (item.finishedAt || 0) - (item.startedAt || 0)))

  if (finishedDurations.length) {
    const average = finishedDurations.reduce((sum, value) => sum + value, 0) / finishedDurations.length
    return Math.max(15000, Math.min(240000, average))
  }

  if (lastGenerationDurationMs.value) {
    return Math.max(15000, Math.min(240000, lastGenerationDurationMs.value / Math.max(1, lastGenerationImageCount.value)))
  }

  return 90000
})

const currentImageProgressPercent = computed(() => {
  if (!generating.value) {
    return 100
  }

  const batchItem = generationCurrentBatchItem.value
  if (batchItem?.status === 'queued') {
    return 0
  }

  const startedAt = batchItem?.startedAt
  const progressTick = generationElapsedMs.value
  const elapsed = startedAt
    ? Math.max(0, Date.now() - startedAt + progressTick * 0)
    : progressTick
  const raw = (elapsed / currentImageEstimateMs.value) * 100
  return Math.min(96, Math.max(3, raw))
})

const currentImageProgressText = computed(() => {
  if (generationBatchActive.value) {
    const current = (generationCurrentBatchItem.value?.index ?? generationBatchFinishedCount.value) + 1
    return t('imageStudio.workbench.currentBatchImageProgress', {
      current: Math.min(current, generationBatchTotalCount.value),
      total: generationBatchTotalCount.value,
    })
  }
  return t('imageStudio.workbench.currentImageProgress')
})

const generationProgressPercent = computed<number>(() => {
  if (!generating.value) {
    return progress.value
  }
  const batch = generationBatchProgress.value
  if (batch) {
    const settledPercent = ((batch.completed + batch.failed) / batch.total) * 100
    const activeSlice = (batch.running > 0 || batch.queued > 0)
      ? (progress.value / 100) * (100 / batch.total)
      : 0
    return Math.min(100, Math.max(6, settledPercent + activeSlice))
  }
  return Math.max(progress.value, 6)
})

const generationProgressLabel = computed(() => {
  if (generationBatchActive.value) {
    return t('imageStudio.workbench.batchProgressLabel', {
      done: generationBatchFinishedCount.value,
      total: generationBatchTotalCount.value,
    })
  }
  return generating.value ? `${Math.round(generationProgressPercent.value)}%` : t('imageStudio.statusBoard.ready')
})

const generationPreviewLabel = computed(() => {
  if (generationBatchActive.value) {
    return t('imageStudio.workbench.batchGeneratingHeading', {
      done: generationBatchFinishedCount.value,
      total: generationBatchTotalCount.value,
    })
  }
  return t('imageStudio.workbench.generatingHeading')
})

const generationBatchDetailText = computed(() => {
  const batch = generationBatchProgress.value
  if (!batch) {
    return ''
  }
  const key = batch.failed > 0
    ? 'imageStudio.workbench.batchProgressDetailWithFailed'
    : 'imageStudio.workbench.batchProgressDetail'
  return t(key, {
    running: batch.running,
    queued: batch.queued,
    failed: batch.failed,
  })
})

const previewIsTransient = computed(() => previewTileId.value?.startsWith('tmp:') ?? false)

const connectionConfigIncomplete = computed(() => {
  if (preferences.providerMode === 'sub2api') {
    return !sub2apiApiKey.value.trim()
  }
  return !preferences.externalBaseUrl.trim() || !externalApiKey.value.trim()
})

const connectionTriggerMeta = computed(() => {
  if (connectionConfigIncomplete.value) {
    return t('imageStudio.popovers.connectionMissing')
  }
  if (isCurrentSiteChatgpt2Api.value) {
    return generateTargetSummary.value.endpointLabel || t('imageStudio.popovers.connectionReady')
  }
  if (preferences.providerMode === 'sub2api') {
    return t('imageStudio.popovers.connectionReady')
  }
  return generateTargetSummary.value.endpointLabel || t('imageStudio.popovers.connectionReady')
})

const selectedTiles = computed(() => (
  workspaceTiles.value.filter((tile) => selectedTileIds.value.includes(tile.id))
))

const generationSummaryText = computed(() => {
  if (generationBatchActive.value) {
    return t('imageStudio.loading.batchGeneratingText', {
      done: generationBatchFinishedCount.value,
      total: generationBatchTotalCount.value,
    })
  }
  if (generationJobActive.value) {
    return generationBatchDetailText.value
  }
  if (generating.value) {
    return t('imageStudio.loading.generatingText')
  }

  if (!activeHistoryRecord.value) {
    return t('imageStudio.previewCanvas.summaryEmpty')
  }

  return t('imageStudio.previewCanvas.summaryReady', {
    count: activeHistoryRecord.value.count,
    time: formatTime(activeHistoryRecord.value.createdAt),
  })
})

const generationFootnote = computed(() => {
  if (generating.value) {
    return t('imageStudio.previewCanvas.summaryGenerating')
  }

  if (!previewTile.value) {
    return t('imageStudio.previewCanvas.summaryHint')
  }

  return previewTile.value.prompt
})

const lightboxMagnifierLabel = computed(() => (
  lightboxMagnifierEnabled.value
    ? t('imageStudio.previewCanvas.exitMagnifier')
    : t('imageStudio.previewCanvas.magnifier')
))

const lightboxBaseScale = computed(() => {
  if (
    lightboxViewMode.value !== 'fit' ||
    !lightboxNaturalWidth.value ||
    !lightboxNaturalHeight.value ||
    !lightboxViewportWidth.value ||
    !lightboxViewportHeight.value
  ) {
    return 1
  }

  return Math.min(
    lightboxViewportWidth.value / lightboxNaturalWidth.value,
    lightboxViewportHeight.value / lightboxNaturalHeight.value,
    1
  )
})

const lightboxRenderScale = computed(() => lightboxBaseScale.value * lightboxZoom.value)
const lightboxMagnifierScale = computed(() => {
  const fitRecoveryScale = lightboxBaseScale.value > 0
    ? (1 / lightboxBaseScale.value) * 1.08
    : 1

  return Math.max(
    LIGHTBOX_ZOOM_FACTOR,
    fitRecoveryScale,
    lightboxZoom.value * 1.18
  )
})

const lightboxRenderedWidth = computed(() => lightboxNaturalWidth.value * lightboxRenderScale.value)

const lightboxRenderedHeight = computed(() => lightboxNaturalHeight.value * lightboxRenderScale.value)

const lightboxFrameStyle = computed(() => ({
  width: `${lightboxNaturalWidth.value || 1}px`,
  height: `${lightboxNaturalHeight.value || 1}px`,
  transform: `translate3d(${lightboxPanX.value}px, ${lightboxPanY.value}px, 0) scale(${lightboxRenderScale.value || 1})`,
}))

const lightboxLensStyle = computed(() => {
  if (!previewTile.value) {
    return {}
  }

  return {
    width: `${LIGHTBOX_LENS_SIZE}px`,
    height: `${LIGHTBOX_LENS_SIZE}px`,
    transform: `translate(${lightboxLensX.value - (LIGHTBOX_LENS_SIZE / 2)}px, ${lightboxLensY.value - (LIGHTBOX_LENS_SIZE / 2)}px)`,
    backgroundImage: `url(${previewTile.value.result.url})`,
    backgroundSize: `${lightboxLensBackgroundWidth.value}px ${lightboxLensBackgroundHeight.value}px`,
    backgroundPosition: `-${lightboxLensBackgroundX.value}px -${lightboxLensBackgroundY.value}px`,
  }
})

const workbenchSelectionRectStyle = computed(() => {
  const left = Math.min(workbenchSelectionStartX.value, workbenchSelectionCurrentX.value)
  const top = Math.min(workbenchSelectionStartY.value, workbenchSelectionCurrentY.value)
  const width = Math.abs(workbenchSelectionCurrentX.value - workbenchSelectionStartX.value)
  const height = Math.abs(workbenchSelectionCurrentY.value - workbenchSelectionStartY.value)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

const usageStatusText = computed(() => {
  const data = sub2apiUsage.value
  if (!data) {
    return t('imageStudio.header.awaitingUsage')
  }

  const status = data.status || (data.isValid ? 'active' : 'invalid')
  const statusMap: Record<string, string> = {
    active: t('imageStudio.usage.status.active'),
    disabled: t('imageStudio.usage.status.disabled'),
    quota_exhausted: t('imageStudio.usage.status.quotaExhausted'),
    expired: t('imageStudio.usage.status.expired'),
    invalid: t('imageStudio.usage.status.invalid'),
  }

  return statusMap[status] || status
})

watch(
  () => preferences.providerMode,
  (mode) => {
    if (mode === 'sub2api') {
      preferences.profile = preferences.currentSiteProfile
      preferences.model = preferences.currentSiteProfile === 'chatgpt2api' ? 'gpt-image-2' : 'gpt-image'
      return
    }

    if (preferences.profile === 'xai-grok-image' && !preferences.model.trim()) {
      preferences.model = FALLBACK_XAI_GROK_IMAGE_MODELS[0]
      return
    }

    if (preferences.model === 'gpt-image') {
      preferences.model = preferences.profile === 'sub2api-sora-compatible' ? 'gpt-image-2' : 'gpt-image-1'
    }
  },
  { immediate: true }
)

watch(
  () => preferences.currentSiteProfile,
  (profile) => {
    if (preferences.providerMode !== 'sub2api') {
      return
    }
    preferences.profile = profile
    detectedImageModels.value = []
    if (profile === 'chatgpt2api') {
      preferences.model = 'gpt-image-2'
      void fetchUpstreamImageModels(true)
      void refreshChatgpt2ApiImageQuota({ silent: true })
    } else {
      preferences.model = 'gpt-image'
      chatgpt2ApiQuota.value = null
      chatgpt2ApiQuotaError.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => preferences.profile,
  (profile) => {
    if (profile === 'openai-responses' && preferences.providerMode !== 'sub2api') {
      preferences.count = 1
    }
    if (profile === 'xai-grok-image' && preferences.providerMode !== 'sub2api') {
      if (!preferences.model.trim() || /^gpt-image|^dall[-_]?e/i.test(preferences.model.trim())) {
        preferences.model = FALLBACK_XAI_GROK_IMAGE_MODELS[0]
      }
      if (!preferences.externalBaseUrl.trim() || /api\.openai\.com/i.test(preferences.externalBaseUrl)) {
        preferences.externalBaseUrl = 'https://api.x.ai/v1'
      }
    }
    if (profile === 'sub2api-sora-compatible' && preferences.providerMode !== 'sub2api' && preferences.model === 'gpt-image') {
      preferences.model = 'gpt-image-2'
    }
  },
  { immediate: true }
)

watch(
  () => preferences.count,
  (value) => {
    const normalized = Math.max(1, Math.min(5, Number.isFinite(value) ? Math.round(value) : 1))
    if (value !== normalized) {
      preferences.count = normalized
    }
  },
  { immediate: true }
)

watch(
  () => sub2apiApiKey.value.trim(),
  (value, oldValue) => {
    if (value === oldValue) {
      return
    }
    sub2apiUsage.value = null
    sub2apiUsageError.value = ''
    chatgpt2ApiQuota.value = null
    chatgpt2ApiQuotaError.value = ''
  }
)


watch(
  [previewTile, compareAvailable],
  ([tile, compareEnabled]) => {
    if (tile?.historyId) {
      activeHistoryId.value = tile.historyId
    }

    if (!compareEnabled && previewMode.value === 'compare') {
      previewMode.value = 'original'
    }
  },
  { immediate: true }
)

function readCssPixelValue(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function updateHistoryListViewportHeight(): void {
  const list = historyListRef.value
  if (!list || typeof window === 'undefined') {
    historyListMaxHeight.value = ''
    return
  }

  const cards = Array.from(list.querySelectorAll<HTMLElement>(':scope > .glass-card'))
    .slice(0, HISTORY_VISIBLE_CARD_LIMIT)

  if (!cards.length) {
    historyListMaxHeight.value = ''
    return
  }

  const styles = window.getComputedStyle(list)
  const gap = readCssPixelValue(styles.rowGap || styles.gap)
  const paddingTop = readCssPixelValue(styles.paddingTop)
  const paddingBottom = readCssPixelValue(styles.paddingBottom)
  const cardHeight = cards.reduce((sum, card) => sum + card.getBoundingClientRect().height, 0)
  const gapHeight = Math.max(0, cards.length - 1) * gap
  const nextHeight = Math.ceil(cardHeight + gapHeight + paddingTop + paddingBottom + 1)

  historyListMaxHeight.value = `${nextHeight}px`
}

function disconnectHistoryListResizeObserver(): void {
  historyListResizeObserver?.disconnect()
  historyListResizeObserver = null
}

function observeHistoryListLayout(): void {
  disconnectHistoryListResizeObserver()

  const list = historyListRef.value
  if (!list || typeof window === 'undefined') {
    historyListMaxHeight.value = ''
    return
  }

  updateHistoryListViewportHeight()

  if (typeof ResizeObserver === 'undefined') {
    return
  }

  const observer = new ResizeObserver(updateHistoryListViewportHeight)
  observer.observe(list)
  Array.from(list.querySelectorAll<HTMLElement>(':scope > .glass-card'))
    .slice(0, HISTORY_VISIBLE_CARD_LIMIT)
    .forEach((card) => observer.observe(card))
  historyListResizeObserver = observer
}

function updateWorkbenchSurfaceViewportHeight(): void {
  const surface = workbenchSurfaceRef.value
  if (!surface || typeof window === 'undefined') {
    workbenchSurfaceMaxHeight.value = ''
    return
  }

  const grid = surface.querySelector<HTMLElement>('.studio-workbench-grid')
  const firstTile = surface.querySelector<HTMLElement>('.studio-workbench-tile')
  if (!grid || !firstTile) {
    workbenchSurfaceMaxHeight.value = ''
    return
  }

  const gridStyles = window.getComputedStyle(grid)
  const columns = gridStyles.gridTemplateColumns
    .split(' ')
    .filter((track) => track.trim().length > 0)
    .length || 1
  const tileCount = grid.querySelectorAll(':scope > .studio-workbench-tile').length
  const visibleRows = Math.min(WORKBENCH_VISIBLE_ROW_LIMIT, Math.ceil(tileCount / columns))
  const tileHeight = firstTile.getBoundingClientRect().height
  const gap = readCssPixelValue(gridStyles.rowGap || gridStyles.gap)
  const paddingTop = readCssPixelValue(gridStyles.paddingTop)
  const paddingBottom = readCssPixelValue(gridStyles.paddingBottom)

  if (!visibleRows || !tileHeight) {
    workbenchSurfaceMaxHeight.value = ''
    return
  }

  const nextHeight = Math.ceil(
    (tileHeight * visibleRows)
    + (Math.max(0, visibleRows - 1) * gap)
    + paddingTop
    + paddingBottom
    + 1
  )
  workbenchSurfaceMaxHeight.value = `${nextHeight}px`
}

function disconnectWorkbenchResizeObserver(): void {
  workbenchResizeObserver?.disconnect()
  workbenchResizeObserver = null
}

function observeWorkbenchLayout(): void {
  disconnectWorkbenchResizeObserver()

  const surface = workbenchSurfaceRef.value
  if (!surface || typeof window === 'undefined') {
    workbenchSurfaceMaxHeight.value = ''
    return
  }

  updateWorkbenchSurfaceViewportHeight()

  if (typeof ResizeObserver === 'undefined') {
    return
  }

  const observer = new ResizeObserver(updateWorkbenchSurfaceViewportHeight)
  observer.observe(surface)
  const grid = surface.querySelector<HTMLElement>('.studio-workbench-grid')
  if (grid) {
    observer.observe(grid)
  }
  Array.from(surface.querySelectorAll<HTMLElement>('.studio-workbench-tile'))
    .slice(0, Math.max(1, WORKBENCH_VISIBLE_ROW_LIMIT * 4))
    .forEach((tile) => observer.observe(tile))
  workbenchResizeObserver = observer
}

watch(
  () => historyItems.value.map((item) => item.id).join('|'),
  () => {
    void nextTick(observeHistoryListLayout)
  },
  { immediate: true }
)

watch(
  () => workspaceTiles.value.map((tile) => tile.id).join('|'),
  () => {
    void nextTick(observeWorkbenchLayout)
  },
  { immediate: true }
)

watch(
  [
    () => preferences.providerMode,
    () => preferences.externalBaseUrl,
    () => preferences.currentSiteProfile,
    () => preferences.currentSiteBaseUrl,
    () => externalApiKey.value,
    () => sub2apiApiKey.value,
  ],
  () => {
    scheduleFetchUpstreamImageModels()
  },
  { immediate: true }
)

watch(
  [
    () => promptHelperConfig.baseUrl,
    () => promptHelperConfig.apiKey,
  ],
  () => {
    scheduleFetchPromptHelperModels()
  },
  { immediate: true }
)

watch(
  () => previewLightboxOpen.value,
  (open) => {
    if (!open) {
      lightboxViewMode.value = 'natural'
      resetLightboxMagnifier()
      return
    }

    refreshLightboxLayout({ resetZoom: true })
  }
)

watch(
  () => previewTile.value?.id,
  (newId) => {
    resetLightboxMagnifier()
    lightboxNaturalSize.value = null
    if (previewLightboxOpen.value) {
      refreshLightboxLayout({ resetZoom: true })
    }
    if (newId) {
      const el = workbenchTileElements.get(newId)
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
      }
    }
  }
)

function formatNumber(value?: number | null, maximumFractionDigits = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return '-'
  }

  return new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

function formatUsageAmount(value?: number | null, unit?: string): string {
  if (value == null || !Number.isFinite(value)) {
    return '-'
  }

  const normalizedUnit = (unit || '').trim()
  if (!normalizedUnit || normalizedUnit.toUpperCase() === 'USD' || normalizedUnit === '$') {
    return new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return `${formatNumber(value)} ${normalizedUnit}`
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

function formatDurationMs(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return ''
  }
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}s`
}

function providerLabel(mode: ImageStudioProviderMode): string {
  switch (mode) {
    case 'sub2api':
      return t('imageStudio.history.providerLabels.sub2api')
    case 'gpt-image-playground':
      return t('imageStudio.history.providerLabels.gptImagePlayground')
    case 'external-browser':
      return t('imageStudio.history.providerLabels.externalBrowser')
    default:
      return t('imageStudio.history.providerLabels.externalRelay')
  }
}

function createWorkspaceTileId(historyId: string, resultId: string): string {
  return `${historyId}::${resultId}`
}

function readWorkspaceOrder(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_ORDER_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && !!item.trim())
      : []
  } catch {
    return []
  }
}

function writeWorkspaceOrder(tileIds: string[]) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(WORKSPACE_ORDER_STORAGE_KEY, JSON.stringify(tileIds))
  } catch {
    // Ordering is a convenience preference; keep the workspace usable if storage is unavailable.
  }
}

function clearWorkspaceOrder() {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.removeItem(WORKSPACE_ORDER_STORAGE_KEY)
  } catch {
    // Ignore unavailable local storage.
  }
}

function flattenHistoryItems(items: ImageStudioHistoryItem[]): ImageStudioWorkspaceTile[] {
  return items.flatMap((item) =>
    item.results.map((result) => ({
      id: createWorkspaceTileId(item.id, result.id),
      historyId: item.id,
      createdAt: item.createdAt,
      providerMode: item.providerMode,
      profile: item.profile,
      model: item.model,
      prompt: item.prompt,
      aspectRatio: item.aspectRatio,
      result,
      parentHistoryId: item.parentHistoryId,
      parentTileId: item.parentTileId,
    }))
  )
}

function orderWorkspaceTiles(tiles: ImageStudioWorkspaceTile[], prioritizedTileIds: string[] = []): ImageStudioWorkspaceTile[] {
  const tileMap = new Map(tiles.map((tile) => [tile.id, tile]))
  const ordered: ImageStudioWorkspaceTile[] = []

  prioritizedTileIds.forEach((tileId) => {
    const tile = tileMap.get(tileId)
    if (tile) {
      ordered.push(tile)
      tileMap.delete(tileId)
    }
  })

  readWorkspaceOrder().forEach((tileId) => {
    const tile = tileMap.get(tileId)
    if (tile) {
      ordered.push(tile)
      tileMap.delete(tileId)
    }
  })

  const remaining = Array.from(tileMap.values()).sort((left, right) => (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  ))

  return [...ordered, ...remaining]
}

function syncWorkspaceSelection(nextTiles: ImageStudioWorkspaceTile[], options: WorkspaceSyncOptions = {}) {
  const validTileIds = new Set(nextTiles.map((tile) => tile.id))
  const requestedSelectedIds = options.selectedTileIds ?? selectedTileIds.value
  selectedTileIds.value = Array.from(new Set(requestedSelectedIds.filter((tileId) => validTileIds.has(tileId))))

  const requestedPreviewId = options.previewTileId === undefined ? previewTileId.value : options.previewTileId
  if (requestedPreviewId && validTileIds.has(requestedPreviewId)) {
    previewTileId.value = requestedPreviewId
  } else {
    previewTileId.value = selectedTileIds.value[0] || nextTiles[0]?.id || null
  }

  const validHistoryIds = new Set(historyItems.value.map((item) => item.id))
  if (options.activeHistoryId && validHistoryIds.has(options.activeHistoryId)) {
    activeHistoryId.value = options.activeHistoryId
  } else if (!activeHistoryId.value || !validHistoryIds.has(activeHistoryId.value)) {
    activeHistoryId.value = historyItems.value[0]?.id || null
  }
}

function extractResultIdFromTileId(tileId: string): string {
  if (tileId.startsWith('tmp:')) {
    return tileId.slice(4)
  }
  const sepIndex = tileId.indexOf('::')
  return sepIndex >= 0 ? tileId.slice(sepIndex + 2) : tileId
}

function pruneTransientTiles(persistedTiles: ImageStudioWorkspaceTile[]): ImageStudioWorkspaceTile[] {
  const persistedResultIds = new Set(persistedTiles.map((tile) => extractResultIdFromTileId(tile.id)))
  const remaining = transientTiles.value.filter((tile) => !persistedResultIds.has(extractResultIdFromTileId(tile.id)))
  transientTiles.value = remaining
  return remaining
}

function rebuildWorkspace(options: WorkspaceSyncOptions = {}) {
  const nextTiles = orderWorkspaceTiles(flattenHistoryItems(historyItems.value), options.prioritizedTileIds)
  const remainingTransient = pruneTransientTiles(nextTiles)
  const merged = remainingTransient.length ? [...remainingTransient, ...nextTiles] : nextTiles
  workspaceTiles.value = merged
  writeWorkspaceOrder(nextTiles.map((tile) => tile.id))
  syncWorkspaceSelection(merged, options)
}

async function loadHistory(options: WorkspaceSyncOptions = {}) {
  revokeImageStudioHistoryItems(historyItems.value)
  historyItems.value = await listImageStudioHistoryItems()
  rebuildWorkspace(options)
}

function changeProviderMode(mode: ImageStudioProviderMode) {
  preferences.providerMode = mode
  if (mode === 'sub2api') {
    preferences.profile = 'sub2api-sora-compatible'
    preferences.model = 'gpt-image'
    return
  }

  if (mode === 'gpt-image-playground') {
    preferences.profile = 'openai-image-api'
    preferences.model = 'gpt-image-2'
    preferences.resolutionPreset = '4k'
    if (!preferences.externalBaseUrl.trim()) {
      preferences.externalBaseUrl = 'https://api.openai.com/v1'
    }
    return
  }

  if (preferences.profile === 'sub2api-sora-compatible') {
    preferences.profile = 'openai-image-api'
  }

  if (preferences.profile === 'xai-grok-image') {
    preferences.model = preferences.model.trim() || FALLBACK_XAI_GROK_IMAGE_MODELS[0]
    preferences.externalBaseUrl = preferences.externalBaseUrl.trim() || 'https://api.x.ai/v1'
  }
}

function applyStudioQaRouteState() {
  if (typeof window === 'undefined' || !workspaceTiles.value.length) {
    return
  }

  const params = new URLSearchParams(window.location.search)
  const requestedPreviewMode = params.get('qaPreviewMode')
  const requestedLightboxMode = params.get('qaLightbox')

  if (requestedPreviewMode === 'compare' && compareAvailable.value) {
    previewMode.value = 'compare'
  }

  if (requestedPreviewMode === 'original') {
    previewMode.value = 'original'
  }

  if (requestedLightboxMode === 'fit' || requestedLightboxMode === 'natural') {
    openPreviewLightbox(requestedLightboxMode)
  }
}

function applyPromptChip(chip: string) {
  prompt.value = prompt.value.trim() ? `${prompt.value} ${chip}` : chip
}

async function refreshPromptLibraryItems() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    savedPromptLibraryItems.value = []
    return
  }
  try {
    const items = await listImageStudioPromptLibraryItems()
    revokeImageStudioPromptLibraryItems(savedPromptLibraryItems.value)
    savedPromptLibraryItems.value = items
  } catch {
    savedPromptLibraryItems.value = []
  }
}

function historyProviderLabel(item: ImageStudioHistoryItem): string {
  if (item.providerMode === 'sub2api' && item.currentSiteProfile === 'chatgpt2api') {
    return t('imageStudio.history.providerLabels.externalRelay')
  }
  return providerLabel(item.providerMode)
}

function historySeedText(): string {
  return locale.value === 'zh' ? '种子' : 'Seed'
}

function normalizeHistorySeed(raw?: string): string {
  const value = (raw || '').trim()
  if (!value) return ''

  const normalized = value
    .replace(/(?:种子|seed)\s*[:：#-]?\s*/gi, '')
    .split(/[\/|,，]/)
    .map((part) => part.trim())
    .find((part) => part && !/^auto$/i.test(part))

  return normalized || ''
}

function historySeedLabel(item: ImageStudioHistoryItem): string {
  return normalizeHistorySeed(item.seed)
}

function historySeedCopyTitle(item: ImageStudioHistoryItem): string {
  const seed = historySeedLabel(item)
  return seed
    ? (locale.value === 'zh' ? `复制种子 ${seed}` : `Copy seed ${seed}`)
    : ''
}

async function copyHistorySeed(item: ImageStudioHistoryItem) {
  const seed = historySeedLabel(item)
  if (!seed) return
  try {
    await navigator.clipboard.writeText(seed)
    appStore.showSuccess(locale.value === 'zh' ? '种子已复制到剪贴板。' : 'Seed copied.')
  } catch {
    appStore.showError(locale.value === 'zh' ? '复制失败。' : 'Copy failed.')
  }
}

function historyStyleLabel(item: ImageStudioHistoryItem): string {
  if (item.stylePresetId) {
    const preset = stylePresets.value.find((option) => option.id === item.stylePresetId)
    if (preset?.title) return preset.title
  }
  return item.stylePresetTitle?.trim() || ''
}

function historyTimingLabel(item: ImageStudioHistoryItem): string {
  return [formatTime(item.createdAt), formatDurationMs(item.durationMs)]
    .filter(Boolean)
    .join(' ')
}

function historyResolutionLabel(item: ImageStudioHistoryItem): string {
  return item.actualSize?.trim() || item.requestedSize?.trim() || item.resolutionPreset?.toUpperCase() || '-'
}

function historyFormatLabel(item: ImageStudioHistoryItem): string {
  const result = item.results[0]
  const explicit = item.format?.trim()
  if (explicit) {
    return explicit.toUpperCase()
  }
  const mime = result?.mimeType?.toLowerCase() || ''
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPG'
  if (mime.includes('webp')) return 'WEBP'
  if (mime.includes('png')) return 'PNG'
  const ext = result?.filename?.split('.').pop()?.trim()
  return ext ? ext.toUpperCase() : '-'
}

function formatFileSize(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) {
    return locale.value === 'zh' ? '大小: -' : 'Size: -'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  const label = `${value.toFixed(digits)} ${units[unitIndex]}`
  return locale.value === 'zh' ? `大小: ${label}` : `Size: ${label}`
}

function historyFileSizeLabel(item: ImageStudioHistoryItem): string {
  return formatFileSize(item.results[0]?.blob?.size)
}

async function openPromptLibrary() {
  promptLibrarySearch.value = ''
  promptLibraryCategory.value = 'all'
  promptLibraryCategorySearch.value = ''
  promptLibraryCategoryMenuOpen.value = false
  promptLibraryOpen.value = true
  await refreshPromptLibraryItems()
}

function closePromptLibrary() {
  promptLibraryOpen.value = false
  promptLibraryCategoryMenuOpen.value = false
  promptLibraryCategorySearch.value = ''
  promptLibraryBatchMode.value = false
  promptLibrarySelectedIds.value = []
  promptLibraryApplyingId.value = null
  closePromptLibraryDetails()
  closePromptUploadModal()
}

function focusPromptTextarea() {
  nextTick(() => {
    promptTextareaRef.value?.focus()
  })
}

function applyPromptLibraryOption(nextPrompt: string, option?: PromptLibraryOption) {
  prompt.value = nextPrompt
  if (option) {
    selectedPromptLibraryOption.value = option
  }
  promptLibraryOpen.value = false
  closePromptLibraryDetails()
}

function openPromptLibraryDetails(option: PromptLibraryOption) {
  promptLibraryDetailsItem.value = option
  promptLibraryDetailsLightboxOpen.value = false
  promptLibraryDetailsLightboxScale.value = 1
  promptDetailsParticles.value = []
}

function closePromptLibraryDetails() {
  promptLibraryDetailsItem.value = null
  promptLibraryDetailsLightboxOpen.value = false
  promptLibraryDetailsLightboxScale.value = 1
  promptDetailsParticles.value = []
  clearPromptLibraryDetailsPreviewPress()
}

function selectPromptLibraryCategory(category: string) {
  promptLibraryCategory.value = category
  promptLibraryCategoryMenuOpen.value = false
}

function startPromptLibraryCategoryAdd() {
  const query = promptLibraryCategorySearch.value.trim()
  if (query) {
    promptLibraryDraftCategory.value = query
  }
  promptLibraryCategoryMenuOpen.value = false
  openPromptUploadModal()
}

async function handlePromptLibraryCardClick(option: PromptLibraryOption) {
  if (!promptLibraryBatchMode.value) {
    promptLibraryApplyingId.value = option.id
    await new Promise((resolve) => window.setTimeout(resolve, 170))
    applyPromptLibraryOption(option.prompt, option)
    promptLibraryApplyingId.value = null
    return
  }

  const index = promptLibrarySelectedIds.value.indexOf(option.id)
  if (index >= 0) {
    promptLibrarySelectedIds.value.splice(index, 1)
    return
  }
  promptLibrarySelectedIds.value.push(option.id)
}

function togglePromptLibraryBatchMode() {
  promptLibraryBatchMode.value = !promptLibraryBatchMode.value
  promptLibrarySelectedIds.value = []
}

async function deleteSelectedPromptLibraryOptions() {
  const selectedLocalIds = promptLibrarySelectedIds.value
    .filter((id) => savedPromptLibraryItems.value.some((item) => item.id === id))

  if (!selectedLocalIds.length) {
    promptLibrarySelectedIds.value = []
    return
  }

  const deletedSelectedTemplate = selectedPromptLibraryOption.value
    ? selectedLocalIds.includes(selectedPromptLibraryOption.value.id)
    : false

  try {
    await Promise.all(selectedLocalIds.map((id) => deleteImageStudioPromptLibraryItem(id)))
    appStore.showSuccess(t('imageStudio.promptWorkspace.localDeleted'))
    promptLibrarySelectedIds.value = []
    if (deletedSelectedTemplate) {
      selectedPromptLibraryOption.value = null
    }
    await refreshPromptLibraryItems()
  } catch {
    appStore.showError(t('imageStudio.promptWorkspace.localDeleteFailed'))
  }
}

function startPromptLibraryCardPress(option: PromptLibraryOption) {
  clearPromptLibraryLongPress()
  promptLibraryLongPressTimer = window.setTimeout(() => {
    openPromptLibraryDetails(option)
  }, 460)
}

function startPromptLibraryLongPress(option: PromptLibraryOption) {
  startPromptLibraryCardPress(option)
}

function clearPromptLibraryLongPress() {
  if (promptLibraryLongPressTimer !== null) {
    window.clearTimeout(promptLibraryLongPressTimer)
    promptLibraryLongPressTimer = null
  }
}

function startPromptLibraryDetailsPreviewPress(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('button')) return
  clearPromptLibraryDetailsPreviewPress()
  promptLibraryDetailsPreviewTimer = window.setTimeout(() => {
    promptLibraryDetailsLightboxScale.value = 1
    promptLibraryDetailsLightboxOpen.value = true
  }, 460)
}

function clearPromptLibraryDetailsPreviewPress() {
  if (promptLibraryDetailsPreviewTimer !== null) {
    window.clearTimeout(promptLibraryDetailsPreviewTimer)
    promptLibraryDetailsPreviewTimer = null
  }
}

function closePromptLibraryDetailsLightbox() {
  promptLibraryDetailsLightboxOpen.value = false
  promptLibraryDetailsLightboxScale.value = 1
}

function handlePromptLibraryDetailsLightboxWheel(event: WheelEvent) {
  const nextScale = promptLibraryDetailsLightboxScale.value + (event.deltaY < 0 ? 0.12 : -0.12)
  promptLibraryDetailsLightboxScale.value = Math.min(3, Math.max(0.45, Number(nextScale.toFixed(2))))
}

function openPromptUploadModal() {
  promptLibraryDraftMode.value = 'create'
  promptLibraryEditingId.value = ''
  promptUploadModalOpen.value = true
  promptLibraryDraftError.value = ''
  if (!promptLibraryDraftPrompt.value.trim()) {
    promptLibraryDraftPrompt.value = prompt.value.trim()
  }
}

function isUploadedPromptLibraryOption(option: PromptLibraryOption | null | undefined): boolean {
  if (!option) return false
  return savedPromptLibraryItems.value.some((item) => item.id === option.id)
}

function openSelectedPromptTemplateEditor() {
  const option = selectedPromptLibraryOption.value
  if (!isUploadedPromptLibraryOption(option)) {
    appStore.showWarning(locale.value === 'zh' ? '内置模板不能修改，请先上传为自己的提示词。' : 'Built-in templates cannot be edited. Upload it as your own prompt first.')
    return
  }
  const item = savedPromptLibraryItems.value.find((record) => record.id === option?.id)
  if (!item) {
    appStore.showWarning(locale.value === 'zh' ? '没有找到可编辑的上传提示词。' : 'Editable uploaded prompt was not found.')
    return
  }

  promptLibraryDraftMode.value = 'edit'
  promptLibraryEditingId.value = item.id
  promptLibraryDraftTitle.value = item.title || ''
  promptLibraryDraftDescription.value = item.description || ''
  promptLibraryDraftPrompt.value = item.prompt || ''
  promptLibraryDraftCategory.value = item.category || ''
  promptLibraryDraftImageFile.value = null
  promptLibraryDraftRemoveImage.value = false
  promptLibraryDraftError.value = ''
  if (promptLibraryDraftImageUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(promptLibraryDraftImageUrl.value)
  }
  promptLibraryDraftImageUrl.value = item.imageUrl || ''
  promptUploadModalOpen.value = true
}

function resetPromptLibraryDraft() {
  promptLibraryDraftMode.value = 'create'
  promptLibraryEditingId.value = ''
  promptLibraryDraftTitle.value = ''
  promptLibraryDraftDescription.value = ''
  promptLibraryDraftPrompt.value = ''
  promptLibraryDraftCategory.value = ''
  promptLibraryDraftImageFile.value = null
  promptLibraryDraftRemoveImage.value = false
  promptLibraryDraftError.value = ''
  promptLibraryDraftSaving.value = false
  if (promptLibraryDraftImageUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(promptLibraryDraftImageUrl.value)
  }
  promptLibraryDraftImageUrl.value = ''
}

function closePromptUploadModal() {
  promptUploadModalOpen.value = false
  resetPromptLibraryDraft()
}

function setPromptLibraryDraftImage(file: File | undefined) {
  promptLibraryDraftError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    promptLibraryDraftError.value = t('imageStudio.promptWorkspace.imageTypeInvalid')
    return
  }
  if (file.size > PROMPT_LIBRARY_IMAGE_MAX_BYTES) {
    promptLibraryDraftError.value = t('imageStudio.promptWorkspace.imageTooLarge')
    return
  }
  if (promptLibraryDraftImageUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(promptLibraryDraftImageUrl.value)
  }
  promptLibraryDraftImageFile.value = file
  promptLibraryDraftRemoveImage.value = false
  promptLibraryDraftImageUrl.value = URL.createObjectURL(file)
}

function removePromptLibraryDraftImage() {
  if (promptLibraryDraftImageUrl.value?.startsWith('blob:')) {
    URL.revokeObjectURL(promptLibraryDraftImageUrl.value)
  }
  promptLibraryDraftImageFile.value = null
  promptLibraryDraftImageUrl.value = ''
  promptLibraryDraftRemoveImage.value = true
}

function handlePromptLibraryImageSelect(event: Event) {
  const input = event.target as HTMLInputElement
  setPromptLibraryDraftImage(input.files?.[0])
  input.value = ''
}

function handlePromptLibraryImageDrop(event: DragEvent) {
  setPromptLibraryDraftImage(event.dataTransfer?.files?.[0])
}

async function savePromptLibraryDraft() {
  if (promptLibraryDraftSaving.value) {
    return
  }

  const promptText = promptLibraryDraftPrompt.value.trim()
  if (!promptText) {
    promptLibraryDraftError.value = t('imageStudio.promptWorkspace.localPromptRequired')
    return
  }

  if (!promptLibraryUsesRemoteStorage && (typeof window === 'undefined' || !window.indexedDB)) {
    promptLibraryDraftError.value = t('imageStudio.promptWorkspace.localStorageUnavailable')
    return
  }

  promptLibraryDraftSaving.value = true
  promptLibraryDraftError.value = ''

  try {
    const payload = {
      title: promptLibraryDraftTitle.value.trim() || t('imageStudio.promptWorkspace.uploadedPrompt'),
      description: promptLibraryDraftDescription.value.trim(),
      prompt: promptText,
      category: promptLibraryDraftCategory.value.trim(),
      imageBlob: promptLibraryDraftImageFile.value || undefined,
      imageMimeType: promptLibraryDraftImageFile.value?.type,
      imageFilename: promptLibraryDraftImageFile.value?.name,
      removeImage: promptLibraryDraftRemoveImage.value,
    }
    if (promptLibraryDraftMode.value === 'edit') {
      if (!promptLibraryEditingId.value) {
        throw new Error('Missing prompt library item id.')
      }
      await updateImageStudioPromptLibraryItem(promptLibraryEditingId.value, payload)
      if (selectedPromptLibraryOption.value?.id === promptLibraryEditingId.value) {
        prompt.value = promptText
      }
    } else {
      await saveImageStudioPromptLibraryItem(payload)
    }
    appStore.showSuccess(promptLibraryDraftMode.value === 'edit'
      ? (locale.value === 'zh' ? '提示词已更新。' : 'Prompt updated.')
      : (promptLibraryUsesRemoteStorage
          ? (locale.value === 'zh' ? '已保存到云端提示词库。' : 'Saved to the cloud prompt library.')
          : t('imageStudio.promptWorkspace.localSaved')))
    closePromptUploadModal()
    await refreshPromptLibraryItems()
  } catch (error) {
    const message = error instanceof Error ? error.message.trim() : ''
    const baseMessage = promptLibraryDraftMode.value === 'edit'
      ? (locale.value === 'zh' ? '更新提示词失败。' : 'Failed to update the prompt.')
      : (promptLibraryUsesRemoteStorage
          ? (locale.value === 'zh' ? '保存云端提示词失败。' : 'Failed to save the cloud prompt.')
          : t('imageStudio.promptWorkspace.localSaveFailed'))
    promptLibraryDraftError.value = message ? `${baseMessage} ${message}` : baseMessage
  } finally {
    promptLibraryDraftSaving.value = false
  }
}

function createPromptDetailsParticles(element: HTMLElement, x: number, y: number, count = 10) {
  const colors = ['#fb7185', '#f472b6', '#a78bfa', '#60a5fa', '#fbbf24', '#34d399']
  const symbols = ['*', '+', '.', 'x', '*']
  const scrollEl = element.querySelector('.studio-prompt-details-prompt-scroll') as HTMLElement | null
  const nextParticles = Array.from({ length: count }, (_, index) => {
    const spread = index - (count - 1) / 2
    return {
      id: ++promptDetailsParticleId,
      x: x + spread * 3 + (Math.random() - 0.5) * 14,
      y: y + (scrollEl?.scrollTop || 0) + (Math.random() - 0.5) * 16,
      dx: (Math.random() - 0.5) * 80,
      dy: 22 + Math.random() * 52,
      size: 14 + Math.random() * 10,
      color: colors[promptDetailsParticleId % colors.length],
      text: symbols[promptDetailsParticleId % symbols.length],
    }
  })
  promptDetailsParticles.value = [...promptDetailsParticles.value, ...nextParticles].slice(-96)
  window.setTimeout(() => {
    const ids = new Set(nextParticles.map((particle) => particle.id))
    promptDetailsParticles.value = promptDetailsParticles.value.filter((particle) => !ids.has(particle.id))
  }, 1100)
}

function burstPromptDetailsParticles(event: PointerEvent) {
  const box = event.currentTarget as HTMLElement
  const rect = box.getBoundingClientRect()
  createPromptDetailsParticles(box, event.clientX - rect.left, event.clientY - rect.top, 18)
}

function emitPromptDetailsParticles(event: MouseEvent) {
  if (promptDetailsParticleFrame) return
  promptDetailsParticleFrame = window.requestAnimationFrame(() => {
    promptDetailsParticleFrame = 0
    const box = event.currentTarget as HTMLElement
    const rect = box.getBoundingClientRect()
    createPromptDetailsParticles(box, event.clientX - rect.left, event.clientY - rect.top, 7)
  })
}

function clearPromptComposer() {
  prompt.value = ''
  negativePrompt.value = ''
}

function clampValue(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function setWorkbenchTileRef(
  tileId: string,
  element: Element | { $el?: Element | null } | null
) {
  const resolvedElement = element instanceof HTMLElement
    ? element
    : element && '$el' in element && element.$el instanceof HTMLElement
      ? element.$el
      : null

  if (resolvedElement) {
    workbenchTileElements.set(tileId, resolvedElement)
    return
  }

  workbenchTileElements.delete(tileId)
}

function updateLightboxNaturalSize() {
  if (!lightboxImageRef.value) {
    return
  }

  lightboxNaturalWidth.value = lightboxImageRef.value.naturalWidth || lightboxImageRef.value.clientWidth || 1
  lightboxNaturalHeight.value = lightboxImageRef.value.naturalHeight || lightboxImageRef.value.clientHeight || 1
}

function updateLightboxViewport() {
  if (!lightboxStageRef.value) {
    return
  }

  const style = window.getComputedStyle(lightboxStageRef.value)
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0
  const paddingRight = Number.parseFloat(style.paddingRight) || 0
  const paddingTop = Number.parseFloat(style.paddingTop) || 0
  const paddingBottom = Number.parseFloat(style.paddingBottom) || 0

  lightboxViewportOffsetX.value = paddingLeft
  lightboxViewportOffsetY.value = paddingTop
  lightboxViewportWidth.value = Math.max(1, lightboxStageRef.value.clientWidth - paddingLeft - paddingRight)
  lightboxViewportHeight.value = Math.max(1, lightboxStageRef.value.clientHeight - paddingTop - paddingBottom)
}

function clampLightboxPan(nextX: number, nextY: number) {
  const renderedWidth = lightboxRenderedWidth.value
  const renderedHeight = lightboxRenderedHeight.value
  const viewportWidth = lightboxViewportWidth.value
  const viewportHeight = lightboxViewportHeight.value

  if (!renderedWidth || !renderedHeight || !viewportWidth || !viewportHeight) {
    return { x: nextX, y: nextY }
  }

  const offsetX = lightboxViewportOffsetX.value
  const offsetY = lightboxViewportOffsetY.value
  const x = renderedWidth <= viewportWidth
    ? offsetX + (viewportWidth - renderedWidth) / 2
    : clampValue(nextX, offsetX + viewportWidth - renderedWidth, offsetX)

  const y = renderedHeight <= viewportHeight
    ? offsetY + (viewportHeight - renderedHeight) / 2
    : clampValue(nextY, offsetY + viewportHeight - renderedHeight, offsetY)

  return { x, y }
}

function resolveDefaultLightboxPan() {
  const renderedWidth = lightboxRenderedWidth.value
  const renderedHeight = lightboxRenderedHeight.value
  const viewportWidth = lightboxViewportWidth.value
  const viewportHeight = lightboxViewportHeight.value

  const offsetX = lightboxViewportOffsetX.value
  const offsetY = lightboxViewportOffsetY.value
  const nextX = renderedWidth >= viewportWidth ? offsetX : offsetX + (viewportWidth - renderedWidth) / 2
  const nextY = renderedHeight >= viewportHeight ? offsetY : offsetY + (viewportHeight - renderedHeight) / 2
  return clampLightboxPan(nextX, nextY)
}

function applyLightboxPan(nextX: number, nextY: number) {
  const clamped = clampLightboxPan(nextX, nextY)
  lightboxPanX.value = clamped.x
  lightboxPanY.value = clamped.y
}

function scheduleLightboxPan(nextX: number, nextY: number) {
  lightboxPendingPan.value = { x: nextX, y: nextY }
  if (lightboxPanFrame) {
    return
  }
  lightboxPanFrame = window.requestAnimationFrame(() => {
    lightboxPanFrame = 0
    const pending = lightboxPendingPan.value
    lightboxPendingPan.value = null
    if (pending) {
      applyLightboxPan(pending.x, pending.y)
    }
  })
}

function refreshLightboxLayout(options: { resetZoom?: boolean } = {}) {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      updateLightboxNaturalSize()
      updateLightboxViewport()

      if (options.resetZoom) {
        lightboxZoom.value = LIGHTBOX_ZOOM_MIN
        const defaults = resolveDefaultLightboxPan()
        lightboxPanX.value = defaults.x
        lightboxPanY.value = defaults.y
        return
      }

      applyLightboxPan(lightboxPanX.value, lightboxPanY.value)
    })
  })
}

function setLightboxZoom(nextZoom: number, anchor?: Pick<MouseEvent, 'clientX' | 'clientY'>) {
  if (!lightboxStageRef.value || !lightboxNaturalWidth.value || !lightboxNaturalHeight.value) {
    return
  }

  const clampedZoom = clampValue(nextZoom, LIGHTBOX_ZOOM_MIN, LIGHTBOX_ZOOM_MAX)
  if (Math.abs(clampedZoom - lightboxZoom.value) < 0.001) {
    return
  }

  updateLightboxViewport()
  const previousScale = lightboxRenderScale.value || 1
  const previousPanX = lightboxPanX.value
  const previousPanY = lightboxPanY.value

  lightboxZoom.value = clampedZoom

  if (!anchor) {
    const defaults = resolveDefaultLightboxPan()
    lightboxPanX.value = defaults.x
    lightboxPanY.value = defaults.y
    return
  }

  const stageRect = lightboxStageRef.value.getBoundingClientRect()
  const anchorX = anchor.clientX - stageRect.left
  const anchorY = anchor.clientY - stageRect.top
  const imageX = (anchorX - previousPanX) / previousScale
  const imageY = (anchorY - previousPanY) / previousScale

  if (
    !Number.isFinite(imageX) ||
    !Number.isFinite(imageY) ||
    imageX < 0 ||
    imageX > lightboxNaturalWidth.value ||
    imageY < 0 ||
    imageY > lightboxNaturalHeight.value
  ) {
    const defaults = resolveDefaultLightboxPan()
    lightboxPanX.value = defaults.x
    lightboxPanY.value = defaults.y
    return
  }

  const nextScale = lightboxRenderScale.value || 1
  applyLightboxPan(
    anchorX - (imageX * nextScale),
    anchorY - (imageY * nextScale)
  )
}

function stepLightboxZoom(direction: 1 | -1, anchor?: Pick<MouseEvent, 'clientX' | 'clientY'>) {
  const nextZoom = direction > 0
    ? lightboxZoom.value + LIGHTBOX_ZOOM_STEP
    : lightboxZoom.value - LIGHTBOX_ZOOM_STEP

  setLightboxZoom(nextZoom, anchor)
}

function openPreviewLightbox(mode: 'natural' | 'fit' = 'fit') {
  if (!previewTile.value) {
    return
  }

  lightboxViewMode.value = mode
  previewLightboxOpen.value = true
  resetLightboxMagnifier()
  refreshLightboxLayout({ resetZoom: true })
}

function closePreviewLightbox() {
  previewLightboxOpen.value = false
  lightboxViewMode.value = 'natural'
  lightboxPointerDown.value = false
  lightboxPointerButton.value = null
  lightboxDragStarted.value = false
  lightboxImmersive.value = false
  clearLightboxLongPressTimer()
  if (lightboxPanFrame) {
    window.cancelAnimationFrame(lightboxPanFrame)
    lightboxPanFrame = 0
  }
  lightboxPendingPan.value = null
  lightboxZoom.value = LIGHTBOX_ZOOM_MIN
  lightboxPanX.value = 0
  lightboxPanY.value = 0
  lightboxViewportOffsetX.value = 0
  lightboxViewportOffsetY.value = 0
  lightboxNaturalSize.value = null
  resetLightboxMagnifier()
}

function resetLightboxMagnifier() {
  lightboxMagnifierEnabled.value = false
  lightboxLensVisible.value = false
}

function toggleLightboxMagnifier() {
  if (!previewTile.value) {
    return
  }

  lightboxMagnifierEnabled.value = !lightboxMagnifierEnabled.value
  lightboxLensVisible.value = false
}

function hideLightboxMagnifier() {
  lightboxLensVisible.value = false
}

function handleLightboxImageLoad() {
  if (lightboxImageRef.value) {
    const w = lightboxImageRef.value.naturalWidth
    const h = lightboxImageRef.value.naturalHeight
    if (w && h) {
      lightboxNaturalSize.value = { width: w, height: h }
    }
  }
  refreshLightboxLayout({ resetZoom: true })
}

function clearLightboxLongPressTimer() {
  if (lightboxLongPressTimer.value !== null) {
    window.clearTimeout(lightboxLongPressTimer.value)
    lightboxLongPressTimer.value = null
  }
}

function handleLightboxStageMouseDown(event: MouseEvent) {
  if ((event.button !== 0 && event.button !== 2) || lightboxMagnifierEnabled.value) {
    return
  }

  lightboxPointerDown.value = true
  lightboxPointerButton.value = event.button
  lightboxDragStarted.value = false
  lightboxPointerStartX.value = event.clientX
  lightboxPointerStartY.value = event.clientY
  lightboxPanStartX.value = lightboxPanX.value
  lightboxPanStartY.value = lightboxPanY.value
  event.preventDefault()

  if (event.button === 0) {
    clearLightboxLongPressTimer()
    lightboxLongPressTimer.value = window.setTimeout(() => {
      if (lightboxPointerDown.value && !lightboxDragStarted.value) {
        lightboxImmersive.value = true
        refreshLightboxLayout()
      }
    }, LIGHTBOX_LONG_PRESS_MS)
  }
}

function handleLightboxWheel(event: WheelEvent) {
  if (lightboxMagnifierEnabled.value) {
    return
  }
  stepLightboxZoom(event.deltaY < 0 ? 1 : -1, event)
}

function handleLightboxPointerMove(event: MouseEvent) {
  if (
    !lightboxMagnifierEnabled.value ||
    !lightboxStageRef.value ||
    !lightboxNaturalWidth.value ||
    !lightboxNaturalHeight.value
  ) {
    return
  }

  const stageRect = lightboxStageRef.value.getBoundingClientRect()
  const stageX = event.clientX - stageRect.left
  const stageY = event.clientY - stageRect.top
  const imageX = (stageX - lightboxPanX.value) / (lightboxRenderScale.value || 1)
  const imageY = (stageY - lightboxPanY.value) / (lightboxRenderScale.value || 1)

  if (imageX < 0 || imageX > lightboxNaturalWidth.value || imageY < 0 || imageY > lightboxNaturalHeight.value) {
    lightboxLensVisible.value = false
    return
  }

  const renderedWidth = lightboxRenderedWidth.value
  const renderedHeight = lightboxRenderedHeight.value
  const magnifierScale = lightboxMagnifierScale.value
  const backgroundWidth = lightboxNaturalWidth.value * magnifierScale
  const backgroundHeight = lightboxNaturalHeight.value * magnifierScale
  const backgroundX = clampValue(
    (imageX * magnifierScale) - (LIGHTBOX_LENS_SIZE / 2),
    0,
    Math.max(0, backgroundWidth - LIGHTBOX_LENS_SIZE)
  )
  const backgroundY = clampValue(
    (imageY * magnifierScale) - (LIGHTBOX_LENS_SIZE / 2),
    0,
    Math.max(0, backgroundHeight - LIGHTBOX_LENS_SIZE)
  )
  const minLensX = lightboxPanX.value + (LIGHTBOX_LENS_SIZE / 2)
  const maxLensX = lightboxPanX.value + renderedWidth - (LIGHTBOX_LENS_SIZE / 2)
  const minLensY = lightboxPanY.value + (LIGHTBOX_LENS_SIZE / 2)
  const maxLensY = lightboxPanY.value + renderedHeight - (LIGHTBOX_LENS_SIZE / 2)

  lightboxLensX.value = clampValue(stageX, Math.min(minLensX, maxLensX), Math.max(minLensX, maxLensX))
  lightboxLensY.value = clampValue(stageY, Math.min(minLensY, maxLensY), Math.max(minLensY, maxLensY))
  lightboxLensBackgroundX.value = backgroundX
  lightboxLensBackgroundY.value = backgroundY
  lightboxLensBackgroundWidth.value = backgroundWidth
  lightboxLensBackgroundHeight.value = backgroundHeight
  lightboxLensVisible.value = true
}

function findStudioTitleTooltipTarget(rawTarget: EventTarget | null): HTMLElement | null {
  if (!(rawTarget instanceof Element) || !studioShellRef.value) {
    return null
  }
  const target = rawTarget.closest<HTMLElement>('[title], [data-studio-title-tooltip]')
  if (!target || !studioShellRef.value.contains(target)) {
    return null
  }
  return target
}

function detachStudioTitleTooltipText(target: HTMLElement): string {
  const title = target.getAttribute('title')
  if (title !== null) {
    target.dataset.studioTitleTooltip = title
    target.removeAttribute('title')
    return title.trim()
  }
  return (target.dataset.studioTitleTooltip || '').trim()
}

function restoreStudioTitleTooltipTarget(target: HTMLElement | null): void {
  if (!target) return
  const stored = target.dataset.studioTitleTooltip
  if (typeof stored !== 'string') return
  target.setAttribute('title', stored)
  delete target.dataset.studioTitleTooltip
}

function updateStudioTitleTooltipPosition(): void {
  const target = studioTitleTooltipTarget.value
  const tooltip = studioTitleTooltipRef.value
  if (!target || !tooltip) return

  const margin = 30
  const gap = 10
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxWidth = Math.max(220, Math.min(460, viewportWidth - margin * 2))

  studioTitleTooltipStyle.value = {
    ...studioTitleTooltipStyle.value,
    maxWidth: `${maxWidth}px`,
  }

  const targetRect = target.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const tooltipWidth = Math.min(tooltipRect.width || maxWidth, maxWidth)
  const tooltipHeight = tooltipRect.height || 1
  const centerX = targetRect.left + targetRect.width / 2
  const left = clampValue(centerX, margin + tooltipWidth / 2, viewportWidth - margin - tooltipWidth / 2)
  const topCandidate = targetRect.top - tooltipHeight - gap
  const bottomCandidate = targetRect.bottom + gap
  const hasRoomAbove = topCandidate >= margin
  const hasRoomBelow = bottomCandidate + tooltipHeight <= viewportHeight - margin
  const placeAbove = hasRoomAbove || !hasRoomBelow
  const top = clampValue(
    placeAbove ? topCandidate : bottomCandidate,
    margin,
    Math.max(margin, viewportHeight - tooltipHeight - margin),
  )

  studioTitleTooltipStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    maxWidth: `${maxWidth}px`,
    '--tooltip-origin': placeAbove ? 'bottom center' : 'top center',
  }
  studioTitleTooltipReady.value = true
}

function clearStudioTitleTooltipOpenTimer(): void {
  if (!studioTitleTooltipOpenTimer) return
  window.clearTimeout(studioTitleTooltipOpenTimer)
  studioTitleTooltipOpenTimer = 0
}

function showStudioTitleTooltip(target: HTMLElement, text: string, delay = 120): void {
  clearStudioTitleTooltipOpenTimer()
  if (!text) {
    restoreStudioTitleTooltipTarget(target)
    return
  }

  if (studioTitleTooltipTarget.value && studioTitleTooltipTarget.value !== target) {
    restoreStudioTitleTooltipTarget(studioTitleTooltipTarget.value)
  }

  studioTitleTooltipTarget.value = target
  studioTitleTooltipText.value = text
  studioTitleTooltipOpenTimer = window.setTimeout(() => {
    studioTitleTooltipOpenTimer = 0
    studioTitleTooltipReady.value = false
    studioTitleTooltipVisible.value = true
    window.addEventListener('resize', updateStudioTitleTooltipPosition)
    window.addEventListener('scroll', updateStudioTitleTooltipPosition, true)
    nextTick(updateStudioTitleTooltipPosition)
  }, delay)
}

function hideStudioTitleTooltip(): void {
  clearStudioTitleTooltipOpenTimer()
  restoreStudioTitleTooltipTarget(studioTitleTooltipTarget.value)
  studioTitleTooltipVisible.value = false
  studioTitleTooltipReady.value = false
  studioTitleTooltipText.value = ''
  studioTitleTooltipTarget.value = null
  window.removeEventListener('resize', updateStudioTitleTooltipPosition)
  window.removeEventListener('scroll', updateStudioTitleTooltipPosition, true)
}

function handleStudioTitleTooltipPointerOver(event: PointerEvent): void {
  const target = findStudioTitleTooltipTarget(event.target)
  if (!target || target === studioTitleTooltipTarget.value) return
  const text = detachStudioTitleTooltipText(target)
  showStudioTitleTooltip(target, text)
}

function handleStudioTitleTooltipPointerOut(event: PointerEvent): void {
  const target = studioTitleTooltipTarget.value
  if (!target) return
  const related = event.relatedTarget
  if (related instanceof Node && target.contains(related)) return
  hideStudioTitleTooltip()
}

function handleStudioTitleTooltipFocusIn(event: FocusEvent): void {
  const target = findStudioTitleTooltipTarget(event.target)
  if (!target) return
  const text = detachStudioTitleTooltipText(target)
  showStudioTitleTooltip(target, text, 0)
}

function handleStudioTitleTooltipFocusOut(event: FocusEvent): void {
  const target = studioTitleTooltipTarget.value
  if (!target) return
  const related = event.relatedTarget
  if (related instanceof Node && target.contains(related)) return
  hideStudioTitleTooltip()
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (releasePanelRef.value && !releasePanelRef.value.contains(target)) {
    avatarMenuOpen.value = false
    releasePanelOpen.value = false
    workspacePanelOpen.value = false
  }
  if (appearancePanelRef.value && !appearancePanelRef.value.contains(target)) {
    appearancePanelOpen.value = false
  }
  if (connectionPanelRef.value && !connectionPanelRef.value.contains(target)) {
    connectionPanelOpen.value = false
  }
  if (advancedPanelRef.value && !advancedPanelRef.value.contains(target)) {
    advancedPanelOpen.value = false
  }
  if (promptHelperPanelRef.value && !promptHelperPanelRef.value.contains(target)) {
    promptHelperPanelOpen.value = false
  }
  if (stylePanelRef.value && !stylePanelRef.value.contains(target)) {
    stylePanelOpen.value = false
  }
  if (qualityPanelRef.value && !qualityPanelRef.value.contains(target)) {
    qualityPanelOpen.value = false
  }
  if (seedPanelRef.value && !seedPanelRef.value.contains(target)) {
    seedPanelOpen.value = false
  }
  if (promptLibraryCategoryMenuRef.value && !promptLibraryCategoryMenuRef.value.contains(target)) {
    promptLibraryCategoryMenuOpen.value = false
  }
}

function handleGlobalMouseMove(event: MouseEvent) {
  if (
    lightboxPointerDown.value &&
    lightboxPointerButton.value === 0 &&
    lightboxZoom.value > 1.02
  ) {
    const deltaX = event.clientX - lightboxPointerStartX.value
    const deltaY = event.clientY - lightboxPointerStartY.value

    if (!lightboxDragStarted.value && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      lightboxDragStarted.value = true
      clearLightboxLongPressTimer()
    }

    if (lightboxDragStarted.value) {
      const nextX = lightboxPanStartX.value + deltaX
      const nextY = lightboxPanStartY.value + deltaY
      scheduleLightboxPan(nextX, nextY)
    }
  }

  if (workbenchSelectionActive.value) {
    updateWorkbenchSelection(event)
  }
}

function handleGlobalMouseUp(event: MouseEvent) {
  const shouldZoomOut = (
    lightboxPointerDown.value &&
    lightboxPointerButton.value === 2 &&
    !lightboxDragStarted.value &&
    !lightboxMagnifierEnabled.value
  )

  clearLightboxLongPressTimer()
  lightboxPointerDown.value = false
  lightboxPointerButton.value = null
  lightboxDragStarted.value = false

  if (shouldZoomOut) {
    stepLightboxZoom(-1, event)
  }

  if (workbenchSelectionActive.value) {
    finishWorkbenchSelection()
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.isComposing) {
    return
  }

  if (event.key === 'Escape') {
    if (promptReplacementModalOpen.value) {
      closePromptReplacementModal()
      return
    }
    if (compatibilityPreviewOpen.value) {
      compatibilityPreviewOpen.value = false
      return
    }
    if (promptHelperPanelOpen.value) {
      promptHelperPanelOpen.value = false
      return
    }
    if (connectionPanelOpen.value) {
      connectionPanelOpen.value = false
      return
    }
    if (advancedPanelOpen.value) {
      advancedPanelOpen.value = false
      return
    }
    if (appearancePanelOpen.value) {
      appearancePanelOpen.value = false
      return
    }
    if (stylePanelOpen.value) {
      stylePanelOpen.value = false
      return
    }
    if (qualityPanelOpen.value) {
      qualityPanelOpen.value = false
      return
    }
    if (seedPanelOpen.value) {
      seedPanelOpen.value = false
      return
    }
    if (referencePreviewOpen.value) {
      closeReferencePreview()
      return
    }
    if (lightboxImmersive.value) {
      lightboxImmersive.value = false
      refreshLightboxLayout()
      return
    }
    if (previewLightboxOpen.value) {
      closePreviewLightbox()
    }
    return
  }

  if (referencePreviewOpen.value) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      stepReferencePreview(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      stepReferencePreview(1)
    }
    return
  }

  if (!previewLightboxOpen.value) {
    return
  }

  const target = event.target as HTMLElement | null
  if (target) {
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
      return
    }
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    stepPreview(-1)
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    stepPreview(1)
    return
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    stepLightboxZoom(1)
    return
  }
  if (event.key === '-' || event.key === '_') {
    event.preventDefault()
    stepLightboxZoom(-1)
    return
  }
  if (event.key === '0') {
    event.preventDefault()
    lightboxZoom.value = LIGHTBOX_ZOOM_MIN
    refreshLightboxLayout({ resetZoom: true })
  }
}

function handleWindowResize() {
  if (previewLightboxOpen.value) {
    refreshLightboxLayout()
  }
  updateHistoryListViewportHeight()
  updateWorkbenchSurfaceViewportHeight()
}

function pickFallbackInspiration(): string {
  const pool = inspirationPrompts.value
  if (!pool.length) {
    return ''
  }
  const index = Math.floor(Math.random() * pool.length)
  return pool[index]
}

async function applyRandomInspiration() {
  if (promptHelperBusy.value) {
    return
  }
  if (!promptHelperConfigured.value) {
    const fallback = pickFallbackInspiration()
    if (fallback) {
      prompt.value = fallback
    }
    return
  }
  promptHelperBusy.value = 'inspire'
  const styleHint = selectedStylePreset.value?.title || ''
  const ratioHint = preferences.aspectRatio
  const localeHint = locale.value === 'zh' ? '中文' : 'English'
  const systemPrompt = `You are a senior text-to-image prompt designer. Output exactly one prompt in ${localeHint}. Use visually testable details: subject, action, environment, lighting, lens/composition, palette, mood, and one stylistic anchor. Avoid vague quality-tag piles and contradictions. 35-80 words. No quotes, no preface, no markdown, no list.`
  const userMessage = `Invent a fresh ${styleHint || 'cinematic'} image prompt suitable for aspect ratio ${ratioHint}. Avoid the obvious; make the subject and setting specific enough to render.`
  try {
    const result = await callPromptHelper([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ])
    prompt.value = result
    appStore.showSuccess(t('imageStudio.toasts.inspirationApplied'))
  } catch (error) {
    const message = error instanceof Error ? error.message : t('imageStudio.toasts.helperFailed')
    appStore.showError(message)
    const fallback = pickFallbackInspiration()
    if (fallback && !prompt.value.trim()) {
      prompt.value = fallback
    }
  } finally {
    promptHelperBusy.value = null
  }
}

async function applyPromptOptimization() {
  if (promptHelperBusy.value) {
    return
  }
  const draftPrompt = resolvePromptTemplateArguments(prompt.value).trim()
  if (!draftPrompt) {
    await applyRandomInspiration()
    return
  }
  if (!promptHelperConfigured.value) {
    const addition = locale.value === 'zh'
      ? '构图完整，主体突出，光影自然，细节干净。'
      : 'balanced composition, strong focal subject, natural lighting, clean detail.'
    if (!draftPrompt.includes(addition)) {
      prompt.value = `${draftPrompt} ${addition}`
    } else {
      prompt.value = draftPrompt
    }
    appStore.showWarning(t('imageStudio.toasts.helperConfigure'))
    return
  }
  promptHelperBusy.value = 'optimize'
  const styleHint = selectedStylePreset.value?.title || ''
  const ratioHint = preferences.aspectRatio
  const localeHint = locale.value === 'zh' ? '中文' : 'English'
  const systemPrompt = `You polish text-to-image prompts. Rewrite the user's draft in ${localeHint}, preserving intent and constraints. Add concrete cues for subject, action, lighting, lens/composition, palette, texture, and mood. Remove contradictions and avoid generic quality-tag stuffing. 40-90 words. Output only the rewritten prompt; no explanation, no quotes, no preface, no list, no markdown.`
  const userMessage = `Style preset: ${styleHint || 'cinematic realism'}. Aspect ratio: ${ratioHint}.\nDraft prompt:\n${draftPrompt}`
  try {
    const result = await callPromptHelper([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ])
    prompt.value = result
    appStore.showSuccess(t('imageStudio.toasts.optimizeApplied'))
  } catch (error) {
    const message = error instanceof Error ? error.message : t('imageStudio.toasts.helperFailed')
    appStore.showError(message)
  } finally {
    promptHelperBusy.value = null
  }
}

function randomizeSeed() {
  randomSeed.value = `${Math.floor(Math.random() * 9_999_999_999)}`
}

function closeCompatibilityPreview() {
  compatibilityPreviewOpen.value = false
}

function disableUpstreamCompatibility() {
  upstreamCompatibilityEnabled.value = false
  confirmedCompatibilityPrompt.value = ''
  compatibilityPreviewOpen.value = false
}

function keepOriginalCompatibilityPrompt() {
  disableUpstreamCompatibility()
}

function confirmCompatibilityPrompt() {
  const nextPrompt = compatibilityPreviewPrompt.value.trim()
  if (!nextPrompt) {
    appStore.showWarning(t('imageStudio.toasts.promptRequired'))
    return
  }
  confirmedCompatibilityPrompt.value = nextPrompt
  upstreamCompatibilityEnabled.value = true
  compatibilityPreviewOpen.value = false
}

function toggleUpstreamCompatibility() {
  if (upstreamCompatibilityEnabled.value) {
    disableUpstreamCompatibility()
    return
  }

  const basePrompt = resolvePromptTemplateArguments(buildPromptText()).trim()
  if (!basePrompt) {
    appStore.showWarning(t('imageStudio.toasts.promptRequired'))
    return
  }

  const compatible = resolveUpstreamCompatiblePrompt(basePrompt)
  compatibilityPreviewOriginal.value = basePrompt
  compatibilityPreviewPrompt.value = compatible.prompt || basePrompt
  compatibilityPreviewOpen.value = true
}

function resolveSub2ApiModel(aspectRatio: string): string {
  if (['16:9', '21:9', '4:3', '3:2', '5:4'].includes(aspectRatio)) {
    return 'gpt-image-landscape'
  }
  if (['9:16', '3:4', '2:3', '4:5'].includes(aspectRatio)) {
    return 'gpt-image-portrait'
  }
  return 'gpt-image'
}

function clearProgressResetTimer() {
  if (progressResetTimer !== null) {
    window.clearTimeout(progressResetTimer)
    progressResetTimer = null
  }
}

function startProgressAnimation(): () => void {
  clearProgressResetTimer()
  progress.value = 6
  const startedAt = performance.now()
  const timer = window.setInterval(() => {
    const elapsedSeconds = (performance.now() - startedAt) / 1000
    const target = elapsedSeconds < 18
      ? 6 + elapsedSeconds * 3.2
      : 64 + Math.min(31, (elapsedSeconds - 18) * 0.55)
    progress.value = Math.min(96, Math.max(progress.value + 0.4, target))
  }, 500)

  return () => {
    window.clearInterval(timer)
  }
}

function createHistoryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function dataUrlToImageBlob(dataUrl: string): Blob | null {
  const commaIndex = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || commaIndex <= 5) {
    return null
  }

  const metadata = dataUrl.slice(5, commaIndex)
  const payload = dataUrl.slice(commaIndex + 1)
  const mimeType = metadata.split(';', 1)[0] || 'image/png'
  const isBase64 = metadata.toLowerCase().includes(';base64')

  try {
    const binary = isBase64
      ? atob(payload)
      : decodeURIComponent(payload)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], {
      type: mimeType.startsWith('image/') ? mimeType : 'image/png',
    })
  } catch {
    return null
  }
}

async function ensureResultBlob(result: NormalizedImageResult): Promise<Blob> {
  if (result.blob) {
    return result.blob
  }

  const sourceUrl = result.originalUrl || result.url
  if (!sourceUrl) {
    throw new Error(t('imageStudio.toasts.downloadFailed'))
  }

  if (sourceUrl.startsWith('data:')) {
    const blob = dataUrlToImageBlob(sourceUrl)
    if (!blob) {
      throw new Error(t('imageStudio.toasts.downloadFailed'))
    }
    result.blob = blob
    result.mimeType = result.mimeType || blob.type
    return blob
  }

  if (sourceUrl.startsWith('blob:')) {
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(t('imageStudio.toasts.downloadFailed'))
    }
    const blob = await response.blob()
    result.blob = blob
    result.mimeType = result.mimeType || blob.type
    return blob
  }

  if (/^https?:\/\//i.test(sourceUrl)) {
    try {
      const response = await fetch(sourceUrl, {
        mode: 'cors',
        credentials: 'omit',
      })
      if (response.ok) {
        const blob = await response.blob()
        result.blob = blob
        result.mimeType = result.mimeType || blob.type
        return blob
      }
    } catch (error) {
      if (IMAGE_STUDIO_DEBUG) {
        console.warn('[image-studio] browser image fetch failed; falling back to relay download', error)
      }
    }
  }

  const blob = await downloadRemoteImage(sourceUrl, result.filename)
  result.blob = blob
  result.mimeType = result.mimeType || blob.type
  return blob
}

async function ensureHistoryResultBlobs(results: NormalizedImageResult[]): Promise<void> {
  let nextIndex = 0
  const workerCount = Math.min(2, results.length)
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < results.length) {
      const result = results[nextIndex]
      nextIndex += 1
      try {
        await ensureResultBlob(result)
      } catch (error) {
        if (IMAGE_STUDIO_DEBUG) {
          console.warn('[image-studio] result blob fetch failed; saving remote history fallback', error)
        }
      }
    }
  })

  await Promise.all(workers)
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Failed to convert image blob to data URL.'))
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read image blob.'))
    reader.readAsDataURL(blob)
  })
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function parsePixelSize(value: string): { width: number; height: number } | null {
  const match = /^\s*(\d+)\s*x\s*(\d+)\s*$/i.exec(value)
  if (!match) {
    return null
  }
  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }
  return { width, height }
}

function outputMimeTypeForFormat(format: string, fallback?: string): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'png':
      return 'image/png'
    default:
      return fallback?.startsWith('image/') ? fallback : 'image/png'
  }
}

function appendResolutionSuffix(filename: string, suffix: string): string {
  if (!suffix || suffix === 'standard') {
    return filename
  }

  const normalizedSuffix = `-${suffix}`
  const dotIndex = filename.lastIndexOf('.')
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  const extension = dotIndex > 0 ? filename.slice(dotIndex) : ''
  if (base.endsWith(normalizedSuffix)) {
    return filename
  }
  return `${base}${normalizedSuffix}${extension}`
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }
        reject(new Error('Failed to render the resized image.'))
      },
      mimeType,
      mimeType === 'image/jpeg' || mimeType === 'image/webp' ? 0.94 : undefined
    )
  })
}

async function resizeResultToPixelSize(
  result: NormalizedImageResult,
  target: { width: number; height: number },
  suffix: string
): Promise<NormalizedImageResult> {
  const sourceBlob = await ensureResultBlob(result)
  const bitmap = await createImageBitmap(sourceBlob)

  try {
    if (bitmap.width === target.width && bitmap.height === target.height) {
      if (IMAGE_STUDIO_DEBUG) {
        console.info('[image-studio] output already matches target size', {
          filename: result.filename,
          suffix,
          size: `${target.width}x${target.height}`,
          mimeType: sourceBlob.type || result.mimeType,
          bytes: sourceBlob.size,
        })
      }
      return result
    }

    if (IMAGE_STUDIO_DEBUG) {
      console.info('[image-studio] resizing output to requested preset', {
        filename: result.filename,
        suffix,
        sourceSize: `${bitmap.width}x${bitmap.height}`,
        targetSize: `${target.width}x${target.height}`,
        mimeType: sourceBlob.type || result.mimeType,
        sourceBytes: sourceBlob.size,
      })
    }

    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D rendering is unavailable in this browser.')
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, target.width, target.height)

    const mimeType = outputMimeTypeForFormat(preferences.format, result.mimeType || sourceBlob.type)
    const resizedBlob = await canvasToBlob(canvas, mimeType)
    const resizedUrl = URL.createObjectURL(resizedBlob)
    if (result.url.startsWith('blob:')) {
      URL.revokeObjectURL(result.url)
    }

    result.originalUrl = result.originalUrl || result.url
    result.url = resizedUrl
    result.source = 'data-url'
    result.mimeType = mimeType
    result.blob = resizedBlob
    result.filename = appendResolutionSuffix(result.filename, suffix)
    return result
  } finally {
    bitmap.close()
  }
}

async function readBlobImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob)
  try {
    return {
      width: bitmap.width,
      height: bitmap.height,
    }
  } finally {
    bitmap.close()
  }
}

function formatPixelDimensions(dimensions?: { width: number; height: number } | null): string | undefined {
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return undefined
  }
  return `${dimensions.width}x${dimensions.height}`
}

function readImageElementDimensions(url?: string): Promise<{ width: number; height: number } | null> {
  const source = (url || '').trim()
  if (!source || typeof Image === 'undefined') {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    const image = new Image()
    const timeout = window.setTimeout(() => {
      cleanup()
      resolve(null)
    }, 15000)

    function cleanup() {
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      cleanup()
      resolve(width > 0 && height > 0 ? { width, height } : null)
    }
    image.onerror = () => {
      cleanup()
      resolve(null)
    }
    image.src = source
  })
}

async function readResultImageDimensions(result?: NormalizedImageResult): Promise<{ width: number; height: number } | null> {
  if (!result) {
    return null
  }

  if (result.blob) {
    try {
      return await readBlobImageDimensions(result.blob)
    } catch {
      if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const url = URL.createObjectURL(result.blob)
        try {
          const dimensions = await readImageElementDimensions(url)
          if (dimensions) {
            return dimensions
          }
        } finally {
          URL.revokeObjectURL(url)
        }
      }
    }
  }

  return readImageElementDimensions(result.url || result.originalUrl)
}

async function readResultActualSize(result?: NormalizedImageResult): Promise<string | undefined> {
  return formatPixelDimensions(await readResultImageDimensions(result))
}

function isProviderScaledOutput(requestedSize?: string, actualSize?: string): boolean {
  const requested = parsePixelSize(requestedSize || '')
  const actual = parsePixelSize(actualSize || '')
  return Boolean(
    requested &&
    actual &&
    actual.width * actual.height < requested.width * requested.height
  )
}

function resolveHistoryOutputMode(
  outputMode: ImageStudioHistoryItem['outputMode'],
  requestedSize?: string,
  actualSize?: string
): ImageStudioHistoryItem['outputMode'] {
  if ((!outputMode || outputMode === 'native') && isProviderScaledOutput(requestedSize, actualSize)) {
    return 'provider-scaled'
  }
  return outputMode
}

async function auditGeneratedImageDimensions(results: NormalizedImageResult[], context: {
  model: string
  source: string
}) {
  if (!IMAGE_STUDIO_DEBUG) {
    return
  }

  if (!results.length) {
    return
  }

  const requestedSize = resolvedSize.value || ''
  const upstreamSize = upstreamGenerationSize.value || ''
  const requestedPixels = parsePixelSize(requestedSize)

  try {
    const items = await Promise.all(results.map(async (result) => {
      const blob = await ensureResultBlob(result)
      const dimensions = await readBlobImageDimensions(blob)
      const actualSize = `${dimensions.width}x${dimensions.height}`
      const localResizeApplied = Boolean(result.originalUrl)
      const nativeRequestMatched = Boolean(
        requestedPixels &&
        dimensions.width === requestedPixels.width &&
        dimensions.height === requestedPixels.height &&
        !localResizeApplied
      )

      return {
        filename: result.filename,
        requestedSize,
        upstreamSize,
        actualSize,
        nativeRequestMatched,
        localResizeApplied,
        mode: preferences.providerMode,
        profile: isCurrentSiteChatgpt2Api.value ? 'chatgpt2api' : preferences.profile,
        model: context.model,
        source: context.source,
        mimeType: blob.type || result.mimeType || '',
        bytes: blob.size,
      }
    }))

    console.info('[image-studio] generation output audit', items)
  } catch (error) {
    console.warn('[image-studio] generation output audit failed', error)
  }
}

async function applyOutputResolutionPreset(results: NormalizedImageResult[]): Promise<NormalizedImageResult[]> {
  if (!localUpscaleAllowed.value) {
    return results
  }

  if (!super4kTargetSize.value && (!supportsCustomResolution.value || preferences.resolutionPreset === 'standard')) {
    return results
  }

  const target = parsePixelSize(resolvedSize.value)
  if (!target) {
    return results
  }

  const suffix = super4kTargetSize.value ? 'super-4k' : preferences.resolutionPreset
  for (const result of results) {
    await resizeResultToPixelSize(result, target, suffix)
  }
  return results
}

interface PromptCompatibilityResult {
  prompt: string
  applied: boolean
}

interface PromptDescriptorRule {
  pattern: RegExp
  text: string
}

function normalizePromptWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function compactLongPromptForUpstream(rawPrompt: string, maxLength = 720): string {
  const normalized = normalizePromptWhitespace(rawPrompt)
  if (normalized.length <= maxLength) {
    return normalized
  }

  const sentences = normalized
    .split(/(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (!sentences.length) {
    return `${normalized.slice(0, maxLength).trim()}`
  }

  const selected: string[] = []
  let total = 0
  for (const sentence of sentences) {
    if (selected.length >= 6 || total + sentence.length > maxLength) {
      break
    }
    selected.push(sentence)
    total += sentence.length + 1
  }

  return selected.length ? selected.join(' ') : normalized.slice(0, maxLength).trim()
}

function matchesPrompt(rawPrompt: string, pattern: RegExp): boolean {
  return pattern.test(rawPrompt)
}

function pushPromptPart(parts: string[], value: string) {
  if (value && !parts.includes(value)) {
    parts.push(value)
  }
}

function collectPromptParts(rawPrompt: string, rules: PromptDescriptorRule[]): string[] {
  const parts: string[] = []
  for (const rule of rules) {
    if (matchesPrompt(rawPrompt, rule.pattern)) {
      pushPromptPart(parts, rule.text)
    }
  }
  return parts
}

function buildStylePromptPart(rawPrompt: string): string {
  const parts: string[] = []
  const hasAnime = /anime|manga|动漫|动画|二次元|アニメ|漫画/i.test(rawPrompt)
  const hasRealistic = /photo[-\s]?realistic|realistic|真实|写实|照片级|リアル|フォトリアル/i.test(rawPrompt)
  const hasDetailed = /highly detailed|detailed|intricate|精细|细节|高细节|詳細|精密/i.test(rawPrompt)

  if (hasDetailed) {
    pushPromptPart(parts, 'highly detailed')
  }

  if (hasAnime && hasRealistic) {
    pushPromptPart(parts, 'photorealistic anime-style')
  } else if (hasAnime) {
    pushPromptPart(parts, 'anime-style')
  } else if (hasRealistic) {
    pushPromptPart(parts, 'photorealistic')
  }

  if (/cinematic|电影感|影视感|シネマ|映画/i.test(rawPrompt)) {
    pushPromptPart(parts, 'cinematic')
  }

  return `${parts.length ? parts.join(' ') : 'detailed'} portrait`
}

function buildSubjectPromptPart(rawPrompt: string, hasExplicitMinor: boolean): string {
  if (hasExplicitMinor) {
    if (/\b(?:boy|male)\b|男|男性|男孩|少年|男の子|男性|少年/i.test(rawPrompt)) {
      return 'age-appropriate fully clothed male subject'
    }
    if (/\b(?:woman|girl|female)\b|女性|女子|女孩|少女|她|女の子|女性|少女|彼女/i.test(rawPrompt)) {
      return 'age-appropriate fully clothed female subject'
    }
    return 'age-appropriate fully clothed person'
  }

  if (/\b(?:man|male)\b|男|男性|男子|彼|男性/i.test(rawPrompt)) {
    return '25-year-old adult male fashion model'
  }

  if (/\b(?:woman|girl|female)\b|女性|女子|女孩|少女|她|女の子|女性|少女|彼女/i.test(rawPrompt)) {
    return '25-year-old adult female fashion model'
  }

  return '25-year-old adult fashion model'
}

function buildHairPromptPart(rawPrompt: string): string {
  const parts: string[] = []
  const colorRules: PromptDescriptorRule[] = [
    { pattern: /ash[-\s]?blonde|亚麻|浅金|灰金|アッシュブロンド/i, text: 'ash-blonde' },
    { pattern: /blonde|golden hair|金发|金色|金髪|ブロンド/i, text: 'blonde' },
    { pattern: /black hair|黑发|黑色头发|黒髪|黒い髪/i, text: 'black' },
    { pattern: /brown hair|棕发|棕色头发|茶髪|ブラウン/i, text: 'brown' },
    { pattern: /silver hair|white hair|银发|白发|銀髪|白髪/i, text: 'silver-white' },
    { pattern: /pink hair|粉发|粉色头发|ピンク髪/i, text: 'pink' },
    { pattern: /blue hair|蓝发|蓝色头发|青髪/i, text: 'blue' },
    { pattern: /red hair|auburn|红发|红色头发|赤髪/i, text: 'red' },
    { pattern: /purple hair|violet hair|紫发|紫色头发|紫髪/i, text: 'purple' },
  ]
  const color = collectPromptParts(rawPrompt, colorRules)[0]
  if (color) {
    pushPromptPart(parts, color)
  }

  if (/long hair|长发|長髪|ロングヘア/i.test(rawPrompt)) {
    pushPromptPart(parts, 'long')
  } else if (/short hair|短发|短髪|ショートヘア/i.test(rawPrompt)) {
    pushPromptPart(parts, 'short')
  }

  if (/flowing|blowing|wind|飘|吹|风中|風|なび/i.test(rawPrompt)) {
    pushPromptPart(parts, 'flowing gently in the wind')
  } else if (/wavy|卷发|波浪|ウェーブ/i.test(rawPrompt)) {
    pushPromptPart(parts, 'softly wavy')
  } else if (/straight hair|直发|直髪|ストレート/i.test(rawPrompt)) {
    pushPromptPart(parts, 'straight')
  }

  return parts.length ? `${parts.join(' ')} hair` : 'hair details matching the original prompt'
}

function buildOutfitPromptPart(rawPrompt: string, hasExplicitMinor: boolean): string {
  const hasCampusStyle = /school|campus|uniform|schoolyard|校服|学校|校园|制服|スクール|学校|制服|キャンパス/i.test(rawPrompt)
  const details = collectPromptParts(rawPrompt, [
    { pattern: /light gr[ae]y cardigan|灰色开衫|浅灰开衫|ライトグレー.*カーディガン/i, text: 'light grey cardigan' },
    { pattern: /cardigan|开衫|カーディガン/i, text: 'cardigan' },
    { pattern: /white (?:shirt|blouse)|白衬衫|白色衬衫|白いシャツ|白いブラウス/i, text: 'white blouse' },
    { pattern: /bow tie|ribbon|领结|蝴蝶结|リボン|蝶ネクタイ/i, text: 'bow tie' },
    { pattern: /dark plaid|plaid|tartan|格纹|格子|チェック/i, text: 'dark plaid accents' },
    { pattern: /pleated skirt|百褶裙|褶裙|プリーツスカート/i, text: hasExplicitMinor ? 'knee-length pleated skirt' : 'dark plaid pleated skirt' },
    { pattern: /knee[-\s]?high|long socks|stockings|及膝|长袜|过膝|ニーハイ|ハイソックス/i, text: hasExplicitMinor ? 'opaque socks' : 'dark knee-high socks' },
    { pattern: /loafers|leather shoes|乐福|皮鞋|ローファー/i, text: 'black loafers' },
    { pattern: /blazer|西装外套|制服外套|ブレザー/i, text: 'tailored blazer' },
    { pattern: /hoodie|卫衣|パーカー/i, text: 'hoodie' },
    { pattern: /dress|连衣裙|ワンピース|ドレス/i, text: 'dress' },
    { pattern: /kimono|和服|着物/i, text: 'kimono-inspired outfit' },
    { pattern: /hanfu|汉服|漢服/i, text: 'hanfu-inspired outfit' },
  ])

  const base = hasCampusStyle
    ? (hasExplicitMinor ? 'age-appropriate uniform-inspired outfit' : 'Japanese school-uniform-inspired fashion styling')
    : 'modest contemporary fashion outfit'
  const detailText = details.length ? ` with ${details.join(', ')}` : ' matching the original clothing colors and fabric details'
  return `${base}${detailText}, treated as adult editorial fashion styling, fully clothed, non-suggestive`
}

function buildPosePromptPart(rawPrompt: string, hasExplicitMinor: boolean): string {
  if (hasExplicitMinor) {
    return 'natural age-appropriate editorial pose, calm body language, non-suggestive framing'
  }

  const parts: string[] = []
  if (/kneel|kneeling|跪|跪姿|膝立ち/i.test(rawPrompt)) {
    pushPromptPart(parts, 'compact editorial kneeling pose')
  } else if (/crouch|crouching|squat|squatting|蹲|蹲下|しゃが/i.test(rawPrompt)) {
    pushPromptPart(parts, 'compact editorial crouching pose')
  } else if (/sitting|seated|坐|坐着|座る|座って/i.test(rawPrompt)) {
    pushPromptPart(parts, 'composed seated fashion pose')
  } else if (/standing|stand|站|站立|立つ|立って/i.test(rawPrompt)) {
    pushPromptPart(parts, 'composed standing fashion pose')
  } else if (/walking|running|walk|run|走路|行走|奔跑|歩く|走る/i.test(rawPrompt)) {
    pushPromptPart(parts, 'dynamic walking or running fashion pose')
  } else {
    pushPromptPart(parts, 'relaxed natural fashion pose')
  }

  if (/arms?.{0,24}knees?|手臂.{0,12}膝|胳膊.{0,12}膝|腕.{0,12}膝/i.test(rawPrompt)) {
    pushPromptPart(parts, 'arms resting naturally on the knees')
  }

  if (/looking slightly down|looking down|look down|低头|俯视|向下看|見下ろ|下を見る/i.test(rawPrompt)) {
    pushPromptPart(parts, 'subtle downward gaze toward the camera')
  } else if (/looking at (?:the )?camera|看镜头|看向镜头|カメラ目線|カメラを見る/i.test(rawPrompt)) {
    pushPromptPart(parts, 'looking toward the camera')
  }

  pushPromptPart(parts, 'calm composed body language')
  return parts.join(', ')
}

function buildCameraPromptPart(rawPrompt: string, hasExplicitMinor: boolean): string {
  const parts: string[] = []

  if (!hasExplicitMinor && /low[-\s]?angle|low camera|低角度|仰拍|ローアングル/i.test(rawPrompt)) {
    pushPromptPart(parts, 'low-position camera perspective for dramatic fashion composition')
    pushPromptPart(parts, 'modest non-voyeuristic framing')
  } else {
    pushPromptPart(parts, 'balanced camera angle with modest framing')
  }

  if (/close[-\s]?up|特写|近景|クローズアップ/i.test(rawPrompt)) {
    pushPromptPart(parts, 'portrait close-up composition')
  } else if (/full[-\s]?body|全身|全身像/i.test(rawPrompt)) {
    pushPromptPart(parts, 'full-body composition')
  } else if (/upper body|half body|半身|上半身/i.test(rawPrompt)) {
    pushPromptPart(parts, 'upper-body composition')
  }

  if (/blurred|bokeh|depth of field|虚化|景深|ボケ/i.test(rawPrompt)) {
    pushPromptPart(parts, 'soft depth of field')
  }

  return parts.join(', ')
}

function buildBackgroundPromptPart(rawPrompt: string, hasExplicitMinor: boolean): string {
  const parts = collectPromptParts(rawPrompt, [
    { pattern: /bright|明亮|晴朗|明るい/i, text: 'bright outdoor atmosphere' },
    { pattern: /blue sky|clear sky|蓝天|晴空|青空/i, text: 'clear blue sky' },
    { pattern: /cloud|云|雲/i, text: 'scattered soft clouds' },
    { pattern: /chain[-\s]?link fence|fence|围栏|铁丝网|フェンス/i, text: 'softly blurred chain-link fence' },
    { pattern: /green trees|trees|tree|绿树|树木|木|樹/i, text: 'green trees' },
    { pattern: /schoolyard|campus|school|校园|操场|学校|校庭|キャンパス/i, text: hasExplicitMinor ? 'outdoor courtyard setting' : 'campus-like outdoor courtyard atmosphere' },
    { pattern: /city|street|城市|街道|都市|通り/i, text: 'city street background' },
    { pattern: /forest|woods|森林|树林|森/i, text: 'forest background' },
    { pattern: /beach|sea|ocean|海边|海滩|海|ビーチ/i, text: 'coastal background' },
    { pattern: /room|indoor|bedroom|室内|房间|屋内|部屋/i, text: 'indoor background' },
    { pattern: /cafe|coffee shop|咖啡|カフェ/i, text: 'cafe background' },
  ])

  return parts.length ? parts.join(', ') : 'background elements matching the original prompt'
}

function buildLightingPromptPart(rawPrompt: string): string {
  const parts = collectPromptParts(rawPrompt, [
    { pattern: /natural daylight|daylight|自然光|日光|昼光/i, text: 'natural daylight' },
    { pattern: /soft light|soft lighting|柔光|柔和光|ソフトライト/i, text: 'soft lighting' },
    { pattern: /cinematic shadows|cinematic shadow|电影感阴影|影视阴影|シネマ.*影/i, text: 'soft cinematic shadows' },
    { pattern: /sunset|golden hour|夕阳|黄昏|日落|夕焼け/i, text: 'warm golden-hour light' },
    { pattern: /neon|霓虹|ネオン/i, text: 'neon lighting' },
  ])

  if (!parts.length) {
    return 'natural lighting, realistic fabric and skin texture'
  }

  pushPromptPart(parts, 'realistic fabric and skin texture')
  return parts.join(', ')
}

function buildPersonPromptCompatibility(rawPrompt: string, hasExplicitMinor: boolean): string {
  const parts = [
    `${buildStylePromptPart(rawPrompt)} of ${buildSubjectPromptPart(rawPrompt, hasExplicitMinor)}`,
    'adult fashion editorial tone',
    buildHairPromptPart(rawPrompt),
    buildOutfitPromptPart(rawPrompt, hasExplicitMinor),
    buildPosePromptPart(rawPrompt, hasExplicitMinor),
    buildCameraPromptPart(rawPrompt, hasExplicitMinor),
    buildBackgroundPromptPart(rawPrompt, hasExplicitMinor),
    buildLightingPromptPart(rawPrompt),
  ]

  return parts.filter(Boolean).join(', ')
}

function resolveUpstreamCompatiblePrompt(rawPrompt: string): PromptCompatibilityResult {
  const normalized = normalizePromptWhitespace(resolvePromptTemplateArguments(rawPrompt))
  if (!normalized) {
    return { prompt: '', applied: false }
  }

  const lower = normalized.toLowerCase()
  const hasPerson = /woman|girl|female|portrait|person|man|male|女性|女子|女孩|少女|人物|肖像|她|女の子|女性|少女|人物|ポートレート|彼女|男性|男子|男孩|少年|男の子|彼/.test(lower)
  const hasSchoolFashion = /school|campus|uniform|schoolyard|cardigan|pleated skirt|knee[-\s]?high|loafers|校服|学校|校园|操场|开衫|百褶裙|及膝|长袜|乐福|制服|キャンパス|校庭|カーディガン|プリーツスカート|ニーハイ|ローファー/.test(lower)
  const hasYouthCodedTerms = /young|girl|boy|schoolgirl|schoolboy|少女|女孩|男孩|少年|女の子|男の子|少女|少年/.test(lower)
  const hasExplicitMinor = /child|kid|minor|underage|preteen|teenage|teenager|schoolgirl|schoolboy|未成年|儿童|孩子|小孩|小学生|中学生|高中生|高校生|小学生|中学生|子供|未成年|児童|\b(?:[1-9]|1[0-7])[-\s]*(?:years?[-\s]*old|yo|y\/o)\b|(?:[1-9]|1[0-7])岁|(?:[1-9]|1[0-7])歳/.test(lower)
  const hasFragilePose = /crouch|crouching|squat|squatting|kneel|kneeling|low[-\s]?angle|low camera|looking down|knees|蹲|跪|低角度|仰拍|俯视|膝盖|しゃが|膝立ち|ローアングル|見下ろ|膝/.test(lower)
  const hasSensitiveClothing = /skirt|stockings|thigh[-\s]?high|knee[-\s]?high|pleated|短裙|裙|丝袜|长袜|过膝|ニーハイ|スカート/.test(lower)
  const shouldStabilizePersonPrompt = hasPerson && (
    ((hasSchoolFashion || hasYouthCodedTerms) && (hasFragilePose || hasSensitiveClothing || normalized.length > 220)) ||
    (hasFragilePose && hasSensitiveClothing)
  )

  if (shouldStabilizePersonPrompt) {
    return {
      prompt: buildPersonPromptCompatibility(normalized, hasExplicitMinor),
      applied: true,
    }
  }

  const compacted = compactLongPromptForUpstream(normalized)
  return {
    prompt: compacted,
    applied: compacted !== normalized,
  }
}

function buildPromptText(basePrompt?: string): string {
  const seedPrompt = resolvePromptTemplateArguments(basePrompt ?? prompt.value).trim()
  if (!seedPrompt) {
    return ''
  }

  const parts = [seedPrompt]

  if (selectedStylePreset.value?.promptHint) {
    parts.push(selectedStylePreset.value.promptHint)
  }

  if (negativePrompt.value.trim()) {
    parts.push(locale.value === 'zh' ? `避免：${negativePrompt.value.trim()}` : `Avoid: ${negativePrompt.value.trim()}`)
  }

  return parts.join('\n')
}

function buildImageToImagePrompt(basePrompt: string): string {
  const normalized = basePrompt.trim()
  const lockText = locale.value === 'zh'
    ? '图生图约束：参考图是主体、姿态、构图和镜头角度的最高优先级。严格保留参考图中的主体身份与外观特征、人物/物体位置、画面比例、景别、视角、动作姿态和主要场景结构；只根据上面的文字调整风格、光影、材质、服装细节或氛围。不要更换主体，不要改变姿势，不要重构构图，不要凭空添加遮挡主体的大元素。如果文字与参考图冲突，以参考图为准。'
    : 'Image-to-image constraint: the reference image has top priority for subject, pose, composition, and camera angle. Preserve the subject identity and visual traits, object/person placement, aspect framing, shot scale, perspective, pose/action, and main scene structure. Apply the text only to style, lighting, material, outfit detail, or mood. Do not replace the subject, change the pose, rebuild the composition, or add large elements that block the subject. If the text conflicts with the reference image, follow the reference image.'

  if (!normalized) {
    return lockText
  }
  return `${normalized}\n${lockText}`
}

function createExternalRequest(
  model: string,
  resolvedPromptText: string,
  imageInputs?: string[],
  sizeOverride?: string
): ExternalImageStudioRequest {
  const cleaned = (imageInputs || []).filter((s) => typeof s === 'string' && s.length > 0)
  const aspectValue = preferences.aspectRatio === 'default' ? '' : preferences.aspectRatio
  const baseUrl = isCurrentSiteChatgpt2Api.value ? currentSiteBaseUrl.value : preferences.externalBaseUrl
  const apiKey = isCurrentSiteChatgpt2Api.value ? sub2apiApiKey.value : externalApiKey.value
  const profile = isCurrentSiteChatgpt2Api.value ? 'chatgpt2api' : preferences.profile
  return {
    base_url: baseUrl,
    api_key: apiKey,
    profile,
    model,
    prompt: resolvedPromptText,
    count: effectiveCount.value,
    image_input: cleaned[0],
    image_inputs: cleaned.length ? cleaned : undefined,
    size: (sizeOverride ?? upstreamGenerationSize.value) || undefined,
    aspect_ratio: aspectValue || undefined,
    quality: preferences.quality,
    background: preferences.background,
    format: preferences.format,
    seed: randomSeed.value.trim() || undefined,
  }
}

async function persistCurrentResults(
  model: string,
  generatedResults: NormalizedImageResult[],
  resolvedPromptText: string,
  imageInputs?: string[],
  lineage?: { parentHistoryId?: string; parentTileId?: string }
) {
  const historyId = createHistoryId()

  await ensureHistoryResultBlobs(generatedResults)

  const cleanedInputs = (imageInputs || []).filter((s) => typeof s === 'string' && s.length > 0)
  const requestedSize = resolvedSize.value || undefined
  const actualSize = await readResultActualSize(generatedResults[0])
  const baseOutputMode: ImageStudioHistoryItem['outputMode'] = super4kTargetSize.value
    ? 'super-4k'
    : (!localUpscaleAllowed.value || preferences.resolutionPreset === 'standard' ? 'native' : 'upscaled')
  const outputMode = resolveHistoryOutputMode(baseOutputMode, requestedSize, actualSize)

  const historyItem: ImageStudioHistoryItem = {
    id: historyId,
    createdAt: new Date().toISOString(),
    providerMode: preferences.providerMode,
    profile: preferences.profile,
    currentSiteProfile: preferences.providerMode === 'sub2api' ? preferences.currentSiteProfile : undefined,
    model,
    prompt: resolvedPromptText,
    aspectRatio: preferences.aspectRatio,
    count: generatedResults.length,
    resolutionPreset: preferences.resolutionPreset,
    requestedSize,
    actualSize,
    outputMode,
    quality: preferences.quality,
    background: preferences.background,
    format: preferences.format,
    seed: randomSeed.value.trim() || undefined,
    stylePresetId: selectedStylePreset.value?.id,
    stylePresetTitle: selectedStylePreset.value?.title,
    durationMs: lastGenerationDurationMs.value || undefined,
    referenceImageUrl: cleanedInputs[0],
    referenceImageUrls: cleanedInputs.length ? cleanedInputs : undefined,
    parentHistoryId: lineage?.parentHistoryId,
    parentTileId: lineage?.parentTileId,
    results: generatedResults.map((result) => ({ ...result })),
  }

  const generatedTileIds = generatedResults.map((result) => createWorkspaceTileId(historyId, result.id))
  const workspaceSyncOptions = {
    prioritizedTileIds: generatedTileIds,
    selectedTileIds: generatedTileIds,
    previewTileId: generatedTileIds[0] || null,
    activeHistoryId: historyId,
  }

  const saveResult = await saveImageStudioHistoryItem(historyItem).catch((error) => {
    keepHistoryItemInCurrentSession(historyItem, workspaceSyncOptions)
    throw error
  })

  await loadHistory({
    ...workspaceSyncOptions,
  })

  return saveResult
}

async function ensureImageStudioPersistentStorage(options: { silent?: boolean } = {}) {
  try {
    const status = await requestImageStudioPersistentStorage()
    if (!status.supported || status.persisted) {
      return
    }
    if (!options.silent && !storagePersistenceWarningShown) {
      storagePersistenceWarningShown = true
      appStore.showWarning(t('imageStudio.toasts.localStorageMayBeEvicted'), 8000)
    }
  } catch {
    if (!options.silent && !storagePersistenceWarningShown) {
      storagePersistenceWarningShown = true
      appStore.showWarning(t('imageStudio.toasts.localStorageMayBeEvicted'), 8000)
    }
  }
}

function isLocalIpHost(hostname: string): boolean {
  return hostname === '127.0.0.1' ||
    hostname === '::1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
}

function warnIfOriginCanSplitLocalHistory() {
  if (typeof window === 'undefined') {
    return
  }

  if (!isLocalIpHost(window.location.hostname)) {
    return
  }

  const key = 'image-studio.local-origin-warning-shown'
  try {
    if (window.sessionStorage.getItem(key)) {
      return
    }
    window.sessionStorage.setItem(key, '1')
  } catch {
    // Session storage can be unavailable in private or hardened contexts.
  }

  appStore.showWarning(t('imageStudio.toasts.localOriginIsolationWarning'), 9000)
}

async function refreshSub2ApiUsage(options: { silent?: boolean } = {}) {
  if (!hasSub2ApiKey.value || sub2apiUsageLoading.value) {
    return
  }

  sub2apiUsageLoading.value = true
  sub2apiUsageError.value = ''

  try {
    sub2apiUsage.value = await fetchImageStudioUsage(sub2apiApiKey.value)
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : t('imageStudio.usage.queryFailed')
    sub2apiUsageError.value = message
    if (!options.silent) {
      appStore.showError(message)
    }
  } finally {
    sub2apiUsageLoading.value = false
  }
}

async function refreshChatgpt2ApiImageQuota(options: { silent?: boolean } = {}) {
  if (!hasSub2ApiKey.value || chatgpt2ApiQuotaLoading.value) {
    return
  }

  chatgpt2ApiQuotaLoading.value = true
  chatgpt2ApiQuotaError.value = ''

  try {
    chatgpt2ApiQuota.value = await fetchChatgpt2ApiImageQuota(currentSiteBaseUrl.value, sub2apiApiKey.value)
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : t('imageStudio.usage.imageQuotaQueryFailed')
    chatgpt2ApiQuotaError.value = message
    if (!options.silent) {
      appStore.showError(message)
    }
  } finally {
    chatgpt2ApiQuotaLoading.value = false
  }
}

async function refreshCurrentSiteUsage(options: { silent?: boolean } = {}) {
  if (isCurrentSiteChatgpt2Api.value) {
    await refreshChatgpt2ApiImageQuota(options)
    return
  }
  await refreshSub2ApiUsage(options)
}

function isAbortLikeError(error: unknown): boolean {
  if (!error) {
    return false
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  if (typeof error === 'object') {
    const candidate = error as { name?: string; code?: string }
    if (candidate.name === 'AbortError' || candidate.name === 'CanceledError') {
      return true
    }
    if (candidate.code === 'ERR_CANCELED') {
      return true
    }
  }
  return false
}

function normalizeErrorMessage(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function createGenerationErrorDescription(options: {
  title: string
  message: string
  detail?: string
  rawText?: string
  kind?: GenerationErrorKind
}): GenerationErrorDescription {
  const rawMessage = options.rawText ? normalizeErrorMessage(options.rawText) : ''
  return {
    title: options.title,
    message: options.message,
    detail: options.detail,
    rawMessage: rawMessage || undefined,
    kind: options.kind ?? 'generic',
  }
}

function classifyGenerationError(error: unknown): GenerationErrorDescription {
  const fallbackTitle = t('imageStudio.generationErrors.genericTitle')
  const fallbackMessage = t('imageStudio.generationErrors.genericMessage')
  if (!error) {
    return createGenerationErrorDescription({
      title: fallbackTitle,
      message: fallbackMessage,
    })
  }

  const candidate = error as { status?: number; message?: string }
  const text = error instanceof Error ? error.message : (typeof candidate.message === 'string' ? candidate.message : '')

  if (text && /504 gateway time-out|504 gateway timeout|gateway time-out|gateway timeout|openresty/i.test(text)) {
    return createGenerationErrorDescription({
      title: t('imageStudio.generationErrors.upstreamGatewayTimeoutTitle'),
      message: t('imageStudio.generationErrors.upstreamGatewayTimeoutMessage'),
      detail: t('imageStudio.generationErrors.upstreamGatewayTimeoutDetail'),
      rawText: text,
      kind: 'backend-unreachable',
    })
  }

  if (text && /image generation is not enabled for this group|generation is not enabled for this group|not enabled for this group|图片生成.*未启用|当前分组.*图片/i.test(text)) {
    return createGenerationErrorDescription({
      title: t('imageStudio.generationErrors.groupImageDisabledTitle'),
      message: t('imageStudio.generationErrors.groupImageDisabledMessage'),
      detail: t('imageStudio.generationErrors.groupImageDisabledDetail'),
      rawText: text,
    })
  }

  if (text && /stream disconnected|before completion/i.test(text)) {
    return createGenerationErrorDescription({
      title: t('imageStudio.generationErrors.streamDisconnectedTitle'),
      message: t('imageStudio.generationErrors.streamDisconnectedMessage'),
      detail: t('imageStudio.generationErrors.streamDisconnectedDetail'),
      rawText: text,
    })
  }

  if (candidate.status === 0 || (text && /Network Error|ECONNREFUSED|Failed to fetch/i.test(text))) {
    return createGenerationErrorDescription({
      title: t('imageStudio.generationErrors.backendTitle'),
      message: t('imageStudio.generationErrors.backendMessage'),
      detail: t('imageStudio.generationErrors.backendDetail'),
      rawText: text,
      kind: 'backend-unreachable',
    })
  }

  if (text && /failed to reach upstream provider|wsarecv|connection attempt failed|failed to respond|host has failed to respond|connection reset|eof/i.test(text)) {
    return createGenerationErrorDescription({
      title: t('imageStudio.generationErrors.upstreamConnectionTitle'),
      message: t('imageStudio.generationErrors.upstreamConnectionMessage'),
      detail: t('imageStudio.generationErrors.upstreamConnectionDetail'),
      rawText: text,
      kind: 'backend-unreachable',
    })
  }

  if (text) {
    return createGenerationErrorDescription({
      title: fallbackTitle,
      message: fallbackMessage,
      detail: t('imageStudio.generationErrors.genericDetail'),
      rawText: text,
    })
  }

  return createGenerationErrorDescription({
    title: fallbackTitle,
    message: fallbackMessage,
  })
}

function errorMessageText(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error !== 'object') return ''

  const record = error as Record<string, unknown>
  return [
    record.message,
    record.msg,
    record.detail,
    record.error,
    record.err_code,
    record.code,
  ]
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map((value) => String(value))
    .join(' ')
}

function isRetryableImageTransportError(error: unknown): boolean {
  const text = errorMessageText(error)
  return /stream disconnected|before completion|receive timeout|timeout|timed out|status code 50[0-9]|status 50[0-9]|gateway|bad gateway|service unavailable|network error|failed to fetch|eof|wsarecv|connection attempt failed|failed to respond|host has failed to respond|connection reset/i.test(text)
}

function isRetryableNativeResolutionError(error: unknown): boolean {
  const text = errorMessageText(error)

  return /invalid size|unsupported size|longest edge|image size|invalid_value|尺寸|分辨率/i.test(text)
}

function canFallbackToStandardResolution(error: unknown): boolean {
  return (
    localUpscaleAllowed.value &&
    (supportsCustomResolution.value || !!super4kTargetSize.value) &&
    (preferences.resolutionPreset !== 'standard' || !!super4kTargetSize.value) &&
    !!standardGenerationSize.value &&
    standardGenerationSize.value !== upstreamGenerationSize.value &&
    isRetryableNativeResolutionError(error)
  )
}

function showPrivateUpstreamBrowserFallbackWarning() {
  appStore.showWarning(locale.value === 'zh'
    ? '后端中转默认禁止访问私网地址，已改用浏览器直连。若要保持后端中转，请设置 ALLOW_PRIVATE_UPSTREAM=true 并重启后端。'
    : 'Relay mode blocks private upstream hosts by default, so browser direct mode was used. Set ALLOW_PRIVATE_UPSTREAM=true and restart the backend to keep using relay mode.')
}

async function generateWithExternalProvider(
  model: string,
  requestPromptText: string,
  imageInputs: string[],
  generationOptions: ImageStudioGenerationOptions
): Promise<NormalizedImageResult[]> {
  const runRelay = async (sizeOverride?: string) => {
    const request = createExternalRequest(model, requestPromptText, imageInputs, sizeOverride)
    try {
      return await generateImageWithExternalRelay(request, generationOptions)
    } catch (error) {
      if (isPrivateUpstreamBlockedError(error)) {
        if (!isGptImagePlaygroundMode.value) {
          showPrivateUpstreamBrowserFallbackWarning()
        }
        return await generateImageWithExternalBrowser(request, generationOptions)
      }
      throw error
    }
  }

  const runBrowser = async (sizeOverride?: string) => {
    try {
      return await generateImageWithExternalBrowser(
        createExternalRequest(model, requestPromptText, imageInputs, sizeOverride),
        generationOptions
      )
    } catch (error) {
      if (
        (error instanceof BrowserDirectGenerationError && error.fallbackSuggested) ||
        isRetryableImageTransportError(error)
      ) {
        appStore.showWarning(t('imageStudio.toasts.browserDirectFallback'))
        return await runRelay(sizeOverride)
      }
      throw error
    }
  }

  const runCurrentMode = (sizeOverride?: string) => (
    preferences.providerMode === 'external-relay' || isCurrentSiteChatgpt2Api.value
      ? runRelay(sizeOverride)
      : runBrowser(sizeOverride)
  )

  try {
    return await runCurrentMode()
  } catch (error) {
    if (!canFallbackToStandardResolution(error)) {
      throw error
    }

    appStore.showWarning(t('imageStudio.toasts.nativeResolutionFallback', {
      size: standardGenerationSize.value,
      target: resolvedSize.value,
    }))
    return await runCurrentMode(standardGenerationSize.value)
  }
}

function buildSyntheticTile(
  result: NormalizedImageResult,
  context: {
    model: string
    prompt: string
    aspectRatio: string
    profile: ImageStudioProtocolProfile
    createdAt: string
    parentHistoryId?: string
    parentTileId?: string
  }
): ImageStudioWorkspaceTile {
  return {
    id: `tmp:${result.id}`,
    historyId: `tmp-history:${result.id}`,
    createdAt: context.createdAt,
    providerMode: preferences.providerMode,
    profile: context.profile,
    model: context.model,
    prompt: context.prompt,
    aspectRatio: context.aspectRatio,
    result,
    parentHistoryId: context.parentHistoryId,
    parentTileId: context.parentTileId,
  }
}

function cloneResultForSessionHistory(result: NormalizedImageResult): NormalizedImageResult {
  if (!result.blob) {
    return { ...result }
  }

  return {
    ...result,
    originalUrl: result.originalUrl || result.url,
    url: URL.createObjectURL(result.blob),
  }
}

function keepHistoryItemInCurrentSession(
  item: ImageStudioHistoryItem,
  options: WorkspaceSyncOptions = {}
) {
  const sessionItem: ImageStudioHistoryItem = {
    ...item,
    results: item.results.map(cloneResultForSessionHistory),
  }
  historyItems.value = [
    sessionItem,
    ...historyItems.value.filter((historyItem) => historyItem.id !== item.id),
  ]
  rebuildWorkspace(options)
}

function prependSyntheticTiles(tiles: ImageStudioWorkspaceTile[]) {
  if (!tiles.length) {
    return
  }
  transientTiles.value = [...tiles, ...transientTiles.value]
  workspaceTiles.value = [...tiles, ...workspaceTiles.value]
  previewTileId.value = tiles[0].id
  activeHistoryId.value = tiles[0].historyId
  selectedTileIds.value = [tiles[0].id]
}

function startElapsedTracker() {
  generationStartedAt.value = performance.now()
  generationElapsedMs.value = 0
  const timer = window.setInterval(() => {
    if (generationStartedAt.value != null) {
      generationElapsedMs.value = performance.now() - generationStartedAt.value
    }
  }, 200)
  return () => {
    window.clearInterval(timer)
  }
}

function updateGenerationBatchProgress(next: ImageStudioBatchProgress) {
  generationBatchProgress.value = { ...next }
}

async function generateImages(options: {
  promptText?: string
  referenceImageData?: string | string[]
  parentHistoryId?: string
  parentTileId?: string
} = {}) {
  if (generating.value) {
    return
  }

  if (!options.promptText && autoCleanPlaceholders.value) {
    const cleanedEditorPrompt = resolvePromptTemplateArguments(prompt.value).trim()
    if (cleanedEditorPrompt && cleanedEditorPrompt !== prompt.value.trim()) {
      prompt.value = cleanedEditorPrompt
    }
  }
  const resolvedPromptText = resolvePromptTemplateArguments(options.promptText || buildPromptText()).trim()
  let requestPromptText = resolvedPromptText
  const overrideRaw = options.referenceImageData
  const overrideArray = Array.isArray(overrideRaw)
    ? overrideRaw
    : (overrideRaw ? [overrideRaw] : [])
  const imageInputs = (overrideArray.length ? overrideArray : referenceImages.value)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  const imageInput = imageInputs[0] || undefined
  if (imageInputs.length) {
    requestPromptText = buildImageToImagePrompt(requestPromptText)
  }

  if (!resolvedPromptText) {
    appStore.showWarning(t('imageStudio.toasts.promptRequired'))
    return
  }

  if (preferences.providerMode === 'sub2api' && !sub2apiApiKey.value.trim()) {
    appStore.showWarning(t('imageStudio.toasts.soraKeyRequired'))
    return
  }

  if (preferences.providerMode !== 'sub2api' && (!preferences.externalBaseUrl.trim() || !externalApiKey.value.trim())) {
    appStore.showWarning(t('imageStudio.toasts.externalConfigRequired'))
    return
  }

  if (upstreamCompatibilityEnabled.value) {
    const confirmedPrompt = confirmedCompatibilityPrompt.value.trim()
    if (!confirmedPrompt) {
      const compatible = resolveUpstreamCompatiblePrompt(resolvedPromptText)
      compatibilityPreviewOriginal.value = resolvedPromptText
      compatibilityPreviewPrompt.value = compatible.prompt || resolvedPromptText
      upstreamCompatibilityEnabled.value = false
      compatibilityPreviewOpen.value = true
      appStore.showWarning(t('imageStudio.promptCompatibility.title'))
      return
    }
    requestPromptText = confirmedPrompt
    appStore.showWarning(t('imageStudio.toasts.promptCompatibilityApplied'))
  }

  generationError.value = null
  clearProgressResetTimer()
  progress.value = 0
  generationElapsedMs.value = 0
  generationBatchProgress.value = effectiveCount.value > 1
    ? {
        total: effectiveCount.value,
        completed: 0,
        failed: 0,
        running: 0,
        queued: effectiveCount.value,
        items: Array.from({ length: effectiveCount.value }, (_item, index) => ({
          index,
          status: 'queued' as const,
          attempt: 0,
        })),
      }
    : null
  generating.value = true
  const controller = new AbortController()
  generationAbort.value = controller
  const stopProgress = startProgressAnimation()
  const stopElapsed = startElapsedTracker()

  try {
    let generatedResults: NormalizedImageResult[] = []
    const resolvedModel = preferences.providerMode === 'sub2api' && !isCurrentSiteChatgpt2Api.value
      ? resolveSub2ApiModel(preferences.aspectRatio)
      : preferences.model
    const profileForTiles = (preferences.providerMode === 'sub2api'
      ? preferences.currentSiteProfile
      : preferences.profile) as ImageStudioProtocolProfile
    const displayedResultIds = new Set<string>()
    const displayedResults: NormalizedImageResult[] = []
    const appendGeneratedResults = async (results: NormalizedImageResult[]) => {
      const uniqueResults = results.filter((result) => !displayedResultIds.has(result.id))
      if (!uniqueResults.length) {
        return
      }

      const preparedResults = await applyOutputResolutionPreset(uniqueResults)
      await auditGeneratedImageDimensions(preparedResults, {
        model: resolvedModel,
        source: 'preview',
      })
      preparedResults.forEach((result) => {
        displayedResultIds.add(result.id)
        displayedResults.push(result)
      })

      const createdAt = new Date().toISOString()
      const synthetic = preparedResults.map((result) =>
        buildSyntheticTile(result, {
          model: resolvedModel,
          prompt: resolvedPromptText,
          aspectRatio: preferences.aspectRatio,
          profile: profileForTiles,
          createdAt,
          parentHistoryId: options.parentHistoryId,
          parentTileId: options.parentTileId,
        })
      )
      prependSyntheticTiles(synthetic)
    }
    const generationOptions: ImageStudioGenerationOptions = {
      signal: controller.signal,
      onBatchProgress: updateGenerationBatchProgress,
      onImageResult: async (results) => {
        await appendGeneratedResults(results)
      },
    }

    if (preferences.providerMode === 'sub2api' && !isCurrentSiteChatgpt2Api.value) {
      const sub2apiPayload = {
        base_url: sub2apiBaseUrl,
        api_key: sub2apiApiKey.value,
        profile: 'sub2api-sora-compatible' as const,
        model: resolvedModel,
        prompt: requestPromptText,
        count: effectiveCount.value,
        image_input: imageInput,
        image_inputs: imageInputs.length ? imageInputs : undefined,
        aspect_ratio: preferences.aspectRatio,
        quality: preferences.quality,
        background: preferences.background,
        format: preferences.format,
      }
      try {
        generatedResults = await generateImageWithExternalBrowser(sub2apiPayload, generationOptions)
      } catch (error) {
        if (isAbortLikeError(error)) {
          throw error
        }
        if (
          (error instanceof BrowserDirectGenerationError && error.fallbackSuggested) ||
          isRetryableImageTransportError(error)
        ) {
          appStore.showWarning(t('imageStudio.toasts.browserDirectFallback'))
          generatedResults = await generateImageWithExternalRelay(sub2apiPayload, generationOptions)
        } else {
          throw error
        }
      }
    } else if (preferences.providerMode === 'external-relay' || isCurrentSiteChatgpt2Api.value) {
      generatedResults = await generateWithExternalProvider(
        resolvedModel,
        requestPromptText,
        imageInputs,
        generationOptions
      )
    } else {
      generatedResults = await generateWithExternalProvider(
        resolvedModel,
        requestPromptText,
        imageInputs,
        generationOptions
      )
    }

    if (!generatedResults.length && !displayedResults.length) {
      throw new Error(t('imageStudio.toasts.generateFailed'))
    }

    await appendGeneratedResults(generatedResults)
    generatedResults = [...displayedResults]
    const finalBatchProgress = generationBatchProgress.value

    const finalElapsed = generationStartedAt.value != null
      ? performance.now() - generationStartedAt.value
      : generationElapsedMs.value
    lastGenerationDurationMs.value = finalElapsed
    lastGenerationImageCount.value = Math.max(1, generatedResults.length)
    sessionStats.value = {
      ...sessionStats.value,
      successCount: sessionStats.value.successCount + generatedResults.length,
      lastDurationMs: finalElapsed,
      lastSuccessAt: Date.now(),
      lastFailureMessage: '',
    }
    progress.value = 100

    try {
      const historySaveResult = await persistCurrentResults(
        resolvedModel,
        generatedResults,
        resolvedPromptText,
        imageInputs,
        { parentHistoryId: options.parentHistoryId, parentTileId: options.parentTileId }
      )
      await ensureImageStudioPersistentStorage({ silent: true })

      if (historySaveResult.storedResultCount < historySaveResult.requestedResultCount) {
        appStore.showWarning(t('imageStudio.toasts.historySavedPartial', {
          done: historySaveResult.storedResultCount,
          total: historySaveResult.requestedResultCount,
        }), 8000)
      } else if (finalBatchProgress && finalBatchProgress.failed > 0 && generatedResults.length > 0) {
        appStore.showWarning(t('imageStudio.toasts.batchGeneratedPartial', {
          done: generatedResults.length,
          total: finalBatchProgress.total,
          failed: finalBatchProgress.failed,
        }))
      } else {
        appStore.showSuccess(t('imageStudio.toasts.generatedCount', { count: generatedResults.length }))
      }
    } catch (error) {
      generationError.value = createGenerationErrorDescription({
        title: t('imageStudio.toasts.historySaveFailed'),
        message: t('imageStudio.toasts.historySaveFailedMessage'),
        rawText: errorMessageText(error),
      })
      appStore.showError(t('imageStudio.toasts.historySaveFailed'))
    }

    if (preferences.providerMode === 'sub2api') {
      void refreshCurrentSiteUsage({ silent: true })
    }
  } catch (error) {
    if (!isAbortLikeError(error)) {
      const description = classifyGenerationError(error)
      generationError.value = description
      sessionStats.value = {
        ...sessionStats.value,
        failureCount: sessionStats.value.failureCount + 1,
        lastFailureMessage: description.title,
      }
      appStore.showError(description.title)
    }
  } finally {
    stopProgress()
    stopElapsed()
    generationStartedAt.value = null
    progressResetTimer = window.setTimeout(() => {
      progress.value = 0
      generationBatchProgress.value = null
      progressResetTimer = null
    }, 260)
    generating.value = false
    generationAbort.value = null
  }
}

function cancelGeneration() {
  if (generationAbort.value) {
    generationAbort.value.abort()
  }
}

function dismissGenerationError() {
  generationError.value = null
}

function recoverWithBrowserDirect() {
  generationError.value = null
  changeProviderMode('external-browser')
  void generateImages()
}

const testConnectionLabel = computed(() => {
  switch (testConnectionState.value.kind) {
    case 'busy': return t('imageStudio.testConnection.busy')
    case 'ok': return t('imageStudio.testConnection.ok')
    case 'fail': return testConnectionState.value.message || t('imageStudio.testConnection.fail')
    default: return t('imageStudio.testConnection.idle')
  }
})

async function testUpstreamConnection() {
  const candidates = externalApiBaseCandidates(preferences.externalBaseUrl)
  const apiKey = externalApiKey.value.trim()
  if (!candidates.length || !apiKey) {
    return
  }
  testConnectionState.value = { kind: 'busy' }
  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    let modelIds: string[] = []
    let resolvedBaseUrl = candidates[0]
    let lastError: unknown = null
    for (const candidate of candidates) {
      try {
        modelIds = await fetchImageModelIds(candidate, apiKey, controller.signal, activeImageProbeProfile())
        resolvedBaseUrl = candidate
        break
      } catch (error) {
        lastError = error
      }
    }
    window.clearTimeout(timeout)
    if (!modelIds.length && lastError) {
      throw lastError
    }
    detectedImageModels.value = modelIds
    if (
      preferences.profile === 'sub2api-sora-compatible' &&
      modelIds.some((modelId) => /^gpt-image(?:[-.\w]*)?$/i.test(modelId))
    ) {
      preferences.profile = 'openai-image-api'
      appStore.showWarning(locale.value === 'zh'
        ? '检测到 gpt-image 图片接口，已切换为 OpenAI 图片接口。'
        : 'Detected a gpt-image Images API upstream and switched to OpenAI Images API.')
    }
    if (resolvedBaseUrl !== preferences.externalBaseUrl.trim().replace(/\/+$/, '')) {
      preferences.externalBaseUrl = resolvedBaseUrl
    }
    testConnectionState.value = { kind: 'ok' }
    window.setTimeout(() => {
      if (testConnectionState.value.kind === 'ok') {
        testConnectionState.value = { kind: 'idle' }
      }
    }, 4000)
  } catch (error) {
    const msg = error instanceof Error ? error.message : t('imageStudio.testConnection.fail')
    testConnectionState.value = { kind: 'fail', message: msg }
  }
}

async function testCurrentSiteConnection() {
  const apiKey = sub2apiApiKey.value.trim()
  if (!apiKey) {
    return
  }

  testConnectionState.value = { kind: 'busy' }
  try {
    if (isCurrentSiteChatgpt2Api.value) {
      const candidates = currentSiteApiBaseCandidates()
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 8000)
      let modelIds: string[] = []
      let resolvedBaseUrl = candidates[0]
      let lastError: unknown = null
      for (const candidate of candidates) {
        try {
          modelIds = await fetchImageModelIds(candidate, apiKey, controller.signal, 'chatgpt2api')
          resolvedBaseUrl = candidate
          break
        } catch (error) {
          lastError = error
        }
      }
      window.clearTimeout(timeout)
      if (!modelIds.length && lastError) {
        throw lastError
      }
      detectedImageModels.value = modelIds.length ? modelIds : ['gpt-image-2']
      if (!detectedImageModels.value.includes(preferences.model)) {
        preferences.model = detectedImageModels.value.includes('gpt-image-2') ? 'gpt-image-2' : detectedImageModels.value[0]
      }
      if (resolvedBaseUrl && resolvedBaseUrl !== currentSiteBaseUrl.value) {
        preferences.currentSiteBaseUrl = resolvedBaseUrl
      }
      await refreshChatgpt2ApiImageQuota({ silent: true })
    } else {
      await refreshSub2ApiUsage({ silent: true })
    }
    testConnectionState.value = { kind: 'ok' }
    window.setTimeout(() => {
      if (testConnectionState.value.kind === 'ok') {
        testConnectionState.value = { kind: 'idle' }
      }
    }, 4000)
  } catch (error) {
    const msg = error instanceof Error ? error.message : t('imageStudio.testConnection.fail')
    testConnectionState.value = { kind: 'fail', message: msg }
  }
}

function focusTile(tileId: string, options: { multi?: boolean } = {}) {
  const tile = workspaceTiles.value.find((item) => item.id === tileId)
  if (!tile) {
    return
  }

  activeHistoryId.value = tile.historyId
  previewTileId.value = tile.id

  if (options.multi) {
    toggleTileSelection(tile.id)
    return
  }

  selectedTileIds.value = [tile.id]
}

function toggleTileSelection(tileId: string) {
  const next = new Set(selectedTileIds.value)
  if (next.has(tileId)) {
    next.delete(tileId)
  } else {
    next.add(tileId)
  }
  selectedTileIds.value = Array.from(next)
}

function openTileLightbox(tileId: string, mode: 'natural' | 'fit' = 'fit') {
  focusTile(tileId)
  openPreviewLightbox(mode)
}

function handleWorkbenchTileClick(tileId: string, event: MouseEvent) {
  if (Date.now() < workbenchIgnoreClickUntil.value) {
    return
  }

  if (event.metaKey || event.ctrlKey) {
    focusTile(tileId, { multi: true })
    return
  }

  focusTile(tileId)
}

function getWorkbenchPointerPosition(event: MouseEvent) {
  if (!workbenchSurfaceRef.value) {
    return { x: 0, y: 0 }
  }

  const surfaceRect = workbenchSurfaceRef.value.getBoundingClientRect()
  return {
    x: event.clientX - surfaceRect.left + workbenchSurfaceRef.value.scrollLeft,
    y: event.clientY - surfaceRect.top + workbenchSurfaceRef.value.scrollTop,
  }
}

function handleWorkbenchSurfaceMouseDown(event: MouseEvent) {
  if (event.button !== 0 || !workbenchSurfaceRef.value) {
    return
  }

  const target = event.target as HTMLElement | null
  if (target?.closest('[data-workbench-tile]')) {
    return
  }

  const pointer = getWorkbenchPointerPosition(event)
  workbenchSelectionActive.value = true
  workbenchSelectionAppend.value = event.metaKey || event.ctrlKey
  workbenchSelectionBaseIds.value = workbenchSelectionAppend.value ? [...selectedTileIds.value] : []
  workbenchSelectionStartX.value = pointer.x
  workbenchSelectionStartY.value = pointer.y
  workbenchSelectionCurrentX.value = pointer.x
  workbenchSelectionCurrentY.value = pointer.y

  if (!workbenchSelectionAppend.value) {
    selectedTileIds.value = []
  }

  event.preventDefault()
}

function updateWorkbenchSelection(event: MouseEvent) {
  if (!workbenchSelectionActive.value || !workbenchSurfaceRef.value) {
    return
  }

  const pointer = getWorkbenchPointerPosition(event)
  workbenchSelectionCurrentX.value = pointer.x
  workbenchSelectionCurrentY.value = pointer.y

  const left = Math.min(workbenchSelectionStartX.value, workbenchSelectionCurrentX.value)
  const top = Math.min(workbenchSelectionStartY.value, workbenchSelectionCurrentY.value)
  const right = Math.max(workbenchSelectionStartX.value, workbenchSelectionCurrentX.value)
  const bottom = Math.max(workbenchSelectionStartY.value, workbenchSelectionCurrentY.value)
  const surfaceRect = workbenchSurfaceRef.value.getBoundingClientRect()
  const nextSelection = new Set(workbenchSelectionAppend.value ? workbenchSelectionBaseIds.value : [])

  workspaceTiles.value.forEach((tile) => {
    const element = workbenchTileElements.get(tile.id)
    if (!element) {
      return
    }

    const tileRect = element.getBoundingClientRect()
    const tileLeft = tileRect.left - surfaceRect.left + workbenchSurfaceRef.value!.scrollLeft
    const tileTop = tileRect.top - surfaceRect.top + workbenchSurfaceRef.value!.scrollTop
    const tileRight = tileLeft + tileRect.width
    const tileBottom = tileTop + tileRect.height
    const intersects = tileLeft <= right && tileRight >= left && tileTop <= bottom && tileBottom >= top

    if (intersects) {
      nextSelection.add(tile.id)
    }
  })

  selectedTileIds.value = Array.from(nextSelection)
}

function finishWorkbenchSelection() {
  workbenchSelectionActive.value = false

  const lastSelectedId = selectedTileIds.value[selectedTileIds.value.length - 1]
  if (!lastSelectedId) {
    return
  }

  const tile = workspaceTiles.value.find((item) => item.id === lastSelectedId)
  if (!tile) {
    return
  }

  previewTileId.value = tile.id
  activeHistoryId.value = tile.historyId
}

function reorderWorkspaceTiles(dragTileId: string, targetTileId: string) {
  if (!dragTileId || !targetTileId || dragTileId === targetTileId) {
    return
  }

  const currentTiles = [...workspaceTiles.value]
  const selectedSet = new Set(selectedTileIds.value)
  const movingIds = selectedSet.has(dragTileId)
    ? currentTiles.filter((tile) => selectedSet.has(tile.id)).map((tile) => tile.id)
    : [dragTileId]

  if (movingIds.includes(targetTileId)) {
    return
  }

  const movingTiles = currentTiles.filter((tile) => movingIds.includes(tile.id))
  const remainingTiles = currentTiles.filter((tile) => !movingIds.includes(tile.id))
  const targetIndex = remainingTiles.findIndex((tile) => tile.id === targetTileId)
  if (targetIndex < 0) {
    return
  }

  remainingTiles.splice(targetIndex, 0, ...movingTiles)
  workspaceTiles.value = remainingTiles
  writeWorkspaceOrder(remainingTiles.map((tile) => tile.id))
}

function handleWorkbenchTileDragStart(tileId: string, event: DragEvent) {
  workbenchDragTileId.value = tileId
  if (!selectedTileIds.value.includes(tileId)) {
    focusTile(tileId)
  }

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tileId)
  }
}

function handleWorkbenchTileDragOver(tileId: string, event: DragEvent) {
  if (!workbenchDragTileId.value || workbenchDragTileId.value === tileId) {
    return
  }

  event.preventDefault()
  workbenchDropTileId.value = tileId
}

function handleWorkbenchTileDragLeave(tileId: string) {
  if (workbenchDropTileId.value === tileId) {
    workbenchDropTileId.value = null
  }
}

function handleWorkbenchTileDrop(tileId: string, event: DragEvent) {
  event.preventDefault()
  reorderWorkspaceTiles(
    workbenchDragTileId.value || event.dataTransfer?.getData('text/plain') || '',
    tileId
  )
  workbenchDropTileId.value = null
}

function handleWorkbenchTileDragEnd() {
  workbenchDragTileId.value = null
  workbenchDropTileId.value = null
  workbenchIgnoreClickUntil.value = Date.now() + 180
}

function selectHistoryRecord(id: string) {
  activeHistoryId.value = id
  const firstTile = workspaceTiles.value.find((tile) => tile.historyId === id)
  if (firstTile) {
    previewTileId.value = firstTile.id
    selectedTileIds.value = [firstTile.id]
  }
}

function restoreHistoryRecord(id: string) {
  const item = historyItems.value.find((historyItem) => historyItem.id === id)
  if (!item) {
    return
  }

  prompt.value = item.prompt
  negativePrompt.value = ''
  preferences.providerMode = item.providerMode
  preferences.profile = item.profile
  if (item.providerMode === 'sub2api') {
    preferences.currentSiteProfile = item.currentSiteProfile || item.profile
  }
  preferences.model = item.model === 'gpt-image-landscape' || item.model === 'gpt-image-portrait' ? 'gpt-image' : item.model
  preferences.aspectRatio = item.aspectRatio
  preferences.count = item.count
  if (item.resolutionPreset) preferences.resolutionPreset = item.resolutionPreset
  if (item.quality) preferences.quality = item.quality
  if (item.background) preferences.background = item.background
  if (item.format) preferences.format = item.format
  randomSeed.value = item.seed || ''
  if (item.stylePresetId) selectedStylePresetId.value = item.stylePresetId
  if (item.referenceImageUrls && item.referenceImageUrls.length) {
    referenceImages.value = [...item.referenceImageUrls]
  } else if (item.referenceImageUrl) {
    referenceImages.value = [item.referenceImageUrl]
  } else {
    referenceImages.value = []
  }
  selectHistoryRecord(id)
}

async function removeHistoryRecord(id: string) {
  if (!window.confirm(t('imageStudio.sidebar.deleteHistoryConfirm'))) {
    return
  }

  await deleteImageStudioHistoryItem(id)
  await loadHistory()
}

function stepPreview(offset: number) {
  if (!previewTile.value || !previewGroupTiles.value.length) {
    return
  }

  const currentIndex = previewGroupTiles.value.findIndex((tile) => tile.id === previewTile.value?.id)
  if (currentIndex < 0) {
    return
  }

  const nextIndex = currentIndex + offset
  const nextTile = previewGroupTiles.value[nextIndex]
  if (!nextTile) {
    return
  }

  previewTileId.value = nextTile.id
  selectedTileIds.value = [nextTile.id]
  lightboxLensVisible.value = false
  if (previewLightboxOpen.value) {
    refreshLightboxLayout({ resetZoom: true })
  }
}

async function downloadTileById(tileId: string) {
  const tile = workspaceTiles.value.find((item) => item.id === tileId)
  if (!tile) {
    appStore.showWarning(t('imageStudio.toasts.selectionRequired'))
    return
  }

  try {
    const blob = await ensureResultBlob(tile.result)
    triggerBlobDownload(blob, tile.result.filename)
  } catch (error) {
    appStore.showError(error instanceof Error ? error.message : t('imageStudio.toasts.downloadFailed'))
  }
}

async function downloadCurrentTile() {
  if (!previewTile.value) {
    appStore.showWarning(t('imageStudio.toasts.noActiveImage'))
    return
  }

  await downloadTileById(previewTile.value.id)
}

async function downloadSelectedTiles() {
  if (!selectedTiles.value.length) {
    appStore.showWarning(t('imageStudio.toasts.selectionRequired'))
    return
  }

  let downloadedCount = 0
  let lastError: unknown = null
  for (const [index, tile] of selectedTiles.value.entries()) {
    try {
      const blob = await ensureResultBlob(tile.result)
      triggerBlobDownload(blob, tile.result.filename)
      downloadedCount += 1
      if (index < selectedTiles.value.length - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100))
      }
    } catch (error) {
      lastError = error
    }
  }

  if (downloadedCount === selectedTiles.value.length) {
    appStore.showSuccess(t('imageStudio.toasts.selectedDownloaded', { count: downloadedCount }))
    return
  }
  if (downloadedCount > 0) {
    appStore.showWarning(t('imageStudio.toasts.selectedDownloaded', { count: downloadedCount }))
    return
  }
  appStore.showError(lastError instanceof Error ? lastError.message : t('imageStudio.toasts.downloadFailed'))
}

async function copyCurrentTileImage() {
  if (!previewTile.value) {
    appStore.showWarning(t('imageStudio.toasts.noActiveImage'))
    return
  }

  if (!window.isSecureContext || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    appStore.showWarning(t('imageStudio.toasts.copyImageUnsupported'))
    return
  }

  try {
    const blob = await ensureResultBlob(previewTile.value.result)
    const mimeType = blob.type || 'image/png'
    await navigator.clipboard.write([
      new ClipboardItem({
        [mimeType]: blob,
      }),
    ])
    appStore.showSuccess(t('imageStudio.toasts.imageCopied'))
  } catch (error) {
    appStore.showError(error instanceof Error ? error.message : t('imageStudio.toasts.copyImageFailed'))
  }
}

async function copyCurrentTileDetails() {
  const tile = previewTile.value
  if (!tile) {
    appStore.showWarning(t('imageStudio.toasts.noActiveImage'))
    return
  }
  if (!navigator.clipboard?.writeText) {
    appStore.showWarning(locale.value === 'zh' ? '当前浏览器不支持复制文本。' : 'Text copy is not supported in this browser.')
    return
  }

  const fileSize = formatLightboxFileSize(tile.result.blob?.size)
    .replace(/^大小\s*/, '')
    .replace(/^Size\s*/, '')
  const duration = lightboxDurationText.value
    .replace(/^耗时\s*/, '')
    .replace(/^Took\s*/, '')
  const isZh = locale.value === 'zh'
  const detailText = isZh
    ? [
        `文件名：${tile.result.filename}`,
        `提示词：\n${tile.prompt}`,
        `分辨率：${lightboxResolutionText.value}`,
        `比例：${tile.aspectRatio || '-'}`,
        `模型：${tile.model || '-'}`,
        `大小：${fileSize || '-'}`,
        `耗时：${duration || '-'}`,
        `生成时间：${formatLightboxTime(tile.createdAt)}`,
      ].join('\n')
    : [
        `Filename: ${tile.result.filename}`,
        `Prompt:\n${tile.prompt}`,
        `Resolution: ${lightboxResolutionText.value}`,
        `Aspect ratio: ${tile.aspectRatio || '-'}`,
        `Model: ${tile.model || '-'}`,
        `Size: ${fileSize || '-'}`,
        `Duration: ${duration || '-'}`,
        `Created at: ${formatLightboxTime(tile.createdAt)}`,
      ].join('\n')

  try {
    await navigator.clipboard.writeText(detailText)
    appStore.showSuccess(isZh ? '参数已复制到剪贴板。' : 'Details copied to clipboard.')
  } catch {
    appStore.showError(isZh ? '复制参数失败。' : 'Failed to copy details.')
  }
}

async function generateVariantFromPreview() {
  if (!previewTile.value) {
    appStore.showWarning(t('imageStudio.toasts.noActiveImage'))
    return
  }

  try {
    const blob = await ensureResultBlob(previewTile.value.result)
    const dataUrl = await blobToDataUrl(blob)
    const rawBasePrompt = prompt.value.trim() || previewTile.value.prompt
    const basePrompt = resolvePromptTemplateArguments(rawBasePrompt).trim()
    if (autoCleanPlaceholders.value && prompt.value.trim() && prompt.value.trim() !== basePrompt) {
      prompt.value = basePrompt
    }
    const variantPrompt = locale.value === 'zh'
      ? `${basePrompt}\n基于当前参考图生成一个轻微变体：主体、身份特征、姿态、构图、镜头角度和主体位置必须与参考图保持一致，只允许微调风格、光影、色彩、质感和细节氛围。`
      : `${basePrompt}\nCreate a subtle variation from the current reference image: keep the subject, identity traits, pose, composition, camera angle, and subject placement consistent with the reference. Only adjust style, lighting, color, texture, and detail mood.`

    await generateImages({
      promptText: variantPrompt,
      referenceImageData: dataUrl,
      parentHistoryId: previewTile.value.historyId,
      parentTileId: previewTile.value.id,
    })
  } catch (error) {
    appStore.showError(error instanceof Error ? error.message : t('imageStudio.toasts.generateFailed'))
  }
}

function snapshotHistoryItems(items: ImageStudioHistoryItem[]): ImageStudioHistoryItem[] {
  return items.map((item) => ({
    ...item,
    results: item.results.map((result) => ({ ...result })),
  }))
}

function startDeleteUndoTimer(snapshot: ImageStudioHistoryItem[], count: number, kind: 'selected' | 'workspace') {
  if (undoableDelete.value) {
    window.clearInterval(undoableDelete.value.timerId)
  }
  const expiresAt = Date.now() + 5000
  undoableDeleteCountdown.value = 5
  const timerId = window.setInterval(() => {
    const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
    undoableDeleteCountdown.value = remaining
    if (remaining <= 0) {
      window.clearInterval(timerId)
      undoableDelete.value = null
    }
  }, 250)
  undoableDelete.value = { snapshot, count, kind, expiresAt, timerId }
}

async function undoDelete() {
  const pending = undoableDelete.value
  if (!pending) {
    return
  }
  window.clearInterval(pending.timerId)
  undoableDelete.value = null
  for (const item of pending.snapshot) {
    await saveImageStudioHistoryItem(item)
  }
  await loadHistory()
  appStore.showSuccess(t('imageStudio.toasts.deleteUndone', { count: pending.count }))
}

async function deleteSelectedTiles() {
  if (!selectedTileIds.value.length) {
    appStore.showWarning(t('imageStudio.toasts.selectionRequired'))
    return
  }

  const selectedIdSet = new Set(selectedTileIds.value)
  const snapshot = snapshotHistoryItems(historyItems.value)
  const nextItems = historyItems.value
    .map((item) => {
      const results = item.results
        .filter((result) => !selectedIdSet.has(createWorkspaceTileId(item.id, result.id)))
        .map((result) => ({ ...result }))

      if (!results.length) {
        return null
      }

      return {
        ...item,
        count: results.length,
        results,
      }
    })
    .filter((item): item is ImageStudioHistoryItem => !!item)

  const removedCount = selectedIdSet.size
  selectedTileIds.value = []
  previewTileId.value = null
  activeHistoryId.value = null
  await replaceImageStudioHistoryItems(nextItems)
  await loadHistory()
  startDeleteUndoTimer(snapshot, removedCount, 'selected')
}

async function clearWorkspace() {
  if (!historyItems.value.length) {
    return
  }

  const snapshot = snapshotHistoryItems(historyItems.value)
  const removedCount = workspaceTiles.value.length || historyItems.value.reduce((sum, item) => sum + item.results.length, 0)
  await clearImageStudioHistory()
  clearWorkspaceOrder()
  selectedTileIds.value = []
  previewTileId.value = null
  activeHistoryId.value = null
  await loadHistory()
  startDeleteUndoTimer(snapshot, removedCount, 'workspace')
}

async function confirmClearHistory() {
  if (!historyItems.value.length) {
    return
  }
  if (!window.confirm(t('imageStudio.sidebar.clearHistoryConfirm'))) {
    return
  }
  await clearWorkspace()
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('mousemove', handleGlobalMouseMove)
  window.addEventListener('mouseup', handleGlobalMouseUp)
  window.addEventListener('resize', handleWindowResize)
  warnIfOriginCanSplitLocalHistory()
  void ensureImageStudioPersistentStorage({ silent: true })
  if (!appStore.publicSettingsLoaded) {
    await appStore.fetchPublicSettings()
  }
  refreshApiPresets()
  await refreshPromptLibraryItems()
  await loadHistory()
  applyStudioQaRouteState()
})

onBeforeUnmount(() => {
  stopDocumentStudioAppearanceSync?.()
  clearDocumentStudioAppearance()
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  window.removeEventListener('resize', handleWindowResize)
  hideStudioTitleTooltip()
  disconnectHistoryListResizeObserver()
  disconnectWorkbenchResizeObserver()
  clearProgressResetTimer()
  if (detectModelsDebounce) {
    window.clearTimeout(detectModelsDebounce)
  }
  if (detectPromptHelperModelsDebounce) {
    window.clearTimeout(detectPromptHelperModelsDebounce)
  }
  detectModelsAbort.value?.abort()
  detectPromptHelperModelsAbort.value?.abort()
  revokeImageStudioHistoryItems(historyItems.value)
  revokeImageStudioPromptLibraryItems(savedPromptLibraryItems.value)
  clearPromptLibraryDetailsPreviewPress()
})
</script>

<style scoped>
.studio-shell {
  --studio-bg: #eef2f7;
  --studio-card: #ffffff;
  --studio-border: #e2e6ee;
  --studio-border-strong: #2563eb;
  --studio-text: #0f172a;
  --studio-muted: #64748b;
  --studio-soft: #f5f7fb;
  --studio-accent: #2563eb;
  --studio-accent-deep: #1d4ed8;
  --studio-accent-soft: #eff6ff;
  --studio-accent-shadow: rgba(37, 99, 235, 0.12);
  --theme-color: #2563eb;
  --theme-color-rgb: 37, 99, 235;
  --theme-text-on-primary: #ffffff;
  --studio-dark: #111827;
  --studio-card-background: #ffffff;
  --studio-soft-background: #f4f6fb;
  --studio-window-shadow: 0 1px 1px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05);
  --studio-panel-shadow: 0 1px 1px rgba(15, 23, 42, 0.03), 0 4px 14px rgba(15, 23, 42, 0.04);
  --studio-backdrop-filter: none;
  --studio-shell-bg: #eef2f7;
  --studio-stage-bg: #f8fafc;
  --studio-lightbox-stage-bg:
    radial-gradient(circle at 18% 16%, rgba(96, 165, 250, 0.13), transparent 26%),
    radial-gradient(circle at 84% 84%, rgba(148, 163, 184, 0.1), transparent 24%),
    linear-gradient(180deg, #050816 0%, #0b1120 100%);
  --studio-radius-window: 18px;
  --studio-radius-panel: 14px;
  --studio-radius-control: 12px;
  --studio-radius-soft: 8px;
  --studio-radius-image: 16px;
  @apply min-h-screen p-4;
  background: var(--studio-shell-bg);
  color: var(--studio-text);
}

.studio-shell.embedded {
  @apply rounded-none p-4;
}

.studio-shell.motion-reduced *,
.studio-shell.motion-reduced *::before,
.studio-shell.motion-reduced *::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}

.studio-title-tooltip {
  position: fixed;
  z-index: 2147483000;
  width: max-content;
  max-height: min(42vh, 320px);
  overflow: auto;
  padding: 10px 12px;
  border-radius: var(--studio-radius-control, 12px);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.45;
  opacity: 0;
  overflow-wrap: anywhere;
  pointer-events: none;
  scrollbar-width: thin;
  text-align: left;
  transform: translate(-50%, 4px) scale(0.98);
  transform-origin: var(--tooltip-origin);
  transition: opacity 140ms ease, transform 140ms ease;
  white-space: pre-wrap;
}

.studio-title-tooltip.is-ready {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

.studio-title-tooltip.is-outline {
  border: 1px solid color-mix(in srgb, var(--tooltip-accent) 42%, rgba(148, 163, 184, 0.35));
  background: color-mix(in srgb, rgba(255, 255, 255, 0.96) 94%, var(--tooltip-accent) 6%);
  color: var(--tooltip-outline-text, var(--tooltip-accent-deep));
  box-shadow: 0 14px 34px rgba(var(--tooltip-accent-rgb), 0.14), 0 8px 18px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.studio-title-tooltip.is-plain {
  border: 0;
  background: rgba(255, 255, 255, 0.98);
  color: #111827;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
}

.studio-title-tooltip.is-soft {
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

.studio-shell.theme-night {
  --studio-bg: #0b0f17;
  --studio-card: #1b202b;
  --studio-border: rgba(148, 163, 184, 0.22);
  --studio-text: #e5eefc;
  --studio-muted: #94a3b8;
  --studio-soft: #131822;
  --studio-dark: #06070b;
  --studio-card-background: #1b202b;
  --studio-soft-background: #131822;
  --studio-window-shadow: 0 18px 44px rgba(0, 0, 0, 0.34), 0 0 0 1px rgba(255, 255, 255, 0.025);
  --studio-panel-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
  --studio-shell-bg: #080b12;
  --studio-stage-bg: #111722;
}

/* Texture variants are intentionally collapsed: single solid look. */
.studio-shell.texture-soft,
.studio-shell.texture-glass,
.studio-shell.texture-solid {
  --studio-backdrop-filter: none;
}

.studio-window {
  @apply mx-auto flex max-w-[1680px] flex-col;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-window);
  background-clip: padding-box;
  box-shadow: var(--studio-window-shadow);
}

.studio-header {
  @apply flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5;
  border-top-left-radius: max(0px, calc(var(--studio-radius-window) - 1px));
  border-top-right-radius: max(0px, calc(var(--studio-radius-window) - 1px));
  background-clip: padding-box;
}

.studio-brand {
  @apply flex min-w-0 items-center gap-3;
}

.studio-brand-mark {
  @apply flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white;
}

.studio-brand-kicker {
  @apply text-xs font-semibold uppercase tracking-[0.24em] text-slate-500;
}

.studio-brand-title {
  @apply mt-1 text-xl font-semibold text-slate-900;
}

.studio-header-actions {
  @apply flex flex-wrap items-center gap-2;
}

.studio-avatar-popover {
  @apply relative;
}

.studio-release-trigger {
  @apply inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition;
  border-color: color-mix(in srgb, var(--theme-color) 24%, var(--studio-border));
  background: color-mix(in srgb, var(--theme-color) 8%, var(--studio-card-background));
  color: var(--studio-accent-deep);
  box-shadow: 0 8px 22px rgba(var(--theme-color-rgb), 0.08);
}

.studio-release-trigger:hover,
.studio-release-trigger.is-open {
  border-color: color-mix(in srgb, var(--theme-color) 42%, var(--studio-border));
  background: color-mix(in srgb, var(--theme-color) 12%, var(--studio-card-background));
  color: var(--studio-accent);
  transform: translateY(-1px);
}

.studio-release-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 80;
  --studio-popover-shift-x: 0px;
  width: min(360px, calc(100vw - 2rem));
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--theme-color) 20%, var(--studio-border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--studio-card-background) 88%, transparent);
  box-shadow: 0 22px 52px rgba(15, 23, 42, 0.16), 0 8px 24px rgba(var(--theme-color-rgb), 0.11);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.studio-workspace-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 84;
  display: grid;
  width: min(380px, calc(100vw - 2rem));
  gap: 12px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--theme-color) 20%, var(--studio-border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--studio-card-background) 92%, transparent);
  box-shadow: 0 22px 52px rgba(15, 23, 42, 0.16), 0 8px 24px rgba(var(--theme-color-rgb), 0.11);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.studio-workspace-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.studio-workspace-panel-head p {
  color: var(--studio-text);
  font-size: 14px;
  font-weight: 700;
}

.studio-workspace-panel-head span {
  display: block;
  margin-top: 4px;
  color: var(--studio-muted);
  font-size: 12px;
  line-height: 1.4;
}

.studio-workspace-field {
  display: grid;
  gap: 6px;
}

.studio-workspace-field span {
  color: var(--studio-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.studio-workspace-field code {
  overflow-wrap: anywhere;
  border-radius: 10px;
  border: 1px solid var(--studio-border);
  background: rgba(255, 255, 255, 0.5);
  padding: 8px 10px;
  color: var(--studio-text);
  font-size: 12px;
  line-height: 1.45;
}

.studio-workspace-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.studio-workspace-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid var(--studio-border);
  background: var(--studio-card-background);
  padding: 8px 10px;
  color: var(--studio-accent-deep);
  font-size: 12px;
  font-weight: 700;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.studio-workspace-actions button:hover {
  border-color: var(--studio-accent);
  background: rgba(var(--theme-color-rgb), 0.08);
  color: var(--studio-accent);
}

.studio-release-head {
  @apply flex items-start justify-between gap-3;
}

.studio-release-title {
  @apply text-sm font-semibold;
  color: var(--studio-text);
}

.studio-release-subtitle {
  @apply mt-1 text-xs;
  color: var(--studio-muted);
}

.studio-release-date {
  @apply shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold;
  background: color-mix(in srgb, var(--theme-color) 10%, transparent);
  color: var(--studio-accent-deep);
}

.studio-release-list {
  @apply mt-3 space-y-2 text-sm leading-relaxed;
  color: color-mix(in srgb, var(--studio-text) 84%, var(--studio-muted));
}

.studio-release-list li {
  position: relative;
  padding-left: 14px;
}

.studio-release-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.72em;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--theme-color);
  box-shadow: 0 0 0 4px rgba(var(--theme-color-rgb), 0.1);
}

.studio-avatar-menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 82;
  --studio-popover-shift-x: 0px;
  display: grid;
  width: min(240px, calc(100vw - 2rem));
  gap: 4px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--theme-color) 18%, var(--studio-border));
  border-radius: 16px;
  background: color-mix(in srgb, var(--studio-card-background) 92%, transparent);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14), 0 8px 22px rgba(var(--theme-color-rgb), 0.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.studio-avatar-menu-item {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  padding: 9px 10px;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.studio-avatar-menu-item:hover {
  background: color-mix(in srgb, var(--theme-color) 10%, transparent);
  color: var(--studio-accent-deep);
  transform: translateX(2px);
}

.studio-avatar-menu-item span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-avatar-menu-icon {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--theme-color) 9%, var(--studio-soft-background));
  color: var(--studio-accent-deep);
}

.studio-header-pill {
  @apply inline-flex items-center;
  gap: 0;
  padding: 0;
  background: #ffffff;
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  transition: border-color 200ms ease;
  overflow: hidden;
}

.studio-header-pill:hover {
  border-color: #cbd5e1;
}

.studio-pill-dot {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  flex-shrink: 0;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 4px;
}

.studio-pill-dot::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}

.studio-pill-dot.is-pulsing::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 999px;
  border: 2px solid currentColor;
  opacity: 0.45;
  animation: studio-pill-pulse 1.4s ease-out infinite;
}

@keyframes studio-pill-pulse {
  0% { transform: scale(0.7); opacity: 0.7; }
  100% { transform: scale(1.8); opacity: 0; }
}

.studio-pill-stack {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 12px 0 4px;
  line-height: 1;
}

.studio-pill-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--studio-muted);
}

.studio-pill-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--studio-text);
  font-variant-numeric: tabular-nums;
}

.studio-header-pill.tone-blue    { background: oklch(98% 0.02 245); }
.studio-header-pill.tone-blue    .studio-pill-dot { color: oklch(55% 0.16 245); background: oklch(94% 0.04 245); }
.studio-header-pill.tone-blue    .studio-pill-value { color: oklch(40% 0.16 245); }

.studio-header-pill.tone-emerald { background: oklch(98% 0.02 155); }
.studio-header-pill.tone-emerald .studio-pill-dot { color: oklch(52% 0.14 155); background: oklch(94% 0.04 155); }
.studio-header-pill.tone-emerald .studio-pill-value { color: oklch(40% 0.14 155); }

.studio-header-pill.tone-amber   { background: oklch(98% 0.03 70); }
.studio-header-pill.tone-amber   .studio-pill-dot { color: oklch(58% 0.14 70); background: oklch(94% 0.05 70); }
.studio-header-pill.tone-amber   .studio-pill-value { color: oklch(45% 0.14 70); }

.studio-header-pill.tone-rose    { background: oklch(98% 0.03 25); }
.studio-header-pill.tone-rose    .studio-pill-dot { color: oklch(54% 0.18 25); background: oklch(94% 0.05 25); }
.studio-header-pill.tone-rose    .studio-pill-value { color: oklch(44% 0.18 25); }

.studio-header-pill.tone-slate   { background: var(--studio-card-background); }
.studio-header-pill.tone-slate   .studio-pill-dot { color: oklch(60% 0.01 250); background: var(--studio-soft); }
.studio-header-pill.tone-slate   .studio-pill-value { color: var(--studio-muted); }

.studio-header-pill strong {
  @apply font-semibold;
  color: var(--studio-text);
}

.studio-header-pill.subtle {
  background: #ffffff;
}

.studio-icon-button {
  @apply inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45;
}

.studio-icon-button.inset {
  @apply h-9 w-9 rounded-lg;
}

.studio-icon-button.danger {
  @apply text-rose-500 hover:border-rose-200 hover:text-rose-600;
}

.studio-avatar {
  @apply flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700;
  padding: 0;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.studio-avatar:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.studio-appearance-popover {
  @apply relative;
}

.studio-appearance-panel {
  @apply absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[320px] rounded-[20px] border border-slate-200 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)];
  --studio-popover-shift-x: 0px;
  max-height: min(78vh, 720px);
  overflow-y: auto;
  border-radius: var(--studio-radius-panel);
  background: var(--studio-card-background);
  backdrop-filter: var(--studio-backdrop-filter);
  -webkit-backdrop-filter: var(--studio-backdrop-filter);
  transform: translateX(var(--studio-popover-shift-x));
}

.studio-appearance-panel::-webkit-scrollbar {
  width: 0;
}

.studio-theme-trigger {
  @apply inline-flex items-center gap-2 border border-slate-200 px-3 py-2 text-sm font-medium transition;
  border-radius: var(--studio-radius-control);
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-theme-trigger:hover,
.studio-theme-trigger.is-open {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  box-shadow: 0 10px 24px var(--studio-accent-shadow);
  color: var(--studio-accent);
}

.studio-appearance-head,
.studio-appearance-row {
  @apply flex items-start justify-between gap-3;
}

.studio-appearance-title {
  @apply text-sm font-semibold;
  color: var(--studio-text);
}

.studio-appearance-subtitle,
.studio-appearance-label,
.studio-appearance-segment small {
  @apply text-xs leading-5;
  color: var(--studio-muted);
}

.studio-appearance-section + .studio-appearance-section {
  @apply mt-4 border-t border-slate-200 pt-4;
  border-color: var(--studio-border);
}

.studio-appearance-segmented {
  @apply mt-2 grid grid-cols-2 gap-2;
}

.studio-appearance-segmented.is-stack {
  @apply grid-cols-1;
}

.studio-appearance-segment,
.studio-appearance-toggle {
  @apply inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-medium transition;
  border-radius: var(--studio-radius-control);
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-appearance-segment.is-column {
  @apply items-start justify-start text-left;
}

.studio-appearance-segment strong {
  @apply text-sm font-semibold;
}

.studio-appearance-segment.active,
.studio-appearance-toggle.active {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  box-shadow: 0 10px 24px var(--studio-accent-shadow);
  color: var(--studio-accent);
}

.studio-appearance-value {
  @apply text-xs font-semibold;
  color: var(--studio-text);
}

.studio-accent-grid {
  @apply mt-2 grid grid-cols-2 gap-2;
}

.studio-accent-card {
  @apply inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-medium transition;
  border-radius: var(--studio-radius-control);
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-accent-card.active {
  border-color: var(--studio-accent);
  box-shadow: 0 10px 24px var(--studio-accent-shadow);
}

.studio-accent-swatch {
  @apply block h-7 w-7 shrink-0 rounded-full border border-white/60 shadow-sm;
}

.studio-popover-enter-active,
.studio-popover-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.studio-popover-enter-from,
.studio-popover-leave-to {
  opacity: 0;
  transform: translate3d(var(--studio-popover-shift-x), -8px, 0) scale(0.98);
}

.studio-layout {
  @apply grid gap-4 p-4;
}

@media (min-width: 1280px) {
  .studio-layout {
    grid-template-columns: 260px minmax(0, 1fr) 300px;
  }
}

@media (min-width: 1536px) {
  .studio-layout {
    grid-template-columns: 280px minmax(0, 1fr) 320px;
  }
}

.studio-left-column,
.studio-main-column,
.studio-right-column {
  @apply flex min-h-0 min-w-0 flex-col gap-4;
}

.studio-right-column,
.studio-side-panel {
  overflow: visible;
}

.studio-panel {
  @apply p-4;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: var(--studio-radius-panel);
  box-shadow: var(--studio-panel-shadow);
}

.studio-panel-heading,
.studio-side-header,
.studio-preview-header,
.studio-progress-header,
.studio-prompt-header {
  @apply flex flex-wrap items-start justify-between gap-3;
}

.studio-prompt-header-actions {
  @apply flex flex-wrap items-center justify-end gap-2;
}

.studio-panel-title {
  @apply text-[15px] font-semibold text-slate-900;
}

.studio-panel-link,
.studio-helper,
.studio-character-count,
.studio-preview-meta,
.studio-side-note {
  @apply text-xs leading-5 text-slate-500;
}

.studio-panel-link-button,
.studio-inline-button,
.studio-ghost-link,
.studio-clear-button {
  @apply inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45;
}

.studio-inline-button.danger {
  @apply text-rose-600 hover:bg-rose-50 hover:text-rose-700;
}

.studio-clear-button {
  @apply border border-slate-200 bg-white;
}

.studio-prompt-library-entry {
  color: var(--studio-accent-deep);
  border-color: color-mix(in srgb, var(--studio-accent) 22%, transparent);
  background: color-mix(in srgb, var(--studio-accent-soft) 78%, #ffffff);
}

.studio-prompt-library-entry:hover {
  color: var(--studio-accent-deep);
  background: color-mix(in srgb, var(--studio-accent-soft) 92%, #ffffff);
}

.studio-provider-switch {
  @apply mt-4 grid gap-2;
}

.studio-provider-pill {
  @apply flex flex-col items-start rounded-xl px-3 py-2.5 text-left transition;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
}

.studio-provider-pill:hover {
  border-color: oklch(80% 0.012 250);
}

.studio-provider-pill span {
  @apply text-sm font-semibold;
  color: var(--studio-text);
}

.studio-provider-pill small {
  @apply mt-0.5 text-xs leading-5;
  color: var(--studio-muted);
}

.studio-provider-pill.active {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
}

.studio-provider-pill.active span {
  color: var(--studio-accent-deep);
}

.studio-field-group {
  @apply mt-4;
}

.studio-field-grid {
  @apply grid gap-3 md:grid-cols-2;
}

.studio-field-label {
  @apply flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700;
}

.studio-inline-tip {
  @apply text-xs font-normal text-slate-400;
}

.studio-select {
  @apply mt-2;
}

.studio-profile-advice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  border: 1px solid rgba(var(--theme-color-rgb), 0.26);
  border-radius: 14px;
  background: rgba(var(--theme-color-rgb), 0.08);
  color: color-mix(in srgb, var(--studio-text) 82%, var(--studio-accent-deep) 18%);
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.55;
}

.studio-profile-advice svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--studio-accent-deep);
}

.studio-profile-advice span {
  min-width: 0;
  flex: 1;
}

.studio-profile-advice button {
  flex-shrink: 0;
  border: 1px solid rgba(var(--theme-color-rgb), 0.3);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--studio-accent-deep);
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 600;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.studio-profile-advice button:hover {
  border-color: rgba(var(--theme-color-rgb), 0.5);
  background: rgba(var(--theme-color-rgb), 0.12);
  transform: translateY(-1px);
}

.studio-ratio-grid {
  @apply mt-4 grid grid-cols-3 gap-2;
}

.studio-ratio-card {
  @apply flex min-h-[72px] flex-col items-center justify-center gap-2 text-sm font-medium text-slate-600 transition;
  background: #ffffff;
  border: 1px solid var(--studio-border);
  border-radius: 12px;
}

.studio-ratio-card:hover {
  border-color: #cbd5e1;
}

.studio-ratio-card.active {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-ratio-card.ghost {
  @apply cursor-not-allowed bg-slate-50 text-slate-400;
}

.studio-ratio-icon {
  @apply block rounded-md border border-slate-300 bg-slate-100;
}

.studio-ratio-icon.is-square {
  width: 22px;
  height: 22px;
}

.studio-ratio-icon.is-wide {
  width: 28px;
  height: 18px;
}

.studio-ratio-icon.is-tall {
  width: 18px;
  height: 28px;
}

.studio-ratio-icon.is-classic {
  width: 24px;
  height: 18px;
}

.studio-ratio-icon.is-portrait {
  width: 18px;
  height: 24px;
}

.studio-ratio-icon.is-cinema {
  width: 30px;
  height: 14px;
}

.studio-ratio-icon.is-photo {
  width: 26px;
  height: 18px;
}

.studio-ratio-icon.is-book {
  width: 18px;
  height: 26px;
}

.studio-ratio-icon.is-custom {
  width: 26px;
  height: 22px;
  border-style: dashed;
}

.studio-ratio-icon.is-default {
  width: 22px;
  height: 22px;
  border-style: dotted;
  border-radius: 999px;
}

.studio-style-grid {
  @apply mt-4 grid grid-cols-3;
  gap: 8px;
}

.studio-style-card {
  position: relative;
  display: flex;
  flex-direction: column;
  text-align: center;
  padding: 0;
  overflow: hidden;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: 12px;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  cursor: pointer;
}

.studio-style-card:hover {
  border-color: oklch(80% 0.012 250);
  transform: translateY(-1px);
}

.studio-style-card.active {
  border-color: var(--studio-accent);
  box-shadow: 0 0 0 2px var(--studio-accent-soft);
}

.studio-style-preview {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--studio-soft);
  position: relative;
}

.studio-style-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.45) 100%);
  pointer-events: none;
}

.studio-style-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 280ms ease;
}

.studio-style-card:hover .studio-style-preview img {
  transform: scale(1.06);
}

.studio-style-card strong {
  position: absolute;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: calc(100% - 12px);
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  backdrop-filter: blur(2px);
  z-index: 2;
  pointer-events: none;
}

.studio-style-card small {
  display: none;
}

/* Fallback backgrounds for presets without a /style-presets/<id>.png asset.
   The <img> hides itself on error so these gradients show through. */
.studio-style-card.preset-default .studio-style-preview {
  background: linear-gradient(135deg, #e0e7ff 0%, #f1f5f9 60%, #e2e8f0 100%);
}
.studio-style-card.preset-photo .studio-style-preview {
  background: linear-gradient(135deg, #4b5563 0%, #94a3b8 60%, #cbd5e1 100%);
}
.studio-style-card.preset-manga .studio-style-preview {
  background:
    repeating-linear-gradient(45deg, rgba(15,23,42,0.95) 0 6px, rgba(255,255,255,1) 6px 12px);
}

.studio-style-card.active::after {
  content: '✓';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--studio-accent);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  z-index: 3;
}

.studio-quality-row {
  @apply mt-3 grid grid-cols-3;
  gap: 6px;
}

.studio-quality-pill {
  @apply inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition;
  background: #ffffff;
  border: 1px solid var(--studio-border);
}

.studio-quality-pill:hover {
  border-color: #cbd5e1;
}

.studio-quality-pill.active {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-seed-row {
  @apply mt-5 pt-4;
  border-top: 1px solid var(--studio-border);
}

.studio-seed-row > .studio-field-label {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.studio-seed-row .studio-inline-tip {
  font-size: 11px;
  color: var(--studio-muted);
  font-weight: 400;
}

.studio-seed-input,
.studio-negative-input {
  @apply relative mt-2;
}

.studio-seed-input .input,
.studio-negative-input .input {
  @apply pr-12;
}

.studio-inline-number {
  @apply mt-2 inline-flex rounded-xl bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900;
}

.studio-collapsible summary {
  list-style: none;
}

.studio-collapsible summary::-webkit-details-marker {
  display: none;
}

.studio-collapsible-summary {
  @apply flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900;
}

.studio-slider-stack {
  @apply mt-4 space-y-4;
}

.studio-slider-block {
  @apply block;
}

.studio-slider-block span {
  @apply text-sm font-medium text-slate-600;
}

.studio-slider-block strong {
  @apply ml-2 text-sm font-semibold text-slate-900;
}

.studio-range {
  @apply mt-2 w-full accent-blue-500;
}

.studio-advanced-stack {
  @apply mt-4 space-y-4;
}

.studio-resolution-grid {
  @apply mt-2 grid grid-cols-3 gap-2;
}

.studio-resolution-card {
  @apply flex flex-col rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition;
}

.studio-resolution-card.active {
  @apply border-blue-400 bg-blue-50;
}

.studio-resolution-card:disabled {
  @apply cursor-not-allowed opacity-50;
}

.studio-resolution-name {
  @apply text-sm font-semibold text-slate-900;
}

.studio-resolution-size {
  @apply mt-1 font-mono text-xs text-slate-500;
}

.studio-local-upscale-control {
  @apply mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3;
}

.studio-local-upscale-toggle {
  @apply inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition;
}

.studio-local-upscale-toggle:hover {
  @apply border-slate-300 text-slate-900;
}

.studio-local-upscale-toggle.active {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-local-upscale-control .studio-helper {
  @apply mt-2;
}

.studio-prompt-card {
  @apply gap-0;
}

.studio-prompt-layout {
  @apply mt-4 grid gap-4;
  grid-template-columns: minmax(0, 1fr) 320px;
  grid-template-areas:
    "side controls"
    "footer footer";
}

.studio-prompt-side {
  grid-area: side;
  @apply flex min-w-0 flex-col gap-3;
}

.studio-prompt-controls {
  grid-area: controls;
  @apply flex min-w-0 flex-col gap-3;
}

.studio-prompt-template-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(112px, 0.84fr);
  gap: 10px;
  min-height: 148px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--studio-border) 45%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--studio-soft-background) 54%, transparent);
}

.studio-prompt-template-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--studio-text);
  font-size: 12px;
  font-weight: 600;
}

.studio-prompt-template-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-prompt-template-title svg {
  flex: 0 0 auto;
  color: var(--studio-accent);
  opacity: 0.72;
}

.studio-prompt-template-preview {
  position: relative;
  display: block;
  min-width: 0;
  min-height: 132px;
  overflow: hidden;
  border-radius: 14px;
  background:
    radial-gradient(circle at 20% 15%, color-mix(in srgb, var(--studio-accent) 26%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--studio-surface) 56%, #0f172a), #111827);
  color: #ffffff;
  isolation: isolate;
  text-align: left;
}

.studio-prompt-template-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  transition: transform 180ms ease;
}

.studio-prompt-template-preview img.is-preview-portrait {
  object-position: center 18%;
}

.studio-prompt-template-preview img.is-preview-centered {
  object-position: center center;
}

.studio-prompt-template-preview::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: "";
  background: linear-gradient(to top, rgba(15, 23, 42, 0.76), rgba(15, 23, 42, 0.28) 44%, rgba(15, 23, 42, 0.05));
  pointer-events: none;
}

.studio-prompt-template-preview:hover img {
  transform: scale(1.025);
}

.studio-prompt-template-empty {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  gap: 6px;
  padding: 18px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  text-align: center;
}

.studio-prompt-template-badge {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 2;
  max-width: calc(100% - 20px);
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: none !important;
  box-shadow: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 10px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  padding: 0;
  text-align: left;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.86), 0 0 8px rgba(0, 0, 0, 0.46);
  white-space: nowrap;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.studio-prompt-template-caption {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 400;
  line-height: 1.45;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.68);
}

.studio-prompt-template-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 9px;
  justify-content: space-between;
  padding: 3px 2px 3px 0;
}

.studio-template-info-rows {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.studio-template-info-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  min-width: 0;
  min-height: 32px;
  border-radius: 999px;
  padding: 0 10px;
  background: color-mix(in srgb, var(--studio-card-background) 76%, transparent);
}

.studio-template-info-row span {
  min-width: 0;
  overflow: hidden;
  color: var(--studio-muted);
  font-size: 10px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-template-info-row strong {
  min-width: 0;
  overflow: hidden;
  color: var(--studio-text);
  font-size: 11px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-prompt-template-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 7px;
}

.studio-prompt-template-button {
  display: inline-flex;
  min-width: 0;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 8px;
  border: 1px solid color-mix(in srgb, var(--studio-border) 50%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--studio-card-background) 82%, transparent);
  color: var(--studio-muted);
  font-size: 12px;
  font-weight: 500;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.studio-prompt-template-button:hover {
  border-color: color-mix(in srgb, var(--studio-accent) 28%, var(--studio-border));
  color: var(--studio-text);
  transform: translateY(-1px);
}

.studio-prompt-template-button.primary {
  background: color-mix(in srgb, var(--studio-accent) 92%, #ffffff);
  border-color: color-mix(in srgb, var(--studio-accent) 70%, transparent);
  color: #ffffff;
}

.studio-prompt-footer {
  grid-area: footer;
  @apply min-w-0;
}

.studio-translate-row {
  @apply flex flex-wrap items-center gap-2 rounded-2xl border p-3;
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-soft-background) 60%, transparent);
}

.studio-translate-lang {
  @apply rounded-lg border px-2.5 py-1.5 text-xs font-medium;
  border-color: var(--studio-border);
  background: var(--studio-surface);
  color: var(--studio-text);
}

.studio-translate-btn {
  @apply inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50;
  background: var(--studio-accent-deep);
  min-height: 32px;
}

.studio-translate-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--studio-accent-deep) 88%, black);
}

.studio-prompt-textarea {
  min-height: 124px;
  resize: none;
}

.studio-prompt-tools {
  @apply mt-3 flex flex-wrap gap-2;
}

.studio-compatibility-note {
  @apply mt-2 text-xs leading-5;
  color: var(--studio-muted);
}

.studio-compatibility-note.is-warning {
  color: rgb(146 64 14);
}

.studio-compatibility-modal {
  width: min(920px, calc(100vw - 32px));
  max-height: 88vh;
  overflow: hidden;
  border: 1px solid rgba(31, 41, 55, 0.05);
  border-radius: 26px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
}

.studio-compatibility-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
  background: #f8fafc;
}

.studio-compatibility-preview-card {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.studio-compatibility-preview-card div {
  display: grid;
  gap: 3px;
}

.studio-compatibility-preview-card p {
  margin: 0;
  color: #1f2937;
  font-size: 13px;
  font-weight: 600;
}

.studio-compatibility-preview-card span {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.studio-compatibility-preview-card.is-compatible p {
  color: var(--studio-accent-deep);
}

.studio-compatibility-preview-textarea {
  min-height: 220px;
  resize: none;
  line-height: 1.7;
}

.studio-prompt-modal-backdrop {
  --studio-accent: #2563eb;
  --studio-accent-deep: #1d4ed8;
  --studio-accent-soft: #eff6ff;
  --studio-accent-shadow: rgba(37, 99, 235, 0.18);
  --theme-color: #2563eb;
  --theme-color-rgb: 37, 99, 235;
  --theme-text-on-primary: #ffffff;
  --studio-border: rgba(31, 41, 55, 0.1);
  --studio-border-strong: rgba(37, 99, 235, 0.34);
  --studio-card-background: rgba(255, 255, 255, 0.68);
  --studio-soft-background: rgba(248, 250, 252, 0.58);
  --studio-text: #111827;
  --studio-muted: #64748b;
  --modal-glass-bg: rgba(255, 255, 255, 0.68);
  --modal-glass-head: rgba(255, 255, 255, 0.54);
  --modal-glass-veil: rgba(247, 249, 252, 0.54);
  @apply fixed inset-0 z-[96] flex items-center justify-center p-4;
  background:
    radial-gradient(circle at 18% 12%, rgba(var(--theme-color-rgb), 0.12), transparent 32%),
    var(--modal-glass-veil);
  backdrop-filter: blur(18px) saturate(128%);
  -webkit-backdrop-filter: blur(18px) saturate(128%);
}

.studio-prompt-modal-backdrop.is-nested {
  z-index: 106;
}

.studio-prompt-modal-panel {
  @apply flex max-h-[92vh] w-full flex-col overflow-hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.42), transparent 34%),
    var(--modal-glass-bg);
  color: var(--studio-text);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.10), 0 6px 22px rgba(var(--theme-color-rgb), 0.06);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
}

.studio-prompt-modal-panel.is-library {
  max-width: 1240px;
  padding-bottom: 30px;
}

.studio-prompt-modal-panel.is-upload {
  max-width: 880px;
}

.studio-prompt-modal-panel.is-details {
  @apply relative grid max-h-[86vh] max-w-6xl;
  grid-template-columns: minmax(0, 1.18fr) minmax(380px, 0.82fr);
}

.studio-prompt-modal-panel.is-replacements {
  max-width: 1120px;
  border-color: rgba(255, 255, 255, 0.56);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0.20) 42%, rgba(var(--theme-color-rgb), 0.08)),
    rgba(255, 255, 255, 0.46);
  box-shadow: 0 28px 74px rgba(15, 23, 42, 0.16), 0 8px 28px rgba(var(--theme-color-rgb), 0.10);
}

.studio-prompt-modal-head {
  @apply flex items-start justify-between gap-4 px-6 py-5;
  border-bottom: 1px solid rgba(255, 255, 255, 0.34);
  background: var(--modal-glass-head);
}

.studio-prompt-modal-title {
  @apply text-base font-medium;
  color: var(--studio-text);
}

.studio-prompt-modal-text {
  @apply mt-1 max-w-2xl text-sm leading-6;
  color: var(--studio-muted);
}

.studio-replacement-body {
  display: grid;
  gap: 14px;
  min-height: 360px;
  overflow-y: auto;
  padding: 18px 22px;
}

.studio-replacement-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.studio-replacement-mode,
.studio-replacement-smart-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.42);
  padding: 0 13px;
  color: var(--studio-text);
  font-size: 12px;
  font-weight: 700;
}

.studio-replacement-mode svg,
.studio-replacement-smart-button svg {
  color: var(--studio-accent);
}

.studio-replacement-mode strong {
  display: inline-grid;
  min-width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 999px;
  background: var(--studio-accent);
  color: #ffffff;
  font-size: 11px;
}

.studio-replacement-smart-button {
  color: var(--studio-accent-deep);
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.studio-replacement-smart-button:hover:not(:disabled) {
  border-color: rgba(var(--theme-color-rgb), 0.28);
  background: rgba(var(--theme-color-rgb), 0.08);
  transform: translateY(-1px);
}

.studio-replacement-smart-button:disabled {
  cursor: wait;
  opacity: 0.62;
}

.studio-replacement-error {
  border-radius: 12px;
  border: 1px solid rgba(225, 29, 72, 0.22);
  background: rgba(255, 241, 242, 0.7);
  padding: 10px 12px;
  color: #be123c;
  font-size: 12px;
  line-height: 1.5;
}

.studio-replacement-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.studio-replacement-item {
  display: grid;
  gap: 10px;
  min-width: 0;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.36);
  padding: 12px;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.studio-replacement-item.active {
  border-color: rgba(var(--theme-color-rgb), 0.38);
  background: rgba(var(--theme-color-rgb), 0.08);
  box-shadow: 0 12px 28px rgba(var(--theme-color-rgb), 0.10);
}

.studio-replacement-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.studio-replacement-item-head div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.studio-replacement-item-head span {
  overflow: hidden;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-replacement-item-head small {
  color: var(--studio-muted);
  font-size: 11px;
}

.studio-replacement-locate {
  display: inline-flex;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(var(--theme-color-rgb), 0.18);
  background: rgba(255, 255, 255, 0.58);
  color: var(--studio-accent-deep);
  transition: background 160ms ease, transform 160ms ease;
}

.studio-replacement-locate:hover {
  background: rgba(var(--theme-color-rgb), 0.10);
  transform: translateY(-1px);
}

.studio-replacement-source {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.studio-replacement-source span {
  color: var(--studio-muted);
  font-size: 11px;
  font-weight: 700;
}

.studio-replacement-source code {
  display: block;
  min-height: 34px;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(15, 23, 42, 0.04);
  padding: 8px 9px;
  color: var(--studio-text);
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-replacement-input {
  min-height: 38px;
  font-size: 13px;
}

.studio-replacement-empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  gap: 9px;
  border-radius: 18px;
  border: 1px dashed rgba(var(--theme-color-rgb), 0.24);
  background: rgba(255, 255, 255, 0.25);
  padding: 24px;
  text-align: center;
}

.studio-replacement-empty svg {
  color: var(--studio-accent);
}

.studio-replacement-empty p {
  color: var(--studio-text);
  font-size: 14px;
  font-weight: 800;
}

.studio-replacement-empty span {
  max-width: 520px;
  color: var(--studio-muted);
  font-size: 12px;
  line-height: 1.6;
}

.studio-replacement-context {
  display: grid;
  gap: 8px;
  border-radius: 16px;
  border: 1px solid rgba(var(--theme-color-rgb), 0.18);
  background: rgba(255, 255, 255, 0.38);
  padding: 12px;
}

.studio-replacement-context-head {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--studio-accent-deep);
  font-size: 12px;
  font-weight: 800;
}

.studio-replacement-context p {
  margin: 0;
  color: var(--studio-muted);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.studio-replacement-context mark {
  border-radius: 6px;
  background: rgba(var(--theme-color-rgb), 0.18);
  color: var(--studio-accent-deep);
  padding: 1px 4px;
}

@media (max-width: 760px) {
  .studio-replacement-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .studio-replacement-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.studio-replacement-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
  gap: 14px;
  align-items: stretch;
}

.studio-replacement-preview-panel,
.studio-replacement-editor-panel {
  min-width: 0;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.46);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.50), rgba(255, 255, 255, 0.20)),
    rgba(255, 255, 255, 0.34);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.52), 0 14px 34px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px) saturate(132%);
  -webkit-backdrop-filter: blur(16px) saturate(132%);
}

.studio-replacement-preview-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.studio-replacement-editor-panel {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 14px;
}

.studio-replacement-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.34);
}

.studio-replacement-editor-panel > .studio-replacement-panel-head {
  padding: 0 0 12px;
}

.studio-replacement-panel-head div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.studio-replacement-panel-head p {
  overflow: hidden;
  color: var(--studio-text);
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-replacement-panel-head span {
  color: var(--studio-muted);
  font-size: 12px;
  line-height: 1.4;
}

.studio-replacement-panel-head strong,
.studio-replacement-panel-head > svg {
  display: inline-grid;
  min-width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 999px;
  background: rgba(var(--theme-color-rgb), 0.12);
  color: var(--studio-accent-deep);
  font-size: 12px;
  font-weight: 800;
}

.studio-replacement-prompt-view {
  min-height: 420px;
  max-height: 58vh;
  overflow-y: auto;
  padding: 18px;
  color: var(--studio-text);
  font-size: 14px;
  line-height: 1.86;
  white-space: pre-wrap;
  word-break: break-word;
  scrollbar-width: none;
}

.studio-replacement-prompt-view::-webkit-scrollbar {
  display: none;
}

.studio-replacement-highlight {
  display: inline;
  border: 0;
  border-radius: 7px;
  background: rgba(var(--theme-color-rgb), 0.16);
  color: var(--studio-accent-deep);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  padding: 2px 5px;
  font: inherit;
  font-weight: 750;
  line-height: inherit;
  transition: background 140ms ease, box-shadow 140ms ease, color 140ms ease;
}

.studio-replacement-highlight:hover,
.studio-replacement-highlight:focus-visible,
.studio-replacement-highlight.active {
  background: rgba(var(--theme-color-rgb), 0.26);
  box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.12), 0 8px 18px rgba(var(--theme-color-rgb), 0.12);
  color: var(--studio-accent-deep);
  outline: none;
}

.studio-replacement-editor-field {
  display: grid;
  gap: 7px;
}

.studio-replacement-editor-field > span {
  color: var(--studio-muted);
  font-size: 12px;
  font-weight: 800;
}

.studio-replacement-editor-field code {
  display: block;
  min-height: 44px;
  overflow-wrap: anywhere;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  background: rgba(255, 255, 255, 0.36);
  padding: 10px 11px;
  color: var(--studio-text);
  font-size: 12px;
  line-height: 1.55;
}

.studio-replacement-editor-input {
  min-height: 118px;
  resize: vertical;
  line-height: 1.58;
}

.studio-replacement-editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.studio-replacement-editor-actions button {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid rgba(var(--theme-color-rgb), 0.18);
  background: rgba(255, 255, 255, 0.40);
  padding: 0 12px;
  color: var(--studio-accent-deep);
  font-size: 12px;
  font-weight: 800;
  transition: background 160ms ease, transform 160ms ease;
}

.studio-replacement-editor-actions button:hover {
  background: rgba(var(--theme-color-rgb), 0.10);
  transform: translateY(-1px);
}

@media (max-width: 900px) {
  .studio-replacement-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .studio-replacement-prompt-view {
    min-height: 260px;
    max-height: 38vh;
  }
}

.studio-prompt-library-toolbar {
  @apply grid gap-3 px-6 py-4;
  grid-template-columns: minmax(360px, 1fr) 190px 156px 132px;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.26);
  background: rgba(255, 255, 255, 0.18);
}

.studio-prompt-library-search {
  @apply flex min-w-0 items-center gap-2 px-4;
  min-height: 44px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(15, 23, 42, 0.04);
  color: var(--studio-muted);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}

.studio-prompt-library-search:focus-within {
  border-color: rgba(var(--theme-color-rgb), 0.38);
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 0 0 4px rgba(var(--theme-color-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.54);
}

.studio-prompt-library-search input {
  @apply min-w-0 flex-1 border-0 bg-transparent text-sm outline-none;
  color: var(--studio-text);
}

.studio-prompt-library-search input::placeholder {
  color: color-mix(in srgb, var(--studio-muted) 72%, transparent);
}

.studio-prompt-library-command {
  @apply inline-flex min-h-[42px] items-center justify-center gap-2 px-4 text-sm font-medium transition;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  background: rgba(255, 255, 255, 0.42);
  color: var(--studio-text);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.44);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.studio-prompt-library-category-wrap {
  position: relative;
  display: block;
  min-width: 0;
  min-height: 44px;
  color: var(--studio-text);
}

.studio-prompt-library-category-trigger {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.04);
  color: var(--studio-text);
  padding: 0 14px 0 16px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, color 180ms ease;
}

.studio-prompt-library-category-trigger span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-prompt-library-category-trigger svg {
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--studio-muted) 82%, var(--studio-text));
  transition: transform 180ms ease, color 180ms ease;
}

.studio-prompt-library-category-trigger.active svg {
  transform: rotate(180deg);
}

.studio-prompt-library-category-wrap:hover,
.studio-prompt-library-category-wrap:focus-within,
.studio-prompt-library-category-trigger.active,
.studio-prompt-library-command:hover,
.studio-prompt-library-command.active {
  color: var(--studio-accent-deep);
  border-color: rgba(var(--theme-color-rgb), 0.42);
  background: rgba(var(--theme-color-rgb), 0.08);
  box-shadow: 0 0 0 4px rgba(var(--theme-color-rgb), 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.46);
}

.studio-prompt-library-category-wrap:hover .studio-prompt-library-category-trigger,
.studio-prompt-library-category-wrap:focus-within .studio-prompt-library-category-trigger,
.studio-prompt-library-category-trigger.active {
  border-color: rgba(var(--theme-color-rgb), 0.42);
  background: rgba(var(--theme-color-rgb), 0.08);
  box-shadow: 0 0 0 4px rgba(var(--theme-color-rgb), 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.46);
}

.studio-prompt-category-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 10px);
  z-index: 40;
  display: grid;
  width: min(320px, calc(100vw - 48px));
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.44), transparent 38%),
    rgba(255, 255, 255, 0.72);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.13), 0 8px 24px rgba(var(--theme-color-rgb), 0.10);
  backdrop-filter: blur(18px) saturate(145%);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  transform-origin: top left;
  animation: studio-category-menu-in 170ms ease both;
}

.studio-prompt-category-search {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  padding: 0 12px;
  color: var(--studio-muted);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.54);
}

.studio-prompt-category-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--studio-text);
  font-size: 13px;
  outline: none;
}

.studio-prompt-category-search input::placeholder {
  color: color-mix(in srgb, var(--studio-muted) 74%, transparent);
}

.studio-prompt-category-section {
  display: grid;
  gap: 6px;
}

.studio-prompt-category-section-title {
  padding: 0 4px;
  color: color-mix(in srgb, var(--studio-muted) 82%, transparent);
  font-size: 11px;
  font-weight: 600;
}

.studio-prompt-category-option,
.studio-prompt-category-add {
  display: grid;
  min-height: 40px;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  border: 1px solid transparent;
  border-radius: 14px;
  padding: 6px 8px;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.studio-prompt-category-option span:nth-child(2),
.studio-prompt-category-add span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-prompt-category-option:hover,
.studio-prompt-category-option.active,
.studio-prompt-category-add:hover {
  border-color: rgba(var(--theme-color-rgb), 0.20);
  background: rgba(var(--theme-color-rgb), 0.10);
  color: var(--studio-accent-deep);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(var(--theme-color-rgb), 0.10);
}

.studio-prompt-category-icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(var(--theme-color-rgb), 0.10);
  color: var(--studio-accent-deep);
}

.studio-prompt-category-icon.is-custom {
  background: rgba(15, 23, 42, 0.06);
  color: color-mix(in srgb, var(--studio-text) 72%, var(--studio-accent-deep));
}

.studio-prompt-category-option small {
  border-radius: 999px;
  padding: 2px 7px;
  background: rgba(var(--theme-color-rgb), 0.12);
  color: var(--studio-accent-deep);
  font-size: 10px;
  font-weight: 600;
}

.studio-prompt-category-add {
  grid-template-columns: 28px minmax(0, 1fr);
  margin-top: 2px;
  border-style: dashed;
  border-color: rgba(var(--theme-color-rgb), 0.22);
  color: var(--studio-accent-deep);
}

.studio-prompt-category-add svg {
  justify-self: center;
}

@keyframes studio-category-menu-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.studio-prompt-library-upload {
  display: inline-flex !important;
  min-height: 44px;
  min-width: 148px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: linear-gradient(135deg, var(--theme-color) 0%, var(--studio-accent-deep) 100%) !important;
  color: var(--theme-text-on-primary) !important;
  box-shadow: 0 12px 24px rgba(var(--theme-color-rgb), 0.28);
  opacity: 1 !important;
  visibility: visible !important;
}

.studio-prompt-library-upload svg,
.studio-prompt-library-upload span {
  color: #ffffff !important;
  opacity: 1 !important;
}

.studio-prompt-library-upload:hover {
  color: var(--theme-text-on-primary);
  background: linear-gradient(135deg, color-mix(in srgb, var(--studio-accent) 88%, #ffffff) 0%, var(--studio-accent-deep) 100%);
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(var(--theme-color-rgb), 0.34);
}

.studio-prompt-library-batch {
  min-height: 44px;
  color: var(--studio-text);
}

.studio-prompt-library-batchbar {
  @apply mx-6 mb-2 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm;
  border: 1px solid rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.40);
  color: var(--studio-muted);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.studio-prompt-library-batchbar button {
  @apply rounded-full px-4 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45;
  background: rgba(244, 63, 94, 0.1);
  color: #be123c;
}

.studio-prompt-library-list {
  @apply grid overflow-y-auto px-6 pt-6;
  column-gap: 18px;
  row-gap: 22px;
  padding-bottom: 10px;
  max-height: min(54vh, 560px);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background:
    radial-gradient(circle at 8% 12%, rgba(var(--theme-color-rgb), 0.08), transparent 30%),
    rgba(255, 255, 255, 0.16);
  scrollbar-width: none;
}

.studio-prompt-library-list::-webkit-scrollbar {
  display: none;
}

.studio-prompt-library-item {
  @apply relative min-w-0 overflow-hidden p-0 text-left transition;
  aspect-ratio: 16 / 10;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.48);
  background: rgba(255, 255, 255, 0.40);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  animation: prompt-card-in 220ms ease both;
  animation-delay: calc(var(--card-index, 0) * 22ms);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform 260ms cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 260ms ease, border-color 260ms ease, filter 260ms ease;
}

.studio-prompt-library-item:hover {
  border-color: rgba(var(--theme-color-rgb), 0.48);
  transform: translateY(-5px) scale(1.018);
  box-shadow: 0 16px 32px rgba(var(--theme-color-rgb), 0.22), 0 5px 12px rgba(15, 23, 42, 0.08);
}

.studio-prompt-library-item:active,
.studio-prompt-library-item.is-applying {
  transform: scale(0.975);
  filter: saturate(1.08);
  box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.26), 0 14px 32px rgba(15, 23, 42, 0.12);
}

.studio-prompt-library-item.is-applying::after {
  position: absolute;
  inset: 0;
  z-index: 8;
  content: "";
  border-radius: inherit;
  background: rgba(var(--theme-color-rgb), 0.18);
  animation: studio-prompt-select-ripple 260ms ease-out both;
  pointer-events: none;
}

.studio-prompt-library-item.selected {
  border-color: rgba(var(--theme-color-rgb), 0.62);
  box-shadow: 0 0 0 2px rgba(var(--theme-color-rgb), 0.34), 0 20px 40px -8px rgba(var(--theme-color-rgb), 0.18);
}

.studio-prompt-library-check {
  @apply absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full text-white opacity-80 transition;
  background: rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(10px);
}

.studio-prompt-library-check.active {
  opacity: 1;
  background: var(--studio-accent-deep);
}

.studio-prompt-library-card-visual {
  @apply absolute inset-0 block overflow-hidden;
  background:
    radial-gradient(circle at 16% 18%, rgba(var(--theme-color-rgb), 0.20), transparent 28%),
    radial-gradient(circle at 78% 18%, rgba(255, 255, 255, 0.78), transparent 28%),
    linear-gradient(145deg, rgba(var(--theme-color-rgb), 0.10), rgba(226, 232, 240, 0.72) 58%, rgba(255, 255, 255, 0.70));
}

.studio-prompt-library-card-visual::before {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 4;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 999px;
  background: rgba(var(--theme-color-rgb), 0.82);
  color: #ffffff;
  content: "+";
  font-size: 18px;
  font-weight: 300;
  line-height: 1;
  opacity: 0;
  transform: translateY(-6px) scale(0.92);
  transition: opacity 220ms ease, transform 220ms ease;
  pointer-events: none;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.studio-prompt-library-card-visual::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: "";
  background: linear-gradient(135deg, rgba(var(--theme-color-rgb), 0.12), transparent 52%);
  opacity: 0;
  transition: opacity 260ms ease;
  pointer-events: none;
}

.studio-prompt-library-card-visual img {
  @apply h-full w-full object-cover;
  object-position: center center;
  transition: transform 500ms ease, filter 260ms ease;
}

.studio-prompt-library-card-visual img.is-preview-portrait {
  object-position: center 18%;
}

.studio-prompt-library-card-visual img.is-preview-centered {
  object-position: center center;
}

.studio-prompt-library-item:hover .studio-prompt-library-card-visual img {
  transform: scale(1.08);
  filter: saturate(1.04);
}

.studio-prompt-library-item:hover .studio-prompt-library-card-visual::before {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.studio-prompt-library-item:hover .studio-prompt-library-card-visual::after {
  opacity: 1;
}

.studio-prompt-library-card-fallback {
  @apply flex h-full w-full items-center justify-center;
  color: color-mix(in srgb, var(--studio-accent-deep) 74%, var(--studio-muted));
}

.studio-prompt-library-card-prompt {
  @apply absolute inset-x-0 bottom-0 px-3 pb-3 pt-12 text-left text-xs leading-5;
  z-index: 3;
  color: rgba(255, 255, 255, 0.94);
  background: linear-gradient(to top, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.34) 45%, transparent 100%);
  transition: padding-top 240ms ease, background 240ms ease;
}

.studio-prompt-library-item:hover .studio-prompt-library-card-prompt {
  padding-top: 18px;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.48) 58%, transparent 100%);
}

.studio-prompt-library-card-prompt strong,
.studio-prompt-library-card-prompt span {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.studio-prompt-library-card-prompt strong {
  -webkit-line-clamp: 1;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.34);
}

.studio-prompt-library-card-prompt span {
  margin-top: 3px;
  -webkit-line-clamp: 2;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 10px rgba(0, 0, 0, 0.28);
}

.studio-prompt-library-empty {
  @apply col-span-full flex min-h-48 flex-col items-center justify-center gap-3 text-sm;
  border-radius: 24px;
  border: 1px dashed rgba(var(--theme-color-rgb), 0.22);
  background: rgba(255, 255, 255, 0.38);
  color: var(--studio-muted);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.studio-prompt-upload-body {
  @apply grid gap-5 p-6;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
  min-height: 0;
  overflow-y: auto;
  background:
    radial-gradient(circle at 10% 10%, rgba(var(--theme-color-rgb), 0.10), transparent 32%),
    rgba(255, 255, 255, 0.16);
  scrollbar-width: none;
}

.studio-prompt-upload-body::-webkit-scrollbar {
  display: none;
}

.studio-prompt-image-drop {
  @apply relative flex cursor-pointer items-center justify-center overflow-hidden text-center transition;
  align-self: start;
  height: clamp(360px, 56vh, 460px);
  min-height: 0;
  border-radius: 24px;
  border: 1px dashed rgba(var(--theme-color-rgb), 0.34);
  background:
    radial-gradient(circle at 50% 34%, rgba(var(--theme-color-rgb), 0.12), transparent 30%),
    rgba(255, 255, 255, 0.30);
  color: var(--studio-muted);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.46);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.studio-prompt-image-drop:hover {
  border-color: rgba(var(--theme-color-rgb), 0.54);
  background: rgba(var(--theme-color-rgb), 0.08);
  box-shadow: 0 18px 38px rgba(var(--theme-color-rgb), 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.52);
}

.studio-prompt-image-drop img {
  @apply h-full w-full object-cover;
  display: block;
  object-position: center 18%;
}

.studio-prompt-image-drop span {
  @apply flex flex-col items-center gap-2 px-5;
}

.studio-prompt-image-drop svg {
  color: var(--theme-color);
}

.studio-prompt-image-drop strong {
  @apply text-sm font-medium;
  color: var(--studio-text);
}

.studio-prompt-image-drop small {
  @apply text-xs font-normal;
  color: var(--studio-muted);
}

.studio-prompt-upload-fields {
  @apply flex min-w-0 flex-col gap-3;
}

.studio-prompt-upload-fields .input {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.56);
  color: var(--studio-text);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.025), inset 0 1px 0 rgba(255, 255, 255, 0.58);
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.studio-prompt-upload-fields .input:focus {
  border-color: rgba(var(--theme-color-rgb), 0.46);
  background: rgba(255, 255, 255, 0.70);
  box-shadow: 0 0 0 4px rgba(var(--theme-color-rgb), 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.50);
}

.studio-prompt-upload-fields .input::placeholder {
  color: color-mix(in srgb, var(--studio-muted) 82%, transparent);
}

.studio-prompt-upload-textarea {
  min-height: 160px;
  resize: vertical;
}

.studio-prompt-upload-textarea.is-description {
  min-height: 84px;
}

.studio-prompt-upload-error {
  @apply rounded-2xl px-4 py-3 text-sm;
  background: rgba(244, 63, 94, 0.08);
  color: #be123c;
}

.studio-prompt-upload-remove-image {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  border: 1px solid rgba(244, 63, 94, 0.18);
  border-radius: 999px;
  background: rgba(244, 63, 94, 0.08);
  color: #be123c;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 500;
  transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.studio-prompt-upload-remove-image:hover {
  border-color: rgba(244, 63, 94, 0.32);
  background: rgba(244, 63, 94, 0.12);
  transform: translateY(-1px);
}

@keyframes prompt-card-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes studio-prompt-select-ripple {
  from { opacity: 0; transform: scale(0.92); }
  45% { opacity: 1; }
  to { opacity: 0; transform: scale(1.08); }
}

.studio-prompt-card-enter-active,
.studio-prompt-card-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.studio-prompt-card-enter-from,
.studio-prompt-card-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.studio-prompt-card-move {
  transition: transform 260ms ease;
}

.studio-prompt-details-close {
  @apply absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-800;
  border: 1px solid rgba(31, 41, 55, 0.04);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(12px);
}

.studio-prompt-details-visual {
  @apply relative flex min-h-[560px] items-center justify-center overflow-hidden text-white;
  background: linear-gradient(135deg, #eef2f7, #dbeafe 52%, #f8fafc);
}

.studio-prompt-details-visual img {
  @apply h-full w-full object-cover;
  object-position: center center;
}

.studio-prompt-details-visual img.is-preview-portrait {
  object-position: center 18%;
}

.studio-prompt-details-visual img.is-preview-centered {
  object-position: center center;
}

.studio-prompt-details-body {
  @apply flex min-w-0 flex-col gap-4 overflow-hidden p-7;
  background: #ffffff;
}

.studio-prompt-details-body h3 {
  @apply text-3xl font-medium leading-tight;
  color: #1f2937;
}

.studio-prompt-details-meta {
  @apply grid gap-1.5 text-sm leading-6;
  color: #6b7280;
}

.studio-prompt-details-prompt {
  @apply relative min-h-0 overflow-hidden text-sm leading-7;
  height: clamp(320px, 50vh, 560px);
  border-radius: 22px;
  border: 1px solid rgba(31, 41, 55, 0.04);
  background: #f9fafb;
  color: #374151;
}

.studio-prompt-details-prompt-scroll {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow-y: auto;
  padding: 34px 26px 28px;
  scrollbar-width: none;
  user-select: text;
}

.studio-prompt-details-prompt-scroll::-webkit-scrollbar {
  display: none;
}

.studio-prompt-details-particles {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none;
}

.studio-prompt-details-prompt-scroll p {
  position: relative;
  z-index: 1;
  white-space: pre-wrap;
  word-break: break-word;
  color: #374151;
  font-family: inherit;
  user-select: text;
}

.studio-prompt-details-particle {
  position: absolute;
  z-index: 2;
  width: auto;
  height: auto;
  color: var(--particle-color);
  font-size: var(--particle-size);
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 0 10px currentColor, 0 0 18px rgba(255, 255, 255, 0.86);
  pointer-events: none;
  animation: studio-prompt-particle 900ms cubic-bezier(0.18, 0.7, 0.2, 1) forwards;
}

.studio-prompt-details-particle::before {
  content: attr(data-symbol);
}

@keyframes studio-prompt-particle {
  55% { opacity: 0.95; }
  to {
    opacity: 0;
    transform: translate(var(--particle-dx), var(--particle-dy)) rotate(32deg) scale(0.18);
  }
}

.studio-prompt-modal-actions.is-inline {
  @apply px-0;
}

.studio-prompt-modal-actions.is-upload-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.30);
  background: rgba(255, 255, 255, 0.22);
}

@media (max-width: 760px) {
  .studio-prompt-upload-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .studio-prompt-image-drop {
    height: clamp(280px, 48vh, 380px);
  }

  .studio-prompt-modal-actions.is-upload-actions {
    flex-wrap: wrap;
    padding: 14px 18px;
  }
}

.studio-prompt-upload-cancel,
.studio-prompt-upload-save {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.studio-prompt-upload-cancel {
  border: 1px solid rgba(255, 255, 255, 0.38);
  background: rgba(255, 255, 255, 0.36);
  color: var(--studio-text);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.42);
}

.studio-prompt-upload-cancel:hover {
  border-color: rgba(var(--theme-color-rgb), 0.32);
  background: rgba(var(--theme-color-rgb), 0.08);
  color: var(--studio-text);
  transform: translateY(-1px);
}

.studio-prompt-upload-save {
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: linear-gradient(135deg, var(--theme-color) 0%, var(--studio-accent-deep) 100%);
  color: var(--theme-text-on-primary);
  box-shadow: 0 14px 28px rgba(var(--theme-color-rgb), 0.24);
}

.studio-prompt-upload-save:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
  box-shadow: 0 18px 34px rgba(var(--theme-color-rgb), 0.30);
}

.studio-prompt-upload-save:disabled {
  cursor: wait;
  opacity: 0.72;
  transform: none;
}

.studio-prompt-full-preview-backdrop {
  @apply fixed inset-0 z-[120] flex items-center justify-center p-6;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(16px);
}

.studio-prompt-full-preview-image {
  max-width: min(92vw, 1400px);
  max-height: 90vh;
  object-fit: contain;
  border-radius: 22px;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.24);
  transition: transform 120ms ease;
  transform-origin: center center;
}

.studio-prompt-full-preview-close {
  @apply absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
}

.studio-prompt-full-preview-close:hover {
  background: rgba(255, 255, 255, 0.28);
}

.studio-chip {
  @apply inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-60;
  background: #ffffff;
  border: 1px solid var(--studio-border);
}

.studio-chip:hover {
  border-color: #cbd5e1;
  color: var(--studio-text);
}

.studio-chip:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--studio-accent) 72%, transparent);
  outline-offset: 2px;
}

.studio-chip.accent,
.studio-chip.active {
  border-color: #93c5fd;
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-chip small {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 999px;
  background: rgba(var(--theme-color-rgb), 0.14);
  color: var(--studio-accent-deep);
  font-size: 10px;
  line-height: 1;
}

.studio-negative-header {
  @apply mt-4 flex items-center justify-between gap-3;
}

.studio-prompt-actions {
  @apply flex flex-col gap-3;
}

.studio-count-quick {
  @apply flex flex-wrap items-center gap-2 rounded-2xl border p-2;
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-soft-background) 72%, var(--studio-surface) 28%);
}

.studio-count-quick-label {
  @apply px-1 text-xs font-semibold;
  color: var(--studio-text);
}

.studio-count-quick-button {
  @apply inline-flex h-8 min-w-10 items-center justify-center rounded-xl border px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55;
  border-color: var(--studio-border);
  background: var(--studio-surface);
  color: color-mix(in srgb, var(--studio-text) 78%, transparent);
}

.studio-count-quick-button:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--studio-accent) 35%, var(--studio-border) 65%);
  color: var(--studio-text);
}

.studio-count-quick-button.active {
  border-color: color-mix(in srgb, var(--studio-accent) 62%, var(--studio-border) 38%);
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-count-quick-hint {
  @apply min-w-0 flex-1 text-xs leading-5;
  color: var(--studio-muted);
}

.studio-generate-button,
.studio-secondary-action {
  @apply inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50;
}

.studio-generate-button {
  background: oklch(22% 0.012 250);
  color: oklch(98% 0.005 250);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.studio-generate-button:hover {
  background: oklch(16% 0.014 250);
}

.studio-secondary-action {
  background: #ffffff;
  color: #374151;
  border: 1px solid var(--studio-border);
}

.studio-secondary-action:hover {
  background: var(--studio-soft);
}

.studio-character-badge {
  @apply mt-auto inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500;
}

.studio-preview-card {
  @apply p-0;
  overflow: hidden;
}

.studio-preview-header {
  @apply border-b border-slate-200 px-4 py-3;
}

.studio-preview-tabs {
  @apply flex flex-wrap gap-2;
}

.studio-preview-tab {
  @apply rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-45;
}

.studio-preview-tab.active {
  @apply border-blue-300 bg-blue-50 text-blue-700;
}

.studio-preview-tools {
  @apply flex flex-wrap items-center;
  gap: 0.75rem;
}

.studio-preview-tools > .studio-preview-meta {
  margin-right: auto;
  padding-right: 0.5rem;
  border-right: 1px solid var(--studio-border);
}

.studio-preview-stage {
  @apply relative flex items-center justify-center p-4;
  background: var(--studio-stage-bg);
  min-height: 320px;
  max-height: 56vh;
  overflow: hidden;
}

.studio-preview-stage.is-clickable {
  @apply cursor-zoom-in;
}

.studio-preview-stage.is-empty {
  @apply p-10;
  min-height: 220px;
  max-height: none;
}

.studio-preview-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06);
}

/* ===== Split preview stage (this | last) =====
   Two columns share the stage. Tall portraits (9:16) need extra vertical room
   to render in full at object-fit: contain, so we override the single-image
   max-height ceiling here. */
.studio-preview-stage-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
  max-height: 78vh;
  min-height: 480px;
}

/* New single-image preview (default for "原图" tab).
   Uses CSS grid so the cell's `height: 100%` resolves against a definite
   track. With flex centering + percentage height the parent's height is
   content-driven, which clipped the image at the bottom. */
.studio-preview-stage-single {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: 1fr;
  padding: 12px;
  height: clamp(480px, 78vh, 1100px);
}

.studio-preview-single-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: 14px;
  padding: 8px;
  cursor: zoom-in;
  overflow: hidden;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.studio-preview-single-cell:hover {
  border-color: var(--studio-accent);
  box-shadow: 0 0 0 2px var(--studio-accent-soft);
}

.studio-preview-single-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  background:
    repeating-conic-gradient(oklch(96% 0.005 250) 0% 25%, oklch(98% 0.005 250) 0% 50%) 0 0 / 14px 14px;
}

.studio-preview-split-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: 14px;
  padding: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 200ms ease, border-color 160ms ease, box-shadow 160ms ease;
  min-height: 0;
  height: 100%;
}

.studio-preview-split-cell:hover:not(.is-empty) {
  border-color: var(--studio-accent);
  transform: translateY(-1px);
}

.studio-preview-split-cell.is-current {
  border-color: var(--studio-accent);
  box-shadow: 0 0 0 2px var(--studio-accent-soft);
  animation: studio-evolution-rise 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.studio-preview-split-cell.is-previous {
  animation: studio-evolution-shift-right 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.studio-shell.motion-reduced .studio-preview-split-cell.is-current,
.studio-shell.motion-reduced .studio-preview-split-cell.is-previous {
  animation: none;
}

.studio-preview-split-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  background:
    repeating-conic-gradient(oklch(96% 0.005 250) 0% 25%, oklch(98% 0.005 250) 0% 50%) 0 0 / 14px 14px;
}

.studio-preview-split-cell.is-empty {
  flex-direction: column;
  gap: 8px;
  color: var(--studio-muted);
  cursor: default;
  background: var(--studio-soft);
  border-style: dashed;
}

.studio-preview-split-cell.is-empty p {
  font-size: 12.5px;
  margin: 0;
}

.studio-preview-split-tag {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--studio-border);
  pointer-events: none;
  backdrop-filter: blur(2px);
}

.studio-preview-split-tag.tone-blue {
  color: oklch(48% 0.16 245);
  border-color: oklch(82% 0.10 245);
  background: oklch(98% 0.02 245);
}

.studio-preview-split-tag.tone-slate {
  color: var(--studio-muted);
}

@media (max-width: 900px) {
  .studio-preview-stage-split {
    grid-template-columns: 1fr;
  }
}

.studio-compare-stage {
  @apply relative h-full w-full overflow-hidden rounded-[22px];
  max-height: 560px;
}

.studio-compare-stage > .studio-preview-image.base {
  @apply absolute inset-0 h-full w-full object-cover;
}

.studio-compare-overlay {
  @apply absolute inset-y-0 left-0 overflow-hidden;
}

.studio-compare-overlay .studio-preview-image.overlay {
  @apply h-full w-full object-cover;
  width: 100%;
  min-width: 100%;
}

.studio-compare-divider {
  @apply absolute inset-y-0 top-0 z-10;
  width: 2px;
  transform: translateX(-1px);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.06);
}

.studio-compare-handle {
  @apply absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-slate-950 text-white shadow-lg;
}

.studio-compare-range {
  @apply absolute inset-x-6 bottom-5 z-20 w-[calc(100%-3rem)] cursor-ew-resize opacity-0;
}

/* === New compare layout (gated to variant) === */
.studio-preview-stage-compare {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 12px;
  max-height: 78vh;
  min-height: 480px;
  gap: 10px;
}

.studio-compare-mode-toggle {
  @apply inline-flex flex-shrink-0 items-center gap-1 self-start rounded-full border bg-white p-1;
  border-color: var(--studio-border);
}

.studio-compare-mode-btn {
  @apply inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition;
  color: color-mix(in srgb, var(--studio-text) 70%, transparent);
}

.studio-compare-mode-btn:hover {
  color: var(--studio-accent-deep);
}

.studio-compare-mode-btn.active {
  background: var(--studio-accent);
  color: #fff;
}

.studio-compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1 1 auto;
  min-height: 0;
}

.studio-compare-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: 14px;
  padding: 8px;
  cursor: zoom-in;
  overflow: hidden;
  transition: border-color 160ms ease, box-shadow 160ms ease;
  min-height: 0;
}

.studio-compare-cell:hover {
  border-color: var(--studio-accent);
}

.studio-compare-cell.is-current {
  border-color: var(--studio-accent);
  box-shadow: 0 0 0 2px var(--studio-accent-soft);
}

.studio-compare-cell img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  background:
    repeating-conic-gradient(oklch(96% 0.005 250) 0% 25%, oklch(98% 0.005 250) 0% 50%) 0 0 / 14px 14px;
}

.studio-compare-tag {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}

.studio-compare-tag.tone-blue {
  background: var(--studio-accent);
  color: #fff;
}

.studio-compare-tag.tone-slate {
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
}

.studio-compare-corner-tag {
  position: absolute;
  top: 12px;
  z-index: 4;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}

.studio-compare-corner-tag.corner-left {
  left: 12px;
}

.studio-compare-corner-tag.corner-right {
  right: 12px;
}

.studio-compare-corner-tag.tone-blue {
  background: var(--studio-accent);
  color: #fff;
}

.studio-compare-corner-tag.tone-slate {
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
}

.studio-empty-preview {
  @apply flex max-w-md flex-col items-center text-center;
}

.studio-empty-mark {
  @apply flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm;
}

.studio-empty-title {
  @apply mt-4 text-lg font-semibold text-slate-900;
}

.studio-empty-text {
  @apply mt-2 text-sm leading-7 text-slate-500;
}

.studio-progress-value {
  @apply text-sm font-semibold text-slate-900;
}

.studio-progress-track {
  @apply h-2 overflow-hidden rounded-full;
  background: #e5e7eb;
}

.studio-progress-bar {
  @apply h-full rounded-full;
  background: var(--studio-accent);
  transition: width 220ms ease;
}

.studio-progress-footer {
  @apply flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500;
}

.studio-workbench-panel {
  @apply gap-0;
  overflow: hidden;
}

.studio-workbench-header,
.studio-workbench-toolbar {
  @apply flex flex-wrap items-start justify-between gap-3;
}

.studio-workbench-summary {
  @apply flex flex-wrap items-center justify-end gap-2;
}

.studio-workbench-pill {
  @apply inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold;
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-workbench-pill.accent {
  @apply border-blue-200 bg-blue-50 text-blue-700;
}

.studio-workbench-toolbar {
  @apply mt-3 rounded-2xl px-3 py-3;
  border: 1px solid var(--studio-border);
  background: color-mix(in srgb, var(--studio-card-background) 82%, transparent);
}

.studio-workbench-toolbar-title {
  @apply text-sm font-semibold;
  color: var(--studio-text);
}

.studio-workbench-tip {
  @apply text-xs leading-6;
  color: var(--studio-muted);
}

.studio-workbench-actions {
  @apply flex flex-wrap items-center gap-2;
}

.studio-workbench-surface {
  --studio-workbench-gap: 14px;
  --studio-workbench-padding: 16px;
  --studio-workbench-columns: 4;
  @apply relative mt-4 overflow-y-auto overflow-x-hidden border;
  min-height: 0;
  max-height: min(74vh, 720px);
  border-color: var(--studio-border);
  border-radius: var(--studio-radius-panel);
  scrollbar-width: none;
  -ms-overflow-style: none;
  overscroll-behavior: contain;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--studio-accent) 16%, transparent) 0%, transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--studio-card-background) 92%, white 8%) 0%, color-mix(in srgb, var(--studio-soft-background) 92%, transparent) 100%);
}

.studio-workbench-surface::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.studio-workbench-surface.is-selecting {
  cursor: crosshair;
}

.studio-workbench-empty {
  @apply flex min-h-[320px] flex-col items-center justify-center px-6 text-center;
}

.studio-workbench-grid {
  display: grid;
  gap: var(--studio-workbench-gap);
  padding: var(--studio-workbench-padding);
  grid-template-columns: repeat(var(--studio-workbench-columns), minmax(0, 1fr));
  grid-auto-rows: 1fr;
  align-items: start;
}

.studio-workbench-tile {
  --tile-tone-color: var(--studio-accent);
  --tile-tone-rgb: var(--theme-color-rgb);
  --tile-ring-color: color-mix(in srgb, rgb(var(--tile-tone-rgb)) 28%, var(--studio-border));
  @apply relative overflow-hidden border border-slate-200 transition;
  aspect-ratio: 1 / 1;
  border: 0;
  border-radius: var(--studio-radius-image);
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1px var(--tile-ring-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.32);
  background:
    linear-gradient(135deg, rgba(var(--tile-tone-rgb), 0.18), rgba(255, 255, 255, 0.08) 38%, rgba(15, 23, 42, 0.04) 100%),
    color-mix(in srgb, var(--studio-card-background) 88%, rgb(var(--tile-tone-rgb)) 12%);
}

.studio-workbench-tile.active {
  --tile-ring-color: color-mix(in srgb, rgb(var(--tile-tone-rgb)) 68%, white 32%);
  box-shadow:
    0 18px 34px rgba(var(--tile-tone-rgb), 0.18),
    0 0 0 1px rgba(var(--tile-tone-rgb), 0.24),
    inset 0 0 0 1px var(--tile-ring-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.38);
}

.studio-workbench-tile.selected {
  --tile-ring-color: color-mix(in srgb, rgb(var(--tile-tone-rgb)) 78%, black 6%);
}

.studio-workbench-tile.is-drop-target {
  transform: translateY(-4px);
  box-shadow:
    0 20px 36px rgba(var(--tile-tone-rgb), 0.22),
    0 0 0 1px rgba(var(--tile-tone-rgb), 0.28),
    inset 0 0 0 1px var(--tile-ring-color);
}

.studio-workbench-tile.is-dragging {
  opacity: 0.5;
}

.studio-workbench-tile-button {
  @apply absolute inset-0 block h-full w-full overflow-hidden text-left;
  border: 0;
  border-radius: inherit;
  background: transparent;
  padding: 0;
  transform: translateZ(0);
}

.studio-workbench-tile-button::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 32%),
    radial-gradient(circle at 20% 10%, rgba(var(--tile-tone-rgb), 0.18), transparent 46%);
  opacity: 0.58;
}

.studio-workbench-image {
  position: absolute;
  inset: 0;
  display: block;
  @apply h-full w-full object-cover;
  border-radius: inherit;
}

.studio-workbench-tile-gradient {
  @apply pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(7, 11, 18, 0.18) 48%, rgba(7, 11, 18, 0.66) 100%);
}

.studio-workbench-tile-copy {
  @apply pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-3 pb-3;
}

.studio-workbench-tile-name {
  @apply truncate text-sm font-semibold text-white;
}

.studio-workbench-tile-meta {
  @apply mt-1 text-[11px] text-slate-200;
}

.studio-workbench-tile-actions {
  --workbench-action-size: 32px;
  --workbench-action-gap: 6px;
  @apply absolute right-2 top-2 z-[3] flex items-center justify-end;
  left: auto;
  width: calc((var(--workbench-action-size) * 3) + (var(--workbench-action-gap) * 2));
  height: var(--workbench-action-size);
  gap: var(--workbench-action-gap);
  pointer-events: none;
}

.studio-workbench-icon {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-slate-900;
  background-color: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: auto;
  transform: translateX(0);
  transition:
    transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.studio-workbench-drag-hotzone {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 text-white/80;
  position: static;
  z-index: auto;
  background-color: rgba(2, 6, 23, 0.48);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: grab;
  pointer-events: auto;
  transform: translateX(0);
  transition:
    transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.studio-workbench-tile:active .studio-workbench-drag-hotzone {
  cursor: grabbing;
}

.studio-workbench-drag-hotzone {
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc((var(--workbench-action-size) + var(--workbench-action-gap)) * 2));
}

.studio-workbench-drag-hotzone + .studio-workbench-icon {
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc(var(--workbench-action-size) + var(--workbench-action-gap)));
}

.studio-workbench-tile:hover .studio-workbench-drag-hotzone,
.studio-workbench-tile:focus-within .studio-workbench-drag-hotzone,
.studio-workbench-tile:hover .studio-workbench-drag-hotzone + .studio-workbench-icon,
.studio-workbench-tile:focus-within .studio-workbench-drag-hotzone + .studio-workbench-icon {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.studio-workbench-marquee {
  @apply pointer-events-none absolute z-20 border border-blue-400/70;
  background-color: rgba(96, 165, 250, 0.12);
  border-radius: 18px;
}

.studio-main-actions {
  @apply flex flex-wrap gap-3;
}

.studio-bottom-action {
  @apply inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45;
}

.studio-bottom-action.icon-only {
  @apply px-3;
}

.studio-side-panel {
  @apply min-h-0;
}

.studio-history-panel {
  --studio-history-card-width: 100%;
  width: 100%;
  max-width: 100%;
  align-self: stretch;
}

.studio-history-header {
  position: relative;
  display: grid;
  width: var(--studio-history-card-width);
  max-width: 100%;
}

.studio-history-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.studio-history-title-row .studio-panel-title {
  min-width: 0;
}

.studio-history-title-wrap {
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
}

.studio-history-title {
  cursor: help;
}

.studio-history-title:focus-visible {
  outline: 2px solid var(--studio-accent);
  outline-offset: 4px;
  border-radius: var(--studio-radius-soft);
}

.studio-history-stats {
  display: inline-flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin: 0;
  overflow: hidden;
  color: var(--studio-muted);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  background: transparent;
}

.studio-history-stats span {
  flex: 0 0 auto;
  background: transparent;
}

.studio-history-stats .is-native {
  color: oklch(48% 0.13 155);
}

.studio-history-stats .is-upscaled {
  color: oklch(57% 0.14 75);
}

.studio-history-stats .is-degraded {
  color: oklch(52% 0.16 28);
}

.studio-shell.theme-night .studio-history-stats,
.studio-shell.theme-night .studio-history-stats span {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.studio-shell.theme-night .studio-history-stats .is-total {
  color: #93c5fd;
}

.studio-shell.theme-night .studio-history-stats .is-native {
  color: #34d399;
}

.studio-shell.theme-night .studio-history-stats .is-upscaled {
  color: #fbbf24;
}

.studio-shell.theme-night .studio-history-stats .is-degraded {
  color: #fb7185;
}

.studio-side-empty {
  @apply mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500;
  width: var(--studio-history-card-width);
  max-width: 100%;
}

.studio-history-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--studio-border);
  background: var(--studio-card-background);
  color: var(--studio-muted);
  font-size: 12px;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
}

.studio-history-clear:hover:not(:disabled) {
  color: var(--studio-accent-deep);
  border-color: var(--studio-border-strong);
  background: var(--studio-accent-soft);
}

.studio-history-clear:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.studio-history-list {
  margin: 8px -18px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  width: calc(var(--studio-history-card-width) + 36px);
  max-width: calc(100% + 36px);
  max-height: 600px;
  padding: 4px 18px 8px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scroll-padding: 4px 18px 8px;
  scroll-snap-type: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.studio-history-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.studio-history-list :deep(.glass-card) {
  scroll-snap-align: none;
}

@media (min-width: 1536px) {
  .studio-history-list {
    max-height: 636px;
  }
}

@media (max-width: 1279px) {
  .studio-history-list {
    max-height: min(72vh, 600px);
  }
}

.studio-history-thumb-wrap {
  /* 核心：左图固定 2:3；传入任意比例图片都只中心裁剪，不拉伸。 */
  position: relative;
  flex-shrink: 0;
  width: 110px;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border-radius: 6px;
  background: var(--studio-soft-background);
}

.studio-history-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.studio-history-thumb-badge {
  position: absolute;
  left: 5px;
  top: 4px;
  display: inline-flex;
  max-width: calc(100% - 10px);
  overflow: hidden;
  gap: 5px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.54);
  color: rgba(255, 255, 255, 0.9);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  backdrop-filter: blur(8px);
}

.studio-history-thumb-badge span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-history-copy {
  /* 核心：右侧按列分布，min-width:0 防止长文本撑爆 Flex 容器。 */
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 6px 2px 3px 0;
}

.studio-history-prompt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  align-self: start;
  min-height: 0;
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.34;
}

.studio-history-tags {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  gap: 6px;
}

.studio-history-tags span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
}

.studio-history-tags span:first-child {
  flex: 0 0 auto;
  max-width: 46%;
}

.studio-history-tags span:last-child {
  flex: 1 1 auto;
}

.studio-history-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
  color: var(--studio-muted);
  font-size: 11px;
  line-height: 1.24;
  font-variant-numeric: tabular-nums;
}

.studio-history-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-history-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}

.studio-history-footer-stack {
  display: grid;
  min-width: 0;
  flex: 1 1 auto;
  gap: 4px;
}

.studio-history-seed {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--studio-muted);
  font-size: 10.5px;
  line-height: 1.1;
  cursor: copy;
}

.studio-history-seed span,
.studio-history-seed strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-history-seed span {
  flex: 0 0 auto;
}

.studio-history-seed strong {
  flex: 1 1 auto;
  color: var(--studio-muted);
  font-weight: 500;
}

.studio-history-format {
  color: var(--studio-accent-deep);
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.studio-history-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
}

.studio-history-actions .studio-icon-button.inset {
  width: 21px;
  height: 21px;
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--studio-accent-deep) 44%, var(--studio-muted));
}

.studio-history-actions .studio-icon-button.inset:hover {
  color: var(--studio-text);
  background: color-mix(in srgb, var(--studio-soft-background) 72%, transparent);
}

.studio-history-actions .studio-icon-button.inset.danger:hover {
  color: #e11d48;
}

.studio-variant-grid {
  @apply mt-4 grid grid-cols-2 gap-3;
}

.studio-variant-card {
  @apply relative overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 text-left transition;
  aspect-ratio: 1 / 1;
}

.studio-variant-card.active {
  @apply border-blue-400 ring-2 ring-blue-200;
}

.studio-variant-card.selected {
  @apply border-slate-950;
}

.studio-variant-card img {
  @apply h-full w-full object-cover;
}

.studio-variant-meta {
  @apply absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700;
}

.studio-variant-check {
  @apply absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm;
}

.studio-download-stack {
  @apply mt-4 space-y-3;
}

.studio-download-card {
  @apply flex w-full items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50;
}

.studio-download-card strong {
  @apply block text-sm font-semibold text-slate-900;
}

.studio-download-card span {
  @apply mt-1 block text-xs leading-5 text-slate-500;
}

.studio-download-card.danger {
  @apply border-rose-100 bg-rose-50;
}

.studio-download-card.danger strong {
  @apply text-rose-700;
}

.studio-lightbox {
  @apply fixed inset-0 z-[90] flex items-center justify-center p-4;
  background: rgba(255, 255, 255, 0.56);
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  backdrop-filter: blur(22px) saturate(1.12);
  -webkit-backdrop-filter: blur(22px) saturate(1.12);
  transition: background-color 500ms ease, color 500ms ease, backdrop-filter 500ms ease;
}

.studio-lightbox.theme-night {
  background: rgba(2, 6, 23, 0.78);
  color: #f5f5f7;
}

.studio-lightbox-panel {
  @apply flex w-full flex-col overflow-hidden;
  max-width: min(90rem, calc(100vw - 48px));
  max-height: min(92vh, calc(100vh - 48px));
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
  color: inherit;
  backdrop-filter: blur(24px) saturate(1.08);
  -webkit-backdrop-filter: blur(24px) saturate(1.08);
  transition: background-color 500ms ease, border-color 500ms ease, box-shadow 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-panel {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(5, 7, 13, 0.86);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.72);
}

.studio-lightbox-header {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding: 24px;
  transition: border-color 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-header {
  border-color: rgba(255, 255, 255, 0.12);
}

.studio-lightbox-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.studio-lightbox-title {
  margin: 0;
  color: #1d1d1f;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  transition: color 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-title {
  color: #f5f5f7;
}

.studio-lightbox-prompt {
  display: -webkit-box;
  margin-top: 10px;
  max-width: 100%;
  max-height: 100px;
  overflow: hidden;
  border-radius: 0;
  background: transparent;
  color: #1d1d1f;
  padding: 0;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  transition: color 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-prompt {
  color: #f5f5f7;
}

.studio-lightbox-caption {
  margin-top: 6px;
  color: #86868b;
  font-size: 13px;
  line-height: 1.5;
  transition: color 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-caption {
  color: #8e8e93;
}

.studio-lightbox-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 8px;
  margin-top: 12px;
  color: #86868b;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.5;
  transition: color 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-meta {
  color: #8e8e93;
}

.studio-lightbox-meta span.primary {
  color: #1d1d1f;
  font-weight: 500;
}

.studio-lightbox.theme-night .studio-lightbox-meta span.primary {
  color: #f5f5f7;
}

.studio-lightbox-meta-dot {
  color: #c7c7cc;
}

.studio-lightbox.theme-night .studio-lightbox-meta-dot {
  color: #636366;
}

.studio-lightbox-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  background: transparent;
  padding: 4px 0 0;
  transition: color 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-actions {
  background: transparent;
}

.studio-lightbox-stage {
  @apply relative flex-1 overflow-hidden;
  box-sizing: border-box;
  padding: clamp(24px, 4vh, 44px) 0;
  background: rgba(255, 255, 255, 0.28);
  transition: background-color 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-stage {
  background: rgba(2, 6, 23, 0.3);
}

.studio-lightbox-frame {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: top left;
  will-change: transform;
}

.studio-lightbox-image {
  @apply block rounded-[24px];
  width: 100%;
  height: 100%;
  max-width: none;
  user-select: none;
  pointer-events: none;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.12);
  transition: box-shadow 500ms ease;
}

.studio-lightbox.theme-night .studio-lightbox-image {
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.72);
}

.studio-lightbox-image.is-fit {
  object-fit: contain;
}

.studio-lightbox-button {
  position: relative;
  display: inline-flex;
  min-height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.56);
  color: var(--theme-color, #007aff);
  padding: 0 15px;
  font-size: 14px;
  font-weight: 500;
  transform: translateZ(0);
  backdrop-filter: blur(14px) saturate(1.08);
  -webkit-backdrop-filter: blur(14px) saturate(1.08);
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease,
    transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1.2);
}

.studio-lightbox-button:hover {
  border-color: rgba(var(--theme-color-rgb, 0, 122, 255), 0.28);
  background: rgba(var(--theme-color-rgb, 0, 122, 255), 0.09);
  box-shadow: 0 8px 22px rgba(var(--theme-color-rgb, 0, 122, 255), 0.14);
  transform: translateY(-1px);
}

.studio-lightbox.theme-night .studio-lightbox-button {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.045);
  color: var(--theme-color, #007aff);
}

.studio-lightbox.theme-night .studio-lightbox-button:hover {
  border-color: rgba(var(--theme-color-rgb, 0, 122, 255), 0.42);
  background: rgba(var(--theme-color-rgb, 0, 122, 255), 0.18);
  color: var(--theme-color, #007aff);
}

.studio-lightbox-button:active {
  transform: translateY(0) scale(0.95);
  transition-duration: 110ms;
}

.studio-lightbox-button.active {
  border-color: rgba(var(--theme-color-rgb, 0, 122, 255), 0.3);
  background: rgba(var(--theme-color-rgb, 0, 122, 255), 0.15);
  color: var(--theme-color, #007aff);
}

.studio-lightbox-button:disabled {
  color: #8e8e93;
  cursor: not-allowed;
  opacity: 0.55;
}

.studio-lightbox-button-label {
  display: inline-block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-lightbox-stage.is-fit {
  cursor: zoom-in;
}

.studio-lightbox-stage.is-zoomed {
  cursor: grab;
}

.studio-lightbox-stage.is-dragging {
  cursor: grabbing;
}

.studio-lightbox-stage.is-magnifier-active {
  cursor: crosshair;
}

.studio-lightbox-lens {
  @apply absolute rounded-full border-2 border-white/90 shadow-2xl;
  pointer-events: none;
  background-repeat: no-repeat;
  background-color: rgba(15, 23, 42, 0.12);
  backdrop-filter: saturate(1.08);
  -webkit-backdrop-filter: saturate(1.08);
}

.studio-lightbox.is-immersive .studio-lightbox-header {
  display: none;
}

.studio-lightbox.is-immersive .studio-lightbox-panel {
  max-width: none;
  max-height: none;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.studio-lightbox.is-immersive .studio-lightbox-lens {
  display: none;
}

/* ===== Preview help tooltip (lives above the preview, after the meta line) ===== */
.studio-preview-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: var(--studio-muted);
  cursor: help;
  outline: none;
}

.studio-preview-help:hover,
.studio-preview-help:focus-visible {
  color: var(--studio-accent-deep);
  background: var(--studio-accent-soft);
}

.studio-preview-help-tip {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 280px;
  padding: 12px 14px;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: 12px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
  font-size: 12px;
  color: var(--studio-text);
  text-align: left;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 140ms ease, transform 140ms ease;
  pointer-events: none;
}

.studio-preview-help:hover .studio-preview-help-tip,
.studio-preview-help:focus-visible .studio-preview-help-tip {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.studio-preview-help-tip strong {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--studio-text);
  margin-bottom: 2px;
}

.studio-preview-help-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--studio-muted);
  font-size: 11.5px;
  line-height: 1.4;
}

.studio-model-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.studio-model-row .studio-select {
  flex: 1;
  margin-top: 0;
}

.studio-model-row .input {
  flex: 1;
  min-width: 0;
}

.studio-preview-help-row kbd {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  min-width: 38px;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--studio-text);
  background: var(--studio-soft);
  border: 1px solid var(--studio-border);
  border-bottom-width: 2px;
  border-radius: 6px;
}

.studio-window,
.studio-panel,
.studio-disabled-card {
  background: var(--studio-card-background);
  border-color: var(--studio-border);
  box-shadow: var(--studio-panel-shadow);
  backdrop-filter: var(--studio-backdrop-filter);
  -webkit-backdrop-filter: var(--studio-backdrop-filter);
}

.studio-window {
  border-radius: var(--studio-radius-window);
  box-shadow: var(--studio-window-shadow);
}

.studio-panel,
.studio-disabled-card {
  border-radius: var(--studio-radius-panel);
}

.studio-brand-mark,
.studio-empty-mark,
.studio-compare-handle,
.studio-variant-check,
.studio-release-trigger,
.studio-theme-trigger,
.studio-appearance-segment,
.studio-appearance-toggle,
.studio-icon-button,
.studio-icon-button.inset,
.studio-header-pill,
.studio-avatar,
.studio-panel-link-button,
.studio-inline-button,
.studio-ghost-link,
.studio-clear-button,
.studio-provider-pill,
.studio-ratio-card,
.studio-style-card,
.studio-quality-pill,
.studio-inline-number,
.studio-resolution-card,
.studio-chip,
.studio-generate-button,
.studio-secondary-action,
.studio-character-badge,
.studio-preview-tab,
.studio-bottom-action,
.studio-side-empty,
.studio-variant-card,
.studio-download-card,
.studio-workbench-toolbar,
.studio-progress-info,
.studio-progress-track,
.studio-api-presets,
.studio-api-preset-save,
.studio-api-preset-apply,
.studio-api-preset-delete,
.studio-api-preset-info,
.studio-popover-panel,
.studio-test-connection,
.studio-generate-target,
.studio-reference-images,
.studio-reference-tile,
.studio-preview-help-tip,
.studio-preview-single-cell,
.studio-prompt-template-preview,
.studio-negative-input .input,
.studio-seed-input .input {
  border-radius: var(--studio-radius-control);
}

.studio-release-panel,
.studio-workspace-panel,
.studio-appearance-panel,
.studio-workbench-surface,
.studio-prompt-modal-panel,
.studio-prompt-full-preview-panel,
.studio-lightbox-panel {
  border-radius: var(--studio-radius-panel);
}

.studio-style-preview,
.studio-preview-image,
.studio-compare-stage,
.studio-lightbox-image {
  border-radius: var(--studio-radius-image);
}

.studio-empty-mark {
  background: var(--studio-soft-background);
}

.studio-shell :deep(.input) {
  border-radius: var(--studio-radius-control);
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
  box-shadow: none;
}

.studio-shell :deep(.input::placeholder) {
  color: color-mix(in srgb, var(--studio-muted) 68%, transparent);
}

.studio-shell :deep(.input[readonly]) {
  color: var(--studio-muted);
}

.studio-shell :deep(.input:focus) {
  border-color: var(--studio-accent);
  box-shadow: 0 0 0 3px var(--studio-accent-soft);
}

.studio-header,
.studio-preview-header {
  border-color: var(--studio-border);
}

.studio-brand-mark {
  background: var(--studio-accent);
}

.studio-brand-kicker,
.studio-panel-link,
.studio-helper,
.studio-character-count,
.studio-preview-meta,
.studio-side-note,
.studio-inline-tip,
.studio-download-card span,
.studio-resolution-size,
.studio-empty-text {
  color: var(--studio-muted);
}

.studio-brand-title,
.studio-header-pill strong,
.studio-panel-title,
.studio-field-label,
.studio-provider-pill span,
.studio-slider-block strong,
.studio-resolution-name,
.studio-progress-value,
.studio-download-card strong,
.studio-empty-title,
.studio-disabled-title {
  color: var(--studio-text);
}

/* Style card title sits on top of image — must stay white & legible regardless of theme. */
.studio-style-card strong {
  color: #ffffff !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7), 0 0 6px rgba(0, 0, 0, 0.35);
}

.studio-header-pill,
.studio-icon-button,
.studio-avatar,
.studio-provider-pill,
.studio-ratio-card,
.studio-style-card,
.studio-quality-pill,
.studio-resolution-card,
.studio-chip,
.studio-preview-tab,
.studio-bottom-action,
.studio-side-empty,
.studio-download-card,
.studio-clear-button,
.studio-workbench-toolbar,
.studio-progress-info,
.studio-api-presets,
.studio-api-preset-info,
.studio-popover-panel,
.studio-reference-images,
.studio-preview-single-cell {
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-header-pill.subtle,
.studio-provider-pill,
.studio-style-card,
.studio-download-card,
.studio-panel-link-button,
.studio-inline-button,
.studio-ghost-link,
.studio-api-preset-save,
.studio-api-preset-apply,
.studio-api-preset-delete {
  background: var(--studio-card-background);
}

.studio-provider-pill small,
.studio-ratio-card,
.studio-quality-pill,
.studio-chip,
.studio-preview-tab,
.studio-bottom-action,
.studio-panel-link-button,
.studio-inline-button,
.studio-ghost-link,
.studio-clear-button,
.studio-icon-button,
.studio-workbench-pill {
  color: var(--studio-muted);
}

.studio-workbench-pill.accent {
  border-color: color-mix(in srgb, var(--studio-accent) 32%, var(--studio-border));
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-provider-pill.active,
.studio-ratio-card.active,
.studio-style-card.active,
.studio-quality-pill.active,
.studio-resolution-card.active,
.studio-preview-tab.active,
.studio-variant-card.active,
.studio-chip.active,
.studio-appearance-segment.active,
.studio-appearance-toggle.active,
.studio-accent-card.active {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  box-shadow: 0 12px 26px var(--studio-accent-shadow);
}

.studio-provider-pill.active span,
.studio-ratio-card.active,
.studio-quality-pill.active,
.studio-preview-tab.active,
.studio-variant-card.active,
.studio-chip.accent,
.studio-chip.active,
.studio-panel-link-button:hover,
.studio-inline-button:hover,
.studio-ghost-link:hover,
.studio-clear-button:hover {
  color: var(--studio-accent);
}

.studio-ratio-card.ghost {
  background: color-mix(in srgb, var(--studio-soft-background) 82%, transparent);
  color: var(--studio-muted);
}

.studio-ratio-icon {
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-soft-background) 72%, transparent);
}

.studio-chip.accent,
.studio-chip.active {
  border-color: var(--studio-border-strong);
  background: var(--studio-accent-soft);
}

/* generate-button colors live earlier in this block; the original gradient
   override has been intentionally removed. */

.studio-secondary-action,
.studio-bottom-action,
.studio-download-card:hover {
  background: var(--studio-card-background);
}

.studio-character-badge,
.studio-inline-number,
.studio-progress-track,
.studio-variant-meta {
  background: var(--studio-soft-background);
}

.studio-progress-bar {
  background: linear-gradient(90deg, var(--studio-accent) 0%, var(--studio-accent-deep) 100%);
}

.studio-preview-stage {
  background: var(--studio-stage-bg);
}

.studio-shell.theme-night .studio-workbench-surface {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--studio-accent) 18%, transparent) 0%, transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--studio-card-background) 94%, #0a0c12 6%) 0%, color-mix(in srgb, var(--studio-soft-background) 94%, transparent) 100%);
}

.studio-variant-card.selected {
  border-color: var(--studio-accent-deep);
}

.studio-variant-check {
  background: var(--studio-accent);
}

.studio-lightbox-stage {
  position: relative;
}

.studio-download-card.danger {
  background: rgba(225, 29, 72, 0.08);
}

.studio-download-card.danger strong {
  color: #e11d48;
}

.studio-disabled {
  border-radius: var(--studio-radius-window);
}

.studio-disabled {
  @apply flex min-h-[60vh] items-center justify-center rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_32%),#f8fafc] p-6;
}

.studio-disabled-card {
  @apply max-w-lg rounded-[28px] border border-slate-200 bg-white px-8 py-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)];
}

.studio-disabled-title {
  @apply text-2xl font-semibold text-slate-900;
}

.studio-disabled-text {
  @apply mt-3 text-sm leading-7 text-slate-500;
}

@media (max-width: 1279px) {
  .studio-layout {
    @apply grid-cols-1;
  }

  .studio-right-column {
    @apply order-3;
  }

  .studio-left-column {
    @apply order-2;
  }

  .studio-main-column {
    @apply order-1;
  }

  .studio-style-grid {
    @apply grid-cols-3;
  }
}

@media (max-width: 767px) {
  .studio-shell,
  .studio-shell.embedded {
    @apply p-2.5;
  }

  .studio-window {
    @apply rounded-[22px];
  }

  .studio-header {
    @apply px-4 py-4;
  }

  .studio-layout {
    @apply p-3;
  }

  .studio-panel {
    @apply rounded-[20px] p-3.5;
  }

  .studio-style-grid,
  .studio-ratio-grid,
  .studio-resolution-grid,
  .studio-quality-row,
  .studio-variant-grid,
  .studio-field-grid {
    @apply grid-cols-2;
  }

  .studio-prompt-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "side"
      "controls"
      "footer";
  }

  .studio-preview-tools,
  .studio-header-actions,
  .studio-main-actions {
    @apply w-full;
  }

  .studio-appearance-panel {
    left: 50%;
    right: auto;
    width: min(320px, calc(100vw - 1.25rem));
    --studio-popover-shift-x: -50%;
  }

  .studio-release-panel {
    left: auto;
    right: 0;
    width: min(340px, calc(100vw - 1.25rem));
    --studio-popover-shift-x: 0px;
  }

  .studio-theme-trigger span {
    @apply hidden;
  }

  .studio-theme-trigger {
    @apply px-2.5;
  }

  .studio-preview-stage {
    min-height: 280px;
  }

  .studio-preview-stage-single {
    height: clamp(320px, 70vh, 900px);
  }

  .studio-lightbox {
    @apply p-2;
  }

  .studio-lightbox-panel {
    max-height: calc(100vh - 1rem);
  }

  .studio-lightbox-header {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }

  .studio-lightbox-caption {
    @apply line-clamp-1;
  }

  .studio-lightbox-actions {
    @apply -mx-1 flex-nowrap overflow-x-auto px-1 pb-1;
    justify-content: flex-start;
    scrollbar-width: thin;
  }

  .studio-lightbox-button {
    @apply shrink-0;
  }

  .studio-lightbox-stage {
    padding-block: 18px;
    min-height: 260px;
  }

  .studio-workbench-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .studio-workbench-surface {
    --studio-workbench-columns: 2;
    min-height: 260px;
  }
}

/* Provider pill styling lives earlier in this block. Side-stripe + gradient
   variants previously here removed per Impeccable absolute bans. */

.studio-generate-target {
  @apply mt-3 flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 text-xs;
  border-color: color-mix(in srgb, var(--studio-accent) 22%, var(--studio-border) 78%);
  background: color-mix(in srgb, var(--studio-accent-soft) 60%, white 40%);
  color: color-mix(in srgb, var(--studio-text) 80%, var(--studio-accent-deep) 20%);
}

.studio-generate-target-mode {
  @apply inline-flex items-center gap-2 font-semibold;
  color: var(--studio-accent-deep);
}

.studio-generate-target-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--studio-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--studio-accent-soft) 60%, transparent);
}

.studio-generate-target-host {
  @apply flex-1 truncate font-mono;
  font-size: 11px;
  color: color-mix(in srgb, var(--studio-text) 78%, transparent);
}

.studio-generate-target-elapsed {
  @apply rounded-full px-2 py-0.5 font-medium;
  background: color-mix(in srgb, var(--studio-accent) 18%, white 82%);
  color: var(--studio-accent-deep);
}

/* Compact variant: single-line, matches Generate-button height */
.studio-generate-target.studio-generate-target-compact {
  @apply mt-2 flex-nowrap overflow-hidden whitespace-nowrap py-2;
  min-height: 44px;
  height: 44px;
}

.studio-generate-target.studio-generate-target-compact .studio-generate-target-host {
  @apply truncate;
  flex: 1 1 auto;
  min-width: 0;
}

.studio-generate-target.studio-generate-target-compact .studio-generate-target-mode {
  flex: 0 0 auto;
}

/* === Reference images (img-to-img) module === */
.studio-reference-images {
  @apply mt-3 rounded-2xl border p-3;
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-soft-background) 60%, transparent);
}

.studio-reference-head {
  @apply mb-2 flex items-start justify-between gap-3;
}

.studio-reference-grid {
  @apply flex flex-wrap gap-2;
}

.studio-reference-tile {
  @apply relative h-20 w-20 overflow-hidden rounded-xl border;
  border-color: var(--studio-border);
}

.studio-reference-preview-trigger {
  @apply block h-full w-full cursor-zoom-in overflow-hidden;
}

.studio-reference-tile img {
  @apply h-full w-full object-cover;
}

.studio-reference-remove {
  @apply absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-white;
  background: rgba(15, 23, 42, 0.7);
}

.studio-reference-remove:hover {
  background: rgba(220, 38, 38, 0.85);
}

.studio-reference-add {
  @apply inline-flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-xs transition;
  border-color: var(--studio-border);
  background: var(--studio-surface);
  color: color-mix(in srgb, var(--studio-text) 60%, transparent);
}

.studio-reference-add:hover {
  border-color: var(--studio-accent);
  color: var(--studio-accent-deep);
  background: color-mix(in srgb, var(--studio-accent-soft) 35%, var(--studio-surface) 65%);
}

.studio-reference-error {
  @apply mt-2 text-xs;
  color: rgb(220, 38, 38);
}

.studio-reference-preview-panel {
  @apply flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/10 text-white shadow-[0_30px_100px_rgba(15,23,42,0.48)];
  background: linear-gradient(180deg, rgba(7, 11, 27, 0.98) 0%, rgba(8, 13, 30, 0.94) 100%);
}

.studio-reference-preview {
  background: rgba(2, 6, 23, 0.92);
  color: #ffffff;
}

.studio-reference-preview .studio-lightbox-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px 20px;
}

.studio-reference-preview .studio-lightbox-title {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.studio-reference-preview .studio-lightbox-caption {
  color: rgba(226, 232, 240, 0.82);
}

.studio-reference-preview .studio-lightbox-actions {
  flex-wrap: wrap;
  border-radius: 0;
  background: transparent;
  padding: 0;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.studio-reference-preview .studio-lightbox-button {
  width: auto;
  height: auto;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--studio-radius-control);
  color: #ffffff;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
}

.studio-reference-preview .studio-lightbox-button:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: none;
}

.studio-reference-preview .studio-lightbox-button:active {
  transform: scale(0.98);
}

.studio-reference-preview .studio-lightbox-button:disabled {
  color: rgba(226, 232, 240, 0.48);
}

.studio-reference-preview-stage {
  @apply flex min-h-[50vh] items-center justify-center overflow-auto p-4;
  background:
    radial-gradient(circle at 18% 16%, rgba(96, 165, 250, 0.13), transparent 26%),
    radial-gradient(circle at 84% 84%, rgba(148, 163, 184, 0.1), transparent 24%),
    linear-gradient(180deg, #050816 0%, #0b1120 100%);
}

.studio-reference-preview-image {
  @apply block max-h-[76vh] max-w-full rounded-2xl object-contain shadow-[0_26px_72px_rgba(2,6,23,0.36)];
}

/* === New compact settings strip (above status indicator) === */
.studio-settings-strip {
  @apply mt-3 flex flex-col gap-2;
}

.studio-strip-row {
  @apply flex flex-wrap items-center gap-1.5;
}

.studio-strip-aspect {
  @apply gap-1;
}

.studio-strip-chip {
  @apply inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition;
  border-color: var(--studio-border);
  background: var(--studio-surface);
  color: color-mix(in srgb, var(--studio-text) 78%, transparent);
}

.studio-strip-chip:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--studio-accent) 35%, var(--studio-border));
  background: color-mix(in srgb, var(--studio-accent-soft) 30%, var(--studio-surface) 70%);
  color: var(--studio-accent-deep);
}

.studio-strip-chip.active {
  border-color: var(--studio-accent);
  background: color-mix(in srgb, var(--studio-accent-soft) 70%, white 30%);
  color: var(--studio-accent-deep);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--studio-accent) 40%, transparent);
}

.studio-strip-chip.ghost {
  @apply opacity-60;
  border-style: dashed;
}

.studio-strip-chip:disabled {
  cursor: not-allowed;
}

.studio-strip-chip .studio-ratio-icon {
  width: 14px;
  height: 14px;
}

.studio-strip-actions {
  @apply gap-2;
}

.studio-strip-popover {
  @apply relative;
}

.studio-strip-trigger {
  @apply inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition;
  border-color: var(--studio-border);
  background: var(--studio-surface);
  color: color-mix(in srgb, var(--studio-text) 80%, transparent);
}

.studio-strip-trigger:hover {
  border-color: color-mix(in srgb, var(--studio-accent) 35%, var(--studio-border));
  background: color-mix(in srgb, var(--studio-accent-soft) 30%, var(--studio-surface) 70%);
  color: var(--studio-accent-deep);
}

.studio-strip-trigger.is-open,
.studio-strip-trigger.active {
  border-color: var(--studio-accent);
  background: color-mix(in srgb, var(--studio-accent-soft) 70%, white 30%);
  color: var(--studio-accent-deep);
}

.studio-popover-panel {
  @apply absolute left-0 top-full z-30 mt-2 w-[320px] rounded-2xl border bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)];
  border-color: var(--studio-border);
}

.studio-popover-narrow {
  @apply w-[260px];
}

.studio-popover-head {
  @apply mb-2 flex items-center justify-between;
}

.studio-popover-title {
  @apply text-sm font-semibold;
  color: var(--studio-text);
}

.studio-popover-panel .studio-style-grid {
  @apply grid grid-cols-3 gap-2;
}

.studio-popover-panel .studio-style-card {
  @apply text-xs;
}

.studio-popover-panel .studio-quality-row {
  @apply flex flex-wrap gap-1.5;
}

.studio-popover-panel .studio-seed-input {
  @apply mt-2;
}

.studio-quota-card {
  display: grid;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--studio-accent-soft) 70%, var(--studio-card-background));
  border: 1px solid color-mix(in srgb, var(--studio-border-strong) 22%, transparent);
}

.studio-quota-card > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.studio-quota-card span,
.studio-quota-card small {
  color: var(--studio-muted);
  font-size: 11px;
  line-height: 1.45;
}

.studio-quota-card strong {
  color: var(--studio-accent-deep);
  font-size: 13px;
  font-weight: 600;
}

.studio-custom-ratio-modal {
  width: min(360px, calc(100vw - 32px));
  border-radius: 24px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: var(--studio-card-background);
  padding: 18px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
}

.studio-custom-ratio-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 10px;
  margin: 16px 0 18px;
}

.studio-custom-ratio-form label {
  display: grid;
  gap: 6px;
}

.studio-custom-ratio-form span {
  color: var(--studio-muted);
  font-size: 11px;
  font-weight: 600;
}

.studio-custom-ratio-form strong {
  padding-bottom: 10px;
  color: var(--studio-muted);
  font-weight: 500;
}

.studio-custom-ratio-form input {
  height: 42px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Stack rows on narrow screens so chips wrap and the popover row sits under aspect */
@media (max-width: 767px) {
  .studio-popover-panel {
    @apply w-[min(92vw,300px)];
  }
}

.studio-generation-banner {
  @apply mt-3 flex items-start gap-2 rounded-2xl border px-3 py-3 text-xs;
  border-color: rgba(220, 38, 38, 0.32);
  background: rgba(254, 242, 242, 0.92);
  color: rgb(127, 29, 29);
}

.studio-generation-banner.is-recoverable {
  border-color: rgba(217, 119, 6, 0.4);
  background: rgba(255, 251, 235, 0.96);
  color: rgb(120, 53, 15);
}

.studio-generation-banner-body {
  @apply flex min-w-0 flex-1 items-start gap-2;
}

.studio-generation-banner-copy {
  @apply flex min-w-0 flex-1 flex-col gap-1;
}

.studio-generation-banner-title {
  @apply font-semibold leading-5;
}

.studio-generation-banner-message {
  @apply leading-5;
}

.studio-generation-banner-detail {
  @apply leading-5;
}

.studio-generation-banner-raw {
  @apply mt-1 break-words rounded-xl border px-2 py-1 font-mono text-[11px] leading-5;
  border-color: rgba(220, 38, 38, 0.22);
  background: rgba(255, 255, 255, 0.62);
}

.studio-generation-banner-actions {
  @apply flex items-center gap-1;
}

.studio-banner-action {
  @apply rounded-lg border px-2 py-1 text-xs font-semibold transition;
  border-color: currentColor;
  background: rgba(255, 255, 255, 0.6);
}

.studio-banner-action:hover {
  background: rgba(255, 255, 255, 0.95);
}

.studio-banner-dismiss {
  @apply rounded-lg p-1 text-current opacity-60 transition;
}

.studio-banner-dismiss:hover {
  @apply opacity-100;
  background: rgba(255, 255, 255, 0.5);
}

.studio-generate-button.is-cancel {
  background: oklch(64% 0.18 38);
  color: oklch(99% 0.005 250);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.studio-generate-button.is-cancel:hover {
  background: oklch(58% 0.20 35);
}

/* Ensure the lightbox stage always has room for the image, even when the
   header grows due to long prompts or metadata. */
.studio-lightbox-stage {
  min-height: 60vh;
}

.studio-lightbox-header {
  flex-shrink: 0;
  max-height: 36vh;
  overflow: visible;
}


.studio-workbench-grid {
  display: grid;
  gap: var(--studio-workbench-gap, 14px);
  padding: var(--studio-workbench-padding, 16px);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 1fr;
}

@media (max-width: 600px) {
  .studio-workbench-surface {
    --studio-workbench-columns: 2;
  }

  .studio-workbench-grid {
    grid-template-columns: repeat(var(--studio-workbench-columns), minmax(0, 1fr));
  }
}

/* ====== ChatGPT-style progress info row ====== */
.studio-progress-info {
  @apply mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2;
  background: var(--studio-soft-background);
  border: 1px solid var(--studio-border);
}

.studio-progress-info-text {
  @apply flex min-w-0 flex-1 flex-col gap-0.5 text-xs;
  color: var(--studio-muted);
}

.studio-progress-info-text strong {
  @apply text-sm font-semibold;
  color: var(--studio-text);
}

.studio-current-progress {
  @apply mt-1.5 w-full max-w-[360px];
}

.studio-current-progress-meta {
  @apply mb-1 flex items-center justify-between gap-3 text-[11px] leading-none;
  color: var(--studio-muted);
}

.studio-current-progress-meta strong {
  @apply text-[11px] font-semibold tabular-nums;
  color: var(--studio-accent);
}

.studio-current-progress-track {
  @apply h-1.5 overflow-hidden rounded-full;
  background: color-mix(in srgb, var(--studio-border) 70%, transparent);
}

.studio-current-progress-track span {
  @apply block h-full rounded-full;
  width: 0%;
  background: var(--studio-accent);
  transition: width 220ms ease;
}

.studio-progress-cancel {
  @apply inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition;
  border: 1px solid var(--studio-border);
  background: #ffffff;
  color: #374151;
}

.studio-progress-cancel:hover {
  border-color: oklch(75% 0.13 50);
  color: oklch(50% 0.16 35);
  background: oklch(98% 0.02 60);
}

.studio-test-connection {
  @apply mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition;
  background: var(--studio-card-background);
  color: var(--studio-text);
  border: 1px solid var(--studio-border);
}

.studio-test-connection:hover:not(:disabled) {
  border-color: var(--studio-accent);
  color: var(--studio-accent-deep);
}

.studio-test-connection:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.studio-test-connection.is-busy {
  color: var(--studio-accent-deep);
  border-color: var(--studio-accent);
}

.studio-test-connection.is-ok {
  color: oklch(48% 0.15 155);
  border-color: oklch(72% 0.14 155);
  background: oklch(96% 0.04 155);
}

.studio-test-connection.is-fail {
  color: oklch(48% 0.18 25);
  border-color: oklch(74% 0.16 25);
  background: oklch(96% 0.04 25);
}

.studio-api-presets {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--studio-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.42);
}

.studio-api-presets-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.studio-api-presets-head div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.studio-api-presets-head span {
  color: var(--studio-text);
  font-size: 13px;
  font-weight: 700;
}

.studio-api-presets-head small,
.studio-api-preset-item small {
  overflow: hidden;
  color: var(--studio-muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-api-preset-save-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.studio-api-preset-save,
.studio-api-preset-apply,
.studio-api-preset-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid var(--studio-border);
  background: var(--studio-card-background);
  color: var(--studio-text);
  font-size: 12px;
  font-weight: 700;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;
}

.studio-api-preset-save {
  min-width: 96px;
  padding: 0 12px;
  color: var(--studio-accent-deep);
  white-space: nowrap;
}

.studio-api-preset-save:hover,
.studio-api-preset-apply:hover,
.studio-api-preset-delete:hover {
  border-color: var(--studio-accent);
  color: var(--studio-accent-deep);
  background: rgba(var(--theme-color-rgb), 0.08);
}

.studio-api-preset-list {
  display: grid;
  max-height: 172px;
  gap: 8px;
  overflow-y: auto;
  scrollbar-width: none;
}

.studio-api-preset-list::-webkit-scrollbar {
  display: none;
}

.studio-api-preset-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 32px;
  gap: 6px;
  align-items: stretch;
  border-radius: 10px;
}

.studio-api-preset-item.active .studio-api-preset-info {
  border-color: rgba(var(--theme-color-rgb), 0.36);
  background: rgba(var(--theme-color-rgb), 0.08);
}

.studio-api-preset-info {
  display: grid;
  min-width: 0;
  gap: 2px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--studio-border) 80%, transparent);
  background: rgba(255, 255, 255, 0.46);
  padding: 8px 10px;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease;
}

.studio-api-preset-item:hover .studio-api-preset-info {
  border-color: rgba(var(--theme-color-rgb), 0.28);
  background: rgba(var(--theme-color-rgb), 0.07);
}

.studio-api-preset-info strong {
  overflow: hidden;
  color: var(--studio-text);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-api-preset-apply {
  min-width: 48px;
  padding: 0 10px;
  color: var(--studio-accent-deep);
}

.studio-api-preset-item.active .studio-api-preset-apply {
  color: oklch(46% 0.15 155);
}

.studio-api-preset-delete {
  width: 32px;
  min-height: 100%;
  color: #e11d48;
}

.studio-undo-bar {
  @apply mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm;
  background: oklch(96% 0.02 250);
  border: 1px solid var(--studio-border);
  color: var(--studio-text);
}

.studio-undo-bar-text {
  flex: 1;
  color: var(--studio-muted);
}

.studio-undo-bar-action {
  @apply rounded-md px-2 py-1 text-xs font-semibold transition;
  color: var(--studio-accent-deep);
  background: var(--studio-accent-soft);
  border: 1px solid transparent;
}

.studio-undo-bar-action:hover {
  background: oklch(94% 0.04 250);
  border-color: var(--studio-accent);
}

/* ===== Popover row in left panel-1 ===== */
.studio-popover-row {
  @apply mt-3 grid grid-cols-2 gap-2;
}

.studio-popover-host {
  position: relative;
}

.studio-popover-trigger {
  @apply flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  color: var(--studio-text);
}

.studio-popover-trigger:hover {
  border-color: oklch(80% 0.012 250);
}

.studio-popover-trigger.is-open {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-popover-trigger.tone-cyan svg { color: oklch(58% 0.12 220); }
.studio-popover-trigger.tone-violet svg { color: oklch(54% 0.16 290); }

.studio-popover-trigger-label {
  flex: none;
  font-weight: 600;
}

.studio-popover-trigger-meta {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 11px;
  font-weight: 500;
  color: var(--studio-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-popover-trigger.is-incomplete .studio-popover-trigger-meta {
  color: oklch(58% 0.16 35);
}

.studio-popover-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  min-width: 240px;
  width: max-content;
  max-width: 360px;
  padding: 14px;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10);
}

.studio-popover-panel.is-wide {
  min-width: 320px;
  max-width: 420px;
}

.studio-popover-panel.is-upward {
  top: auto;
  bottom: calc(100% + 6px);
  margin-top: 0;
}

.studio-popover-head {
  @apply mb-3 flex items-start justify-between gap-3;
}

.studio-popover-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--studio-text);
}

.studio-popover-subtitle {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--studio-muted);
}

.studio-popover-close {
  @apply rounded-md p-1 text-current opacity-50 transition;
}

.studio-popover-close:hover {
  opacity: 1;
  background: var(--studio-soft);
}

.studio-popover-enter-active,
.studio-popover-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.studio-popover-enter-from,
.studio-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

.studio-popover-panel.is-upward.studio-popover-enter-from,
.studio-popover-panel.is-upward.studio-popover-leave-to {
  transform: translateY(4px) scale(0.98);
}

.studio-inline-meta {
  @apply mt-1 flex items-center gap-2 text-sm;
  color: var(--studio-muted);
}

.studio-inline-meta strong {
  color: var(--studio-text);
  font-size: 16px;
}

/* ===== Operation tone classes for icon-buttons =====
   Color encodes intent at a glance: blue=read/download, emerald=copy/affirm,
   violet=create/variant, amber=warn, rose=destructive, slate=neutral. */
.studio-icon-button.tone-blue:hover:not(:disabled) {
  color: oklch(48% 0.16 245);
  border-color: oklch(78% 0.10 245);
  background: oklch(96% 0.02 245);
}

.studio-icon-button.tone-emerald:hover:not(:disabled) {
  color: oklch(48% 0.14 155);
  border-color: oklch(78% 0.10 155);
  background: oklch(96% 0.02 155);
}

.studio-icon-button.tone-violet:hover:not(:disabled) {
  color: oklch(48% 0.16 290);
  border-color: oklch(78% 0.10 290);
  background: oklch(96% 0.02 290);
}

.studio-icon-button.tone-amber:hover:not(:disabled) {
  color: oklch(54% 0.14 70);
  border-color: oklch(80% 0.10 70);
  background: oklch(96% 0.03 70);
}

.studio-icon-button.tone-rose:hover:not(:disabled) {
  color: oklch(50% 0.18 25);
  border-color: oklch(78% 0.12 25);
  background: oklch(96% 0.03 25);
}

.studio-icon-button.tone-slate {
  /* keep base neutral hover */
}

/* ===== Right column prompt-helper ===== */
.studio-helper-panel {
  position: relative;
  overflow: visible;
}

.studio-helper-popover {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  left: auto;
  top: auto;
  width: 320px;
  max-width: 360px;
  max-height: 70vh;
  overflow-y: auto;
}

.studio-helper-provider-grid {
  @apply mt-2 grid grid-cols-3 gap-2;
}

.studio-helper-provider-card {
  @apply flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left text-xs transition;
  background: var(--studio-card-background);
  border: 1px solid var(--studio-border);
  color: var(--studio-text);
}

.studio-helper-provider-card:hover {
  border-color: oklch(80% 0.012 250);
}

.studio-helper-provider-card.active {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-helper-provider-name {
  font-weight: 700;
  font-size: 13px;
}

.studio-helper-provider-meta {
  color: var(--studio-muted);
  font-size: 10.5px;
}

.studio-helper-quality {
  margin-top: 4px;
}

.studio-helper-quality.is-warning {
  color: rgb(180, 83, 9);
}

.studio-helper-actions {
  @apply mt-3 flex items-center justify-end gap-2;
}

/* ===== Evolution timeline (right column) =====
   Vertical timeline of recent generations. Newest at the top, oldest at the
   bottom: read from bottom up to follow the evolution sequence. Each step has
   a connector line, a dot (filled accent for the head), and a thumbnail card. */
.studio-evolution-panel {
  display: flex;
  flex-direction: column;
}

.studio-evolution-timeline {
  @apply mt-3 flex flex-col;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 6px;
}

.studio-evolution-step {
  position: relative;
}

.studio-evolution-step-card {
  width: 100%;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 6px 10px 6px 8px;
  background: var(--studio-card-background);
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
  text-align: left;
  min-width: 0;
}

.studio-evolution-step-card:hover {
  background: var(--studio-soft-background);
}

.studio-evolution-step.is-current .studio-evolution-step-card {
  background: var(--studio-accent-soft);
  border-color: var(--studio-accent);
}

.studio-evolution-step.is-head:not(.is-current) .studio-evolution-step-card {
  background: var(--studio-soft-background);
}

.studio-evolution-step-card img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--studio-soft);
}

.studio-evolution-step-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.studio-evolution-step-model {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--studio-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.studio-evolution-step-time {
  font-size: 10.5px;
  color: var(--studio-muted);
  font-variant-numeric: tabular-nums;
}

.studio-evolution-step.is-current .studio-evolution-step-model {
  color: var(--studio-accent-deep);
}

.studio-evolution-step-arrow {
  color: var(--studio-muted);
  opacity: 0;
  transition: opacity 140ms ease, transform 140ms ease;
}

.studio-evolution-step-card:hover .studio-evolution-step-arrow {
  opacity: 1;
  transform: translateX(2px);
}

.studio-evolution-step.is-current .studio-evolution-step-arrow {
  opacity: 1;
  color: var(--studio-accent-deep);
}

@keyframes studio-evolution-rise {
  from { opacity: 0; transform: translateY(14px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes studio-evolution-shift-right {
  from { transform: translateX(-12px); opacity: 0.6; }
  to   { transform: translateX(0); opacity: 1; }
}

/* ===== Generating preview animation =====
   Existing image breathes into a soft blur and back, with a horizontal shine
   sweeping across to suggest "developing". When there is no prior image, the
   stage shows a skeleton block with the same shine. */
.studio-preview-stage.is-generating {
  cursor: progress;
  isolation: isolate;
}

.studio-preview-image.is-generating-shimmer {
  animation: studio-preview-blur-breath 2.4s ease-in-out infinite;
}

@keyframes studio-preview-blur-breath {
  0%, 100% { filter: blur(0px) saturate(1); transform: scale(1); }
  50%      { filter: blur(8px) saturate(1.05); transform: scale(1.01); }
}

.studio-preview-generating-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0) 60%, rgba(15,23,42,0.04) 100%);
}

.studio-preview-generating-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 30%,
    rgba(255, 255, 255, 0.55) 50%,
    transparent 70%
  );
  background-size: 220% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: overlay;
  animation: studio-preview-shine 2s linear infinite;
}

@keyframes studio-preview-shine {
  from { background-position: 120% 0; }
  to   { background-position: -120% 0; }
}

.studio-preview-generating-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--studio-border);
  border-radius: 999px;
  color: var(--studio-accent-deep);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.studio-preview-stage.is-generating-empty {
  background: linear-gradient(135deg, oklch(96% 0.014 250) 0%, oklch(94% 0.018 245) 100%);
  position: relative;
  overflow: hidden;
}

.studio-preview-skeleton {
  position: absolute;
  inset: 16px;
  border-radius: 14px;
  background:
    linear-gradient(120deg, oklch(94% 0.02 250) 0%, oklch(98% 0.01 250) 50%, oklch(94% 0.02 250) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 18px;
  overflow: hidden;
}

.studio-preview-skeleton-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 30%,
    rgba(255, 255, 255, 0.7) 50%,
    transparent 70%
  );
  background-size: 220% 100%;
  background-repeat: no-repeat;
  animation: studio-preview-shine 1.6s linear infinite;
}

/* ===== Global theme normalization =====
   Keep the appearance controls authoritative across the whole studio surface. */
.studio-shell :is(
  .studio-release-trigger,
  .studio-theme-trigger,
  .studio-avatar,
  .studio-avatar-menu,
  .studio-avatar-menu-item,
  .studio-release-panel,
  .studio-workspace-panel,
  .studio-workspace-field code,
  .studio-workspace-actions button,
  .studio-appearance-panel,
  .studio-appearance-segment,
  .studio-appearance-toggle,
  .studio-accent-card,
  .studio-provider-pill,
  .studio-popover-trigger,
  .studio-popover-panel,
  .studio-api-presets,
  .studio-api-preset-save,
  .studio-api-preset-apply,
  .studio-api-preset-delete,
  .studio-api-preset-info,
  .studio-test-connection,
  .studio-ratio-card,
  .studio-quality-pill,
  .studio-resolution-card,
  .studio-chip,
  .studio-count-quick-button,
  .studio-generate-target,
  .studio-reference-images,
  .studio-reference-tile,
  .studio-prompt-template-panel,
  .studio-prompt-template-preview,
  .studio-template-info-row,
  .studio-prompt-template-button,
  .studio-translate-row,
  .studio-generate-button,
  .studio-secondary-action,
  .studio-preview-tab,
  .studio-preview-help-tip,
  .studio-preview-single-cell,
  .studio-workbench-toolbar,
  .studio-workbench-surface,
  .studio-workbench-tile,
  .studio-progress-info,
  .studio-progress-track,
  .studio-progress-cancel,
  .studio-inline-button,
  .studio-bottom-action,
  .studio-side-empty,
  .studio-history-clear,
  .studio-helper-provider-card,
  .studio-evolution-step-card,
  .studio-disabled,
  .studio-disabled-card
) {
  border-radius: var(--studio-radius-control);
}

.studio-shell :is(
  .studio-panel,
  .studio-disabled,
  .studio-disabled-card,
  .studio-release-panel,
  .studio-workspace-panel,
  .studio-appearance-panel,
  .studio-workbench-surface,
  .studio-prompt-modal-panel,
  .studio-prompt-full-preview-panel,
  .studio-lightbox-panel
) {
  border-radius: var(--studio-radius-panel);
}

.studio-shell .studio-window {
  border-radius: var(--studio-radius-window);
}

.studio-shell :is(
  .studio-preview-image,
  .studio-style-preview,
  .studio-compare-stage,
  .studio-lightbox-image,
  .studio-reference-tile img,
  .studio-prompt-template-preview img,
  .studio-prompt-library-card-visual,
  .studio-prompt-library-item
) {
  border-radius: var(--studio-radius-image);
}

.studio-shell.theme-night :is(
  .studio-header,
  .studio-workbench-toolbar,
  .studio-progress-info,
  .studio-prompt-template-panel,
  .studio-translate-row,
  .studio-reference-images,
  .studio-api-presets,
  .studio-popover-panel,
  .studio-appearance-panel,
  .studio-release-panel,
  .studio-workspace-panel,
  .studio-avatar-menu,
  .studio-disabled-card,
  .studio-preview-single-cell,
  .studio-replacement-preview-panel,
  .studio-replacement-editor-panel,
  .studio-replacement-context,
  .studio-prompt-library-empty,
  .studio-prompt-upload-body
) {
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-card-background) 88%, #0a0c12 12%);
  color: var(--studio-text);
}

.studio-shell.theme-night :is(
  .studio-workspace-field code,
  .studio-workspace-actions button,
  .studio-template-info-row,
  .studio-prompt-template-button,
  .studio-secondary-action,
  .studio-bottom-action,
  .studio-inline-button,
  .studio-clear-button,
  .studio-panel-link-button,
  .studio-ghost-link,
  .studio-api-preset-save,
  .studio-api-preset-apply,
  .studio-api-preset-delete,
  .studio-api-preset-info,
  .studio-helper-provider-card,
  .studio-evolution-step-card,
  .studio-character-badge,
  .studio-preview-tab,
  .studio-count-quick-button,
  .studio-reference-remove
) {
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-shell.theme-night :is(
  .studio-brand-title,
  .studio-panel-title,
  .studio-field-label,
  .studio-workbench-toolbar-title,
  .studio-prompt-template-title,
  .studio-template-info-row strong,
  .studio-release-title,
  .studio-workspace-panel-head p,
  .studio-helper-provider-name,
  .studio-evolution-step-model,
  .studio-disabled-title
) {
  color: var(--studio-text);
}

.studio-shell.theme-night :is(
  .studio-brand-kicker,
  .studio-helper,
  .studio-panel-link,
  .studio-workbench-tip,
  .studio-template-info-row span,
  .studio-release-subtitle,
  .studio-workspace-panel-head span,
  .studio-helper-provider-meta,
  .studio-evolution-step-time,
  .studio-disabled-text
) {
  color: var(--studio-muted);
}

.studio-shell.theme-night :is(
  .studio-generate-target,
  .studio-progress-track,
  .studio-preview-stage,
  .studio-side-empty,
  .studio-character-badge,
  .studio-prompt-template-button:not(.primary)
) {
  background: var(--studio-soft-background);
  color: var(--studio-text);
  border-color: var(--studio-border);
}

.studio-shell.theme-night .studio-generate-target-host {
  color: color-mix(in srgb, var(--studio-text) 78%, transparent);
}

.studio-shell.theme-night .studio-prompt-template-button.primary {
  background: var(--studio-accent);
  border-color: var(--studio-accent);
  color: #fff;
}

.studio-shell.theme-night .studio-workbench-surface {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--studio-accent) 18%, transparent) 0%, transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--studio-card-background) 94%, #0a0c12 6%) 0%, color-mix(in srgb, var(--studio-soft-background) 94%, transparent) 100%);
}

.studio-shell.theme-night .studio-preview-generating-label {
  background: var(--studio-card-background);
  color: var(--studio-accent-deep);
}

/* Teleported dialogs and late-added tool surfaces must obey the same
   appearance variables as the main studio shell. */
.studio-shell :is(
  .studio-strip-chip,
  .studio-strip-trigger,
  .studio-profile-advice,
  .studio-profile-advice button,
  .studio-quota-card,
  .studio-local-upscale-control,
  .studio-local-upscale-toggle,
  .studio-count-quick,
  .studio-strip-row,
  .studio-generate-target-elapsed,
  .studio-generation-banner,
  .studio-generation-banner-raw,
  .studio-banner-action,
  .studio-banner-dismiss,
  .studio-translate-lang,
  .studio-translate-btn,
  .studio-prompt-template-panel,
  .studio-template-info-row,
  .studio-workbench-pill,
  .studio-workbench-icon,
  .studio-current-progress-track,
  .studio-current-progress-track span,
  .studio-accent-swatch,
  .studio-history-stats,
  .studio-history-stats span
) {
  border-radius: var(--studio-radius-control);
}

.studio-shell :is(
  .studio-workbench-image,
  .studio-reference-preview-image
) {
  border-radius: var(--studio-radius-image);
}

.studio-prompt-modal-backdrop :is(
  .studio-prompt-modal-panel,
  .studio-compatibility-modal,
  .studio-custom-ratio-modal,
  .studio-prompt-category-menu,
  .studio-prompt-library-empty,
  .studio-replacement-preview-panel,
  .studio-replacement-editor-panel,
  .studio-prompt-details-prompt,
  .studio-reference-preview-panel
) {
  border-radius: var(--studio-radius-panel);
}

.studio-prompt-modal-backdrop :is(
  .studio-prompt-library-search,
  .studio-prompt-library-category-trigger,
  .studio-prompt-library-command,
  .studio-prompt-category-search,
  .studio-prompt-category-option,
  .studio-prompt-category-add,
  .studio-prompt-category-icon,
  .studio-prompt-category-option small,
  .studio-prompt-library-batchbar,
  .studio-prompt-library-batchbar button,
  .studio-prompt-library-item,
  .studio-prompt-library-check,
  .studio-prompt-image-drop,
  .studio-prompt-upload-fields .input,
  .studio-prompt-upload-error,
  .studio-prompt-upload-remove-image,
  .studio-prompt-upload-cancel,
  .studio-prompt-upload-save,
  .studio-replacement-mode,
  .studio-replacement-mode strong,
  .studio-replacement-smart-button,
  .studio-replacement-error,
  .studio-replacement-empty,
  .studio-replacement-context,
  .studio-replacement-context mark,
  .studio-replacement-editor-field code,
  .studio-replacement-editor-actions button,
  .studio-replacement-highlight,
  .studio-prompt-details-close,
  .studio-prompt-details-prompt
) {
  border-radius: var(--studio-radius-control);
}

.studio-prompt-modal-backdrop :is(
  .studio-prompt-library-card-visual,
  .studio-prompt-details-visual,
  .studio-prompt-full-preview-image
) {
  border-radius: var(--studio-radius-image);
}

.studio-reference-preview :is(
  .studio-reference-preview-panel,
  .studio-lightbox-panel
) {
  border-radius: var(--studio-radius-panel);
}

.studio-reference-preview :is(
  .studio-lightbox-button,
  .studio-reference-preview-image
) {
  border-radius: var(--studio-radius-control);
}

.studio-prompt-full-preview-backdrop :is(
  .studio-prompt-full-preview-close,
  .studio-prompt-full-preview-image
) {
  border-radius: var(--studio-radius-control);
}

.studio-shell.theme-night :is(
  .studio-strip-chip,
  .studio-strip-trigger,
  .studio-profile-advice,
  .studio-quota-card,
  .studio-local-upscale-control,
  .studio-local-upscale-toggle,
  .studio-count-quick,
  .studio-generate-target-elapsed,
  .studio-translate-lang,
  .studio-workbench-pill,
  .studio-workbench-icon,
  .studio-template-info-row,
  .studio-prompt-template-empty
) {
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-shell.theme-night .studio-workbench-tile {
  --tile-ring-color: rgba(var(--tile-tone-rgb), 0.48);
  background:
    linear-gradient(135deg, rgba(var(--tile-tone-rgb), 0.20), rgba(255, 255, 255, 0.035) 36%, rgba(0, 0, 0, 0.18) 100%),
    color-mix(in srgb, var(--studio-card-background) 78%, rgb(var(--tile-tone-rgb)) 22%);
  box-shadow:
    0 16px 34px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(var(--tile-tone-rgb), 0.055),
    inset 0 0 0 1px var(--tile-ring-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.studio-shell.theme-night .studio-workbench-tile.active,
.studio-shell.theme-night .studio-workbench-tile.selected {
  --tile-ring-color: rgba(var(--tile-tone-rgb), 0.78);
  box-shadow:
    0 18px 34px rgba(0, 0, 0, 0.34),
    0 0 0 1px rgba(var(--tile-tone-rgb), 0.32),
    0 0 22px rgba(var(--tile-tone-rgb), 0.14),
    inset 0 0 0 1px var(--tile-ring-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.studio-shell.theme-night .studio-workbench-tile .studio-workbench-icon,
.studio-shell.theme-night .studio-workbench-tile .studio-workbench-drag-hotzone {
  border-color: rgba(var(--tile-tone-rgb), 0.24);
  background: rgba(7, 11, 18, 0.66);
  color: rgba(229, 238, 252, 0.88);
}

.studio-shell.theme-night .studio-workbench-tile .studio-workbench-icon:hover {
  border-color: rgba(var(--tile-tone-rgb), 0.44);
  background: rgba(var(--tile-tone-rgb), 0.16);
  color: #ffffff;
}

.studio-shell.theme-night :is(
  .studio-strip-chip.active,
  .studio-strip-trigger.active,
  .studio-strip-trigger.is-open,
  .studio-local-upscale-toggle.active
) {
  border-color: var(--studio-accent);
  background: var(--studio-accent-soft);
  color: var(--studio-accent-deep);
}

.studio-shell.theme-night .studio-generation-banner {
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(127, 29, 29, 0.20);
  color: #fecaca;
}

.studio-shell.theme-night .studio-generation-banner.is-recoverable {
  border-color: rgba(251, 191, 36, 0.34);
  background: rgba(120, 53, 15, 0.20);
  color: #fde68a;
}

.studio-shell.theme-night :is(
  .studio-generation-banner-raw,
  .studio-banner-action,
  .studio-banner-dismiss
) {
  border-color: currentColor;
  background: rgba(255, 255, 255, 0.08);
}

.studio-prompt-modal-backdrop :is(
  .studio-prompt-modal-panel,
  .studio-compatibility-modal,
  .studio-custom-ratio-modal,
  .studio-prompt-details-body,
  .studio-prompt-category-menu,
  .studio-prompt-library-item,
  .studio-prompt-library-empty,
  .studio-prompt-image-drop,
  .studio-prompt-upload-fields .input,
  .studio-replacement-preview-panel,
  .studio-replacement-editor-panel,
  .studio-replacement-mode,
  .studio-replacement-smart-button,
  .studio-replacement-empty,
  .studio-replacement-context,
  .studio-replacement-editor-field code,
  .studio-prompt-details-prompt,
  .studio-prompt-details-close
) {
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-card-background) 84%, transparent);
  color: var(--studio-text);
}

.studio-prompt-modal-backdrop :is(
  .studio-prompt-modal-head,
  .studio-prompt-library-toolbar,
  .studio-prompt-library-list,
  .studio-prompt-library-batchbar,
  .studio-prompt-upload-body,
  .studio-prompt-modal-actions.is-upload-actions,
  .studio-compatibility-preview-grid,
  .studio-replacement-body
) {
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-soft-background) 82%, transparent);
}

.studio-prompt-modal-backdrop :is(
  .studio-prompt-library-search,
  .studio-prompt-library-category-trigger,
  .studio-prompt-library-command:not(.studio-prompt-library-upload),
  .studio-prompt-category-search,
  .studio-prompt-category-option,
  .studio-prompt-category-add,
  .studio-prompt-upload-cancel,
  .studio-replacement-editor-actions button
) {
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-soft-background) 78%, transparent);
  color: var(--studio-text);
}

.studio-prompt-modal-backdrop :is(
  .studio-compatibility-preview-card p,
  .studio-prompt-details-body h3,
  .studio-prompt-details-prompt-scroll p,
  .studio-replacement-panel-head p,
  .studio-replacement-editor-field code
) {
  color: var(--studio-text);
}

.studio-prompt-modal-backdrop :is(
  .studio-compatibility-preview-card span,
  .studio-prompt-details-meta,
  .studio-replacement-panel-head span,
  .studio-replacement-empty span,
  .studio-replacement-context p
) {
  color: var(--studio-muted);
}

.studio-prompt-modal-backdrop :is(
  .input,
  input,
  textarea
) {
  border-color: var(--studio-border);
  background: color-mix(in srgb, var(--studio-soft-background) 80%, transparent);
  color: var(--studio-text);
}

.studio-shell.motion-reduced .studio-preview-image.is-generating-shimmer,
.studio-shell.motion-reduced .studio-preview-generating-shine,
.studio-shell.motion-reduced .studio-preview-skeleton-shine {
  animation: none !important;
  filter: none !important;
}
</style>
