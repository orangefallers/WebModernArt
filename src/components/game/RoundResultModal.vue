<script setup lang="ts">
import { computed } from 'vue'
import { ARTISTS, AUCTION_LABELS, AUCTION_SYMBOLS } from '@/config/game-rules'
import type { ArtworkRoundResult, GameState } from '@/domain/model'
import { artistDisplayName } from '@/services/settings.service'
import { useDeveloperSettings } from '@/services/developer-settings.service'

const props = defineProps<{ game: GameState }>()
defineEmits<{ continue: [] }>()
const { developerSettings } = useDeveloperSettings()
const canShowPurchaseCosts = computed(
  () => import.meta.env.DEV && developerSettings.showPurchaseCosts,
)

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

function playerArtworks(playerId: string) {
  const completeArtworks = props.game.roundResult?.artworks?.[playerId]
  if (completeArtworks) return completeArtworks
  return (props.game.roundResult?.sales?.[playerId] ?? []).map((sale) => ({
    card: sale.card,
    acquisition: 'auction' as const,
    sellableThisRound: true,
    bankSalePrice: sale.unitPrice,
  }))
}

function purchasePriceLabel(purchasePrice: number | undefined): string {
  return purchasePrice === undefined ? '買進成本未記錄' : `買進 $${purchasePrice}k`
}

function artworkSettlementLabel(artwork: ArtworkRoundResult): string {
  const details = [AUCTION_LABELS[artwork.card.auctionType]]
  if (canShowPurchaseCosts.value) {
    details.push(
      artwork.acquisition === 'unmatched-double'
        ? '免費獲得'
        : purchasePriceLabel(artwork.purchasePrice),
    )
  }
  if (artwork.bankSalePrice !== undefined) {
    details.push(`賣給銀行 $${artwork.bankSalePrice}k`)
  } else if (artwork.acquisition === 'unmatched-double') {
    details.push('本輪不可出售')
  } else {
    details.push('未進前三名，本輪未售')
  }
  return details.join(' · ')
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
          :class="`result-podium__rank--${item.rank}`"
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

      <section class="round-sales" aria-label="本輪各玩家收藏結算明細">
        <article v-for="player in game.players" :key="player.id" class="round-sales__player">
          <header>
            <span>{{ player.name }}</span>
            <strong>本輪收入 +${{ game.roundResult?.earnings[player.id] ?? 0 }}k</strong>
          </header>

          <div v-if="playerArtworks(player.id).length" class="round-sales__cards">
            <div
              v-for="artwork in playerArtworks(player.id)"
              :key="artwork.card.id"
              class="round-sale-card"
              :class="{ 'round-sale-card--unsold': artwork.bankSalePrice === undefined }"
              :style="{
                '--sale-color': ARTISTS[artwork.card.artistId].color,
                '--sale-ink': ARTISTS[artwork.card.artistId].ink,
              }"
            >
              <span class="round-sale-card__art">
                <b>{{ AUCTION_SYMBOLS[artwork.card.auctionType] }}</b>
              </span>
              <span class="round-sale-card__detail">
                <b>{{ artistDisplayName(artwork.card.artistId) }}</b>
                <small>{{ artworkSettlementLabel(artwork) }}</small>
              </span>
            </div>
          </div>
          <p v-else class="round-sales__empty">本輪沒有買進作品</p>
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
