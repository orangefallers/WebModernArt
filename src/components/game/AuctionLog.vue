<script setup lang="ts">
import { computed } from 'vue'
import type { GameLogEntry, GameState } from '@/domain/model'

const props = defineProps<{ game: GameState }>()

interface DisplayLogEntry extends GameLogEntry {
  displayRound: number
}

const allEntries = computed<DisplayLogEntry[]>(() => {
  let inferredRound = 1
  return props.game.log
    .map((entry) => {
      const roundStart = entry.message.match(/^第 ([1-4]) 輪開始。/)
      if (roundStart?.[1]) inferredRound = Number(roundStart[1])
      return {
        ...entry,
        displayRound: entry.round ?? inferredRound,
      }
    })
    .reverse()
})
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
        <div class="auction-log__meta" aria-label="動態編號與輪次">
          <span class="auction-log__round">R{{ entry.displayRound }}</span>
          <span class="auction-log__index">#{{ String(entry.id).padStart(2, '0') }}</span>
        </div>
        <p>{{ entry.message }}</p>
      </li>
    </ol>
  </section>
</template>
