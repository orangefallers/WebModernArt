<script setup lang="ts">
import { computed } from 'vue'
import { ARTISTS, AUCTION_LABELS, AUCTION_SYMBOLS } from '@/config/game-rules'
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

function playerSales(playerId: string) {
  return props.game.roundResult?.sales?.[playerId] ?? []
}
</script>

<template>
  <div class="modal-backdrop" role="presentation">
    <section
      class="result-modal result-modal--round"
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

      <section class="round-sales" aria-label="本輪各玩家售畫明細">
        <article v-for="player in game.players" :key="player.id" class="round-sales__player">
          <header>
            <span>{{ player.name }}</span>
            <strong>本輪收入 +${{ game.roundResult?.earnings[player.id] ?? 0 }}k</strong>
          </header>

          <div v-if="playerSales(player.id).length" class="round-sales__cards">
            <div
              v-for="sale in playerSales(player.id)"
              :key="sale.card.id"
              class="round-sale-card"
              :style="{
                '--sale-color': ARTISTS[sale.card.artistId].color,
                '--sale-ink': ARTISTS[sale.card.artistId].ink,
              }"
            >
              <span class="round-sale-card__art">
                <b>{{ AUCTION_SYMBOLS[sale.card.auctionType] }}</b>
              </span>
              <span class="round-sale-card__detail">
                <b>{{ ARTISTS[sale.card.artistId].zhName }}</b>
                <small>
                  {{ AUCTION_LABELS[sale.card.auctionType] }} · 賣給銀行 ${{ sale.unitPrice }}k
                </small>
              </span>
            </div>
          </div>
          <p v-else class="round-sales__empty">本輪沒有賣給銀行的作品</p>
        </article>
      </section>

      <button class="button button--primary button--wide" @click="$emit('continue')">
        {{ game.round === 4 ? '查看最終排名' : `進入第 ${game.round + 1} 輪` }}
      </button>
    </section>
  </div>
</template>
