<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ARTIST_IDS, PERSONALITY_IDS, type ArtistId } from '@/domain/model'
import { ARTISTS, PERSONALITY_LABELS } from '@/config/game-rules'
import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_ARTIST_NAMES,
  saveAISettings,
  saveArtistNames,
  useAISettings,
  useArtistSettings,
  validateArtistName,
  validatePlayerName,
} from '@/services/settings.service'

const emit = defineEmits<{ close: [] }>()
const settings = useArtistSettings()
const draft = reactive<Record<ArtistId, string>>({ ...settings.artistNames })
const { aiSettings } = useAISettings()
const aiDraft = reactive(aiSettings.map((setting) => ({ ...setting })))

const errors = computed(
  () =>
    Object.fromEntries(
      ARTIST_IDS.map((artistId) => [artistId, validateArtistName(draft[artistId])]),
    ) as Record<ArtistId, string>,
)

const aiErrors = computed(() => aiDraft.map((setting) => validatePlayerName(setting.name)))

const canSave = computed(
  () =>
    ARTIST_IDS.every((artistId) => errors.value[artistId] === '') &&
    aiErrors.value.every((error) => error === ''),
)

function restoreDefaults(): void {
  Object.assign(draft, DEFAULT_ARTIST_NAMES)
  aiDraft.splice(0, aiDraft.length, ...DEFAULT_AI_SETTINGS.map((setting) => ({ ...setting })))
}

function save(): void {
  if (canSave.value && saveArtistNames(draft) && saveAISettings(aiDraft)) emit('close')
}
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section
      class="rules-modal settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <button class="modal-close" aria-label="關閉設定" @click="$emit('close')">×</button>
      <span class="eyebrow">Game settings</span>
      <h2 id="settings-title">遊戲設定</h2>

      <section class="settings-section" aria-labelledby="artist-settings-title">
        <header>
          <h3 id="artist-settings-title">藝術家名稱</h3>
          <p>英文字母或中文字，最多 10 個字。</p>
        </header>
        <div class="artist-name-settings">
          <label v-for="(artistId, index) in ARTIST_IDS" :key="artistId" class="artist-name-field">
            <i :style="{ background: ARTISTS[artistId].color }"></i>
            <span>
              <b>藝術家 {{ String(index + 1).padStart(2, '0') }}</b>
              <small>{{ Array.from(draft[artistId]).length }}/10</small>
            </span>
            <input
              v-model="draft[artistId]"
              type="text"
              maxlength="10"
              :aria-label="`藝術家 ${index + 1} 的自訂名稱`"
              :aria-invalid="Boolean(errors[artistId])"
              :aria-describedby="`artist-name-error-${artistId}`"
            />
            <small :id="`artist-name-error-${artistId}`" class="artist-name-field__error">
              {{ errors[artistId] }}
            </small>
          </label>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="ai-settings-title">
        <header>
          <h3 id="ai-settings-title">AI 畫商</h3>
          <p>可為四個 AI 席位設定名稱與出牌個性。</p>
        </header>
        <div class="ai-player-settings">
          <label v-for="(ai, index) in aiDraft" :key="index" class="ai-setting-row">
            <span>AI {{ String(index + 1).padStart(2, '0') }}</span>
            <input
              v-model="ai.name"
              type="text"
              maxlength="20"
              :aria-label="`AI 畫商 ${index + 1} 名稱`"
              :aria-invalid="Boolean(aiErrors[index])"
              :aria-describedby="`ai-name-error-${index}`"
            />
            <select v-model="ai.personality" :aria-label="`AI 畫商 ${index + 1} 出牌個性`">
              <option
                v-for="personality in PERSONALITY_IDS"
                :key="personality"
                :value="personality"
              >
                {{ PERSONALITY_LABELS[personality] }}
              </option>
            </select>
            <small :id="`ai-name-error-${index}`" class="ai-setting-row__error">
              {{ aiErrors[index] }}
            </small>
          </label>
        </div>
      </section>

      <div class="settings-modal__actions">
        <button class="button button--ghost" @click="restoreDefaults">恢復預設</button>
        <button class="button button--primary" :disabled="!canSave" @click="save">儲存設定</button>
      </div>
    </section>
  </div>
</template>
