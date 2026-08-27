<script setup lang="ts">
import { reactive } from 'vue'
import { saveDeveloperSettings, useDeveloperSettings } from '@/services/developer-settings.service'

const emit = defineEmits<{ close: [] }>()
const { developerSettings } = useDeveloperSettings()
const draft = reactive({ ...developerSettings })

function save(): void {
  saveDeveloperSettings(draft)
  emit('close')
}
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section
      class="result-modal developer-mode-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="developer-mode-title"
    >
      <button class="modal-close" aria-label="關閉開發者模式" @click="$emit('close')">×</button>
      <span class="eyebrow">Development only</span>
      <h2 id="developer-mode-title">開發者模式</h2>
      <p>這些顯示選項只用於本機測試，不會改變遊戲規則或存檔內容。</p>

      <div class="developer-toggle-list">
        <label class="developer-toggle">
          <span>
            <b>顯示 AI 現金</b>
            <small>在畫商席位顯示每位 AI 目前擁有的金額。</small>
          </span>
          <input v-model="draft.showAICash" type="checkbox" aria-label="顯示 AI 玩家目前金額" />
        </label>
        <label class="developer-toggle">
          <span>
            <b>顯示作品買進成本</b>
            <small>在每輪市場結算明細顯示每張作品的買進成本。</small>
          </span>
          <input
            v-model="draft.showPurchaseCosts"
            type="checkbox"
            aria-label="顯示市場結算作品買進成本"
          />
        </label>
      </div>

      <div class="modal-actions">
        <button class="button button--ghost" @click="$emit('close')">取消</button>
        <button class="button button--primary" @click="save">套用設定</button>
      </div>
    </section>
  </div>
</template>
