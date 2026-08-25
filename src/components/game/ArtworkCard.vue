<script setup lang="ts">
import { computed } from 'vue'
import { ARTISTS, AUCTION_LABELS, AUCTION_SYMBOLS } from '@/config/game-rules'
import type { ArtworkCard } from '@/domain/model'

const props = withDefaults(
  defineProps<{
    card: ArtworkCard
    compact?: boolean
    disabled?: boolean
    selected?: boolean
  }>(),
  { compact: false, disabled: false, selected: false },
)

defineEmits<{ select: [card: ArtworkCard] }>()

const artist = computed(() => ARTISTS[props.card.artistId])
const cardStyle = computed(() => ({
  '--artist-color': artist.value.color,
  '--artist-ink': artist.value.ink,
}))
</script>

<template>
  <button
    class="art-card"
    :class="{ 'art-card--compact': compact, 'art-card--selected': selected }"
    :style="cardStyle"
    :disabled="disabled"
    :aria-label="`${artist.zhName}，${AUCTION_LABELS[card.auctionType]}`"
    @click="$emit('select', card)"
  >
    <span class="art-card__edition">{{ String(card.edition).padStart(2, '0') }}</span>
    <span class="art-card__canvas" aria-hidden="true">
      <i class="art-card__shape art-card__shape--one"></i>
      <i class="art-card__shape art-card__shape--two"></i>
      <i class="art-card__shape art-card__shape--three"></i>
    </span>
    <span class="art-card__artist">{{ artist.name }}</span>
    <span class="art-card__meta">
      <b>{{ AUCTION_SYMBOLS[card.auctionType] }}</b>
      <small>{{ AUCTION_LABELS[card.auctionType] }}</small>
    </span>
  </button>
</template>
