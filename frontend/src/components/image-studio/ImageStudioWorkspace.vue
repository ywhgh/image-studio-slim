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
    class="studio-shell"
    :class="[
      { embedded: props.embedded, 'motion-reduced': !studioAppearance.motionEnabled },
      `theme-${studioAppearance.themeMode}`,
      `texture-${studioAppearance.textureMode}`,
    ]"
    :style="studioAppearanceStyle"
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
            :disabled="sub2apiUsageLoading || !hasSub2ApiKey"
            :title="t('imageStudio.buttons.checkUsage')"
            @click="refreshSub2ApiUsage()"
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
                    min="10"
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
          <div class="studio-avatar">
            <Icon name="userCircle" size="md" />
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
                    : (preferences.providerMode !== 'sub2api' && detectedImageModels.length
                      ? t('imageStudio.settings.modelDetected', { count: detectedImageModels.length })
                      : t('imageStudio.settings.modelHint')) }}
                </span>
              </label>
              <div class="studio-model-row">
                <select v-model="preferences.model" class="input studio-select">
                  <option v-for="option in modelOptions" :key="option" :value="option">{{ option }}</option>
                </select>
                <button
                  v-if="preferences.providerMode !== 'sub2api'"
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
                  <div v-if="connectionPanelOpen" class="studio-popover-panel">
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
                        <label class="studio-field-label">{{ t('imageStudio.fields.soraKey') }}</label>
                        <input
                          v-model.trim="sub2apiApiKey"
                          type="password"
                          class="input font-mono text-sm"
                          :placeholder="t('imageStudio.placeholders.soraKey')"
                          autocomplete="off"
                          @blur="refreshSub2ApiUsage({ silent: true })"
                          @keyup.enter="refreshSub2ApiUsage({ silent: true })"
                        />
                        <p class="studio-helper">{{ t('imageStudio.hints.sub2apiReuse') }}</p>
                      </div>
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
                        <p class="studio-helper">{{ t('imageStudio.hints.external') }}</p>
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
                  </div>
                </transition>
              </div>

              <div
                v-if="preferences.providerMode !== 'sub2api'"
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
                  <div v-if="advancedPanelOpen" class="studio-popover-panel is-wide">
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
                          max="10"
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
              <button type="button" class="studio-clear-button" @click="clearPromptComposer">
                <Icon name="x" size="sm" />
                <span>{{ t('imageStudio.promptPanel.clear') }}</span>
              </button>
            </div>

            <div class="studio-prompt-layout">
              <!-- LEFT side: text-editing flow -->
              <div class="studio-prompt-side">
                <div class="studio-prompt-form">
                  <label class="studio-field-label">{{ t('imageStudio.sections.prompt') }}</label>
                  <textarea
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
                      :title="upstreamCompatibilityEnabled
                        ? t('imageStudio.promptPanel.upstreamCompatibilityOn')
                        : t('imageStudio.promptPanel.upstreamCompatibilityOff')"
                      @click="upstreamCompatibilityEnabled = !upstreamCompatibilityEnabled"
                    >
                      <Icon :name="upstreamCompatibilityEnabled ? 'shield' : 'x'" size="sm" />
                      <span>{{ t('imageStudio.promptPanel.upstreamCompatibility') }}</span>
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
                      v-for="chip in promptChips"
                      :key="chip"
                      type="button"
                      class="studio-chip"
                      @click="applyPromptChip(chip)"
                    >
                      {{ chip }}
                    </button>
                  </div>

                  <template v-if="preferences.providerMode !== 'sub2api'">
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
                    disabled
                    :title="t('imageStudio.settings.customRatio')"
                  >
                    <span class="studio-ratio-icon is-custom"></span>
                    <span>{{ t('imageStudio.settings.customRatio') }}</span>
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
                    v-if="preferences.providerMode !== 'sub2api'"
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
                      <kbd>Ctrl + {{ t('imageStudio.previewCanvas.helpKeyWheel') }}</kbd>
                      <span>{{ t('imageStudio.previewCanvas.helpZoomDesc') }}</span>
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
                  <span>{{ t('imageStudio.workbench.generatingHeading') }}</span>
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
                  <span>{{ t('imageStudio.workbench.generatingHeading') }}</span>
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
                  {{ generating ? `${Math.round(generationProgressPercent)}%` : t('imageStudio.statusBoard.ready') }}
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
                <strong>{{ t('imageStudio.workbench.generatingHeading') }}</strong>
                <span v-if="estimatedRemainingSeconds != null">
                  {{ t('imageStudio.workbench.etaSeconds', { value: estimatedRemainingSeconds }) }}
                </span>
                <span v-else>{{ t('imageStudio.workbench.etaUnknown') }}</span>
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
                    <button
                      type="button"
                      class="studio-workbench-icon"
                      :title="t('imageStudio.previewCanvas.expandPreview')"
                      @click.stop="openTileLightbox(tile.id, 'fit')"
                    >
                      <Icon name="eye" size="xs" />
                    </button>
                    <button
                      type="button"
                      class="studio-workbench-icon"
                      :title="t('imageStudio.workbench.toggleSelection')"
                      @click.stop="toggleTileSelection(tile.id)"
                    >
                      <Icon :name="selectedTileIds.includes(tile.id) ? 'check' : 'plus'" size="xs" />
                    </button>
                    <span class="studio-workbench-drag-pill">
                      <Icon name="grid" size="xs" />
                      {{ t('imageStudio.workbench.dragHandle') }}
                    </span>
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
          <section class="studio-panel studio-side-panel">
            <div class="studio-side-header">
              <div>
                <p class="studio-panel-title">{{ t('imageStudio.sidebar.historyTitle') }}</p>
                <p class="studio-helper">{{ t('imageStudio.sidebar.historySubtitle') }}</p>
              </div>
              <button
                type="button"
                class="studio-panel-link-button"
                :disabled="historyItems.length === 0"
                @click="clearWorkspace"
              >
                {{ t('imageStudio.promptPanel.clear') }}
              </button>
            </div>

            <div v-if="!historyItems.length" class="studio-side-empty">
              {{ t('imageStudio.emptyStates.history') }}
            </div>

            <div v-else class="studio-history-list">
              <article
                v-for="item in historyItems"
                :key="item.id"
                class="studio-history-card"
                :class="{ active: activeHistoryRecord?.id === item.id }"
              >
                <button type="button" class="studio-history-main" @click="selectHistoryRecord(item.id)">
                  <img
                    :src="item.results[0]?.url"
                    :alt="item.results[0]?.filename || item.model"
                    class="studio-history-thumb"
                  />
                  <div class="studio-history-copy">
                    <p class="studio-history-prompt">{{ item.prompt }}</p>
                    <p class="studio-history-meta">
                      {{ item.aspectRatio }} · {{ providerLabel(item.providerMode) }} · {{ formatTime(item.createdAt) }}
                    </p>
                  </div>
                </button>
                <div class="studio-history-actions">
                  <button type="button" class="studio-ghost-link" @click="restoreHistoryRecord(item.id)">
                    {{ t('imageStudio.buttons.restore') }}
                  </button>
                  <button type="button" class="studio-icon-button inset danger" @click="removeHistoryRecord(item.id)">
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
              </article>
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
                  <label class="studio-field-label">{{ t('imageStudio.sidebar.helperModel') }}</label>
                  <input
                    v-model.trim="promptHelperConfig.model"
                    type="text"
                    class="input font-mono text-sm"
                    list="prompt-helper-models"
                    :placeholder="t('imageStudio.sidebar.helperModelPlaceholder')"
                  />
                  <datalist id="prompt-helper-models">
                    <option v-for="m in promptHelperModelHints" :key="m" :value="m" />
                  </datalist>
                  <p class="studio-helper">{{ t('imageStudio.sidebar.helperModelHint') }}</p>
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
        :class="{ 'is-isolated': lightboxFreeDrag }"
        @click.self="closePreviewLightbox"
      >
        <div class="studio-lightbox-panel">
          <div class="studio-lightbox-header">
            <div class="min-w-0">
              <p class="studio-lightbox-title">{{ previewTile.result.filename }}</p>
              <p class="studio-lightbox-caption">{{ previewTile.prompt }}</p>
              <div class="studio-lightbox-meta">
                <span v-if="lightboxNaturalSize" class="studio-lightbox-chip">
                  {{ lightboxNaturalSize.width }} × {{ lightboxNaturalSize.height }}
                </span>
                <span v-if="previewTile.model" class="studio-lightbox-chip">{{ previewTile.model }}</span>
                <span v-if="previewTile.aspectRatio" class="studio-lightbox-chip">{{ previewTile.aspectRatio }}</span>
                <span v-if="previewIsTransient && lastGenerationDurationSeconds" class="studio-lightbox-chip is-accent">
                  {{ t('imageStudio.workbench.durationSeconds', { value: lastGenerationDurationSeconds }) }}
                </span>
              </div>
            </div>
            <div class="studio-lightbox-actions">
              <button type="button" class="studio-lightbox-button" @click="stepPreview(-1)">
                <Icon name="chevronLeft" size="sm" />
                {{ t('imageStudio.workbench.previousPreview') }}
              </button>
              <button type="button" class="studio-lightbox-button" @click="stepPreview(1)">
                <Icon name="chevronRight" size="sm" />
                {{ t('imageStudio.workbench.nextPreview') }}
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :disabled="!previewTile.prompt"
                @click="copyPreviewPrompt"
              >
                <Icon name="clipboard" size="sm" />
                {{ t('imageStudio.lightbox.copyPrompt') }}
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :class="{ active: lightboxViewMode === 'fit' }"
                data-testid="studio-lightbox-view-mode"
                @click="toggleLightboxViewMode"
              >
                <Icon :name="lightboxViewMode === 'fit' ? 'arrowsUpDown' : 'eye'" size="sm" />
                {{ lightboxViewModeLabel }}
              </button>
              <button
                type="button"
                class="studio-lightbox-button"
                :class="{ active: lightboxMagnifierEnabled }"
                data-testid="studio-lightbox-magnifier"
                @click="toggleLightboxMagnifier"
              >
                <Icon :name="lightboxMagnifierEnabled ? 'eyeOff' : 'search'" size="sm" />
                {{ lightboxMagnifierLabel }}
              </button>
              <button type="button" class="studio-lightbox-button" @click="downloadCurrentTile">
                <Icon name="download" size="sm" />
                {{ t('imageStudio.buttons.downloadCurrent') }}
              </button>
              <button type="button" class="studio-lightbox-button" @click="copyCurrentTileImage">
                <Icon name="copy" size="sm" />
                {{ t('imageStudio.sidebar.copyImage') }}
              </button>
              <button type="button" class="studio-lightbox-button" @click="closePreviewLightbox">
                <Icon name="x" size="sm" />
                {{ t('imageStudio.workbench.closePreview') }}
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
                'is-free-drag': lightboxFreeDrag,
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

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import {
  BrowserDirectGenerationError,
  downloadRemoteImage,
  fetchImageStudioUsage,
  generateImageWithExternalBrowser,
  generateImageWithExternalRelay,
  resolveImageStudioSize,
} from '@/api/imageStudio'
import { useImageStudioAppearance } from '@/composables/useImageStudioAppearance'
import { useImageStudioPreferences } from '@/composables/useImageStudioPreferences'
import {
  clearImageStudioHistory,
  deleteImageStudioHistoryItem,
  listImageStudioHistoryItems,
  replaceImageStudioHistoryItems,
  revokeImageStudioHistoryItems,
  saveImageStudioHistoryItem,
} from '@/services/imageStudioHistory'
import { useAppStore } from '@/stores'
import type {
  ExternalImageStudioRequest,
  ImageStudioHistoryItem,
  ImageStudioProtocolProfile,
  ImageStudioProviderMode,
  ImageStudioResolutionPreset,
  ImageStudioUsageResponse,
  ImageStudioWorkspaceTile,
  NormalizedImageResult,
} from '@/types/imageStudio'

