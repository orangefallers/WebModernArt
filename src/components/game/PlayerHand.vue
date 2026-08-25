<script setup lang="ts">
import { computed } from 'vue'
import type { ArtworkCard, GameState, PlayerState } from '@/domain/model'
import ArtworkCardView from './ArtworkCard.vue'

const props = defineProps<{
  game: GameState
  human: PlayerState
  isHumanTurn: boolean
}>()

const emit = defineEmits<{
  play: [cardId: string]
  supplement: [cardId: string]
}>()

const selectMode = computed(() => {
  if (!props.isHumanTurn) return 'none'
  if (props.game.phase === 'select-card') return 'play'
  if (props.game.phase === 'double-response') return 'supplement'
  return 'none'
})

function isEligible(card: ArtworkCard): boolean {
  if (selectMode.value === 'play') return true
  if (selectMode.value !== 'supplement' || !props.game.pendingDouble) return false
  return (
    card.artistId === props.game.pendingDouble.primaryCard.artistId && card.auctionType !== 'double'
  )
}

function choose(card: ArtworkCard): void {
  if (!isEligible(card)) return
  if (selectMode.value === 'play') emit('play', card.id)
  if (selectMode.value === 'supplement') emit('supplement', card.id)
}
</script>

<template>
  <section class="hand-console" aria-labelledby="hand-title">
    <div class="hand-console__heading">
      <div>
        <span class="eyebrow">Private collection</span>
        <h2 id="hand-title">你的手牌</h2>
      </div>
      <p v-if="selectMode === 'play'">選一張作品上拍</p>
      <p v-else-if="selectMode === 'supplement'">選擇符合條件的第二張作品</p>
      <p v-else>等待其他畫商行動</p>
      <strong>{{ human.hand.length }} 件</strong>
    </div>
    <div class="hand-strip">
      <ArtworkCardView
        v-for="card in human.hand"
        :key="card.id"
        :card="card"
        :disabled="!isEligible(card)"
        @select="choose"
      />
      <div v-if="human.hand.length === 0" class="hand-empty">目前沒有手牌</div>
    </div>
  </section>
</template>
