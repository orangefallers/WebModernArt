<script setup lang="ts">
import { ARTISTS, AUCTION_LABELS, AUCTION_SYMBOLS, PERSONALITY_LABELS } from '@/config/game-rules'
import type { GameState, PlayerId } from '@/domain/model'
import { artistDisplayName } from '@/services/settings.service'

const props = defineProps<{
  game: GameState
  actorId?: PlayerId
  thinkingPlayerId: PlayerId | null
}>()

function auctionStatus(
  playerId: PlayerId,
): { label: string; tone: 'bid' | 'pass' | 'waiting' } | null {
  const auction = props.game.auction
  if (!auction) return null
  if (auction.passedPlayerIds.includes(playerId)) return { label: 'PASS', tone: 'pass' }
  if (auction.type === 'sealed' && auction.bids[playerId] !== undefined) {
    return { label: '已封標', tone: 'waiting' }
  }
  const bid = auction.bids[playerId]
  if (bid !== undefined) return { label: `$${bid}k`, tone: 'bid' }
  if (
    auction.type === 'fixed-price' &&
    auction.priceSetterId === playerId &&
    auction.fixedPrice !== undefined
  ) {
    return { label: `定價 $${auction.fixedPrice}k`, tone: 'bid' }
  }
  if (props.actorId === playerId) return { label: '待行動', tone: 'waiting' }
  return null
}
</script>

<template>
  <section class="panel player-rail" aria-labelledby="players-title">
    <div class="panel__heading">
      <div>
        <span class="eyebrow">Collectors</span>
        <h2 id="players-title">畫商席位</h2>
      </div>
    </div>
    <ol class="player-list">
      <li
        v-for="(player, index) in game.players"
        :key="player.id"
        class="player-seat"
        :class="{
          'player-seat--active': player.id === actorId,
          'player-seat--human': player.kind === 'human',
        }"
      >
        <span class="player-seat__number">0{{ index + 1 }}</span>
        <span class="player-seat__portrait" :class="`portrait-${index + 1}`">
          {{ player.kind === 'human' ? 'YOU' : 'AI' }}
        </span>
        <span class="player-seat__identity">
          <b>{{ player.name }}</b>
          <small v-if="player.kind === 'ai' && player.personality">
            {{ PERSONALITY_LABELS[player.personality] }}
          </small>
          <small v-else>首席策展人</small>
          <span
            v-if="auctionStatus(player.id)"
            class="player-seat__auction-status"
            :class="`player-seat__auction-status--${auctionStatus(player.id)?.tone}`"
          >
            {{ auctionStatus(player.id)?.label }}
          </span>
        </span>
        <span class="player-seat__assets">
          <b>${{ player.cash }}k</b>
          <small>{{ player.hand.length }} 手牌 · {{ player.gallery.length }} 收藏</small>
        </span>
        <div class="player-seat__gallery" :aria-label="`${player.name} 本輪買入作品`">
          <template v-if="player.gallery.length === 0">
            <span class="player-seat__gallery-empty">尚無作品</span>
          </template>
          <template v-else>
            <span
              v-for="entry in player.gallery"
              :key="entry.card.id"
              class="player-seat__gallery-card"
              :style="{
                '--gallery-color': ARTISTS[entry.card.artistId].color,
                '--gallery-ink': ARTISTS[entry.card.artistId].ink,
              }"
              :title="`${artistDisplayName(entry.card.artistId)} · ${AUCTION_LABELS[entry.card.auctionType]}`"
            >
              <b>{{ AUCTION_SYMBOLS[entry.card.auctionType] }}</b>
              <small>{{ artistDisplayName(entry.card.artistId) }}</small>
            </span>
          </template>
        </div>
        <span v-if="thinkingPlayerId === player.id" class="thinking-dot" aria-label="思考中">
          <i></i><i></i><i></i>
        </span>
      </li>
    </ol>
  </section>
</template>