const WORKSPACE_ORDER_STORAGE_KEY = 'image-studio.workspace-order'
const LIGHTBOX_LENS_SIZE = 184
const LIGHTBOX_ZOOM_FACTOR = 1.9
const LIGHTBOX_ZOOM_MIN = 1
const LIGHTBOX_ZOOM_MAX = 4
const LIGHTBOX_ZOOM_STEP = 0.35

interface WorkspaceSyncOptions {
  prioritizedTileIds?: string[]
  selectedTileIds?: string[]
  previewTileId?: string | null
  activeHistoryId?: string | null
}

interface StylePresetOption {
  id: string
  title: string
  subtitle: string
  promptHint: string
}

const props = withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false,
})

const { t, locale } = useI18n()
const appStore = useAppStore()
const preferences = useImageStudioPreferences()
const {
  appearance: studioAppearance,
  resetAppearance: resetStudioAppearance,
} = useImageStudioAppearance()

const sub2apiApiKey = ref('')
const externalApiKey = ref('')
const prompt = ref('')
const negativePrompt = ref('')
const upstreamCompatibilityEnabled = ref(true)
const autoCleanPlaceholders = ref(false)
const referenceImages = ref<string[]>([])
const REFERENCE_IMAGE_MAX_COUNT = 6
const REFERENCE_IMAGE_MAX_BYTES = 8 * 1024 * 1024
const referenceImageError = ref('')
const referencePreviewIndex = ref<number | null>(null)

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
const lightboxPointerDown = ref(false)
const lightboxPointerButton = ref<number | null>(null)
const lightboxDragStarted = ref(false)
const lightboxPointerStartX = ref(0)
const lightboxPointerStartY = ref(0)
const lightboxPanStartX = ref(0)
const lightboxPanStartY = ref(0)
const lightboxFreeDrag = ref(false)
const lightboxLongPressTimer = ref<number | null>(null)
const LIGHTBOX_LONG_PRESS_MS = 420
const comparePosition = ref(50)
const compareViewMode = ref<'side-by-side' | 'slider'>('side-by-side')
const selectedStylePresetId = ref('default')
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

type TranslateLang = 'en' | 'ja' | 'de' | 'zh' | 'ru'
const translateLang = ref<TranslateLang>('en')
const translating = ref(false)
const translateLanguages = computed<{ value: TranslateLang; label: string }[]>(() => [
  { value: 'en', label: t('imageStudio.translate.languages.en') },
  { value: 'ja', label: t('imageStudio.translate.languages.ja') },
  { value: 'de', label: t('imageStudio.translate.languages.de') },
  { value: 'zh', label: t('imageStudio.translate.languages.zh') },
  { value: 'ru', label: t('imageStudio.translate.languages.ru') },
])

function translateLanguageName(code: TranslateLang): string {
  switch (code) {
    case 'en': return 'English'
    case 'ja': return 'Japanese'
    case 'de': return 'German'
    case 'zh': return 'Simplified Chinese'
    case 'ru': return 'Russian'
  }
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
  if (promptHelperUsesImageModel.value) {
    return t('imageStudio.sidebar.helperQualityImageModel')
  }
  if (promptHelperUsesStrongTextModel.value) {
    return t('imageStudio.sidebar.helperQualityStrong')
  }
  return t('imageStudio.sidebar.helperQualityGeneric')
})

const promptHelperModelHints = PROMPT_HELPER_MODEL_HINTS

function resetPromptHelperConfig() {
  promptHelperConfig.baseUrl = ''
  promptHelperConfig.apiKey = ''
  promptHelperConfig.model = ''
}

