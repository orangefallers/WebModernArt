<script setup lang="ts">
import { computed } from 'vue'
import { ARTISTS, AUCTION_LABELS, AUCTION_SYMBOLS } from '@/config/game-rules'
import type { GameState } from '@/domain/model'
import { artistDisplayName } from '@/services/settings.service'

const props = defineProps<{ game: GameState }>()
defineEmits<{ continue: [] }>()

const ranked = computed(() =>
  (props.game.roundResult?.ranking ?? []).slice(0, 3).map((artistId, index) => {
    const round = props.game.roundResult?.round ?? props.game.round
    const valueHistory = Array.from({ length: round }, (_, roundIndex) => {
      const marketRound = props.game.marketHistory.find((entry) => entry.round === roundIndex + 1)
      return { round: roundIndex + 1, value: marketRound?.values[artistId] ?? 0 }
    })
    return {
      artist: ARTISTS[artistId],
      displayName: artistDisplayName(artistId),
      count: props.game.roundResult?.counts[artistId] ?? 0,
      valueHistory,
      cumulativeValue: valueHistory.reduce((sum, entry) => sum + entry.value, 0),
      rank: index + 1,
    }
  }),
)

const nextAuctioneer = computed(() => {
  const nextAuctioneerId = props.game.roundResult?.nextAuctioneerId
  if (!nextAuctioneerId || props.game.round === 4) return undefined
  return props.game.players.find((player) => player.id === nextAuctioneerId)
})

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
            <b>{{ item.displayName }}</b
            ><small>{{ item.count }} 件成交</small>
            <span v-if="(game.roundResult?.round ?? 1) > 1" class="result-value-history">
              <i v-for="entry in item.valueHistory" :key="entry.round">
                R{{ entry.round }} ${{ entry.value }}k
              </i>
            </span>
          </div>
          <strong>
            <small>單張累計</small>
            ${{ item.cumulativeValue }}k
          </strong>
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
                <b>{{ artistDisplayName(sale.card.artistId) }}</b>
                <small>
                  {{ AUCTION_LABELS[sale.card.auctionType] }} · 賣給銀行 ${{ sale.unitPrice }}k
                </small>
              </span>
            </div>
          </div>
          <p v-else class="round-sales__empty">本輪沒有賣給銀行的作品</p>
        </article>
      </section>

      <aside v-if="nextAuctioneer" class="next-round-auctioneer" aria-label="下一輪出牌玩家">
        <span>Next auctioneer</span>
        <div>
          <small>第 {{ game.round + 1 }} 輪首位拍賣官</small>
          <strong>{{ nextAuctioneer.name }}</strong>
        </div>
      </aside>

      <button class="button button--primary button--wide" @click="$emit('continue')">
        {{ game.round === 4 ? '查看最終排名' : `進入第 ${game.round + 1} 輪` }}
      </button>
    </section>
  </div>
</template>
