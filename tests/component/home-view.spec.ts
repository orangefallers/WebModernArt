import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import HomeView from '@/views/HomeView.vue'
import { useGameStore } from '@/stores/game.store'
import {
  restoreDefaultDeveloperSettings,
  useDeveloperSettings,
} from '@/services/developer-settings.service'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/game', component: { template: '<div>遊戲</div>' } },
    ],
  })
}

describe('HomeView', () => {
  beforeEach(() => {
    localStorage.clear()
    restoreDefaultDeveloperSettings()
    setActivePinia(createPinia())
  })

  it('shows a disabled multiplayer preview beside the solo game action', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [router] } })
    const multiplayerButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('多人連線'))

    expect(multiplayerButton).toBeDefined()
    expect(multiplayerButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.get('#multiplayer-coming-soon').text()).toBe('to be continue')
  })

  it('opens the game rules from the home page', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()

    const wrapper = mount(HomeView, { global: { plugins: [router] } })
    const rulesButton = wrapper
      .findAll('.home-nav__actions button')
      .find((button) => button.text() === '遊戲規則')
    if (!rulesButton) throw new Error('game rules button not found')

    await rulesButton.trigger('click')

    const rules = wrapper.get('[aria-labelledby="rules-title"]')
    expect(rules.exists()).toBe(true)
    for (const auctionName of ['公開競價', '一圈競價', '秘密投標', '一口定價', '聯合拍賣']) {
      expect(rules.text()).toContain(auctionName)
    }
    expect(rules.text()).toContain('先打出聯合拍賣牌的玩家是次要拍賣官')
  })

  it('asks for a gallery name before creating the game', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomeView, { global: { plugins: [router] } })
    const soloButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('進入拍賣會'))
    if (!soloButton) throw new Error('solo game button not found')

    await soloButton.trigger('click')
    expect(wrapper.get('#gallery-name-title').text()).toBe('為你的畫廊命名')

    await wrapper.get('input[aria-label="自訂畫廊名稱"]').setValue('橘子藝廊')
    const confirmButton = wrapper
      .findAll('.gallery-name-modal button')
      .find((button) => button.text().includes('確認並進入遊戲'))
    if (!confirmButton) throw new Error('gallery confirmation button not found')
    await confirmButton.trigger('click')
    await flushPromises()

    expect(useGameStore().game?.players[0]?.name).toBe('橘子藝廊')
    expect(router.currentRoute.value.path).toBe('/game')
  })

  it('opens development-only visibility settings from the top navigation', async () => {
    const router = createTestRouter()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(HomeView, { global: { plugins: [router] } })

    expect(import.meta.env.DEV).toBe(true)
    const developerButton = wrapper
      .findAll('.home-nav__actions button')
      .find((button) => button.text() === '開發者模式')
    if (!developerButton) throw new Error('developer mode button not found')
    await developerButton.trigger('click')

    const aiCashToggle = wrapper.get('input[aria-label="顯示 AI 玩家目前金額"]')
    const purchaseCostToggle = wrapper.get('input[aria-label="顯示市場結算作品買進成本"]')
    expect((aiCashToggle.element as HTMLInputElement).checked).toBe(false)
    expect((purchaseCostToggle.element as HTMLInputElement).checked).toBe(false)

    await aiCashToggle.setValue(true)
    await purchaseCostToggle.setValue(true)
    await wrapper
      .findAll('.developer-mode-modal button')
      .find((button) => button.text() === '套用設定')!
      .trigger('click')

    expect(useDeveloperSettings().developerSettings.showAICash).toBe(true)
    expect(useDeveloperSettings().developerSettings.showPurchaseCosts).toBe(true)
  })
})
