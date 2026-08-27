<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game.store'
import RulesModal from '@/components/common/RulesModal.vue'
import SettingsModal from '@/components/common/SettingsModal.vue'
import { useArtistSettings } from '@/services/settings.service'

const router = useRouter()
const store = useGameStore()
const aiCount = ref<2 | 3 | 4>(3)
const showRules = ref(false)
const showSettings = ref(false)
const { artistNames } = useArtistSettings()

function start(): void {
  store.begin(aiCount.value)
  void router.push('/game')
}

function resume(): void {
  if (store.resume()) void router.push('/game')
}
</script>

<template>
  <div class="home-page">
    <header class="home-nav">
      <a class="brand-mark" href="#" aria-label="現代藝術首頁"><i></i><span>MA / 92</span></a>
      <div class="home-nav__actions">
        <button class="text-button" @click="showSettings = true">遊戲設定</button>
        <button class="text-button" @click="showRules = true">遊戲規則</button>
      </div>
    </header>

    <main class="hero">
      <section class="hero__copy">
        <span class="hero__index">01 — 04 · SOLO AUCTION</span>
        <h1><span>現代</span><span>藝術</span></h1>
        <p class="hero__lead">眼光決定價值，出價揭露野心。</p>
        <p class="hero__body">
          與不同性格的 AI 畫商同桌競標，在四季市場浪潮中，打造最富有的私人藝廊。
        </p>

        <div class="game-setup">
          <span class="game-setup__label">選擇對手</span>
          <div class="segmented-control" aria-label="AI 玩家數量">
            <button
              v-for="count in [2, 3, 4] as const"
              :key="count"
              :class="{ active: aiCount === count }"
              @click="aiCount = count"
            >
              {{ count }} AI
            </button>
          </div>
          <button class="button button--primary button--start" @click="start">
            進入拍賣會 <span>↗</span>
          </button>
          <button v-if="store.savedGameAvailable" class="continue-button" @click="resume">
            繼續上次牌局
          </button>
        </div>
      </section>

      <section class="hero-gallery" aria-label="抽象藝術展覽預覽">
        <div class="hero-gallery__label hero-gallery__label--top">PRIVATE VIEW · TAIPEI</div>
        <div class="hero-art hero-art--yellow">
          <i></i><b>{{ artistNames.yellow }}</b
          ><small>No. 12</small>
        </div>
        <div class="hero-art hero-art--red">
          <i></i><b>{{ artistNames.red }}</b
          ><small>No. 27</small>
        </div>
        <div class="hero-art hero-art--blue">
          <i></i><b>{{ artistNames.blue }}</b
          ><small>No. 08</small>
        </div>
        <div class="hero-gallery__stamp"><span>4</span><small>ROUNDS</small></div>
        <div class="hero-gallery__label hero-gallery__label--bottom">
          EST. 1992 · THE MARKET IS OPEN
        </div>
      </section>
    </main>

    <footer class="home-footer">
      <span>3—5 PLAYERS</span><span>70 ARTWORKS</span><span>5 AUCTION STYLES</span>
    </footer>

    <RulesModal v-if="showRules" @close="showRules = false" />
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>
