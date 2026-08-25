<script setup lang="ts">
import { computed } from 'vue'
import { ARTISTS } from '@/config/game-rules'
import type { GameState } from '@/domain/model'

const props = defineProps<{ game: GameState }>()
defineEmits<{ continue: [] }>()

const ranked = computed(() =>
  (props.game.roundResult?.ranking ?? []).slice(0, 3).map((artistId, index) => ({
    artist: ARTISTS[artistId],
    count: props.game.roundResult?.counts[artistId] ?? 0,
    value: props.game.roundResult?.values[artistId] ?? 0,
    rank: index + 1,
  })),
)
</script>

<template>
  <div class="modal-backdrop" role="presentation">
    <section
      class="result-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-result-title"
    >
      <span class="eyebrow">Market close</span>
      <h2 id="round-result-title">第 {{ game.roundResult?.round }} 輪市場結算</h2>
      <p>本季最受矚目的三位藝術家，將價值帶進後續市場。</p>

      <ol class="result-podium">
        <li
          v-for="item in ranked"
          :key="item.artist.id"
          :style="{ '--rank-color': item.artist.color }"
        >
          <span>0{{ item.rank }}</span>
          <div>
            <b>{{ item.artist.zhName }}</b
            ><small>{{ item.count }} 件成交</small>
          </div>
          <strong>+${{ item.value }}k</strong>
        </li>
      </ol>

      <div class="earnings-grid">
        <div v-for="player in game.players" :key="player.id">
          <span>{{ player.name }}</span>
          <strong>+${{ game.roundResult?.earnings[player.id] ?? 0 }}k</strong>
        </div>
      </div>

      <button class="button button--primary button--wide" @click="$emit('continue')">
        {{ game.round === 4 ? '查看最終排名' : `進入第 ${game.round + 1} 輪` }}
      </button>
    </section>
  </div>
</template>