const promptHelperBusy = ref<'optimize' | 'inspire' | null>(null)

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callPromptHelper(messages: OpenAIChatMessage[], signal?: AbortSignal): Promise<string> {
  const baseUrl = promptHelperConfig.baseUrl.trim().replace(/\/+$/, '')
  const apiKey = promptHelperConfig.apiKey.trim()
  const model = promptHelperConfig.model.trim()
  if (!baseUrl || !apiKey || !model) {
    throw new Error(t('imageStudio.sidebar.helperMissing'))
  }
  const endpoint = `${baseUrl}/chat/completions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 600,
      stream: false,
    }),
    signal,
  })
  if (!response.ok) {
    let detail = `HTTP ${response.status}`
    try {
      const errBody = await response.json()
      detail = (errBody && (errBody.error?.message || errBody.message)) || detail
    } catch {
      /* ignore parse */
    }
    throw new Error(detail)
  }
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(t('imageStudio.toasts.helperEmpty'))
  }
  return content.trim()
}
const workbenchSurfaceRef = ref<HTMLElement | null>(null)
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
const workbenchTileElements = new Map<string, HTMLElement>()

const providerModes = computed(() => [
  {
    value: 'sub2api' as const,
    label: t('imageStudio.providerModes.sub2api.label'),
    description: t('imageStudio.providerModes.sub2api.description'),
  },
  {
    value: 'external-relay' as const,
    label: t('imageStudio.providerModes.externalRelay.label'),
    description: t('imageStudio.providerModes.externalRelay.description'),
  },
  {
    value: 'external-browser' as const,
    label: t('imageStudio.providerModes.externalBrowser.label'),
    description: t('imageStudio.providerModes.externalBrowser.description'),
  },
])

const accentPalette = {
  blue: {
    color: '#2563eb',
    deep: '#1d4ed8',
    soft: 'rgba(37, 99, 235, 0.12)',
    ring: 'rgba(37, 99, 235, 0.32)',
    shadow: 'rgba(37, 99, 235, 0.18)',
    preview: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
  },
  emerald: {
    color: '#059669',
    deep: '#047857',
    soft: 'rgba(5, 150, 105, 0.14)',
    ring: 'rgba(5, 150, 105, 0.32)',
    shadow: 'rgba(5, 150, 105, 0.18)',
    preview: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
  },
  amber: {
    color: '#d97706',
    deep: '#b45309',
    soft: 'rgba(217, 119, 6, 0.14)',
    ring: 'rgba(217, 119, 6, 0.32)',
    shadow: 'rgba(217, 119, 6, 0.18)',
    preview: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  },
  rose: {
    color: '#e11d48',
    deep: '#be123c',
    soft: 'rgba(225, 29, 72, 0.14)',
    ring: 'rgba(225, 29, 72, 0.32)',
    shadow: 'rgba(225, 29, 72, 0.18)',
    preview: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
  },
} as const

const themeModeOptions = computed(() => [
  { value: 'day' as const, label: t('imageStudio.appearance.themeModes.day'), icon: 'sun' as const },
  { value: 'night' as const, label: t('imageStudio.appearance.themeModes.night'), icon: 'moon' as const },
])

const accentOptions = computed(() => [
  { value: 'blue' as const, label: t('imageStudio.appearance.accents.blue'), preview: accentPalette.blue.preview },
  { value: 'emerald' as const, label: t('imageStudio.appearance.accents.emerald'), preview: accentPalette.emerald.preview },
  { value: 'amber' as const, label: t('imageStudio.appearance.accents.amber'), preview: accentPalette.amber.preview },
  { value: 'rose' as const, label: t('imageStudio.appearance.accents.rose'), preview: accentPalette.rose.preview },
])

const textureOptions = computed(() => [
  {
    value: 'soft' as const,
    label: t('imageStudio.appearance.textures.soft'),
    description: t('imageStudio.appearance.textureDescriptions.soft'),
  },
  {
    value: 'glass' as const,
    label: t('imageStudio.appearance.textures.glass'),
    description: t('imageStudio.appearance.textureDescriptions.glass'),
  },
  {
    value: 'solid' as const,
    label: t('imageStudio.appearance.textures.solid'),
    description: t('imageStudio.appearance.textureDescriptions.solid'),
  },
])


const studioAppearanceStyle = computed(() => {
  const accent = accentPalette[studioAppearance.accentTone]
  const radius = Math.min(24, Math.max(10, studioAppearance.radiusScale))

  return {
    '--studio-accent': accent.color,
    '--studio-accent-deep': accent.deep,
    '--studio-accent-soft': accent.soft,
    '--studio-border-strong': accent.ring,
    '--studio-accent-shadow': accent.shadow,
    '--studio-radius-window': `${radius + 8}px`,
    '--studio-radius-panel': `${radius + 2}px`,
    '--studio-radius-control': `${Math.max(10, radius - 1)}px`,
    '--studio-radius-soft': `${Math.max(8, radius - 5)}px`,
    '--studio-radius-image': `${radius + 4}px`,
  } as Record<string, string>
})

const compatibilityProfiles = computed(() => [
  { value: 'openai-image-api', label: t('imageStudio.profiles.openaiImageApi') },
  { value: 'openai-responses', label: t('imageStudio.profiles.openaiResponses') },
  { value: 'sub2api-sora-compatible', label: t('imageStudio.profiles.sub2apiCompatible') },
])

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

const supportsCustomResolution = computed(() => preferences.providerMode !== 'sub2api')

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

function resolveWorkspaceImageSize(preset: ImageStudioResolutionPreset): string {
  if (preset === 'standard' && usesGptImage2SizeProfile.value) {
    return resolveGptImage2StandardSize(preferences.aspectRatio)
  }
  return resolveImageStudioSize(preferences.aspectRatio, undefined, preset)
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

const qualityOptions = computed(() => [
  { value: 'high', label: t('imageStudio.qualities.high'), icon: 'sparkles' as const },
  { value: 'medium', label: t('imageStudio.qualities.medium'), icon: 'bolt' as const },
  { value: 'low', label: t('imageStudio.qualities.low'), icon: 'cloud' as const },
])

const activeQualityLabel = computed(() => (
  qualityOptions.value.find((option) => option.value === preferences.quality)?.label
    || t('imageStudio.fields.quality')
))

const backgroundOptions = computed(() => [
  { value: 'auto', label: t('imageStudio.backgrounds.auto') },
  { value: 'transparent', label: t('imageStudio.backgrounds.transparent') },
  { value: 'opaque', label: t('imageStudio.backgrounds.opaque') },
])

const formatOptions = computed(() => [
  { value: 'png', label: t('imageStudio.formats.png') },
  { value: 'jpeg', label: t('imageStudio.formats.jpeg') },
  { value: 'webp', label: t('imageStudio.formats.webp') },
])

const promptChips = computed(() => (
  locale.value === 'zh'
    ? ['清晨', '湖泊', '雪山', '倒影', '木栈道', '薄雾', '超写实']
    : ['Dawn', 'Lake', 'Snow Peak', 'Reflection', 'Boardwalk', 'Mist', 'Photoreal']
))

const inspirationPrompts = computed(() => (
  locale.value === 'zh'
    ? [
        '清晨的湖边，远处雪山在朝阳下泛着金色，湖水清澈如镜，倒映着山峰与森林，湖边有木栈道通往远方，天空有薄雾和几缕云彩，宁静而治愈，超写实风格，高清摄影。',
        '赛博朋克城市夜景，雨后的街道反射霓虹灯光，远处高楼林立，空气中有薄雾，镜头语言电影感，细节丰富，适合海报构图。',
        '未来科幻空间站内部场景，银白金属结构与蓝色光带，中心区域有悬浮装置，空间感强烈，光影精致，超高细节。',
        '日式庭院，樱花飘落，小桥和池塘构成前景，柔和晨光穿过树影，氛围安静温暖，插画与写实融合。',
      ]
    : [
        'A tranquil lake at dawn with snow mountains glowing in sunrise light, mirror reflections, forest shoreline, a wooden boardwalk, soft mist, ultra realistic photography.',
        'A cyberpunk city at night after rain, neon reflections on wet streets, cinematic framing, layered skyscrapers, rich atmosphere and crisp detail.',
        'A futuristic space station interior with silver architecture, blue light bands, a floating central device, dramatic depth and ultra-detailed lighting.',
        'A Japanese garden with falling cherry blossoms, a small bridge over a pond, gentle morning light and a calm painterly-realistic mood.',
      ]
))

const stylePresets = computed<StylePresetOption[]>(() => (
  locale.value === 'zh'
    ? [
        { id: 'default', title: '默认', subtitle: '不限风格 · 仅按提示词', promptHint: '' },
        { id: 'realistic', title: '写实', subtitle: '自然光影 · 细节丰富', promptHint: '写实摄影，光影自然，真实材质，细节丰富' },
        { id: 'photo', title: '摄影', subtitle: '镜头质感 · 真实纪录', promptHint: '专业摄影，镜头景深，胶片颗粒，自然色调' },
        { id: 'anime', title: '动漫', subtitle: '高对比 · 清晰轮廓', promptHint: '动漫风格，清晰线条，高对比配色，角色感强' },
        { id: 'manga', title: '漫画', subtitle: '黑白线条 · 强烈分镜', promptHint: '日式漫画风格，黑白网点，强烈分镜，墨线明显' },
        { id: 'illustration', title: '插画', subtitle: '柔和叙事 · 画面干净', promptHint: '插画风格，构图完整，色彩柔和，叙事感明确' },
        { id: 'render3d', title: '3D 渲染', subtitle: '材质通透 · 体积感强', promptHint: '3D 渲染，体积光，真实材质，空间层次分明' },
        { id: 'watercolor', title: '水彩', subtitle: '晕染边缘 · 轻盈通透', promptHint: '水彩质感，柔和晕染，轻盈色块，手工笔触' },
        { id: 'oil', title: '油画', subtitle: '厚涂纹理 · 色彩沉稳', promptHint: '油画质感，厚涂笔触，肌理明显，色彩沉稳' },
      ]
    : [
        { id: 'default', title: 'Default', subtitle: 'No style · Prompt only', promptHint: '' },
        { id: 'realistic', title: 'Realistic', subtitle: 'Natural light · Rich detail', promptHint: 'photorealistic, natural lighting, realistic surfaces, rich detail' },
        { id: 'photo', title: 'Photography', subtitle: 'Lens feel · Documentary', promptHint: 'professional photography, depth of field, film grain, natural color grading' },
        { id: 'anime', title: 'Anime', subtitle: 'Bold contrast · Clean lines', promptHint: 'anime style, clean line art, bold contrast, expressive color palette' },
        { id: 'manga', title: 'Manga', subtitle: 'Black & white · Sharp panels', promptHint: 'Japanese manga style, black-and-white screentones, dynamic paneling, strong inking' },
        { id: 'illustration', title: 'Illustration', subtitle: 'Soft narrative · Clean frame', promptHint: 'illustration style, balanced composition, soft palette, narrative clarity' },
        { id: 'render3d', title: '3D Render', subtitle: 'Dimensional light · Polished surfaces', promptHint: '3d render, volumetric light, polished materials, strong depth' },
        { id: 'watercolor', title: 'Watercolor', subtitle: 'Soft bleed · Airy mood', promptHint: 'watercolor texture, soft bleeds, airy atmosphere, handcrafted brushwork' },
        { id: 'oil', title: 'Oil Painting', subtitle: 'Thick brushwork · Mature tones', promptHint: 'oil painting texture, thick brush strokes, visible canvas grain, mature tones' },
      ]
))

const FALLBACK_IMAGE_MODELS = ['gpt-image-1', 'gpt-image-2', 'dall-e-3', 'dall-e-2']
const IMAGE_MODEL_KEYWORDS = /(image|sora|dall[-_]?e|flux|sdxl|stable[-_]?diffusion|midjourney|imagen|kling|mj|wan-?\d|pika|ideogram|firefly)/i

const detectedImageModels = ref<string[]>([])
const detectingModels = ref(false)
const detectModelsAbort = ref<AbortController | null>(null)

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

async function fetchImageModelIds(baseUrl: string, apiKey: string, signal?: AbortSignal): Promise<string[]> {
  const response = await fetch(`${baseUrl}/models`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
    signal,
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const payload = await response.json().catch(() => null)
  const list: unknown = payload?.data || payload?.models || payload
  if (!Array.isArray(list)) {
    throw new Error('unexpected response shape')
  }

  return Array.from(new Set(list
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') {
        const obj = entry as { id?: unknown; name?: unknown }
        if (typeof obj.id === 'string') return obj.id
        if (typeof obj.name === 'string') return obj.name
      }
      return ''
    })
    .filter((id) => typeof id === 'string' && id.length > 0)
    .filter((id) => IMAGE_MODEL_KEYWORDS.test(id))))
}

const modelOptions = computed(() => {
  if (preferences.providerMode === 'sub2api') {
    return ['gpt-image']
  }
  if (detectedImageModels.value.length) {
    return detectedImageModels.value
  }
  return FALLBACK_IMAGE_MODELS
})

let detectModelsDebounce = 0
async function fetchUpstreamImageModels(silent = true) {
  if (preferences.providerMode === 'sub2api') return
  const candidates = externalApiBaseCandidates(preferences.externalBaseUrl)
  const apiKey = externalApiKey.value.trim()
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
        unique = await fetchImageModelIds(candidate, apiKey, controller.signal)
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
      if (resolvedBaseUrl !== preferences.externalBaseUrl.trim().replace(/\/+$/, '')) {
        preferences.externalBaseUrl = resolvedBaseUrl
      }
      if (!unique.includes(preferences.model)) {
        preferences.model = unique[0]
      }
    } else {
      detectedImageModels.value = []
    }
  } catch (error) {
    if ((error as { name?: string })?.name !== 'AbortError') {
      detectedImageModels.value = []
      if (!silent) {
        appStore.showError(error instanceof Error ? error.message : 'Failed to load model list')
      }
    }
  } finally {
    detectingModels.value = false
    detectModelsAbort.value = null
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

const effectiveCount = computed(() => {
  if (preferences.providerMode !== 'sub2api' && preferences.profile === 'openai-responses') {
    return 1
  }
  return Math.max(1, Math.min(10, preferences.count))
})

const countSliderDisabled = computed(() => (
  preferences.profile === 'openai-responses' && preferences.providerMode !== 'sub2api'
))

const resolvedSize = computed(() => {
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

const resolvedSizeDisplay = computed(() => (
  resolvedSize.value || t('imageStudio.providerManagedSize')
))

const resolutionHint = computed(() => (
  supportsCustomResolution.value
    ? t('imageStudio.hints.resolution')
    : t('imageStudio.hints.resolutionSub2api')
))

const hasSub2ApiKey = computed(() => !!sub2apiApiKey.value.trim())

const selectedStylePreset = computed(() => (
  stylePresets.value.find((preset) => preset.id === selectedStylePresetId.value) || stylePresets.value[0]
))

const promptCharacterCount = computed(() => prompt.value.length)
const negativePromptCharacterCount = computed(() => negativePrompt.value.length)

const activeHistoryRecord = computed(() => (
  historyItems.value.find((item) => item.id === activeHistoryId.value) || historyItems.value[0] || null
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

const previousBatchTile = computed<ImageStudioWorkspaceTile | null>(() => {
  const current = previewTile.value
  if (!current) return null
  return sortedTilesByDate.value.find((tile) => tile.historyId !== current.historyId) || null
})

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

const headerRemainingText = computed(() => {
  if (preferences.providerMode === 'sub2api') {
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
    return {
      modeLabel,
      endpointLabel: describeEndpointHost(sub2apiBaseUrl) || sub2apiBaseUrl,
    }
  }
  return {
    modeLabel,
    endpointLabel: describeEndpointHost(preferences.externalBaseUrl),
  }
})

const generationElapsedSeconds = computed(() => (generationElapsedMs.value / 1000).toFixed(1))

const lastGenerationDurationSeconds = computed(() => {
  if (lastGenerationDurationMs.value == null) {
    return null
  }
  return (lastGenerationDurationMs.value / 1000).toFixed(1)
})

const estimatedRemainingSeconds = computed<number | null>(() => {
  if (!generating.value || lastGenerationDurationMs.value == null) {
    return null
  }
  const remaining = (lastGenerationDurationMs.value - generationElapsedMs.value) / 1000
  return Math.max(0, Math.round(remaining))
})

const generationProgressPercent = computed<number>(() => {
  if (!generating.value) {
    return progress.value
  }
  return Math.max(progress.value, 6)
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
  if (preferences.providerMode === 'sub2api') {
    return t('imageStudio.popovers.connectionReady')
  }
  return generateTargetSummary.value.endpointLabel || t('imageStudio.popovers.connectionReady')
})

const selectedTiles = computed(() => (
  workspaceTiles.value.filter((tile) => selectedTileIds.value.includes(tile.id))
))

const generationSummaryText = computed(() => {
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

const previewTileDownloadText = computed(() => {
  if (!previewTile.value) {
    return t('imageStudio.sidebar.downloadEmpty')
  }

  return `${previewTile.value.result.filename} · ${previewTile.value.aspectRatio}`
})

const lightboxViewModeLabel = computed(() => (
  lightboxViewMode.value === 'fit'
    ? t('imageStudio.previewCanvas.actualSize')
    : t('imageStudio.previewCanvas.openOverview')
))

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

const lightboxHintText = computed(() => {
  if (lightboxMagnifierEnabled.value) {
    return t('imageStudio.previewCanvas.magnifierHint')
  }
  if (lightboxFreeDrag.value) {
    return t('imageStudio.previewCanvas.freeDragHint')
  }
  return t('imageStudio.previewCanvas.panHint')
})

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
      preferences.profile = 'sub2api-sora-compatible'
      preferences.model = 'gpt-image'
      return
    }

    if (preferences.model === 'gpt-image') {
      preferences.model = preferences.profile === 'sub2api-sora-compatible' ? 'gpt-image-2' : 'gpt-image-1'
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
    if (profile === 'sub2api-sora-compatible' && preferences.providerMode !== 'sub2api' && preferences.model === 'gpt-image') {
      preferences.model = 'gpt-image-2'
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

watch(
  [
    () => preferences.providerMode,
    () => preferences.externalBaseUrl,
    () => externalApiKey.value,
  ],
  () => {
    scheduleFetchUpstreamImageModels()
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
  window.localStorage.setItem(WORKSPACE_ORDER_STORAGE_KEY, JSON.stringify(tileIds))
}

function clearWorkspaceOrder() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(WORKSPACE_ORDER_STORAGE_KEY)
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

  if (preferences.profile === 'sub2api-sora-compatible') {
    preferences.profile = 'openai-image-api'
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

  lightboxViewportWidth.value = lightboxStageRef.value.clientWidth
  lightboxViewportHeight.value = lightboxStageRef.value.clientHeight
}

function clampLightboxPan(nextX: number, nextY: number) {
  const renderedWidth = lightboxRenderedWidth.value
  const renderedHeight = lightboxRenderedHeight.value
  const viewportWidth = lightboxViewportWidth.value
  const viewportHeight = lightboxViewportHeight.value

  if (!renderedWidth || !renderedHeight || !viewportWidth || !viewportHeight) {
    return { x: nextX, y: nextY }
  }

  const x = renderedWidth <= viewportWidth
    ? (viewportWidth - renderedWidth) / 2
    : clampValue(nextX, viewportWidth - renderedWidth, 0)

  const y = renderedHeight <= viewportHeight
    ? (viewportHeight - renderedHeight) / 2
    : clampValue(nextY, viewportHeight - renderedHeight, 0)

  return { x, y }
}

function resolveDefaultLightboxPan() {
  const renderedWidth = lightboxRenderedWidth.value
  const renderedHeight = lightboxRenderedHeight.value
  const viewportWidth = lightboxViewportWidth.value
  const viewportHeight = lightboxViewportHeight.value

  const nextX = renderedWidth >= viewportWidth ? 0 : (viewportWidth - renderedWidth) / 2
  const nextY = renderedHeight >= viewportHeight ? 0 : (viewportHeight - renderedHeight) / 2
  return clampLightboxPan(nextX, nextY)
}

function applyLightboxPan(nextX: number, nextY: number) {
  const clamped = clampLightboxPan(nextX, nextY)
  lightboxPanX.value = clamped.x
  lightboxPanY.value = clamped.y
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
  lightboxFreeDrag.value = false
  clearLightboxLongPressTimer()
  lightboxZoom.value = LIGHTBOX_ZOOM_MIN
  lightboxPanX.value = 0
  lightboxPanY.value = 0
  lightboxNaturalSize.value = null
  resetLightboxMagnifier()
}

function toggleLightboxViewMode() {
  lightboxViewMode.value = lightboxViewMode.value === 'fit' ? 'natural' : 'fit'
  resetLightboxMagnifier()
  refreshLightboxLayout({ resetZoom: true })
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

  // Long-press on left button activates free-drag: image floats and can be
  // moved beyond the normal pan clamp.
  if (event.button === 0) {
    clearLightboxLongPressTimer()
    lightboxLongPressTimer.value = window.setTimeout(() => {
      if (lightboxPointerDown.value && !lightboxDragStarted.value) {
        lightboxFreeDrag.value = true
      }
    }, LIGHTBOX_LONG_PRESS_MS)
  }
}

function handleLightboxWheel(event: WheelEvent) {
  if (lightboxMagnifierEnabled.value) {
    return
  }

  // Wheel pans the image vertically (and horizontally if Shift is held).
  // Modifier keys still allow zoom for users who want it.
  if (event.ctrlKey || event.metaKey) {
    stepLightboxZoom(event.deltaY < 0 ? 1 : -1, event)
    return
  }
  const deltaY = event.deltaY
  const deltaX = event.shiftKey ? event.deltaY : event.deltaX
  if (lightboxFreeDrag.value) {
    lightboxPanX.value -= deltaX
    lightboxPanY.value -= deltaY
  } else {
    applyLightboxPan(lightboxPanX.value - deltaX, lightboxPanY.value - deltaY)
  }
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

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Node
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
}

function handleGlobalMouseMove(event: MouseEvent) {
  if (
    lightboxPointerDown.value &&
    lightboxPointerButton.value === 0 &&
    (lightboxZoom.value > 1 || lightboxViewMode.value === 'natural' || lightboxFreeDrag.value)
  ) {
    const deltaX = event.clientX - lightboxPointerStartX.value
    const deltaY = event.clientY - lightboxPointerStartY.value

    if (!lightboxDragStarted.value && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      lightboxDragStarted.value = true
      // User started moving before long-press fired — cancel timer; this is a
      // normal pan, not a free-float gesture.
      if (!lightboxFreeDrag.value) {
        clearLightboxLongPressTimer()
      }
    }

    if (lightboxDragStarted.value) {
      const nextX = lightboxPanStartX.value + deltaX
      const nextY = lightboxPanStartY.value + deltaY
      if (lightboxFreeDrag.value) {
        // Free-drag: image floats. No clamp.
        lightboxPanX.value = nextX
        lightboxPanY.value = nextY
      } else {
        applyLightboxPan(nextX, nextY)
      }
    }
  }

  if (workbenchSelectionActive.value) {
    updateWorkbenchSelection(event)
  }
}

function handleGlobalMouseUp(event: MouseEvent) {
  // Long-press on left button is a free-drag activation: do NOT zoom on tap.
  // Right-click still performs zoom-out. Plain left-click does nothing.
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
    if (lightboxFreeDrag.value) {
      lightboxFreeDrag.value = false
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

async function ensureResultBlob(result: NormalizedImageResult): Promise<Blob> {
  if (result.blob) {
    return result.blob
  }

  const sourceUrl = result.originalUrl || result.url
  if (sourceUrl.startsWith('data:')) {
    const response = await fetch(sourceUrl)
    const blob = await response.blob()
    result.blob = blob
    result.mimeType = result.mimeType || blob.type
    return blob
  }

  const blob = await downloadRemoteImage(sourceUrl, result.filename)
  result.blob = blob
  result.mimeType = result.mimeType || blob.type
  return blob
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
  URL.revokeObjectURL(url)
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

function appendResolutionSuffix(filename: string, preset: ImageStudioResolutionPreset): string {
  if (preset === 'standard') {
    return filename
  }

  const suffix = `-${preset}`
  const dotIndex = filename.lastIndexOf('.')
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
  const extension = dotIndex > 0 ? filename.slice(dotIndex) : ''
  if (base.endsWith(suffix)) {
    return filename
  }
  return `${base}${suffix}${extension}`
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
  preset: ImageStudioResolutionPreset
): Promise<NormalizedImageResult> {
  const sourceBlob = await ensureResultBlob(result)
  const bitmap = await createImageBitmap(sourceBlob)

  try {
    if (bitmap.width === target.width && bitmap.height === target.height) {
      return result
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
    result.filename = appendResolutionSuffix(result.filename, preset)
    return result
  } finally {
    bitmap.close()
  }
}

async function applyOutputResolutionPreset(results: NormalizedImageResult[]): Promise<NormalizedImageResult[]> {
  if (!supportsCustomResolution.value || preferences.resolutionPreset === 'standard') {
    return results
  }

  const target = parsePixelSize(resolvedSize.value)
  if (!target) {
    return results
  }

  for (const result of results) {
    await resizeResultToPixelSize(result, target, preferences.resolutionPreset)
  }
  return results
}

function unescapePromptTemplateAttribute(value: string): string {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .trim()
}

function readPromptTemplateAttribute(attributes: string, key: 'name' | 'default'): string {
  const normalized = attributes.replace(/\\"/g, '"').replace(/\\'/g, "'")
  const matcher = new RegExp(
    `${key}\\s*=\\s*(?:"((?:\\\\.|[^"\\\\])*)"|'((?:\\\\.|[^'\\\\])*)'|([^\\s}]+))`,
    'i'
  )
  const match = normalized.match(matcher)
  if (!match) {
    return ''
  }
  return unescapePromptTemplateAttribute(match[1] || match[2] || match[3] || '')
}

