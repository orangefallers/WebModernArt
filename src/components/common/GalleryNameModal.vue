<script setup lang="ts">
import { computed, ref } from 'vue'
import { validatePlayerName } from '@/services/settings.service'

const emit = defineEmits<{ close: []; start: [galleryName: string] }>()
const galleryName = ref('你的藝廊')
const error = computed(() => validatePlayerName(galleryName.value))

function submit(): void {
  if (error.value) return
  emit('start', galleryName.value.trim())
}
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section
      class="result-modal gallery-name-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-name-title"
    >
      <button class="modal-close" aria-label="關閉畫廊命名" @click="$emit('close')">×</button>
      <span class="eyebrow">Before the auction</span>
      <h2 id="gallery-name-title">為你的畫廊命名</h2>
      <p>這個名稱會顯示在畫商席位與整場拍賣紀錄中。</p>

      <label class="gallery-name-field">
        <span>畫廊名稱</span>
        <input
          v-model="galleryName"
          type="text"
          maxlength="20"
          autofocus
          aria-label="自訂畫廊名稱"
          :aria-invalid="Boolean(error)"
          aria-describedby="gallery-name-error"
          @keyup.enter="submit"
        />
        <small id="gallery-name-error">{{ error || `${Array.from(galleryName).length}/20` }}</small>
      </label>

      <div class="modal-actions">
        <button class="button button--ghost" @click="$emit('close')">取消</button>
        <button class="button button--primary" :disabled="Boolean(error)" @click="submit">
          確認並進入遊戲
        </button>
      </div>
    </section>
  </div>
</template>
