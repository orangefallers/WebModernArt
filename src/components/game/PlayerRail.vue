<script setup lang="ts">
import { PERSONALITY_LABELS } from '@/config/game-rules'
import type { GameState, PlayerId } from '@/domain/model'

defineProps<{
  game: GameState
  actorId?: PlayerId
  thinkingPlayerId: PlayerId | null
}>()
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
        </span>
        <span class="player-seat__assets">
          <b>${{ player.cash }}k</b>
          <small>{{ player.hand.length }} 手牌 · {{ player.gallery.length }} 收藏</small>
        </span>
        <span v-if="thinkingPlayerId === player.id" class="thinking-dot" aria-label="思考中">
          <i></i><i></i><i></i>
        </span>
      </li>
    </ol>
  </section>
</template>