function resolvePromptTemplateArguments(rawPrompt: string): string {
  return rawPrompt.replace(/\{\s*argument\b([^{}]*)\}/gi, (_match, attributes: string) => {
    const fallback = readPromptTemplateAttribute(attributes, 'name')
    return readPromptTemplateAttribute(attributes, 'default') || fallback
  })
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

function createExternalRequest(
  model: string,
  resolvedPromptText: string,
  imageInputs?: string[],
  sizeOverride?: string
): ExternalImageStudioRequest {
  const cleaned = (imageInputs || []).filter((s) => typeof s === 'string' && s.length > 0)
  const aspectValue = preferences.aspectRatio === 'default' ? '' : preferences.aspectRatio
  return {
    base_url: preferences.externalBaseUrl,
    api_key: externalApiKey.value,
    profile: preferences.profile,
    model,
    prompt: resolvedPromptText,
    count: effectiveCount.value,
    image_input: cleaned[0],
    image_inputs: cleaned.length ? cleaned : undefined,
    size: (sizeOverride ?? resolvedSize.value) || undefined,
    aspect_ratio: aspectValue || undefined,
    quality: preferences.quality,
    background: preferences.background,
    format: preferences.format,
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

  for (const result of generatedResults) {
    await ensureResultBlob(result)
  }

  const cleanedInputs = (imageInputs || []).filter((s) => typeof s === 'string' && s.length > 0)

  await saveImageStudioHistoryItem({
    id: historyId,
    createdAt: new Date().toISOString(),
    providerMode: preferences.providerMode,
    profile: preferences.profile,
    model,
    prompt: resolvedPromptText,
    aspectRatio: preferences.aspectRatio,
    count: effectiveCount.value,
    referenceImageUrl: cleanedInputs[0],
    referenceImageUrls: cleanedInputs.length ? cleanedInputs : undefined,
    parentHistoryId: lineage?.parentHistoryId,
    parentTileId: lineage?.parentTileId,
    results: generatedResults.map((result) => ({ ...result })),
  })

  const generatedTileIds = generatedResults.map((result) => createWorkspaceTileId(historyId, result.id))
  await loadHistory({
    prioritizedTileIds: generatedTileIds,
    selectedTileIds: generatedTileIds,
    previewTileId: generatedTileIds[0] || null,
    activeHistoryId: historyId,
  })
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
  return error instanceof Error
    ? error.message
    : typeof (error as { message?: unknown })?.message === 'string'
      ? String((error as { message?: unknown }).message)
      : ''
}

function isRetryableImageTransportError(error: unknown): boolean {
  const text = errorMessageText(error)
  return /stream disconnected|before completion|receive timeout|timeout|timed out|status code 50[0-9]|status 50[0-9]|gateway|bad gateway|service unavailable|network error|failed to fetch|eof|wsarecv|connection attempt failed|failed to respond|host has failed to respond|connection reset/i.test(text)
}

function isRetryableNativeResolutionError(error: unknown): boolean {
  const text = errorMessageText(error)

  return /invalid size|unsupported size|longest edge|image size|invalid_value|尺寸|分辨率/i.test(text) ||
    isRetryableImageTransportError(error)
}

function canFallbackToStandardResolution(error: unknown): boolean {
  return (
    supportsCustomResolution.value &&
    preferences.resolutionPreset !== 'standard' &&
    !!standardGenerationSize.value &&
    standardGenerationSize.value !== resolvedSize.value &&
    isRetryableNativeResolutionError(error)
  )
}

async function generateWithExternalProvider(
  model: string,
  requestPromptText: string,
  imageInputs: string[],
  signal: AbortSignal
): Promise<NormalizedImageResult[]> {
  const runRelay = (sizeOverride?: string) => generateImageWithExternalRelay(
    createExternalRequest(model, requestPromptText, imageInputs, sizeOverride),
    { signal }
  )

  const runBrowser = async (sizeOverride?: string) => {
    try {
      return await generateImageWithExternalBrowser(
        createExternalRequest(model, requestPromptText, imageInputs, sizeOverride),
        { signal }
      )
    } catch (error) {
      if (
        (error instanceof BrowserDirectGenerationError && error.fallbackSuggested) ||
        isRetryableImageTransportError(error)
      ) {
        appStore.showWarning(t('imageStudio.toasts.browserDirectFallback'))
        preferences.providerMode = 'external-relay'
        return await runRelay(sizeOverride)
      }
      throw error
    }
  }

  const runCurrentMode = (sizeOverride?: string) => (
    preferences.providerMode === 'external-relay'
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
  const upstreamPrompt = resolveUpstreamCompatiblePrompt(resolvedPromptText)
  let requestPromptText = resolvedPromptText
  const overrideRaw = options.referenceImageData
  const overrideArray = Array.isArray(overrideRaw)
    ? overrideRaw
    : (overrideRaw ? [overrideRaw] : [])
  const imageInputs = (overrideArray.length ? overrideArray : referenceImages.value)
    .filter((s): s is string => typeof s === 'string' && s.length > 0)
  const imageInput = imageInputs[0] || undefined

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

  if (upstreamCompatibilityEnabled.value && upstreamPrompt.applied && upstreamPrompt.prompt !== resolvedPromptText) {
    requestPromptText = upstreamPrompt.prompt
    appStore.showWarning(t('imageStudio.toasts.promptCompatibilityApplied'))
  }

  generationError.value = null
  clearProgressResetTimer()
  progress.value = 0
  generationElapsedMs.value = 0
  generating.value = true
  const controller = new AbortController()
  generationAbort.value = controller
  const stopProgress = startProgressAnimation()
  const stopElapsed = startElapsedTracker()

  try {
    let generatedResults: NormalizedImageResult[] = []
    const resolvedModel = preferences.providerMode === 'sub2api'
      ? resolveSub2ApiModel(preferences.aspectRatio)
      : preferences.model

    if (preferences.providerMode === 'sub2api') {
      const sub2apiPayload = {
        base_url: sub2apiBaseUrl,
        api_key: sub2apiApiKey.value,
        profile: 'sub2api-sora-compatible' as const,
        model: resolvedModel,
        prompt: requestPromptText,
        count: effectiveCount.value,
        image_input: imageInput,
        aspect_ratio: preferences.aspectRatio,
        quality: preferences.quality,
        background: preferences.background,
        format: preferences.format,
      }
      try {
        generatedResults = await generateImageWithExternalBrowser(sub2apiPayload, { signal: controller.signal })
      } catch (error) {
        if (isAbortLikeError(error)) {
          throw error
        }
        if (error instanceof BrowserDirectGenerationError && error.fallbackSuggested) {
          appStore.showWarning(t('imageStudio.toasts.browserDirectFallback'))
          generatedResults = await generateImageWithExternalRelay(sub2apiPayload, { signal: controller.signal })
        } else {
          throw error
        }
      }
    } else if (preferences.providerMode === 'external-relay') {
      generatedResults = await generateWithExternalProvider(
        resolvedModel,
        requestPromptText,
        imageInputs,
        controller.signal
      )
    } else {
      generatedResults = await generateWithExternalProvider(
        resolvedModel,
        requestPromptText,
        imageInputs,
        controller.signal
      )
    }

    if (!generatedResults.length) {
      throw new Error(t('imageStudio.toasts.generateFailed'))
    }

    generatedResults = await applyOutputResolutionPreset(generatedResults)

    const finalElapsed = generationStartedAt.value != null
      ? performance.now() - generationStartedAt.value
      : generationElapsedMs.value
    lastGenerationDurationMs.value = finalElapsed
    sessionStats.value = {
      ...sessionStats.value,
      successCount: sessionStats.value.successCount + generatedResults.length,
      lastDurationMs: finalElapsed,
      lastSuccessAt: Date.now(),
      lastFailureMessage: '',
    }
    progress.value = 100

    const createdAt = new Date().toISOString()
    const profileForTiles = (preferences.providerMode === 'sub2api'
      ? 'sub2api-sora-compatible'
      : preferences.profile) as ImageStudioProtocolProfile
    const synthetic = generatedResults.map((result) =>
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

    if (synthetic.length) {
      transientTiles.value = [...synthetic, ...transientTiles.value]
      workspaceTiles.value = [...synthetic, ...workspaceTiles.value]
      previewTileId.value = synthetic[0].id
      activeHistoryId.value = synthetic[0].historyId
      selectedTileIds.value = [synthetic[0].id]
    }

    appStore.showSuccess(t('imageStudio.toasts.generatedCount', { count: generatedResults.length }))

    void persistCurrentResults(
      resolvedModel,
      generatedResults,
      resolvedPromptText,
      imageInputs,
      { parentHistoryId: options.parentHistoryId, parentTileId: options.parentTileId }
    )
      .catch((error) => {
        const description = classifyGenerationError(error)
        generationError.value = { ...description, kind: 'generic' }
        appStore.showError(description.title)
      })

    if (preferences.providerMode === 'sub2api') {
      void refreshSub2ApiUsage({ silent: true })
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
        modelIds = await fetchImageModelIds(candidate, apiKey, controller.signal)
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

async function copyPreviewPrompt() {
  const promptText = previewTile.value?.prompt?.trim()
  if (!promptText) {
    appStore.showWarning(t('imageStudio.toasts.promptCopyEmpty'))
    return
  }
  if (!navigator.clipboard) {
    appStore.showWarning(t('imageStudio.toasts.promptCopyUnsupported'))
    return
  }
  try {
    await navigator.clipboard.writeText(promptText)
    appStore.showSuccess(t('imageStudio.toasts.promptCopied'))
  } catch (error) {
    appStore.showError(error instanceof Error ? error.message : t('imageStudio.toasts.promptCopyFailed'))
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

function handleVariantTileClick(tileId: string, event: MouseEvent) {
  if (event.metaKey || event.ctrlKey) {
    focusTile(tileId, { multi: true })
    return
  }

  focusTile(tileId)
}

function selectAllActiveHistoryTiles() {
  selectedTileIds.value = activeHistoryTiles.value.map((tile) => tile.id)
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
  preferences.model = item.model === 'gpt-image-landscape' || item.model === 'gpt-image-portrait' ? 'gpt-image' : item.model
  preferences.aspectRatio = item.aspectRatio
  preferences.count = item.count
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

  try {
    for (const [index, tile] of selectedTiles.value.entries()) {
      const blob = await ensureResultBlob(tile.result)
      triggerBlobDownload(blob, tile.result.filename)
      if (index < selectedTiles.value.length - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100))
      }
    }

    appStore.showSuccess(t('imageStudio.toasts.selectedDownloaded', { count: selectedTiles.value.length }))
  } catch (error) {
    appStore.showError(error instanceof Error ? error.message : t('imageStudio.toasts.downloadFailed'))
  }
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
      ? `${basePrompt}\n保持主体构图与氛围，生成新的风格变体版本。`
      : `${basePrompt}\nKeep the overall composition and mood, but generate a fresh style variation.`

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
  if (!workspaceTiles.value.length) {
    return
  }

  const snapshot = snapshotHistoryItems(historyItems.value)
  const removedCount = workspaceTiles.value.length
  await clearImageStudioHistory()
  clearWorkspaceOrder()
  selectedTileIds.value = []
  previewTileId.value = null
  activeHistoryId.value = null
  await loadHistory()
  startDeleteUndoTimer(snapshot, removedCount, 'workspace')
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('mousemove', handleGlobalMouseMove)
  window.addEventListener('mouseup', handleGlobalMouseUp)
  window.addEventListener('resize', handleWindowResize)
  if (!appStore.publicSettingsLoaded) {
    await appStore.fetchPublicSettings()
  }
  await loadHistory()
  applyStudioQaRouteState()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  window.removeEventListener('resize', handleWindowResize)
  clearProgressResetTimer()
  revokeImageStudioHistoryItems(historyItems.value)
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

.studio-shell.theme-night {
  --studio-bg: #0a0c12;
  --studio-card: #1c1e26;
  --studio-border: rgba(148, 163, 184, 0.18);
  --studio-text: #e5eefc;
  --studio-muted: #94a3b8;
  --studio-soft: #14161d;
  --studio-dark: #06070b;
  --studio-card-background: #1c1e26;
  --studio-soft-background: #14161d;
  --studio-window-shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 1px 1px rgba(0, 0, 0, 0.4);
  --studio-panel-shadow: 0 1px 1px rgba(0, 0, 0, 0.32);
  --studio-shell-bg: #0a0c12;
  --studio-stage-bg: #14161d;
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
  box-shadow: var(--studio-window-shadow);
}

.studio-header {
  @apply flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-5;
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
}

.studio-appearance-popover {
  @apply relative;
}

.studio-appearance-panel {
  @apply absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[320px] rounded-[20px] border border-slate-200 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)];
  --studio-popover-shift-x: 0px;
  border-radius: var(--studio-radius-panel);
  background: var(--studio-card-background);
  backdrop-filter: var(--studio-backdrop-filter);
  -webkit-backdrop-filter: var(--studio-backdrop-filter);
  transform: translateX(var(--studio-popover-shift-x));
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
  @apply grid gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)_320px];
}

.studio-left-column,
.studio-main-column,
.studio-right-column {
  @apply flex min-h-0 min-w-0 flex-col gap-4;
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

.studio-negative-header {
  @apply mt-4 flex items-center justify-between gap-3;
}

.studio-prompt-actions {
  @apply flex flex-col gap-3;
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
  @apply mt-4;
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
  @apply relative mt-4 overflow-auto rounded-[24px] border border-slate-200;
  min-height: 320px;
  max-height: 560px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--studio-accent) 16%, transparent) 0%, transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--studio-card-background) 92%, white 8%) 0%, color-mix(in srgb, var(--studio-soft-background) 92%, transparent) 100%);
}

