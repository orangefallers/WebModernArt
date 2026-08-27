<script setup lang="ts">
import { computed } from 'vue'
import { ARTIST_IDS, type GameState } from '@/domain/model'
import { ARTISTS } from '@/config/game-rules'
import { cumulativeMarketValue } from '@/domain/game-engine'
import { artistDisplayName } from '@/services/settings.service'

const props = defineProps<{ game: GameState }>()

function marketValueTone(value: number | null): 'gold' | 'silver' | 'bronze' | undefined {
  if (value === 30) return 'gold'
  if (value === 20) return 'silver'
  if (value === 10) return 'bronze'
  return undefined
}

const rows = computed(() =>
  ARTIST_IDS.map((artistId) => ({
    ...ARTISTS[artistId],
    displayName: artistDisplayName(artistId),
    count: props.game.roundCounts[artistId],
    history: [1, 2, 3, 4].map(
      (round) =>
        props.game.marketHistory.find((entry) => entry.round === round)?.values[artistId] ?? null,
    ),
    total: cumulativeMarketValue(props.game, artistId),
  })),
)
</script>

<template>
  <section class="panel market-board" aria-labelledby="market-title">
    <div class="panel__heading">
      <div>
        <span class="eyebrow">Market index</span>
        <h2 id="market-title">市場行情</h2>
      </div>
      <span class="round-chip">R{{ game.round }}</span>
    </div>

    <div class="market-board__header" aria-hidden="true">
      <span>藝術家</span><span>本輪</span><span>R1</span><span>R2</span><span>R3</span
      ><span>R4</span><span>累計</span>
    </div>
    <div v-for="artist in rows" :key="artist.id" class="market-board__row">
      <span class="artist-key">
        <i :style="{ background: artist.color }"></i>
        <span
          ><b>{{ artist.displayName }}</b></span
        >
      </span>
      <strong class="market-board__count">{{ artist.count }}/5</strong>
      <span
        v-for="(value, index) in artist.history"
        :key="index"
        class="market-board__value"
        :class="
          marketValueTone(value) ? `market-board__value--${marketValueTone(value)}` : undefined
        "
      >
        {{ value === null ? '—' : `$${value}` }}
      </span>
      <strong class="market-board__total">${{ artist.total }}</strong>
    </div>
  </section>
</template>
