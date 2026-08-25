<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game.store'
import MarketBoard from '@/components/game/MarketBoard.vue'
import PlayerRail from '@/components/game/PlayerRail.vue'
import AuctionStage from '@/components/game/AuctionStage.vue'
import PlayerHand from '@/components/game/PlayerHand.vue'
import RoundResultModal from '@/components/game/RoundResultModal.vue'
import RulesModal from '@/components/common/RulesModal.vue'

const store = useGameStore()
const router = useRouter()
const { game, human, actorId, isHumanTurn, thinkingPlayerId } = storeToRefs(store)
const showRules = ref(false)
const showMenu = ref(false)

const finalRanking = computed(() =>
  [...(game.value?.players ?? [])].sort((left, right) => right.cash - left.cash),
)

onMounted(() => {
  if (!game.value && !store.resume()) void router.replace('/')
})

function leave(): void {
  store.quit()
  void router.push('/')
}
</script>

<template>
  <div v-if="game && human" class="game-page">
    <header class="game-nav">
      <button class="brand-mark brand-mark--game" aria-label="返回首頁" @click="leave">
        <i></i><span>MA / 92</span>
      </button>
      <div class="game-nav__status">
        <span>ROUND</span><strong>0{{ game.round }}</strong
        ><i></i><span>拍賣季進行中</span>
      </div>
      <div class="game-nav__actions">
        <button class="text-button" @click="showRules = true">規則</button>
        <button class="icon-button" aria-label="遊戲選單" @click="showMenu = !showMenu">•••</button>
        <div v-if="showMenu" class="game-menu">
          <button @click="store.restart()">重新開始</button>
          <button @click="leave">儲存並回首頁</button>
        </div>
      </div>
    </header>

    <div class="game-layout">
      <MarketBoard :game="game" />
      <AuctionStage />
      <PlayerRail :game="game" :actor-id="actorId" :thinking-player-id="thinkingPlayerId" />
    </div>

    <div v-if="store.errorMessage" class="error-toast" role="alert">{{ store.errorMessage }}</div>

    <PlayerHand
      :game="game"
      :human="human"
      :is-human-turn="isHumanTurn"
      @play="store.humanPlayCard"
      @supplement="store.humanDouble"
    />

    <RoundResultModal
      v-if="game.phase === 'round-result'"
      :game="game"
      @continue="store.continueRound"
    />

    <div v-if="game.phase === 'game-over'" class="modal-backdrop">
      <section class="result-modal final-modal" role="dialog" aria-modal="true">
        <span class="eyebrow">Final ledger</span>
        <h2>拍賣會閉幕</h2>
        <p>
          {{
            finalRanking[0]?.id === human.id
              ? '你成為本季最成功的畫商。'
              : `${finalRanking[0]?.name} 掌握了市場。`
          }}
        </p>
        <ol class="final-ranking">
          <li
            v-for="(player, index) in finalRanking"
            :key="player.id"
            :class="{ winner: index === 0 }"
          >
            <span>0{{ index + 1 }}</span
            ><b>{{ player.name }}</b
            ><strong>${{ player.cash }}k</strong>
          </li>
        </ol>
        <div class="modal-actions">
          <button class="button button--primary" @click="store.restart()">再玩一局</button>
          <button class="button button--ghost" @click="leave">返回首頁</button>
        </div>
      </section>
    </div>

    <RulesModal v-if="showRules" @close="showRules = false" />
  </div>
</template>
