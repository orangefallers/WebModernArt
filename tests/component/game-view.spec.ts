import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import GameView from '@/views/GameView.vue'
import { useGameStore } from '@/stores/game.store'

describe('GameView restart confirmation', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('asks for confirmation, clears the game, and returns to the home route', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>首頁</div>' } },
        { path: '/game', component: GameView },
      ],
    })
    await router.push('/game')
    await router.isReady()

    const store = useGameStore()
    store.begin(2)
    const wrapper = mount(GameView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          MarketBoard: true,
          PlayerRail: true,
          AuctionStage: true,
          AuctionLog: true,
          PlayerHand: true,
        },
      },
    })

    await wrapper.get('button[aria-label="遊戲選單"]').trigger('click')
    const restartButton = wrapper
      .findAll('.game-menu button')
      .find((button) => button.text() === '重新開始')
    if (!restartButton) throw new Error('restart button not found')
    await restartButton.trigger('click')

    expect(wrapper.get('[role="alertdialog"]').text()).toContain('確定重新開始？')
    expect(store.game).not.toBeNull()

    const confirmButton = wrapper
      .findAll('[role="alertdialog"] button')
      .find((button) => button.text() === '確認並返回首頁')
    if (!confirmButton) throw new Error('confirm button not found')
    await confirmButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
    expect(store.game).toBeNull()
    expect(store.savedGameAvailable).toBe(false)
  })
})
