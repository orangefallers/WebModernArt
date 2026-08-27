<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '@/domain/model'

const props = defineProps<{ game: GameState }>()

const allEntries = computed(() => [...props.game.log].reverse())
</script>

<template>
  <section class="panel auction-log" aria-labelledby="auction-log-title" aria-live="polite">
    <div class="panel__heading auction-log__heading">
      <div>
        <span class="eyebrow">Live ledger</span>
        <h2 id="auction-log-title">拍賣動態</h2>
      </div>
      <span class="auction-log__live"><i></i> 全場 {{ game.log.length }} 筆</span>
    </div>
    <ol class="auction-log__list" aria-label="完整遊戲動態，最新紀錄優先">
      <li
        v-for="entry in allEntries"
        :key="entry.id"
        :class="`auction-log__entry--${entry.tone ?? 'neutral'}`"
      >
        <span>{{ String(entry.id).padStart(2, '0') }}</span>
        <p>{{ entry.message }}</p>
      </li>
    </ol>
  </section>
</template>