.studio-workbench-surface.is-selecting {
  cursor: crosshair;
}

.studio-workbench-empty {
  @apply flex min-h-[320px] flex-col items-center justify-center px-6 text-center;
}

.studio-workbench-grid {
  @apply grid gap-3 p-4;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
}

.studio-workbench-tile {
  @apply relative overflow-hidden border border-slate-200 transition;
  aspect-ratio: 1 / 1;
  border-radius: var(--studio-radius-image);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  background: color-mix(in srgb, var(--studio-card-background) 92%, transparent);
}

.studio-workbench-tile.active {
  border-color: color-mix(in srgb, var(--studio-accent) 52%, white 48%);
  box-shadow:
    0 18px 34px color-mix(in srgb, var(--studio-accent-shadow) 68%, transparent),
    0 0 0 1px color-mix(in srgb, var(--studio-accent) 16%, transparent);
}

.studio-workbench-tile.selected {
  border-color: color-mix(in srgb, var(--studio-accent) 68%, black 6%);
}

.studio-workbench-tile.is-drop-target {
  transform: translateY(-4px);
  box-shadow:
    0 20px 36px color-mix(in srgb, var(--studio-accent-shadow) 72%, transparent),
    0 0 0 1px color-mix(in srgb, var(--studio-accent) 24%, transparent);
}

