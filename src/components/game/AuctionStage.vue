<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { AUCTION_LABELS } from '@/config/game-rules'
import { useGameStore } from '@/stores/game.store'
import ArtworkCard from './ArtworkCard.vue'

const store = useGameStore()
const { game, actor, isHumanTurn, thinkingPlayerId, human, auctionResultNotice } =
  storeToRefs(store)
const amountInput = ref<string | number>('1')

const auctioneer = computed(() => {
  const state = game.value
  if (!state) return undefined
  const auctioneerId =
    state.auction?.primaryAuctioneerId ??
    state.pendingDouble?.primaryAuctioneerId ??
    state.players[state.auctioneerIndex]?.id
  return state.players.find((player) => player.id === auctioneerId)
})

const auctionWinner = computed(() =>
  game.value?.players.find((player) => player.id === auctionResultNotice.value?.winnerId),
)

const displayedCards = computed(() => {
  if (!game.value) return []
  if (game.value.auction) return game.value.auction.cards
  if (game.value.pendingDouble) return [game.value.pendingDouble.primaryCard]
  return []
})

const minimum = computed(() => {
  const auction = game.value?.auction
  if (!auction) return 0
  if (auction.type === 'sealed' || auction.type === 'fixed-price') return 0
  return auction.highestBid + 1
})

const availableCash = computed(() => human.value?.cash ?? 0)

const amount = computed(() => {
  if (String(amountInput.value).trim() === '') return Number.NaN
  return Number(amountInput.value)
})

const amountError = computed(() => {
  if (!Number.isFinite(amount.value)) return '請輸入金額。'
  if (!Number.isInteger(amount.value) || amount.value < 0) return '金額必須是非負整數。'
  if (amount.value > availableCash.value)
    return `超過可用現金 $${availableCash.value}k，請降低金額。`
  if (amount.value < minimum.value) return `本次最低金額為 $${minimum.value}k。`
  return ''
})

const canSubmitAmount = computed(() => amountError.value === '')

function addAmount(increment: 1 | 5 | 10): void {
  const current = Number.isFinite(amount.value) ? amount.value : minimum.value
  amountInput.value = String(
    Math.min(availableCash.value, Math.max(minimum.value, current + increment)),
  )
}

function canAddAmount(increment: 1 | 5 | 10): boolean {
  const current = Number.isFinite(amount.value) ? amount.value : minimum.value
  return current + increment <= availableCash.value
}

const heading = computed(() => {
  const state = game.value
  if (!state) return ''
  if (state.phase === 'select-card')
    return isHumanTurn.value ? '選擇一件作品上拍' : '拍賣官正在選畫'
  if (state.phase === 'double-response') return '聯合拍賣 · 尋找第二件作品'
  if (state.auction) return AUCTION_LABELS[state.auction.type]
  return '拍賣會場'
})

const instruction = computed(() => {
  const state = game.value
  if (!state) return ''
  if (thinkingPlayerId.value) return `${actor.value?.name ?? 'AI 畫商'} 正在評估市場…`
  if (state.phase === 'select-card')
    return isHumanTurn.value ? '從下方手牌選一張，成為本次拍賣官。' : '下一件作品即將揭曉。'
  if (state.phase === 'double-response') {
    return isHumanTurn.value
      ? '可從手牌補一張同藝術家的非聯合牌，或選擇略過。'
      : `${actor.value?.name ?? '畫商'} 正在考慮補牌。`
  }
  const auction = state.auction
  if (!auction) return ''
  if (!isHumanTurn.value) return `${actor.value?.name ?? '畫商'} 行動中。`
  if (auction.type === 'sealed') return '你的出價會保持秘密，直到所有畫商完成出價。'
  if (auction.type === 'fixed-price' && auction.fixedPrice === undefined)
    return '設定一口價；若無人購買，你必須自行買下。'
  if (auction.type === 'fixed-price') return `是否以 $${auction.fixedPrice}k 購買這組作品？`
  return `目前最高價 $${auction.highestBid}k。提高出價，或退出本次競標。`
})

watch(
  () => [game.value?.phase, game.value?.auction?.highestBid, game.value?.auction?.fixedPrice],
  () => {
    amountInput.value = String(Math.max(minimum.value, 0))
  },
  { immediate: true },
)

