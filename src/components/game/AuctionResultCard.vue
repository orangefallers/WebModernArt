<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ARTISTS, AUCTION_LABELS, AUCTION_SYMBOLS } from '@/config/game-rules'
import type { AuctionResult, GameState } from '@/domain/model'
import { artistDisplayName } from '@/services/settings.service'

const props = defineProps<{
  game: GameState
  result: AuctionResult
}>()

const expanded = ref(false)
const winner = computed(() =>
  props.game.players.find((player) => player.id === props.result.winnerId),
)
const isUnmatchedDouble = computed(() => props.result.kind === 'unmatched-double')
const isJointAuction = computed(() => props.result.cardCount === 2)
const resultRound = computed(() => props.result.round ?? props.game.round)
const auctionTypeLabel = computed(() => {
  if (isUnmatchedDouble.value) return '未配對聯合拍賣'
  const baseLabel = props.result.auctionType ? AUCTION_LABELS[props.result.auctionType] : '拍賣成交'
  return isJointAuction.value ? `聯合拍賣 · ${baseLabel}` : baseLabel
})
const payouts = computed(() =>
  (props.result.payouts ?? []).map((payout) => ({
    ...payout,
    playerName:
      props.game.players.find((player) => player.id === payout.playerId)?.name ?? payout.playerId,
    roleLabel: isJointAuction.value
      ? payout.role === 'primary'
        ? '主要拍賣官'
        : '次要拍賣官'
      : '拍賣官',
  })),
)

watch(
  () => props.result.id,
  () => {
    expanded.value = false
  },
)
</script>

<template>
  <section
    v-if="winner"
    class="panel auction-result-card"
    :class="{ 'auction-result-card--expanded': expanded }"
    role="status"
    aria-live="polite"
    aria-labelledby="latest-auction-result-title"
  >
    <header class="auction-result-card__header">
      <div>
        <span class="eyebrow">R{{ resultRound }} · HAMMER DOWN</span>
        <strong id="latest-auction-result-title">最新成交</strong>
      </div>
      <span>{{ auctionTypeLabel }}</span>
    </header>

    <div class="auction-result-card__headline">
      <div>
        <small>{{ isUnmatchedDouble ? '取得畫作' : '得標畫商' }}</small>
        <h2>{{ winner.name }}{{ isUnmatchedDouble ? ' 免費獲得' : ' 得標' }}</h2>
      </div>
      <strong>{{ isUnmatchedDouble ? '免費' : `$${result.amount}k` }}</strong>
    </div>

    <div v-if="result.cards?.length" class="auction-result-card__artworks" aria-label="得標畫作">
      <span
        v-for="card in result.cards"
        :key="card.id"
        class="auction-result-card__artwork"
        :style="{
          '--result-artist-color': ARTISTS[card.artistId].color,
          '--result-artist-ink': ARTISTS[card.artistId].ink,
        }"
        :title="`${artistDisplayName(card.artistId)} · ${AUCTION_LABELS[card.auctionType]}`"
      >
        <b>{{ AUCTION_SYMBOLS[card.auctionType] }}</b>
        <small>{{ artistDisplayName(card.artistId) }}</small>
      </span>
    </div>
    <p v-else class="auction-result-card__count">{{ result.cardCount }} 張作品</p>

    <div id="latest-auction-ledger" class="auction-result-card__ledger">
      <div>
        <span>{{ winner.name }}</span>
        <b>{{ isUnmatchedDouble ? '支付 $0k' : `支付成交價 $${result.amount}k` }}</b>
      </div>
      <div v-for="payout in payouts" :key="`${payout.role}-${payout.playerId}`">
        <span>{{ payout.roleLabel }} · {{ payout.playerName }}</span>
        <b>獲得 +${{ payout.amount }}k</b>
      </div>
      <div v-if="result.bankPayment !== undefined">
        <span>支付銀行</span>
        <b>${{ result.bankPayment }}k</b>
      </div>
      <div v-if="isUnmatchedDouble">
        <span>原因</span>
        <b>聯合拍賣無人補牌</b>
      </div>
    </div>

    <button
      class="auction-result-card__toggle"
      type="button"
      :aria-expanded="expanded"
      aria-controls="latest-auction-ledger"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收合收付款' : '查看收付款' }}
    </button>
  </section>
</template>
