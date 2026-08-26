import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AuctionStage from '@/components/game/AuctionStage.vue'
import { createDeck } from '@/domain/deck'
import { playCard, startGame } from '@/domain/game-engine'
import { useGameStore } from '@/stores/game.store'

describe('AuctionStage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('offers quick bid buttons and blocks an amount above the player cash', async () => {
    const store = useGameStore()
    const game = startGame({ aiCount: 2, seed: 'auction-input' })
    const auctionCard = createDeck().find((card) => card.auctionType === 'once-around')
    if (!auctionCard) throw new Error('expected a once-around card')

    game.auctioneerIndex = 2
    game.players[2]!.hand = [auctionCard]
    store.game = playCard(game, 'ai-2', auctionCard.id)

    const wrapper = mount(AuctionStage)
    const amountInput = wrapper.get('input[aria-label="輸入出價金額"]')
    const quickAddTen = wrapper.findAll('button').find((button) => button.text().trim() === '+10k')

    expect(amountInput.element).toHaveProperty('value', '1')
    expect(wrapper.text()).toContain('本次拍賣官AI 畫商 2')
    expect(quickAddTen).toBeDefined()
    await quickAddTen!.trigger('click')
    expect(amountInput.element).toHaveProperty('value', '11')

    await amountInput.setValue('101')
    expect(wrapper.text()).toContain('超過可用現金 $100k')
    expect(wrapper.get('button.button--primary').attributes('disabled')).toBeDefined()
  })

  it('shows the winner and purchase amount after an auction settles', async () => {
    const store = useGameStore()
    store.game = startGame({ aiCount: 2, seed: 'auction-result-notice' })
    store.auctionResultNotice = {
      id: 99,
      winnerId: 'ai-1',
      amount: 24,
      cardCount: 2,
    }

    const wrapper = mount(AuctionStage)

    expect(wrapper.get('.auction-result-notice').text()).toContain('AI 畫商 1 得標')
    expect(wrapper.get('.auction-result-notice').text()).toContain('$24k · 2 張作品')
  })
})