function submitAmount(): void {
  const auction = game.value?.auction
  if (!auction || !canSubmitAmount.value) return
  if (auction.type === 'sealed') store.humanSealedBid(amount.value)
  else if (auction.type === 'fixed-price' && auction.fixedPrice === undefined)
    store.humanSetPrice(amount.value)
  else store.humanBid(amount.value)
}
</script>

<template>
  <main class="auction-stage" aria-live="polite">
    <div class="auction-stage__header">
      <span class="eyebrow">Live auction · Round {{ game?.round }}</span>
      <h1>{{ heading }}</h1>
      <p>{{ instruction }}</p>
      <div v-if="auctioneer" class="current-auctioneer">
        <span>本次拍賣官</span>
        <strong>{{ auctioneer.name }}</strong>
      </div>
    </div>

    <Transition name="auction-result">
      <div v-if="auctionResultNotice && auctionWinner" class="auction-result-notice" role="status">
        <span>HAMMER DOWN</span>
        <strong>{{ auctionWinner.name }} 得標</strong>
        <b>${{ auctionResultNotice.amount }}k · {{ auctionResultNotice.cardCount }} 張作品</b>
      </div>
    </Transition>

    <div
      class="auction-stage__art"
      :class="{ 'auction-stage__art--empty': displayedCards.length === 0 }"
    >
      <template v-if="displayedCards.length">
        <ArtworkCard v-for="card in displayedCards" :key="card.id" :card="card" compact disabled />
      </template>
      <div v-else class="empty-plinth" aria-hidden="true">
        <span>+</span>
        <i></i>
      </div>
    </div>

    <div v-if="game?.phase === 'auction' && game.auction" class="auction-status">
      <div>
        <span>{{ game.auction.type === 'fixed-price' ? '定價' : '最高出價' }}</span>
        <strong>
          ${{
            game.auction.type === 'fixed-price'
              ? (game.auction.fixedPrice ?? '—')
              : game.auction.highestBid
          }}k
        </strong>
      </div>
      <div>
        <span>目前行動</span>
        <strong>{{ actor?.name ?? '結算中' }}</strong>
      </div>
    </div>

    <div v-if="isHumanTurn && game" class="auction-controls">
      <template v-if="game.phase === 'double-response'">
        <button class="button button--ghost" @click="store.humanDouble()">略過補牌</button>
      </template>
      <template v-else-if="game.phase === 'auction' && game.auction">
        <template
          v-if="game.auction.type === 'fixed-price' && game.auction.fixedPrice !== undefined"
        >
          <button
            class="button button--primary"
            :disabled="(game.auction.fixedPrice ?? 0) > (human?.cash ?? 0)"
            @click="store.humanFixedResponse(true)"
          >
            立即購買 · ${{ game.auction.fixedPrice }}k
          </button>
          <button class="button button--ghost" @click="store.humanFixedResponse(false)">
            放棄
          </button>
        </template>
        <template v-else>
          <div class="money-entry">
            <div class="money-entry__row">
              <label class="money-input" :class="{ 'money-input--invalid': amountError }">
                <span>$</span>
                <input
                  v-model="amountInput"
                  type="number"
                  inputmode="numeric"
                  aria-label="輸入出價金額"
                  :aria-invalid="Boolean(amountError)"
                  :min="minimum"
                  :max="availableCash"
                  step="1"
                />
                <small>k</small>
              </label>
              <div class="quick-bids" aria-label="快速增加金額">
                <button
                  v-for="increment in [1, 5, 10] as const"
                  :key="increment"
                  type="button"
                  :disabled="!canAddAmount(increment)"
                  @click="addAmount(increment)"
                >
                  +{{ increment }}k
                </button>
              </div>
            </div>
            <div class="money-entry__feedback">
              <span :class="{ 'money-entry__error': amountError }">
                {{ amountError || `可用現金 $${availableCash}k` }}
              </span>
            </div>
          </div>
          <button class="button button--primary" :disabled="!canSubmitAmount" @click="submitAmount">
            {{
              game.auction.type === 'sealed'
                ? '封存出價'
                : game.auction.type === 'fixed-price'
                  ? '確認定價'
                  : '出價'
            }}
          </button>
          <button
            v-if="['open', 'once-around'].includes(game.auction.type)"
            class="button button--ghost"
            @click="store.humanPass()"
          >
            Pass
          </button>
        </template>
      </template>
    </div>

    <div v-else-if="thinkingPlayerId" class="thinking-banner">
      <span></span>{{ actor?.name }} 正在思考
    </div>
  </main>
</template>