.studio-workbench-tile.is-dragging {
  opacity: 0.5;
}

.studio-workbench-tile-button {
  @apply relative block h-full w-full overflow-hidden text-left;
}

.studio-workbench-image {
  @apply h-full w-full object-cover;
}

.studio-workbench-tile-gradient {
  @apply pointer-events-none absolute inset-x-0 bottom-0 h-24;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.84) 100%);
}

.studio-workbench-tile-copy {
  @apply pointer-events-none absolute inset-x-0 bottom-0 z-[1] px-3 pb-3;
}

.studio-workbench-tile-name {
  @apply truncate text-sm font-semibold text-white;
}

.studio-workbench-tile-meta {
  @apply mt-1 text-[11px] text-slate-200;
}

.studio-workbench-tile-actions {
  @apply absolute left-2 right-2 top-2 z-[2] flex items-center justify-between gap-2;
}

.studio-workbench-icon {
  @apply inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-slate-900;
  background-color: rgba(2, 6, 23, 0.68);
}

.studio-workbench-drag-pill {
  @apply inline-flex items-center gap-1 rounded-full border border-white/30 px-2.5 py-1 text-[11px] font-medium text-white;
  background-color: rgba(2, 6, 23, 0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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

.studio-side-empty {
  @apply mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500;
}

.studio-history-list {
  @apply mt-4 space-y-3;
  max-height: 360px;
  overflow-y: auto;
}

.studio-history-card {
  @apply rounded-[20px] border border-slate-200 bg-slate-50 p-3 transition;
}

.studio-history-card.active {
  @apply border-blue-300 bg-blue-50;
}

.studio-history-main {
  @apply flex w-full items-start gap-3 text-left;
}

.studio-history-thumb {
  @apply h-14 w-14 shrink-0 rounded-2xl object-cover;
}

.studio-history-copy {
  @apply min-w-0 flex-1;
}

.studio-history-prompt {
  @apply line-clamp-2 text-sm font-medium leading-6 text-slate-800;
}

.studio-history-meta {
  @apply mt-1 text-xs text-slate-500;
}

.studio-history-actions {
  @apply mt-3 flex items-center justify-end gap-2;
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
  @apply fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm;
}

.studio-lightbox-panel {
  @apply flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 text-white shadow-[0_30px_100px_rgba(15,23,42,0.48)];
  background:
    linear-gradient(180deg, rgba(7, 11, 27, 0.98) 0%, rgba(8, 13, 30, 0.94) 100%);
}

.studio-lightbox-header {
  @apply flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4;
}

.studio-lightbox-title {
  @apply text-base font-semibold;
}

.studio-lightbox-caption {
  @apply mt-1 line-clamp-2 text-sm leading-6 text-slate-300;
}

.studio-lightbox-actions {
  @apply flex flex-wrap gap-2;
}

.studio-lightbox-stage {
  @apply relative flex-1 overflow-hidden;
  background:
    radial-gradient(circle at 18% 16%, rgba(96, 165, 250, 0.13), transparent 26%),
    radial-gradient(circle at 84% 84%, rgba(148, 163, 184, 0.1), transparent 24%),
    linear-gradient(180deg, #050816 0%, #0b1120 100%);
}

.studio-lightbox-frame {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: top left;
  will-change: transform;
}

.studio-lightbox-image {
  @apply block rounded-[24px] shadow-[0_26px_72px_rgba(2,6,23,0.36)];
  width: 100%;
  height: 100%;
  max-width: none;
  user-select: none;
  pointer-events: none;
}

.studio-lightbox-image.is-fit {
  object-fit: contain;
}

.studio-lightbox-button {
  @apply inline-flex items-center justify-center gap-2 border border-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10;
  border-radius: var(--studio-radius-control);
}

.studio-lightbox-button.active {
  background: var(--studio-accent-soft);
  border-color: var(--studio-border-strong);
  color: #fff;
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

/* ===== Free-drag isolated mode (picture-in-picture) =====
   When the user long-presses the image, the lightbox stops being a modal:
   the full-screen backdrop, the panel chrome, and the toolbar all vanish.
   Only the image remains, floating on top of the regular workspace which
   stays visible and interactive underneath everywhere except under the
   image itself. The image can be dragged anywhere on screen. */
.studio-lightbox.is-isolated {
  background-color: rgba(15, 23, 42, 0.18) !important;
  background-image: none !important;
  backdrop-filter: blur(14px) saturate(0.85) !important;
  -webkit-backdrop-filter: blur(14px) saturate(0.85) !important;
  pointer-events: none;
}

.studio-lightbox.is-isolated .studio-lightbox-panel {
  pointer-events: none;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  max-width: none !important;
  max-height: none !important;
}

.studio-lightbox.is-isolated .studio-lightbox-header {
  display: none;
}

.studio-lightbox.is-isolated .studio-lightbox-stage {
  background: transparent;
  pointer-events: none;
}

.studio-lightbox.is-isolated .studio-lightbox-frame {
  pointer-events: auto;
  cursor: grabbing;
  filter:
    drop-shadow(0 28px 60px rgba(0, 0, 0, 0.55))
    drop-shadow(0 0 0 1px rgba(255, 255, 255, 0.18));
  transition: filter 220ms ease;
}

.studio-lightbox.is-isolated .studio-lightbox-image {
  pointer-events: auto;
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.studio-lightbox.is-isolated .studio-lightbox-lens {
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
.studio-history-card,
.studio-side-empty,
.studio-variant-card,
.studio-download-card,
.studio-negative-input .input,
.studio-seed-input .input {
  border-radius: var(--studio-radius-control);
}

.studio-style-preview,
.studio-history-thumb,
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
.studio-preview-header,
.studio-lightbox-header {
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
.studio-history-meta,
.studio-download-card span,
.studio-resolution-size,
.studio-empty-text,
.studio-lightbox-caption {
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
.studio-disabled-title,
.studio-lightbox-title {
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
.studio-history-card,
.studio-side-empty,
.studio-download-card,
.studio-clear-button {
  border-color: var(--studio-border);
  background: var(--studio-soft-background);
  color: var(--studio-text);
}

.studio-header-pill.subtle,
.studio-provider-pill,
.studio-style-card,
.studio-history-card,
.studio-download-card,
.studio-panel-link-button,
.studio-inline-button,
.studio-ghost-link {
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
.studio-icon-button {
  color: var(--studio-muted);
}

.studio-provider-pill.active,
.studio-ratio-card.active,
.studio-style-card.active,
.studio-quality-pill.active,
.studio-resolution-card.active,
.studio-preview-tab.active,
.studio-history-card.active,
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

.studio-history-card.active,
.studio-variant-card.selected {
  border-color: var(--studio-accent-deep);
}

.studio-variant-check {
  background: var(--studio-accent);
}

.studio-lightbox {
  background: rgba(2, 6, 23, 0.74);
}

.studio-lightbox-panel {
  border-radius: var(--studio-radius-window);
  border-color: rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(7, 11, 27, 0.97) 0%, rgba(8, 13, 30, 0.94) 100%);
}

.studio-lightbox-stage {
  position: relative;
  background: var(--studio-lightbox-stage-bg);
}

.studio-lightbox-title {
  color: #fff;
}

.studio-lightbox-caption {
  color: rgba(226, 232, 240, 0.82);
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

@media (max-width: 1535px) {
  .studio-layout {
    @apply xl:grid-cols-[260px_minmax(0,1fr)_300px];
  }
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
    @apply gap-3 px-4 py-3;
  }

  .studio-lightbox-caption {
    @apply line-clamp-1;
  }

  .studio-lightbox-actions {
    @apply -mx-1 flex-nowrap overflow-x-auto px-1 pb-1;
    scrollbar-width: thin;
  }

  .studio-lightbox-button {
    @apply shrink-0 px-2.5 py-2 text-xs;
  }

  .studio-lightbox-stage {
    min-height: 260px;
  }

  .studio-workbench-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .studio-workbench-surface {
    min-height: 260px;
    max-height: 420px;
  }

  .studio-workbench-drag-pill {
    @apply hidden;
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

.studio-lightbox-meta {
  @apply mt-2 flex flex-wrap gap-1.5;
  max-height: 56px;
  overflow-y: auto;
}

.studio-lightbox-chip {
  @apply inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.studio-lightbox-chip.is-accent {
  background: color-mix(in srgb, var(--studio-accent) 28%, transparent);
  color: white;
  border-color: color-mix(in srgb, var(--studio-accent) 50%, transparent);
}

/* Ensure the lightbox stage always has room for the image, even when the
   header grows due to long prompts or many metadata chips. */
.studio-lightbox-stage {
  min-height: 60vh;
}

.studio-lightbox-header {
  flex-shrink: 0;
  max-height: 32vh;
  overflow-y: auto;
}

.studio-lightbox-caption {
  -webkit-line-clamp: 3;
}


.studio-workbench-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  padding: 1rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-gutter: stable;
  scroll-snap-type: x proximity;
  scroll-behavior: smooth;
  grid-template-columns: none;
}

.studio-workbench-grid > .studio-workbench-tile {
  flex: 0 0 168px;
  scroll-snap-align: start;
}

.studio-workbench-grid::-webkit-scrollbar {
  height: 8px;
}

.studio-workbench-grid::-webkit-scrollbar-track {
  background: transparent;
}

.studio-workbench-grid::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--studio-accent) 30%, transparent);
  border-radius: 999px;
}

@media (max-width: 600px) {
  .studio-workbench-grid {
    flex-wrap: wrap;
    overflow-x: visible;
  }
  .studio-workbench-grid > .studio-workbench-tile {
    flex: 1 1 140px;
  }
}

/* ====== ChatGPT-style progress info row ====== */
.studio-progress-info {
  @apply mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2;
  background: var(--studio-soft-background);
  border: 1px solid var(--studio-border);
}

.studio-progress-info-text {
  @apply flex flex-col gap-0.5 text-xs;
  color: var(--studio-muted);
}

.studio-progress-info-text strong {
  @apply text-sm font-semibold;
  color: var(--studio-text);
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

.studio-shell.motion-reduced .studio-preview-image.is-generating-shimmer,
.studio-shell.motion-reduced .studio-preview-generating-shine,
.studio-shell.motion-reduced .studio-preview-skeleton-shine {
  animation: none !important;
  filter: none !important;
}
</style>
