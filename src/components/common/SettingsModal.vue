<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ARTIST_IDS, type ArtistId } from '@/domain/model'
import { ARTISTS } from '@/config/game-rules'
import {
  DEFAULT_ARTIST_NAMES,
  saveArtistNames,
  useArtistSettings,
  validateArtistName,
} from '@/services/settings.service'

const emit = defineEmits<{ close: [] }>()
const settings = useArtistSettings()
const draft = reactive<Record<ArtistId, string>>({ ...settings.artistNames })

const errors = computed(
  () =>
    Object.fromEntries(
      ARTIST_IDS.map((artistId) => [artistId, validateArtistName(draft[artistId])]),
    ) as Record<ArtistId, string>,
)

const canSave = computed(() => ARTIST_IDS.every((artistId) => errors.value[artistId] === ''))

function restoreDefaults(): void {
  Object.assign(draft, DEFAULT_ARTIST_NAMES)
}

function save(): void {
  if (canSave.value && saveArtistNames(draft)) emit('close')
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
      <h2 id="settings-title">自訂藝術家名稱</h2>
      <p>名稱可使用英文字母、中文字或兩者混合，最多 10 個字。</p>

      <div class="artist-name-settings">
        <label v-for="artistId in ARTIST_IDS" :key="artistId" class="artist-name-field">
          <i :style="{ background: ARTISTS[artistId].color }"></i>
          <span>
            <b>{{ ARTISTS[artistId].name }}</b>
            <small>{{ Array.from(draft[artistId]).length }}/10</small>
          </span>
          <input
            v-model="draft[artistId]"
            type="text"
            maxlength="10"
            :aria-label="`${ARTISTS[artistId].name} 的自訂名稱`"
            :aria-invalid="Boolean(errors[artistId])"
            :aria-describedby="`artist-name-error-${artistId}`"
          />
          <small :id="`artist-name-error-${artistId}`" class="artist-name-field__error">
            {{ errors[artistId] }}
          </small>
        </label>
      </div>

      <div class="settings-modal__actions">
        <button class="button button--ghost" @click="restoreDefaults">恢復預設</button>
        <button class="button button--primary" :disabled="!canSave" @click="save">儲存設定</button>
      </div>
    </section>
  </div>
</template>
